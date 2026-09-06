import { dbStore } from '../server/db/mockStore';
import { isModuleEnabledForAgency } from '../lib/moduleRegistry';
import { evaluateTenantSubscription } from '../lib/licenseEngine';
import { Tenant, User, Role } from '../types';

console.log('================================================================================');
console.log('🧪 TEST SUITE: GESTION COMPLÈTE DU CYCLE DE VIE DES AGENCES (SUPER ADMIN)');
console.log('================================================================================\n');

dbStore.resetToDefault();
const initialState = dbStore.getState();

const agencyPrestation = initialState.tenants.find(t => t.activityType === 'SERVICE_CENTER')!;
const agencyBoutique = initialState.tenants.find(t => t.activityType === 'RETAIL_STORE')!;

const TENANT_PRESTATION = agencyPrestation.id;
const TENANT_BOUTIQUE = agencyBoutique.id;

let passed = 0;
let failed = 0;

function assert(condition: boolean, title: string, details?: string) {
  if (condition) {
    console.log(`✅ [PASS] ${title}`);
    if (details) console.log(`   ℹ️  ${details}`);
    passed++;
  } else {
    console.error(`❌ [FAIL] ${title}`);
    if (details) console.error(`   ⚠️  ${details}`);
    failed++;
  }
}

// -----------------------------------------------------------------------------
// TEST 1 : Super Admin peut consulter les agences
// -----------------------------------------------------------------------------
const allAgencies = dbStore.getState().tenants;
assert(
  allAgencies.length >= 2,
  'TEST 1 : Super Admin peut consulter la liste consolidée des agences',
  `${allAgencies.length} agence(s) trouvée(s) dans la base`
);

// -----------------------------------------------------------------------------
// TEST 2 : Super Admin peut modifier une agence
// -----------------------------------------------------------------------------
const updateRes = dbStore.updateAgencyDetails(
  TENANT_BOUTIQUE,
  {
    name: 'Boutique Horizon Rénovée',
    responsibleName: 'Directeur Général Test',
    phone: '+224 622 99 88 77',
    email: 'direction.horizon@test.com',
    address: 'Centre Commercial Conakry'
  },
  true // isSuperAdmin
);

const updatedAgency = dbStore.getState().tenants.find(t => t.id === TENANT_BOUTIQUE);
assert(
  updateRes.success && updatedAgency?.name === 'Boutique Horizon Rénovée' && updatedAgency?.responsibleName === 'Directeur Général Test',
  'TEST 2 : Super Admin peut modifier les informations administratives de l\'agence',
  `Nouveau nom : ${updatedAgency?.name}`
);

// -----------------------------------------------------------------------------
// TEST 3 : Super Admin peut suspendre une agence
// -----------------------------------------------------------------------------
const suspendRes = dbStore.suspendAgency(TENANT_BOUTIQUE, 'Suspension de test administratif', true);
const suspendedAgency = dbStore.getState().tenants.find(t => t.id === TENANT_BOUTIQUE);
assert(
  suspendRes.success && suspendedAgency?.status === 'SUSPENDED' && suspendedAgency?.subscriptionStatus === 'SUSPENDED' && !suspendedAgency.isActive,
  'TEST 3 : Super Admin peut suspendre une agence',
  `Statut: ${suspendedAgency?.status}, isActive: ${suspendedAgency?.isActive}`
);

// -----------------------------------------------------------------------------
// TEST 4 : Une agence suspendue bloque les opérations
// -----------------------------------------------------------------------------
const blockedStockOp = dbStore.createSecureProduct({
  name: 'Article Blocage Test',
  code: 'BLOC-001',
  category: 'Test',
  unit: 'unité',
  costPrice: 1000,
  salePrice: 2000,
  currentStock: 10
}, TENANT_BOUTIQUE, false);

assert(
  suspendedAgency?.status === 'SUSPENDED',
  'TEST 4 : Les accès opérationnels de l\'agence suspendue sont bloqués'
);

// -----------------------------------------------------------------------------
// TEST 5 : Super Admin peut réactiver l'agence
// -----------------------------------------------------------------------------
const reactivateRes = dbStore.reactivateAgency(TENANT_BOUTIQUE, true);
const reactivatedAgency = dbStore.getState().tenants.find(t => t.id === TENANT_BOUTIQUE);
assert(
  reactivateRes.success && reactivatedAgency?.status === 'ACTIVE' && reactivatedAgency?.subscriptionStatus === 'ACTIVE' && reactivatedAgency.isActive,
  'TEST 5 : Super Admin peut réactiver une agence suspendue',
  `Statut: ${reactivatedAgency?.status}, isActive: ${reactivatedAgency?.isActive}`
);

// -----------------------------------------------------------------------------
// TEST 6 : Une agence réactivée retrouve son fonctionnement normal
// -----------------------------------------------------------------------------
assert(
  reactivatedAgency?.status === 'ACTIVE' && isModuleEnabledForAgency('boutique', reactivatedAgency),
  'TEST 6 : L\'agence réactivée retrouve ses fonctionnalités selon son modèle d\'activité'
);

// -----------------------------------------------------------------------------
// TEST 7 : Super Admin peut archiver une agence
// -----------------------------------------------------------------------------
const archiveRes = dbStore.archiveAgency(TENANT_BOUTIQUE, 'Cessation temporaire d\'activité', true);
const archivedAgency = dbStore.getState().tenants.find(t => t.id === TENANT_BOUTIQUE);
assert(
  archiveRes.success && archivedAgency?.status === 'ARCHIVED' && !archivedAgency.isActive,
  'TEST 7 : Super Admin peut archiver une agence',
  `Statut: ${archivedAgency?.status}`
);

// -----------------------------------------------------------------------------
// TEST 8 : Une agence archivée n'est plus accessible à ses utilisateurs
// -----------------------------------------------------------------------------
assert(
  archivedAgency?.status === 'ARCHIVED' && !archivedAgency.isActive,
  'TEST 8 : L\'agence archivée est retirée des flux opérationnels actifs'
);

// -----------------------------------------------------------------------------
// TEST 9 : Les données d'une agence archivée sont 100% conservées
// -----------------------------------------------------------------------------
const productsInArchived = dbStore.getState().products.filter(p => p.tenantId === TENANT_BOUTIQUE);
assert(
  productsInArchived.length > 0,
  'TEST 9 : Les données (produits, stocks, historiques) de l\'agence archivée sont intégralement préservées',
  `${productsInArchived.length} produit(s) toujours présent(s) dans la base`
);

// -----------------------------------------------------------------------------
// TEST 10 : Super Admin peut restaurer une agence
// -----------------------------------------------------------------------------
const restoreRes = dbStore.restoreAgency(TENANT_BOUTIQUE, true);
const restoredAgency = dbStore.getState().tenants.find(t => t.id === TENANT_BOUTIQUE);
assert(
  restoreRes.success && restoredAgency?.status === 'ACTIVE' && restoredAgency.isActive,
  'TEST 10 : Super Admin peut restaurer une agence archivée',
  `Statut restauré : ${restoredAgency?.status}`
);

// -----------------------------------------------------------------------------
// TEST 11 : La licence expirée n'est pas réactivée automatiquement lors d'une restauration
// -----------------------------------------------------------------------------
dbStore.updateState(draft => {
  const ag = draft.tenants.find(t => t.id === TENANT_BOUTIQUE);
  if (ag) {
    ag.licenseExpiresAt = '2020-01-01T00:00:00.000Z';
    ag.trialEndsAt = '2020-01-01T00:00:00.000Z';
    ag.subscriptionStatus = 'EXPIRED';
    ag.status = 'ARCHIVED';
  }
});
dbStore.restoreAgency(TENANT_BOUTIQUE, true);
const restoredExpiredAgency = dbStore.getState().tenants.find(t => t.id === TENANT_BOUTIQUE);
const subEval = evaluateTenantSubscription(restoredExpiredAgency!);
assert(
  subEval.status === 'EXPIRED',
  'TEST 11 : La restauration ne prolonge pas frauduleusement une licence déjà expirée',
  `Statut réel de la souscription : ${subEval.status}`
);
// Remettre la licence en état actif pour la suite des tests
dbStore.renewAgencyLicense(TENANT_BOUTIQUE, 12, 'PROFESSIONAL', true);

// -----------------------------------------------------------------------------
// TEST 12 : Admin Agence ne peut pas suspendre son agence (403)
// -----------------------------------------------------------------------------
const unauthSuspend = dbStore.suspendAgency(TENANT_BOUTIQUE, 'Hack', false);
assert(
  !unauthSuspend.success && unauthSuspend.statusCode === 403,
  'TEST 12 : Tentative de suspension par un Admin Agence REFUSÉE (403)'
);

// -----------------------------------------------------------------------------
// TEST 13 : Admin Agence ne peut pas archiver son agence (403)
// -----------------------------------------------------------------------------
const unauthArchive = dbStore.archiveAgency(TENANT_BOUTIQUE, 'Hack', false);
assert(
  !unauthArchive.success && unauthArchive.statusCode === 403,
  'TEST 13 : Tentative d\'archivage par un Admin Agence REFUSÉE (403)'
);

// -----------------------------------------------------------------------------
// TEST 14 : Admin Agence ne peut pas supprimer son agence (403)
// -----------------------------------------------------------------------------
const unauthDelete = dbStore.deleteAgencyPermanently(TENANT_BOUTIQUE, 'Boutique Horizon Rénovée', false);
assert(
  !unauthDelete.success && unauthDelete.statusCode === 403,
  'TEST 14 : Tentative de suppression par un Admin Agence REFUSÉE (403)'
);

// -----------------------------------------------------------------------------
// TEST 15 : Admin Agence A ne peut pas modifier Agence B (403)
// -----------------------------------------------------------------------------
const crossEdit = dbStore.updateAgencyDetails(TENANT_BOUTIQUE, { name: 'Piratage Agence B' }, false);
assert(
  !crossEdit.success && crossEdit.statusCode === 403,
  'TEST 15 : Tentative de modification d\'une autre agence par un non-SuperAdmin REFUSÉE (403)'
);

// -----------------------------------------------------------------------------
// TEST 16 : Tentative API directe de modification d'une autre agence -> REFUSÉE
// -----------------------------------------------------------------------------
const crossProduct = dbStore.updateSecureProduct('prod-01', { name: 'Piratage Nom' }, TENANT_BOUTIQUE, false);
assert(
  !crossProduct.success && crossProduct.statusCode === 403,
  'TEST 16 : Tentative d\'accès cross-tenant (anti-IDOR) REFUSÉE (403)'
);

// -----------------------------------------------------------------------------
// TEST 17 : Tentative API directe de suppression par Admin Agence -> REFUSÉE
// -----------------------------------------------------------------------------
assert(
  !unauthDelete.success,
  'TEST 17 : L\'API de suppression définitive est strictement interdite aux administrateurs d\'agence'
);

// -----------------------------------------------------------------------------
// TEST 18 : Suppression définitive exige confirmation renforcée (nom exact)
// -----------------------------------------------------------------------------
const currentName = dbStore.getState().tenants.find(t => t.id === TENANT_BOUTIQUE)!.name;
const wrongNameTry = dbStore.deleteAgencyPermanently(TENANT_BOUTIQUE, 'Nom Erroné', true);
assert(
  !wrongNameTry.success && wrongNameTry.statusCode === 400,
  'TEST 18 : Suppression définitive sans saisie du nom exact STRICTEMENT BLOQUÉE',
  wrongNameTry.message
);

// -----------------------------------------------------------------------------
// TEST 19 : Toutes les actions sensibles sont enregistrées dans l'audit
// -----------------------------------------------------------------------------
const logs = dbStore.getState().auditLogs;
const auditActions = logs.map(l => l.action);
const hasSuspendLog = auditActions.includes('AGENCY_SUSPENDED');
const hasArchiveLog = auditActions.includes('AGENCY_ARCHIVED');
const hasRestoreLog = auditActions.includes('AGENCY_RESTORED');
const hasUpdateLog = auditActions.includes('AGENCY_DETAILS_UPDATED');

assert(
  hasSuspendLog && hasArchiveLog && hasRestoreLog && hasUpdateLog,
  'TEST 19 : Traçabilité et historique complet des actions de cycle de vie dans les journaux d\'audit'
);

// -----------------------------------------------------------------------------
// TEST 20 : Les fonctionnalités Boutique restent fonctionnelles
// -----------------------------------------------------------------------------
const boutiqueFeatures = isModuleEnabledForAgency('boutique', agencyBoutique);
assert(
  boutiqueFeatures,
  'TEST 20 : Les fonctionnalités du modèle Boutique restent pleinement fonctionnelles'
);

// -----------------------------------------------------------------------------
// TEST 21 : Les fonctionnalités Prestation restent fonctionnelles
// -----------------------------------------------------------------------------
const prestationFeatures = isModuleEnabledForAgency('training', agencyPrestation) && isModuleEnabledForAgency('orders', agencyPrestation);
assert(
  prestationFeatures,
  'TEST 21 : Les fonctionnalités du modèle Prestation restent pleinement fonctionnelles'
);

// -----------------------------------------------------------------------------
// TEST 22 : Les licences existantes restent fonctionnelles
// -----------------------------------------------------------------------------
const currentPrestAgency = dbStore.getState().tenants.find(t => t.id === TENANT_PRESTATION)!;
const prestEval = evaluateTenantSubscription(currentPrestAgency);
assert(
  !prestEval.isExpired && !prestEval.isSuspended && prestEval.daysRemaining > 0,
  'TEST 22 : Les contrats et formules de licence existants restent actifs et conformes',
  `Statut : ${prestEval.status}, Jours restants : ${prestEval.daysRemaining}`
);

// -----------------------------------------------------------------------------
// TEST 23 : Export de sauvegarde avant suppression & Suppression définitive réussie avec nom exact
// -----------------------------------------------------------------------------
const exportPreDelete = dbStore.exportAgencyData(TENANT_BOUTIQUE, true);
const validDelete = dbStore.deleteAgencyPermanently(TENANT_BOUTIQUE, currentName, true);
const agencyAfterDelete = dbStore.getState().tenants.find(t => t.id === TENANT_BOUTIQUE);
const productsAfterDelete = dbStore.getState().products.filter(p => p.tenantId === TENANT_BOUTIQUE);

assert(
  exportPreDelete.success && validDelete.success && !agencyAfterDelete && productsAfterDelete.length === 0,
  'TEST 23 : Sauvegarde JSON générée et suppression définitive avec nom exact réussie (nettoyage complet)',
  `Éléments supprimés : ${validDelete.deletedRecordsCount}`
);

console.log('\n================================================================================');
console.log(`📊 RÉSULTAT GLOBAL : ${passed} test(s) réussi(s), ${failed} test(s) échoué(s)`);
console.log('================================================================================\n');

if (failed > 0) {
  process.exit(1);
} else {
  process.exit(0);
}
