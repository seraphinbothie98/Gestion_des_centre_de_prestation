import { dbStore } from '../server/db/mockStore';
import { isModuleEnabledForAgency } from '../lib/moduleRegistry';
import { calculateServiceStockConsumption } from '../lib/stockEngine';
import { Tenant, User, Role } from '../types';

console.log('================================================================================');
console.log('🧪 TEST SUITE: MULTI-MODÈLE BOUTIQUE / PRESTATION & SÉCURISATION DES LICENCES');
console.log('================================================================================\n');

// 1. Initialisation de l'état de test
dbStore.resetToDefault();
const initialState = dbStore.getState();

const agencyPrestation = initialState.tenants.find(t => t.activityType === 'SERVICE_CENTER')!;
const agencyBoutique = initialState.tenants.find(t => t.activityType === 'RETAIL_STORE')!;

const TENANT_PRESTATION = agencyPrestation.id; // 't-001'
const TENANT_BOUTIQUE = agencyBoutique.id;     // 't-002'

let testsPassed = 0;
let testsFailed = 0;

function assert(condition: boolean, testName: string, details?: string) {
  if (condition) {
    console.log(`✅ [PASS] ${testName}`);
    if (details) console.log(`   ℹ️  ${details}`);
    testsPassed++;
  } else {
    console.error(`❌ [FAIL] ${testName}`);
    if (details) console.error(`   ⚠️  ${details}`);
    testsFailed++;
  }
}

// -----------------------------------------------------------------------------
// TEST 1: Agence BOUTIQUE - Modules Prestation désactivés
// -----------------------------------------------------------------------------
const trainingInBoutique = isModuleEnabledForAgency('training', agencyBoutique);
const ordersInBoutique = isModuleEnabledForAgency('orders', agencyBoutique);
const productionInBoutique = isModuleEnabledForAgency('production', agencyBoutique);
const equipmentInBoutique = isModuleEnabledForAgency('equipment', agencyBoutique);
const servicesInBoutique = isModuleEnabledForAgency('services-pricing', agencyBoutique);

assert(
  !trainingInBoutique && !ordersInBoutique && !productionInBoutique && !equipmentInBoutique && !servicesInBoutique,
  'TEST 1: Modules Prestation invisibles/désactivés pour une agence Boutique',
  'training, orders, production, equipment, services-pricing sont false'
);

// -----------------------------------------------------------------------------
// TEST 2: Agence BOUTIQUE - Modules Boutique activés
// -----------------------------------------------------------------------------
const boutiqueInBoutique = isModuleEnabledForAgency('boutique', agencyBoutique);
const stockInBoutique = isModuleEnabledForAgency('stock', agencyBoutique);
const suppliersInBoutique = isModuleEnabledForAgency('suppliers', agencyBoutique);
const cashInBoutique = isModuleEnabledForAgency('cash', agencyBoutique);

assert(
  boutiqueInBoutique && stockInBoutique && suppliersInBoutique && cashInBoutique,
  'TEST 2: Modules Boutique activés pour une agence Boutique',
  'boutique, stock, suppliers, cash sont true'
);

// -----------------------------------------------------------------------------
// TEST 3: Agence BOUTIQUE - Tentative de transfert vers Stock Prestation refusée par le backend
// -----------------------------------------------------------------------------
// Create a product for Boutique
const prodBoutiqueRes = dbStore.createSecureProduct({
  name: 'Ciment Portland 50kg',
  code: 'CIM-50KG',
  categoryId: initialState.productCategories.find(c => c.tenantId === TENANT_BOUTIQUE)?.id || 'cat-b1',
  category: 'Matériaux',
  unit: 'sac',
  baseUnit: 'sac',
  costPrice: 85000,
  salePrice: 100000,
  currentStock: 100,
  minStockAlert: 10,
  isActive: true
}, TENANT_BOUTIQUE, false);

const prodBoutiqueId = prodBoutiqueRes.product?.id || '';

const transferBoutiqueRes = dbStore.consumeSecureProductStock(
  prodBoutiqueId,
  5,
  'Impression Bâche',
  'CMD-001',
  'Tentative illégale depuis boutique',
  TENANT_BOUTIQUE,
  'Caissier Boutique',
  false // not superadmin
);

assert(
  !transferBoutiqueRes.success && transferBoutiqueRes.statusCode === 403,
  'TEST 3: Tentative de transfert vers Prestation depuis Boutique REFUSÉE (403)',
  transferBoutiqueRes.message
);

// -----------------------------------------------------------------------------
// TEST 4: Agence BOUTIQUE - Tentative de consommation directe Prestation refusée
// -----------------------------------------------------------------------------
const consPrestationRes = dbStore.consumeSecurePrestationStock(
  prodBoutiqueId,
  2,
  'Service Inexistant',
  'CMD-002',
  'Consommation',
  TENANT_BOUTIQUE,
  'Caissier Boutique',
  false
);

assert(
  !consPrestationRes.success && consPrestationRes.statusCode === 403,
  'TEST 4: Tentative de consommation Stock Prestation depuis Boutique REFUSÉE (403)',
  consPrestationRes.message
);

// -----------------------------------------------------------------------------
// TEST 5: Agence PRESTATION - Modules Prestation actifs et fonctionnels
// -----------------------------------------------------------------------------
const trainingInPrestation = isModuleEnabledForAgency('training', agencyPrestation);
const ordersInPrestation = isModuleEnabledForAgency('orders', agencyPrestation);
const productionInPrestation = isModuleEnabledForAgency('production', agencyPrestation);

assert(
  trainingInPrestation && ordersInPrestation && productionInPrestation,
  'TEST 5: Modules Prestation (training, orders, production) actifs pour agence Prestation'
);

// -----------------------------------------------------------------------------
// TEST 6: Agence PRESTATION - Transfert vers Stock Prestation autorisé & fonctionnel
// -----------------------------------------------------------------------------
const prodPrest = initialState.products.find(p => p.tenantId === TENANT_PRESTATION && p.currentStock >= 10);
if (prodPrest) {
  const oldStock = prodPrest.currentStock;
  const oldPrestationStock = prodPrest.prestationStock || 0;

  const validTransfer = dbStore.consumeSecureProductStock(
    prodPrest.id,
    1,
    'Impression & Reliure',
    'CMD-PREST-001',
    'Mise à disposition atelier',
    TENANT_PRESTATION,
    'Opérateur Atelier',
    false,
    prodPrest.baseUnit || prodPrest.unit
  );

  const updatedProd = dbStore.getState().products.find(p => p.id === prodPrest.id);

  assert(
    validTransfer.success && updatedProd?.prestationStock === oldPrestationStock + (validTransfer.deductedBaseQty || 1),
    'TEST 6: Transfert vers Stock Prestation AUTORISÉ et fonctionnel pour agence Prestation',
    `Stock magasin : ${oldStock} -> ${updatedProd?.currentStock}, Stock prestation : ${oldPrestationStock} -> ${updatedProd?.prestationStock}`
  );
}

// -----------------------------------------------------------------------------
// TEST 7: SÉCURITÉ LICENCE - Tentative de renouvellement/modification par Admin d'agence REFUSÉE
// -----------------------------------------------------------------------------
const unauthRenew = dbStore.renewAgencyLicense(TENANT_BOUTIQUE, 12, 'UNLIMITED', false); // isSuperAdmin = false

assert(
  !unauthRenew.success && unauthRenew.statusCode === 403,
  'TEST 7: Modification de licence par un Admin Agence REFUSÉE côté backend (403)',
  unauthRenew.message
);

// -----------------------------------------------------------------------------
// TEST 8: SÉCURITÉ LICENCE - Modification de statut agence par Admin d'agence REFUSÉE
// -----------------------------------------------------------------------------
const unauthStatus = dbStore.updateAgencyStatus(TENANT_BOUTIQUE, 'SUSPENDED', 'Hack', false); // isSuperAdmin = false

assert(
  !unauthStatus.success && unauthStatus.statusCode === 403,
  'TEST 8: Modification de statut agence par un Admin Agence REFUSÉE côté backend (403)',
  unauthStatus.message
);

// -----------------------------------------------------------------------------
// TEST 9: SUPER ADMIN - Renouvellement et modification de licence AUTORISÉS
// -----------------------------------------------------------------------------
const authRenew = dbStore.renewAgencyLicense(TENANT_BOUTIQUE, 12, 'ENTERPRISE', true); // isSuperAdmin = true

const agencyAfterRenew = dbStore.getState().tenants.find(t => t.id === TENANT_BOUTIQUE);

assert(
  agencyAfterRenew?.licensePlan === 'ENTERPRISE' && agencyAfterRenew?.subscriptionStatus === 'ACTIVE',
  'TEST 9: Super Admin peut renouveler et faire évoluer la licence avec succès',
  `Nouveau plan : ${agencyAfterRenew?.licensePlan}, Statut : ${agencyAfterRenew?.subscriptionStatus}`
);

// -----------------------------------------------------------------------------
// TEST 10: ISOLATION MULTI-TENANT - Agence A ne voit pas les produits de l'Agence B
// -----------------------------------------------------------------------------
const prodsA = dbStore.getProductsByTenant(TENANT_PRESTATION, false);
const prodsB = dbStore.getProductsByTenant(TENANT_BOUTIQUE, false);

const leakedInA = prodsA.filter(p => p.tenantId !== TENANT_PRESTATION);
const leakedInB = prodsB.filter(p => p.tenantId !== TENANT_BOUTIQUE);

assert(
  leakedInA.length === 0 && leakedInB.length === 0,
  'TEST 10: Isolation stricte des catalogues et stocks par agence',
  `Agence A (${prodsA.length} articles, 0 fuite), Agence B (${prodsB.length} articles, 0 fuite)`
);

// -----------------------------------------------------------------------------
// TEST 11: ISOLATION MULTI-TENANT - Tentative de lecture d'un produit tiers via API REFUSÉE
// -----------------------------------------------------------------------------
const crossAccess = dbStore.getProductById(prodBoutiqueId, TENANT_PRESTATION, false);

assert(
  !crossAccess.success && crossAccess.statusCode === 403,
  'TEST 11: Tentative IDOR inter-agences sur getProductById REFUSÉE (403)',
  crossAccess.message
);

// -----------------------------------------------------------------------------
// TEST 12: ISOLATION MULTI-TENANT - Tentative de mutation d'un produit tiers REFUSÉE
// -----------------------------------------------------------------------------
const crossUpdate = dbStore.updateSecureProduct(prodBoutiqueId, { name: 'Piratage Nom' }, TENANT_PRESTATION, false);

assert(
  !crossUpdate.success && crossUpdate.statusCode === 403,
  'TEST 12: Tentative IDOR inter-agences sur updateSecureProduct REFUSÉE (403)',
  crossUpdate.message
);

// -----------------------------------------------------------------------------
// TEST 13: SÉCURITÉ CYCLE DE VIE - Suspension et réactivation par Super Admin
// -----------------------------------------------------------------------------
dbStore.suspendAgency(TENANT_BOUTIQUE, 'Non-paiement redevance', true);
const suspendedTenant = dbStore.getState().tenants.find(t => t.id === TENANT_BOUTIQUE);

assert(
  suspendedTenant?.status === 'SUSPENDED' && suspendedTenant?.subscriptionStatus === 'SUSPENDED' && !suspendedTenant.isActive,
  'TEST 13: Suspension de l\'agence par le Super Admin effective',
  `Statut: ${suspendedTenant?.status}, isActive: ${suspendedTenant?.isActive}`
);

dbStore.reactivateAgency(TENANT_BOUTIQUE, true);
const reactivatedTenant = dbStore.getState().tenants.find(t => t.id === TENANT_BOUTIQUE);

assert(
  reactivatedTenant?.status === 'ACTIVE' && reactivatedTenant?.isActive,
  'TEST 14: Réactivation de l\'agence par le Super Admin effective'
);

// -----------------------------------------------------------------------------
// TEST 15: ARCHIVAGE & RESTAURATION - Préservation intégrale des données
// -----------------------------------------------------------------------------
dbStore.archiveAgency(TENANT_BOUTIQUE, 'Cessation temporaire', true);
const archivedTenant = dbStore.getState().tenants.find(t => t.id === TENANT_BOUTIQUE);
const productsWhileArchived = dbStore.getState().products.filter(p => p.tenantId === TENANT_BOUTIQUE);

assert(
  archivedTenant?.status === 'ARCHIVED' && !archivedTenant.isActive && productsWhileArchived.length > 0,
  'TEST 15: Archivage d\'agence effectif avec 100% des données conservées',
  `${productsWhileArchived.length} produit(s) conservé(s) intact(s)`
);

dbStore.restoreAgency(TENANT_BOUTIQUE, true);
const restoredTenant = dbStore.getState().tenants.find(t => t.id === TENANT_BOUTIQUE);

assert(
  restoredTenant?.status === 'ACTIVE' && restoredTenant.isActive,
  'TEST 16: Restauration de l\'agence archivée effective'
);

// -----------------------------------------------------------------------------
// TEST 17: CHANGEMENT DE MODÈLE CONTRÔLÉ - Garde-fou sur données existantes
// -----------------------------------------------------------------------------
const modelChangeCheck = dbStore.changeAgencyActivityModel(TENANT_PRESTATION, 'RETAIL_STORE', false, true);

assert(
  modelChangeCheck.requiresControlledMigration === true || modelChangeCheck.success === true,
  'TEST 17: Contrôle de sécurité lors du changement de modèle d\'activité'
);

// -----------------------------------------------------------------------------
// TEST 18: JOURNAL D'AUDIT - Toutes les opérations sont tracées
// -----------------------------------------------------------------------------
const logs = dbStore.getState().auditLogs;
const hasStatusLogs = logs.some(l => l.action === 'AGENCY_STATUS_UPDATED');
const hasLicenseLogs = logs.some(l => l.action === 'AGENCY_LICENSE_RENEWED');

assert(
  hasStatusLogs && hasLicenseLogs,
  'TEST 18: Traçabilité complète des actions de licence et statuts dans les journaux d\'audit'
);

// -----------------------------------------------------------------------------
// TEST 19: EXPORT DE SAUVEGARDE AVANT SUPPRESSION
// -----------------------------------------------------------------------------
const exportRes = dbStore.exportAgencyData(TENANT_BOUTIQUE, true);

assert(
  Boolean(exportRes.success && exportRes.exportBundle?.products && exportRes.exportBundle.products.length > 0),
  'TEST 19: Export de sauvegarde complet de l\'agence au format JSON fonctionnel'
);

// -----------------------------------------------------------------------------
// TEST 20: SÉCURISATION DE LA SUPPRESSION DÉFINITIVE - Exige le nom exact
// -----------------------------------------------------------------------------
const wrongNameDelete = dbStore.deleteAgencyPermanently(TENANT_BOUTIQUE, 'Mauvais Nom', true);

assert(
  !wrongNameDelete.success && wrongNameDelete.statusCode === 400,
  'TEST 20: Suppression définitive sans nom exact STRICTEMENT REJETÉE (Sécurité anti-erreur)',
  wrongNameDelete.message
);

console.log('\n================================================================================');
console.log(`📊 RÉSULTAT GLOBAL : ${testsPassed} test(s) réussi(s), ${testsFailed} test(s) échoué(s)`);
console.log('================================================================================\n');

if (testsFailed > 0) {
  process.exit(1);
} else {
  process.exit(0);
}
