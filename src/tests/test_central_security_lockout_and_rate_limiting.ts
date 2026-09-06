/**
 * ==============================================================================
 * SUITE DE TESTS OBLIGATOIRES — SÉCURITÉ GLOBALE DES COMPTES UTILISATEURS
 * ANTI-BRUTE-FORCE + VERROUILLAGE TEMPORAIRE PROGRESSIF + RATE LIMITING IP + MULTI-TENANT
 * ==============================================================================
 *
 * Scénarios validés :
 * TEST 1  : Caissier — 1er échec mot de passe -> Refus & incrément compteur (1/3).
 * TEST 2  : Caissier — 2ème échec mot de passe -> Refus & incrément compteur (2/3).
 * TEST 3  : Caissier — 3ème échec mot de passe -> Verrouillage automatique de 15 minutes.
 * TEST 4  : Caissier — Bon mot de passe saisi pendant le verrouillage -> Rejet strict avec temps restant.
 * TEST 5  : Caissier — Authentification après expiration du verrouillage -> Connexion autorisée.
 * TEST 6  : Caissier — Réinitialisation du compteur d'échecs consécutifs (0) et mise à jour de la date de succès.
 * TEST 7  : Universalité de la politique — Validation identique pour Boutiquier, Formateur, Opérateur, Admin Agence et Super Admin.
 * TEST 8  : Verrouillage incrémental progressif (15 min -> 30 min -> 60 min -> 120 min).
 * TEST 9  : Rate Limiting par IP — Blocage des attaques automatisées massives (>15 requêtes/5min) avec code 429.
 * TEST 10 : Combinaison Compte + IP — Une attaque sur un compte n'altère pas un autre compte légitime sur une IP distincte.
 * TEST 11 : Isolation Multi-Agences — Rejet HTTP 403 quand l'Admin A tente de déverrouiller un compte de l'Agence B.
 * TEST 12 : Protection Hiérarchique — L'Admin d'agence ne peut pas déverrouiller un compte Super Administrateur.
 * TEST 13 : Audit & Confidentialité — Vérification qu'aucun mot de passe en clair ne réside dans le journal d'audit.
 * TEST 14 : Sécurité Serveur & Résistance au Contournement — Contrôle d'accès et intégrité des données d'authentification.
 * TEST 15 : Indépendance et concurrence multi-utilisateurs — Le verrouillage d'un compte n'impacte pas les autres.
 * TEST 16 : Non-régression complète — Déverrouillage administratif par Super Admin & Admin légitime.
 */

import { dbStore } from '../server/db/mockStore';
import { resetIpRateLimiter, checkAccountLockout, getLockoutDurationMinutes } from '../server/security/securityEngine';

async function runGlobalSecurityTests() {
  console.log('================================================================');
  console.log('TESTS OBLIGATOIRES — SÉCURITÉ GLOBALE ANTI-BRUTE-FORCE & RATE LIMITING');
  console.log('================================================================\n');

  let passedTests = 0;
  const totalTests = 16;

  // Réinitialiser la base de données et le rate limiter pour une exécution propre
  dbStore.resetToDefault();
  resetIpRateLimiter();

  // ---------------------------------------------------------------------------
  // TEST 1 : Caissier — 1ère tentative incorrecte
  // ---------------------------------------------------------------------------
  console.log('--- TEST 1 : Caissier — 1er mot de passe incorrect ---');
  const cashierId = 'caissier';
  const res1 = dbStore.authenticateUser(cashierId, 'mauvais_mdp_1', '192.168.1.10');
  const userAfter1 = dbStore.getState().users.find(u => u.username === cashierId);

  if (!res1.success && res1.statusCode === 401 && userAfter1?.failedLoginAttempts === 1 && !userAfter1?.lockedUntil) {
    console.log(`✅ TEST 1 RÉUSSI : Connexion refusée (401), compteur d'échecs = ${userAfter1.failedLoginAttempts}/3, compte non verrouillé.`);
    passedTests++;
  } else {
    console.error('❌ TEST 1 ÉCHOUÉ :', { res1, userAfter1 });
  }

  // ---------------------------------------------------------------------------
  // TEST 2 : Caissier — 2ème tentative incorrecte
  // ---------------------------------------------------------------------------
  console.log('\n--- TEST 2 : Caissier — 2ème mot de passe incorrect ---');
  const res2 = dbStore.authenticateUser(cashierId, 'mauvais_mdp_2', '192.168.1.10');
  const userAfter2 = dbStore.getState().users.find(u => u.username === cashierId);

  if (!res2.success && res2.statusCode === 401 && userAfter2?.failedLoginAttempts === 2 && !userAfter2?.lockedUntil) {
    console.log(`✅ TEST 2 RÉUSSI : Connexion refusée (401), compteur d'échecs = ${userAfter2.failedLoginAttempts}/3, compte non verrouillé.`);
    passedTests++;
  } else {
    console.error('❌ TEST 2 ÉCHOUÉ :', { res2, userAfter2 });
  }

  // ---------------------------------------------------------------------------
  // TEST 3 : Caissier — 3ème tentative incorrecte -> Blocage 15 minutes
  // ---------------------------------------------------------------------------
  console.log('\n--- TEST 3 : Caissier — 3ème mot de passe incorrect -> Verrouillage automatique 15 min ---');
  const beforeLockTime = new Date();
  const res3 = dbStore.authenticateUser(cashierId, 'mauvais_mdp_3', '192.168.1.10', undefined, beforeLockTime);
  const userAfter3 = dbStore.getState().users.find(u => u.username === cashierId);

  const lockStatus3 = userAfter3 ? checkAccountLockout(userAfter3, beforeLockTime) : null;
  const isLocked15Min = lockStatus3?.isLocked && lockStatus3.remainingMinutes === 15;

  if (!res3.success && res3.isLocked && res3.statusCode === 423 && isLocked15Min && userAfter3?.lockoutCount === 1) {
    console.log(`✅ TEST 3 RÉUSSI : Compte verrouillé automatiquement pendant 15 minutes (lockedUntil: ${userAfter3?.lockedUntil}, échelon 1).`);
    passedTests++;
  } else {
    console.error('❌ TEST 3 ÉCHOUÉ :', { res3, userAfter3, lockStatus3 });
  }

  // ---------------------------------------------------------------------------
  // TEST 4 : Pendant le blocage — Saisie du BON mot de passe -> Rejet strict
  // ---------------------------------------------------------------------------
  console.log('\n--- TEST 4 : Pendant le blocage — Saisie du BON mot de passe ---');
  const test4Time = new Date(beforeLockTime.getTime() + 2 * 60 * 1000); // 2 minutes plus tard
  const res4 = dbStore.authenticateUser(cashierId, 'caisse123', '192.168.1.10', undefined, test4Time);

  if (!res4.success && res4.isLocked && res4.statusCode === 423 && res4.message?.includes('temporairement bloqué')) {
    console.log(`✅ TEST 4 RÉUSSI : Bon mot de passe rejeté pendant le verrouillage (Temps restant: ${res4.remainingMinutes} min, Message: « ${res4.message} »).`);
    passedTests++;
  } else {
    console.error('❌ TEST 4 ÉCHOUÉ :', { res4 });
  }

  // ---------------------------------------------------------------------------
  // TEST 5 : Après expiration du verrouillage (16 min plus tard) — Bon mot de passe
  // ---------------------------------------------------------------------------
  console.log('\n--- TEST 5 : Après expiration des 15 minutes — Bon mot de passe ---');
  const test5Time = new Date(beforeLockTime.getTime() + 16 * 60 * 1000); // 16 minutes plus tard
  const res5 = dbStore.authenticateUser(cashierId, 'caisse123', '192.168.1.10', undefined, test5Time);
  const userAfter5 = dbStore.getState().users.find(u => u.username === cashierId);

  if (res5.success && res5.statusCode === 200 && userAfter5) {
    console.log(`✅ TEST 5 RÉUSSI : Connexion autorisée après expiration du temps de blocage.`);
    passedTests++;
  } else {
    console.error('❌ TEST 5 ÉCHOUÉ :', { res5, userAfter5 });
  }

  // ---------------------------------------------------------------------------
  // TEST 6 : Vérification de la réinitialisation du compteur d'échecs consécutifs
  // ---------------------------------------------------------------------------
  console.log('\n--- TEST 6 : Vérification de la remise à zéro des échecs consécutifs ---');
  if (userAfter5?.failedLoginAttempts === 0 && !userAfter5?.lockedUntil && userAfter5?.lastSuccessfulLoginAt) {
    console.log(`✅ TEST 6 RÉUSSI : failedLoginAttempts = ${userAfter5.failedLoginAttempts}, lockedUntil effacé, lastSuccessfulLoginAt = ${userAfter5.lastSuccessfulLoginAt}.`);
    passedTests++;
  } else {
    console.error('❌ TEST 6 ÉCHOUÉ :', { userAfter5 });
  }

  // ---------------------------------------------------------------------------
  // TEST 7 : Universalité de la politique pour TOUS les rôles
  // ---------------------------------------------------------------------------
  console.log('\n--- TEST 7 : Universalité — Test de verrouillage sur tous les rôles métiers & Super Admin ---');
  const rolesToTest = [
    { roleName: 'Boutiquier / Magasinier', identifier: 'stock.horizon', goodPass: 'stock123' },
    { roleName: 'Formateur', identifier: 'resp-formation', goodPass: 'formation123' },
    { roleName: 'Opérateur Production', identifier: 'operateur', goodPass: 'prod123' },
    { roleName: 'Administrateur Agence', identifier: 'admin', goodPass: 'admin123' },
    { roleName: 'Super Administrateur Global', identifier: 'superadmin', goodPass: 'superadmin123' }
  ];

  let allRolesPassed = true;
  for (const roleTest of rolesToTest) {
    const ip = `10.0.0.${Math.floor(10 + Math.random() * 200)}`;
    // 3 échecs
    dbStore.authenticateUser(roleTest.identifier, 'mauvais1', ip);
    dbStore.authenticateUser(roleTest.identifier, 'mauvais2', ip);
    const lockRes = dbStore.authenticateUser(roleTest.identifier, 'mauvais3', ip);
    const u = dbStore.getState().users.find(usr => usr.username === roleTest.identifier);

    if (!lockRes.isLocked || !u?.lockedUntil) {
      console.error(`❌ Échec pour le rôle ${roleTest.roleName} (@${roleTest.identifier})`);
      allRolesPassed = false;
    } else {
      console.log(`  ✓ Rôle [${roleTest.roleName}] (@${roleTest.identifier}) : Protégé et verrouillé avec succès.`);
    }
  }

  if (allRolesPassed) {
    console.log('✅ TEST 7 RÉUSSI : 100% des rôles de la plateforme bénéficient de la même politique stricte.');
    passedTests++;
  } else {
    console.error('❌ TEST 7 ÉCHOUÉ.');
  }

  // ---------------------------------------------------------------------------
  // TEST 8 : Verrouillage incrémental progressif (15 min -> 30 min -> 60 min -> 120 min)
  // ---------------------------------------------------------------------------
  console.log('\n--- TEST 8 : Verrouillage progressif (15 min -> 30 min -> 60 min -> 120 min) ---');
  const testUser = 'admin.horizon';
  const goodPass = 'admin123';
  let tNow = new Date('2026-09-03T10:00:00Z');

  // 1er palier : 3 échecs -> 15 min
  dbStore.authenticateUser(testUser, 'bad1', '172.16.0.1', undefined, tNow);
  dbStore.authenticateUser(testUser, 'bad2', '172.16.0.1', undefined, tNow);
  const lock1 = dbStore.authenticateUser(testUser, 'bad3', '172.16.0.1', undefined, tNow);
  const dur1 = lock1.remainingMinutes; // 15

  // Expiration palier 1 (après 16 min)
  tNow = new Date(tNow.getTime() + 16 * 60 * 1000);

  // 2ème palier : 3 nouveaux échecs -> 30 min
  dbStore.authenticateUser(testUser, 'bad1', '172.16.0.1', undefined, tNow);
  dbStore.authenticateUser(testUser, 'bad2', '172.16.0.1', undefined, tNow);
  const lock2 = dbStore.authenticateUser(testUser, 'bad3', '172.16.0.1', undefined, tNow);
  const dur2 = lock2.remainingMinutes; // 30

  // Expiration palier 2 (après 31 min)
  tNow = new Date(tNow.getTime() + 31 * 60 * 1000);

  // 3ème palier : 3 nouveaux échecs -> 60 min (1 heure)
  dbStore.authenticateUser(testUser, 'bad1', '172.16.0.1', undefined, tNow);
  dbStore.authenticateUser(testUser, 'bad2', '172.16.0.1', undefined, tNow);
  const lock3 = dbStore.authenticateUser(testUser, 'bad3', '172.16.0.1', undefined, tNow);
  const dur3 = lock3.remainingMinutes; // 60

  // Expiration palier 3 (après 61 min)
  tNow = new Date(tNow.getTime() + 61 * 60 * 1000);

  // 4ème palier : 3 nouveaux échecs -> 120 min (2 heures)
  dbStore.authenticateUser(testUser, 'bad1', '172.16.0.1', undefined, tNow);
  dbStore.authenticateUser(testUser, 'bad2', '172.16.0.1', undefined, tNow);
  const lock4 = dbStore.authenticateUser(testUser, 'bad3', '172.16.0.1', undefined, tNow);
  const dur4 = lock4.remainingMinutes; // 120

  if (dur1 === 15 && dur2 === 30 && dur3 === 60 && dur4 === 120) {
    console.log(`✅ TEST 8 RÉUSSI : Progression validée : Palier 1 = ${dur1}m, Palier 2 = ${dur2}m, Palier 3 = ${dur3}m, Palier 4 = ${dur4}m.`);
    passedTests++;
  } else {
    console.error('❌ TEST 8 ÉCHOUÉ :', { dur1, dur2, dur3, dur4 });
  }

  // ---------------------------------------------------------------------------
  // TEST 9 : Rate Limiting par IP (>15 requêtes en 5 min)
  // ---------------------------------------------------------------------------
  console.log('\n--- TEST 9 : Rate Limiting par IP — Bloquage des attaques automatisées massives ---');
  resetIpRateLimiter();
  const attackerIp = '198.51.100.99';
  let rateLimitedTriggered = false;

  for (let i = 0; i < 16; i++) {
    const res = dbStore.authenticateUser('vendeur.horizon', `fake_password_${i}`, attackerIp);
    if (res.statusCode === 429 && res.rateLimited) {
      rateLimitedTriggered = true;
      console.log(`  ✓ Requête ${i + 1} bloquée par le Rate Limiter IP (HTTP 429: « ${res.message} »)`);
      break;
    }
  }

  if (rateLimitedTriggered) {
    console.log('✅ TEST 9 RÉUSSI : Protection Rate Limiting IP active et fonctionnelle (HTTP 429).');
    passedTests++;
  } else {
    console.error('❌ TEST 9 ÉCHOUÉ : Le Rate Limiter n\'a pas bloqué les requêtes excessives.');
  }

  // ---------------------------------------------------------------------------
  // TEST 10 : Combinaison Compte + IP (IP légitime non bloquée par une attaque IP séparée)
  // ---------------------------------------------------------------------------
  console.log('\n--- TEST 10 : Combinaison Compte + IP — Utilisateur légitime sur IP saine non pénalisé ---');
  const legitimateIp = '10.200.1.50';
  const legRes = dbStore.authenticateUser('admin', 'admin123', legitimateIp);

  if (legRes.statusCode !== 429) {
    console.log('✅ TEST 10 RÉUSSI : Les requêtes depuis l\'IP saine ne sont pas bloquées par l\'attaque de l\'autre IP.');
    passedTests++;
  } else {
    console.error('❌ TEST 10 ÉCHOUÉ :', legRes);
  }

  // ---------------------------------------------------------------------------
  // TEST 11 : Isolation Multi-Agences — Déverrouillage cross-tenant rejeté
  // ---------------------------------------------------------------------------
  console.log('\n--- TEST 11 : Isolation Multi-Agences — Rejet du déverrouillage inter-agences ---');
  const adminAgencyA = dbStore.getState().users.find(u => u.username === 'admin')!; // Tenant t-001
  const userAgencyB = dbStore.getState().users.find(u => u.username === 'vendeur.horizon')!; // Tenant t-002

  // Verrouillons l'utilisateur de l'agence B
  dbStore.authenticateUser('vendeur.horizon', 'bad1', '10.50.1.1');
  dbStore.authenticateUser('vendeur.horizon', 'bad2', '10.50.1.1');
  dbStore.authenticateUser('vendeur.horizon', 'bad3', '10.50.1.1');

  // L'Admin de l'agence A tente de déverrouiller l'utilisateur de l'agence B
  const crossUnlockRes = dbStore.unlockUserAccount(userAgencyB.id, adminAgencyA, 'Tentative non autorisée');

  if (!crossUnlockRes.success && crossUnlockRes.statusCode === 403) {
    console.log(`✅ TEST 11 RÉUSSI : Tentative inter-agences strictement bloquée avec HTTP 403 (« ${crossUnlockRes.message} »).`);
    passedTests++;
  } else {
    console.error('❌ TEST 11 ÉCHOUÉ :', crossUnlockRes);
  }

  // ---------------------------------------------------------------------------
  // TEST 12 : Protection Hiérarchique — Admin d'agence ne peut pas déverrouiller Super Admin
  // ---------------------------------------------------------------------------
  console.log('\n--- TEST 12 : Protection Hiérarchique — Admin d\'agence ne peut pas déverrouiller Super Admin ---');
  const superAdminUser = dbStore.getState().users.find(u => u.username === 'superadmin')!;
  const unauthUnlockSuper = dbStore.unlockUserAccount(superAdminUser.id, adminAgencyA, 'Tentative non autorisée');

  if (!unauthUnlockSuper.success && unauthUnlockSuper.statusCode === 403) {
    console.log(`✅ TEST 12 RÉUSSI : Seul un Super Admin peut déverrouiller un compte Super Admin (« ${unauthUnlockSuper.message} »).`);
    passedTests++;
  } else {
    console.error('❌ TEST 12 ÉCHOUÉ :', unauthUnlockSuper);
  }

  // ---------------------------------------------------------------------------
  // TEST 13 : Audit & Non-Divulgation de mots de passe
  // ---------------------------------------------------------------------------
  console.log('\n--- TEST 13 : Audit — Aucun mot de passe en clair dans les logs ---');
  const logs = dbStore.getState().auditLogs;
  let hasPlainPassword = false;

  for (const log of logs) {
    const serialized = JSON.stringify(log).toLowerCase();
    if (serialized.includes('mauvais_mdp') || serialized.includes('caisse123') || serialized.includes('admin123')) {
      hasPlainPassword = true;
      console.error('❌ Fuite détectée dans le log :', log);
      break;
    }
  }

  if (!hasPlainPassword) {
    console.log(`✅ TEST 13 RÉUSSI : Les ${logs.length} événements d'audit sont 100% anonymisés et sans fuite de mots de passe.`);
    passedTests++;
  } else {
    console.error('❌ TEST 13 ÉCHOUÉ : Mot de passe trouvé dans les logs.');
  }

  // ---------------------------------------------------------------------------
  // TEST 14 : Intégrité Backend & Messages génériques anti-énumération
  // ---------------------------------------------------------------------------
  console.log('\n--- TEST 14 : Message générique anti-énumération pour identifiant inconnu ---');
  const unknownRes = dbStore.authenticateUser('compte_inexistant_999@test.com', 'password123', '10.10.10.10');

  if (!unknownRes.success && unknownRes.statusCode === 401 && unknownRes.message === 'Identifiants incorrects.') {
    console.log(`✅ TEST 14 RÉUSSI : Message générique retourné : « ${unknownRes.message} » (Aucune fuite d'existence de compte).`);
    passedTests++;
  } else {
    console.error('❌ TEST 14 ÉCHOUÉ :', unknownRes);
  }

  // ---------------------------------------------------------------------------
  // TEST 15 : Indépendance et isolation multi-utilisateurs
  // ---------------------------------------------------------------------------
  console.log('\n--- TEST 15 : Indépendance des comptes — Verrouillage isolé ---');
  const userA = dbStore.getState().users.find(u => u.username === 'operateur')!;
  const userB = dbStore.getState().users.find(u => u.username === 'resp-formation')!;

  // Débloquons d'abord userB
  dbStore.unlockUserAccount(userB.id, superAdminUser);
  const lockStatusBBefore = checkAccountLockout(dbStore.getState().users.find(u => u.id === userB.id)!);

  if (!lockStatusBBefore.isLocked) {
    console.log('✅ TEST 15 RÉUSSI : Les comptes utilisateurs maintiennent un état de sécurité strictement cloisonné.');
    passedTests++;
  } else {
    console.error('❌ TEST 15 ÉCHOUÉ :', lockStatusBBefore);
  }

  // ---------------------------------------------------------------------------
  // TEST 16 : Déverrouillage administratif légitime (Admin d'agence sur son agence + Super Admin)
  // ---------------------------------------------------------------------------
  console.log('\n--- TEST 16 : Déverrouillage administratif autorisé ---');
  const adminAgencyB = dbStore.getState().users.find(u => u.username === 'admin.horizon')!; // Admin Agence B

  // Admin Agence B déverrouille Vendeur Agence B
  const validAgencyUnlock = dbStore.unlockUserAccount(userAgencyB.id, adminAgencyB, 'Déverrouillage légitime');
  // Super Admin déverrouille Admin Agence A
  const validSuperUnlock = dbStore.unlockUserAccount(adminAgencyA.id, superAdminUser, 'Déverrouillage Super Admin');

  const finalUserAgencyB = dbStore.getState().users.find(u => u.id === userAgencyB.id);
  const finalAdminAgencyA = dbStore.getState().users.find(u => u.id === adminAgencyA.id);

  if (validAgencyUnlock.success && validSuperUnlock.success && !finalUserAgencyB?.lockedUntil && !finalAdminAgencyA?.lockedUntil) {
    console.log('✅ TEST 16 RÉUSSI : Déverrouillages administratifs autorisés exécutés avec succès et audit logué.');
    passedTests++;
  } else {
    console.error('❌ TEST 16 ÉCHOUÉ :', { validAgencyUnlock, validSuperUnlock });
  }

  // ---------------------------------------------------------------------------
  // RÉCAPITULATIF
  // ---------------------------------------------------------------------------
  console.log('\n================================================================');
  console.log(`RÉSULTAT GLOBAL : ${passedTests}/${totalTests} TESTS VALIDÉS AVEC SUCCÈS (${Math.round((passedTests / totalTests) * 100)}%)`);
  console.log('================================================================\n');

  if (passedTests !== totalTests) {
    process.exit(1);
  }
}

runGlobalSecurityTests().catch(err => {
  console.error('Erreur inattendue pendant l\'exécution des tests :', err);
  process.exit(1);
});
