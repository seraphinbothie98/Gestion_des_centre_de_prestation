import { dbStore } from '../server/db/mockStore';

console.log('====================================================================');
console.log('TEST SUITE : ISOLATION STRICTE DES DONNÉES PAR AGENCE');
console.log('ESPACE DU SUPER ADMINISTRATEUR (MULTI-AGENCES)');
console.log('====================================================================\n');

const state = dbStore.getState();
const agencyA_id = 't-001';
const agencyB_id = 't-002';

const agencyA = state.tenants.find(t => t.id === agencyA_id);
const agencyB = state.tenants.find(t => t.id === agencyB_id);

console.log(`🏢 Agence A : "${agencyA?.name}" (ID: ${agencyA_id})`);
console.log(`🏪 Agence B : "${agencyB?.name}" (ID: ${agencyB_id})\n`);

// -----------------------------------------------------------------------------
// TEST 1 — COMPTES FINANCIERS
// -----------------------------------------------------------------------------
console.log('--- TEST 1 : ISOLATION DES COMPTES FINANCIERS ---');

const accountsA = dbStore.getFinancialAccounts(agencyA_id);
const accountsB = dbStore.getFinancialAccounts(agencyB_id);
const accountsAll = dbStore.getFinancialAccounts('ALL');

console.log(`Comptes Agence A (t-001) : ${accountsA.length} comptes`);
accountsA.forEach(a => console.log(`  - [${a.code}] ${a.name} (Tenant: ${a.tenantId})`));

console.log(`Comptes Agence B (t-002) : ${accountsB.length} comptes`);
accountsB.forEach(a => console.log(`  - [${a.code}] ${a.name} (Tenant: ${a.tenantId})`));

console.log(`Comptes Vue Consolidée (ALL) : ${accountsAll.length} comptes`);

const test1Passed =
  accountsA.length === 5 &&
  accountsA.every(a => a.tenantId === agencyA_id) &&
  accountsB.length === 4 &&
  accountsB.every(a => a.tenantId === agencyB_id) &&
  accountsAll.length === 9;

if (test1Passed) {
  console.log('✅ TEST 1 RÉUSSI : Les comptes financiers sont strictement isolés (5 pour Agence A, 4 pour Agence B, 9 en consolidé).\n');
} else {
  console.error('❌ TEST 1 ÉCHOUÉ : Mauvais nombre de comptes ou fuite inter-agences !');
  process.exit(1);
}

// -----------------------------------------------------------------------------
// TEST 2 — UTILISATEURS & POSTES
// -----------------------------------------------------------------------------
console.log('--- TEST 2 : ISOLATION DES UTILISATEURS & POSTES ---');

const usersA = dbStore.getUsersByTenant(agencyA_id);
const usersB = dbStore.getUsersByTenant(agencyB_id);
const usersAll = dbStore.getUsersByTenant('ALL');

console.log(`Utilisateurs Agence A : ${usersA.length} utilisateurs`);
usersA.forEach(u => console.log(`  - ${u.firstName} ${u.lastName} (@${u.username}) (Tenant: ${u.tenantId})`));

console.log(`Utilisateurs Agence B : ${usersB.length} utilisateurs`);
usersB.forEach(u => console.log(`  - ${u.firstName} ${u.lastName} (@${u.username}) (Tenant: ${u.tenantId})`));

const test2Passed =
  usersA.every(u => u.tenantId === agencyA_id) &&
  usersB.every(u => u.tenantId === agencyB_id) &&
  usersA.length > 0 &&
  usersB.length > 0;

if (test2Passed) {
  console.log('✅ TEST 2 RÉUSSI : Les utilisateurs de l\'Agence A et B ne sont jamais mélangés.\n');
} else {
  console.error('❌ TEST 2 ÉCHOUÉ : Fuite d\'utilisateurs entre agences !');
  process.exit(1);
}

// -----------------------------------------------------------------------------
// TEST 3 — EXERCICES & PÉRIODES FINANCIÈRES
// -----------------------------------------------------------------------------
console.log('--- TEST 3 : ISOLATION DES EXERCICES & PÉRIODES FINANCIÈRES ---');

const yearsA = dbStore.getFinancialYears(agencyA_id);
const yearsB = dbStore.getFinancialYears(agencyB_id);

console.log(`Exercices Agence A : ${yearsA.length}`);
yearsA.forEach(y => console.log(`  - [${y.code}] ${y.name} (Tenant: ${y.tenantId})`));

console.log(`Exercices Agence B : ${yearsB.length}`);
yearsB.forEach(y => console.log(`  - [${y.code}] ${y.name} (Tenant: ${y.tenantId})`));

const test3Passed =
  yearsA.every(y => y.tenantId === agencyA_id) &&
  yearsB.every(y => y.tenantId === agencyB_id);

if (test3Passed) {
  console.log('✅ TEST 3 RÉUSSI : Les exercices financiers sont strictement rattachés à leur agence respective.\n');
} else {
  console.error('❌ TEST 3 ÉCHOUÉ : Exercices mélangés !');
  process.exit(1);
}

// -----------------------------------------------------------------------------
// TEST 4 — FOURNISSEURS & DETTES FOURNISSEURS
// -----------------------------------------------------------------------------
console.log('--- TEST 4 : ISOLATION DES DETTES FOURNISSEURS ---');

const debtsA = dbStore.getSupplierDebts(agencyA_id);
const debtsB = dbStore.getSupplierDebts(agencyB_id);

console.log(`Dettes Fournisseurs Agence A : ${debtsA.length}`);
console.log(`Dettes Fournisseurs Agence B : ${debtsB.length}`);

const test4Passed =
  debtsA.every(d => d.tenantId === agencyA_id) &&
  debtsB.every(d => d.tenantId === agencyB_id);

if (test4Passed) {
  console.log('✅ TEST 4 RÉUSSI : Dettes et paiements fournisseurs strictement isolés par agence.\n');
} else {
  console.error('❌ TEST 4 ÉCHOUÉ : Dettes fournisseurs mélangées !');
  process.exit(1);
}

// -----------------------------------------------------------------------------
// TEST 5 — SÉCURITÉ CROSS-TENANT (ANTI-IDOR)
// -----------------------------------------------------------------------------
console.log('--- TEST 5 : SÉCURITÉ ANTI-IDOR ET CONTRÔLE D\'ACCÈS ---');

const targetUserA = usersA[0];
const crossAccessAttempt = dbStore.getUserById(targetUserA.id, agencyB_id, false);

console.log(`Tentative d'accès depuis Agence B à l'utilisateur de l'Agence A (${targetUserA.username}) : StatusCode = ${crossAccessAttempt.statusCode}`);

if (crossAccessAttempt.statusCode === 403 && !crossAccessAttempt.success) {
  console.log('✅ TEST 5 RÉUSSI : Accès refusé (403) pour tentative d\'accès cross-tenant par un utilisateur non-autorisé.\n');
} else {
  console.error('❌ TEST 5 ÉCHOUÉ : Faille IDOR détectée !');
  process.exit(1);
}

console.log('====================================================================');
console.log('🎉 TOUS LES TESTS D\'ISOLATION MULTI-AGENCES ONT RÉUSSI AVEC SUCCÈS !');
console.log('====================================================================');
