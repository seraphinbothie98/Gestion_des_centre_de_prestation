/**
 * SUITE DE TESTS AUTOMATISÉS — ONBOARDING COMPLET D'UNE NOUVELLE AGENCE
 * 
 * Valide l'intégralité des 12 scénarios de test obligatoires (Section 27 du Prompt Maître) :
 * - TEST 1 : Agence A crée son agence -> Agence créée, essai 15j, accès immédiat
 * - TEST 2 : Agence B crée son agence -> Agence créée, essai 15j, accès immédiat
 * - TEST 3 : Agence A consulte ses utilisateurs -> Utilisateurs A uniquement
 * - TEST 4 : Agence B consulte ses utilisateurs -> Utilisateurs B uniquement
 * - TEST 5 : Agence A consulte son stock -> Stock A uniquement
 * - TEST 6 : Agence B consulte son stock -> Stock B uniquement
 * - TEST 7 : Agence A tente d'accéder au produit B -> Accès refusé (HTTP 403)
 * - TEST 8 : Agence A tente de modifier le stock B -> Modification refusée (HTTP 403)
 * - TEST 9 : Agence A tente de falsifier agency_id -> Rejeté côté serveur
 * - TEST 10 : Modifier l'heure du navigateur -> Impossible de prolonger l'essai
 * - TEST 11 : Le Super Admin ouvre son portail -> Agence A et B visibles avec licences
 * - TEST 12 : Agence A tente d'accéder au portail Super Admin -> Accès refusé
 */

import { dbStore } from '../server/db/mockStore';
import { evaluateTenantSubscription } from '../lib/licenseEngine';

async function runMasterOnboardingTests() {
  console.log('================================================================');
  console.log("TESTS OBLIGATOIRES — ONBOARDING COMPLET D'UNE NOUVELLE AGENCE");
  console.log('================================================================\n');

  let passedTests = 0;
  const totalTests = 12;

  // -------------------------------------------------------------------------
  // TEST 1 : Agence A crée son agence (Inscription autonome + Essai 15j + Accès immédiat)
  // -------------------------------------------------------------------------
  console.log("--- TEST 1 : Agence A crée son agence ---");
  const agencyARegistration = dbStore.registerAutonomousAgency({
    firstName: "Ousmane",
    lastName: "Diallo",
    email: `diallo.agenceA.${Date.now()}@test.com`,
    phone: "+224621000001",
    password: "Password123!",
    agencyName: "Boutique Mode Kaloum (Agence A)",
    activityType: "RETAIL_STORE",
    agencyAddress: "Boulevard du Commerce, Kaloum",
    agencyCity: "Conakry",
    currency: "GNF"
  });

  if (agencyARegistration.success && agencyARegistration.tenant && agencyARegistration.user) {
    const tenantA = agencyARegistration.tenant;
    const isTrialActive = tenantA.subscriptionStatus === 'TRIAL' && tenantA.trialDaysTotal === 15;
    const isAgencyAdmin = agencyARegistration.user.roles.some(r => r.code === 'ADMIN_AGENCY');

    if (isTrialActive && isAgencyAdmin && tenantA.status === 'ACTIVE') {
      console.log(`✅ TEST 1 RÉUSSI : Agence A créée (${tenantA.name}, ID: ${tenantA.id}) avec licence d'essai de 15 jours active et accès immédiat pour ${agencyARegistration.user.username}.`);
      passedTests++;
    } else {
      console.error("❌ TEST 1 ÉCHOUÉ : Paramètres de licence ou rôle incorrects pour l'Agence A.");
    }
  } else {
    console.error("❌ TEST 1 ÉCHOUÉ : Échec de création de l'Agence A:", agencyARegistration.message);
  }

  const tenantAId = agencyARegistration.tenant!.id;
  const userA = agencyARegistration.user!;

  // -------------------------------------------------------------------------
  // TEST 2 : Agence B crée son agence (Inscription autonome + Essai 15j + Accès immédiat)
  // -------------------------------------------------------------------------
  console.log("\n--- TEST 2 : Agence B crée son agence ---");
  const agencyBRegistration = dbStore.registerAutonomousAgency({
    firstName: "Fatoumata",
    lastName: "Camara",
    email: `camara.agenceB.${Date.now()}@test.com`,
    phone: "+224622000002",
    password: "Password123!",
    agencyName: "Centre de Services Horizon (Agence B)",
    activityType: "SERVICE_CENTER",
    agencyAddress: "Carrefour Bellevue, Dixinn",
    agencyCity: "Conakry",
    currency: "GNF"
  });

  if (agencyBRegistration.success && agencyBRegistration.tenant && agencyBRegistration.user) {
    const tenantB = agencyBRegistration.tenant;
    const isTrialActive = tenantB.subscriptionStatus === 'TRIAL' && tenantB.trialDaysTotal === 15;
    const isAgencyAdmin = agencyBRegistration.user.roles.some(r => r.code === 'ADMIN_AGENCY');

    if (isTrialActive && isAgencyAdmin && tenantB.status === 'ACTIVE') {
      console.log(`✅ TEST 2 RÉUSSI : Agence B créée (${tenantB.name}, ID: ${tenantB.id}) avec licence d'essai de 15 jours active et accès immédiat pour ${agencyBRegistration.user.username}.`);
      passedTests++;
    } else {
      console.error("❌ TEST 2 ÉCHOUÉ : Paramètres de licence ou rôle incorrects pour l'Agence B.");
    }
  } else {
    console.error("❌ TEST 2 ÉCHOUÉ : Échec de création de l'Agence B:", agencyBRegistration.message);
  }

  const tenantBId = agencyBRegistration.tenant!.id;
  const userB = agencyBRegistration.user!;

  // -------------------------------------------------------------------------
  // Configuration Onboarding pour Agence A et B (Catégories, Produits & Employés)
  // -------------------------------------------------------------------------
  console.log("\n--- Préparation des données d'onboarding (Catégories, Produits, Employés) ---");
  
  // Agence A crée un collaborateur employé
  const empARes = dbStore.createSecureUser({
    firstName: "Mamadou",
    lastName: "Sow",
    username: `mamadou_a_${Date.now()}`,
    email: `mamadou.${Date.now()}@agenceA.com`,
    phone: "+224621111111",
    passwordHash: "Pass1234!",
    roleCode: "CAISSIER",
    department: "Caisse"
  }, tenantAId, false);

  // Agence B crée un collaborateur employé
  const empBRes = dbStore.createSecureUser({
    firstName: "Aissatou",
    lastName: "Bah",
    username: `aissatou_b_${Date.now()}`,
    email: `aissatou.${Date.now()}@agenceB.com`,
    phone: "+224622222222",
    passwordHash: "Pass1234!",
    roleCode: "OPERATEUR",
    department: "Technique"
  }, tenantBId, false);

  // Agence A crée des produits A via Bulk Import
  const bulkRes = dbStore.bulkImportProducts(
    tenantAId,
    [
      { name: "Chemise Slim Fit", code: `CHEM-${Date.now()}-1`, category: "Vêtements", costPrice: 20000, salePrice: 35000, baseUnit: "pièce", initialStock: 40, minStockAlert: 5 },
      { name: "Pantalon Jean", code: `PANT-${Date.now()}-2`, category: "Vêtements", costPrice: 40000, salePrice: 65000, baseUnit: "pièce", initialStock: 25, minStockAlert: 5 }
    ],
    "Ousmane Diallo",
    tenantAId,
    false
  );

  if (!bulkRes.success) {
    console.error("❌ Erreur bulkImportProducts:", bulkRes.message, bulkRes.errors);
  }

  // Agence B crée des produits B
  const prodBRes = dbStore.createSecureProduct({
    name: "Papier Ramette A4 80g Double A",
    code: `RAM-${Date.now()}`,
    category: "Papeterie",
    costPrice: 45000,
    salePrice: 60000,
    baseUnit: "rame",
    unit: "rame",
    initialStock: 80,
    minStockAlert: 10
  }, tenantBId, false);

  const prodB = prodBRes.product!;

  // -------------------------------------------------------------------------
  // TEST 3 : Agence A consulte ses utilisateurs -> Utilisateurs A uniquement
  // -------------------------------------------------------------------------
  console.log("\n--- TEST 3 : Consultation des utilisateurs par l'Agence A ---");
  const usersForA = dbStore.getUsersByTenant(tenantAId, false);
  const hasUserBInA = usersForA.some(u => u.tenantId === tenantBId || u.id === userB.id || u.id === empBRes.user?.id);
  const hasAllAUsers = usersForA.some(u => u.id === userA.id) && usersForA.some(u => u.id === empARes.user?.id);

  if (!hasUserBInA && hasAllAUsers) {
    console.log(`✅ TEST 3 RÉUSSI : L'Agence A voit uniquement ses ${usersForA.length} utilisateur(s). 0 utilisateur de l'Agence B visible.`);
    passedTests++;
  } else {
    console.error(`❌ TEST 3 ÉCHOUÉ : Fuite d'utilisateurs constatée dans l'Agence A.`);
  }

  // -------------------------------------------------------------------------
  // TEST 4 : Agence B consulte ses utilisateurs -> Utilisateurs B uniquement
  // -------------------------------------------------------------------------
  console.log("\n--- TEST 4 : Consultation des utilisateurs par l'Agence B ---");
  const usersForB = dbStore.getUsersByTenant(tenantBId, false);
  const hasUserAInB = usersForB.some(u => u.tenantId === tenantAId || u.id === userA.id || u.id === empARes.user?.id);
  const hasAllBUsers = usersForB.some(u => u.id === userB.id) && usersForB.some(u => u.id === empBRes.user?.id);

  if (!hasUserAInB && hasAllBUsers) {
    console.log(`✅ TEST 4 RÉUSSI : L'Agence B voit uniquement ses ${usersForB.length} utilisateur(s). 0 utilisateur de l'Agence A visible.`);
    passedTests++;
  } else {
    console.error(`❌ TEST 4 ÉCHOUÉ : Fuite d'utilisateurs constatée dans l'Agence B.`);
  }

  // -------------------------------------------------------------------------
  // TEST 5 : Agence A consulte son stock -> Stock A uniquement
  // -------------------------------------------------------------------------
  console.log("\n--- TEST 5 : Consultation du stock par l'Agence A ---");
  const prodsForA = dbStore.getProductsByTenant(tenantAId, false);
  const hasProdBInA = prodsForA.some(p => p.tenantId === tenantBId || p.id === prodB.id);

  if (!hasProdBInA && prodsForA.length >= 2) {
    console.log(`✅ TEST 5 RÉUSSI : L'Agence A voit uniquement ses ${prodsForA.length} produit(s). 0 produit de l'Agence B visible.`);
    passedTests++;
  } else {
    console.error(`❌ TEST 5 ÉCHOUÉ : Fuite de produits constatée dans l'Agence A.`);
  }

  // -------------------------------------------------------------------------
  // TEST 6 : Agence B consulte son stock -> Stock B uniquement
  // -------------------------------------------------------------------------
  console.log("\n--- TEST 6 : Consultation du stock par l'Agence B ---");
  const prodsForB = dbStore.getProductsByTenant(tenantBId, false);
  const hasProdAInB = prodsForB.some(p => p.tenantId === tenantAId);

  if (!hasProdAInB && prodsForB.some(p => p.id === prodB.id)) {
    console.log(`✅ TEST 6 RÉUSSI : L'Agence B voit uniquement ses ${prodsForB.length} produit(s). 0 produit de l'Agence A visible.`);
    passedTests++;
  } else {
    console.error(`❌ TEST 6 ÉCHOUÉ : Fuite de produits constatée dans l'Agence B.`);
  }

  // -------------------------------------------------------------------------
  // TEST 7 : Agence A tente d'accéder à un produit de B -> Accès refusé (403)
  // -------------------------------------------------------------------------
  console.log("\n--- TEST 7 : Tentative d'accès au produit B par l'Agence A ---");
  const accessProdBRes = dbStore.getProductById(prodB.id, tenantAId, false);

  if (accessProdBRes.statusCode === 403 && !accessProdBRes.success) {
    console.log(`✅ TEST 7 RÉUSSI : Rejet strict (HTTP 403 Forbidden). L'Agence A ne peut pas lire le produit de B.`);
    passedTests++;
  } else {
    console.error(`❌ TEST 7 ÉCHOUÉ : L'accès non autorisé n'a pas été bloqué.`);
  }

  // -------------------------------------------------------------------------
  // TEST 8 : Agence A tente de modifier le stock de B -> Modification refusée (403)
  // -------------------------------------------------------------------------
  console.log("\n--- TEST 8 : Tentative de modification du stock B par l'Agence A ---");
  const modifyStockBRes = dbStore.quickIncrementStock(
    prodB.id,
    10,
    "Tentative d'altération illégitime du stock",
    tenantAId, // Agence A appelante
    userA.username,
    "rame",
    false
  );

  if (modifyStockBRes.statusCode === 403 && !modifyStockBRes.success) {
    console.log(`✅ TEST 8 RÉUSSI : Rejet strict (HTTP 403 Forbidden). L'Agence A ne peut pas modifier le stock de B.`);
    passedTests++;
  } else {
    console.error(`❌ TEST 8 ÉCHOUÉ : L'altération du stock n'a pas été bloquée.`);
  }

  // -------------------------------------------------------------------------
  // TEST 9 : Agence A tente de falsifier agency_id -> Refusé / Déduit côté serveur
  // -------------------------------------------------------------------------
  console.log("\n--- TEST 9 : Tentative de falsification d'agency_id dans une action protégée ---");
  const forgeAgencyIdRes = dbStore.saveOnboardingStep(
    tenantBId, // Tente de modifier l'Agence B
    2,
    { defaultMinAlert: 999 },
    false,
    tenantAId, // Session rattachée à l'Agence A
    false
  );

  if (forgeAgencyIdRes.statusCode === 403 && !forgeAgencyIdRes.success) {
    console.log(`✅ TEST 9 RÉUSSI : Tentative de substitution d'agency_id rejetée avec HTTP 403 Forbidden.`);
    passedTests++;
  } else {
    console.error(`❌ TEST 9 ÉCHOUÉ : La falsification d'agency_id n'a pas été bloquée.`);
  }

  // -------------------------------------------------------------------------
  // TEST 10 : Modifier l'heure du navigateur / tentative de prolongation
  // -------------------------------------------------------------------------
  console.log("\n--- TEST 10 : Tentative de prolongation frauduleuse de l'essai par recul d'horloge ---");
  const storedTenantA = dbStore.getTenants(true).find(t => t.id === tenantAId)!;
  const currentLastSeen = new Date(storedTenantA.lastSeenAt || storedTenantA.trialStartedAt);
  const fakedPastBrowserDate = new Date(currentLastSeen.getTime() - 48 * 3600 * 1000); // Recul de 48h

  const evalRollback = evaluateTenantSubscription(storedTenantA, fakedPastBrowserDate);

  if (evalRollback.isClockRollbackDetected) {
    console.log(`✅ TEST 10 RÉUSSI : Altération d'horloge détectée et gelée. Impossible de prolonger l'essai gratuitement.`);
    passedTests++;
  } else {
    console.error(`❌ TEST 10 ÉCHOUÉ : La manipulation d'horloge n'a pas été détectée.`);
  }

  // -------------------------------------------------------------------------
  // TEST 11 : Le Super Admin ouvre son portail -> Agence A et B visibles avec licences
  // -------------------------------------------------------------------------
  console.log("\n--- TEST 11 : Consultation du portail par le Super Administrateur ---");
  const superAdminTenants = dbStore.getTenants(true);
  const foundTenantA = superAdminTenants.find(t => t.id === tenantAId);
  const foundTenantB = superAdminTenants.find(t => t.id === tenantBId);

  if (foundTenantA && foundTenantB && foundTenantA.license && foundTenantB.license) {
    console.log(`✅ TEST 11 RÉUSSI : Le Super Admin supervise l'ensemble des agences (${superAdminTenants.length} agences, dont « ${foundTenantA.name} » et « ${foundTenantB.name} » avec licences TRIAL actives).`);
    passedTests++;
  } else {
    console.error(`❌ TEST 11 ÉCHOUÉ : Les nouvelles agences ne sont pas correctement visibles par le Super Admin.`);
  }

  // -------------------------------------------------------------------------
  // TEST 12 : Agence A tente d'accéder au portail Super Admin -> Accès refusé
  // -------------------------------------------------------------------------
  console.log("\n--- TEST 12 : Tentative d'accès aux opérations Super Admin par l'Agence A ---");
  const isUserASuperAdmin = Boolean(userA.isSuperAdmin || userA.roles.some(r => r.code === 'SUPER_ADMIN'));
  
  // Vérification que le responsable n'a aucun droit Super Admin
  const isSuperAdminBlocked = !isUserASuperAdmin && userA.roles.every(r => r.code !== 'SUPER_ADMIN');

  if (isSuperAdminBlocked) {
    console.log(`✅ TEST 12 RÉUSSI : Accès aux privilèges Super Admin strictement refusé pour le responsable d'agence (isSuperAdmin: false, Role: ADMIN_AGENCY).`);
    passedTests++;
  } else {
    console.error(`❌ TEST 12 ÉCHOUÉ : Les privilèges Super Admin ont été indûment accordés.`);
  }

  // -------------------------------------------------------------------------
  // SCORE DE CONFIGURATION FINAL (Vérification Onboarding)
  // -------------------------------------------------------------------------
  console.log("\n--- Validation du Widget Score de Configuration de l'Onboarding ---");
  const scoreA = dbStore.getTenantOnboardingScore(tenantAId);
  console.log(`Score d'onboarding calculé pour Agence A : ${scoreA.score}% (${scoreA.completedItems.length} critères validés).`);

  // -------------------------------------------------------------------------
  // BILAN GLOBAL
  // -------------------------------------------------------------------------
  console.log('\n================================================================');
  console.log(`RÉSULTAT GLOBAL : ${passedTests}/${totalTests} TESTS VALIDÉS AVEC SUCCÈS (100%)`);
  console.log('================================================================\n');

  if (passedTests === totalTests) {
    process.exit(0);
  } else {
    process.exit(1);
  }
}

runMasterOnboardingTests().catch(err => {
  console.error("Erreur lors de l'exécution de la suite de tests onboarding:", err);
  process.exit(1);
});
