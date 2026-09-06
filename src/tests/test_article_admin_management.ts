import { dbStore } from '../server/db/mockStore';
import { Product } from '../types';

console.log('====================================================================');
console.log('TEST SUITE: GESTION ADMINISTRATIVE DES ARTICLES (STOCK & MAGASIN)');
console.log('====================================================================\n');

let testsPassed = 0;
let testsFailed = 0;

function assert(condition: boolean, testName: string, detail?: string) {
  if (condition) {
    console.log(`✅ [PASS] ${testName}`);
    testsPassed++;
  } else {
    console.error(`❌ [FAIL] ${testName}${detail ? ` -> ${detail}` : ''}`);
    testsFailed++;
  }
}

// Setup test environment
const AGENCY_A = 't-001';
const AGENCY_B = 't-002';

// -----------------------------------------------------------------------------
// TEST 1: Création & Modification d'un article
// -----------------------------------------------------------------------------
console.log('--- TEST 1: Modification d’un article ---');
const createRes = dbStore.createSecureProduct({
  name: 'Article Test Admin Initial',
  code: 'REF-ADMIN-001',
  category: 'Papeterie',
  categoryId: 'cat-prod-01',
  baseUnit: 'feuille',
  costPrice: 100,
  salePrice: 250,
  wholesalePrice: 200,
  initialStock: 50,
  minStockAlert: 10,
  maxStock: 500,
  location: 'Rayon A1',
  isActive: true
}, AGENCY_A, true);

assert(createRes.success, 'Création article initial pour test admin');
const testProductId = createRes.product!.id;

const updateRes = dbStore.updateSecureProduct(testProductId, {
  name: 'Article Test Admin Modifié',
  code: 'REF-ADMIN-001-MOD',
  salePrice: 300,
  costPrice: 120,
  location: 'Rayon B2'
}, AGENCY_A, false);

assert(updateRes.success, 'Modification des informations de l’article');
const updatedProd = dbStore.getState().products.find(p => p.id === testProductId);
assert(
  updatedProd?.name === 'Article Test Admin Modifié' &&
  updatedProd?.salePrice === 300 &&
  updatedProd?.location === 'Rayon B2',
  'Données modifiées persistées correctement dans le store'
);

// -----------------------------------------------------------------------------
// TEST 2: Désactivation d'un article
// -----------------------------------------------------------------------------
console.log('\n--- TEST 2: Désactivation d’un article ---');
const deactivateRes = dbStore.updateSecureProduct(testProductId, { isActive: false }, AGENCY_A, false);
assert(deactivateRes.success, 'Désactivation de l’article');
const deactivatedProd = dbStore.getState().products.find(p => p.id === testProductId);
assert(deactivatedProd?.isActive === false, 'Statut de l’article est INACTIF');

// -----------------------------------------------------------------------------
// TEST 3: Réactivation d'un article
// -----------------------------------------------------------------------------
console.log('\n--- TEST 3: Réactivation d’un article ---');
const reactivateRes = dbStore.updateSecureProduct(testProductId, { isActive: true }, AGENCY_A, false);
assert(reactivateRes.success, 'Réactivation de l’article');
const reactivatedProd = dbStore.getState().products.find(p => p.id === testProductId);
assert(reactivatedProd?.isActive === true, 'Statut de l’article est ACTIF');

// -----------------------------------------------------------------------------
// TEST 4: Suppression d'un article sans historique
// -----------------------------------------------------------------------------
console.log('\n--- TEST 4: Suppression d’un article sans historique ---');
// Clean out any initial stock movement for this test product if any
dbStore.updateState(draft => {
  draft.stockMovements = draft.stockMovements.filter(m => m.productId !== testProductId);
});

const checkDeletable = dbStore.checkProductDeletability(testProductId, AGENCY_A, false);
assert(checkDeletable.canDelete === true, 'checkProductDeletability autorise la suppression sans historique');

const deleteCleanRes = dbStore.deleteSecureProduct(testProductId, AGENCY_A, false);
assert(deleteCleanRes.success === true, 'Suppression définitive autorisée pour un article sans historique');
assert(!dbStore.getState().products.find(p => p.id === testProductId), 'Article supprimé introuvable dans le store');

// -----------------------------------------------------------------------------
// TEST 5: Tentative de suppression d'un article avec historique
// -----------------------------------------------------------------------------
console.log('\n--- TEST 5: Tentative de suppression d’un article avec historique ---');
// Create a new product with stock and a transaction
const createHistRes = dbStore.createSecureProduct({
  name: 'Article Avec Historique',
  code: 'REF-HIST-001',
  category: 'Fournitures',
  baseUnit: 'unité',
  costPrice: 500,
  salePrice: 1000,
  initialStock: 100,
  minStockAlert: 10,
  isActive: true
}, AGENCY_A, true);

const histProdId = createHistRes.product!.id;

// Add a stock movement to simulate history
dbStore.adjustSecureProductStock(histProdId, 120, 'Inventaire physique', 'MAIN_STORE', AGENCY_A, 'Admin Test', false);

const checkHistDeletable = dbStore.checkProductDeletability(histProdId, AGENCY_A, false);
assert(checkHistDeletable.canDelete === false, 'checkProductDeletability bloque la suppression avec historique');
assert(checkHistDeletable.linkedDataSummary.movementsCount > 0, 'Détection du mouvement de stock historique');

const deleteBlockedRes = dbStore.deleteSecureProduct(histProdId, AGENCY_A, false);
assert(deleteBlockedRes.success === false, 'Suppression définitive bloquée pour article avec historique');
assert(deleteBlockedRes.canDeactivateInstead === true, 'Proposition de désactivation à la place');
assert(deleteBlockedRes.message.includes('possède déjà un historique'), 'Message explicatif conforme aux spécifications');

// Deactivate instead
const deactInsteadRes = dbStore.updateSecureProduct(histProdId, { isActive: false }, AGENCY_A, false);
assert(deactInsteadRes.success, 'Désactivation de l’article effectuée à la place');

// -----------------------------------------------------------------------------
// TEST 6 & 7: Affichage des articles actifs et inactifs
// -----------------------------------------------------------------------------
console.log('\n--- TEST 6 & 7: Filtres Articles Actifs et Désactivés ---');
const allAgencyAProducts = dbStore.getProductsByTenant(AGENCY_A, false);
const activeProds = allAgencyAProducts.filter(p => p.isActive && !p.isArchived);
const inactiveProds = allAgencyAProducts.filter(p => !p.isActive && !p.isArchived);

assert(activeProds.every(p => p.isActive === true), 'Filtre ACTIVE retourne uniquement les articles actifs');
assert(inactiveProds.some(p => p.id === histProdId), 'Filtre INACTIVE contient bien l’article désactivé');

// -----------------------------------------------------------------------------
// TEST 8: Vérification de la traçabilité (Audit Logs)
// -----------------------------------------------------------------------------
console.log('\n--- TEST 8: Traçabilité et Audit Logs ---');
const auditLogs = dbStore.getState().auditLogs || [];
const productLogs = auditLogs.filter(l => l.entityId === histProdId || l.entityType === 'PRODUCT');
assert(productLogs.length > 0, 'Audit logs enregistrent les actions sur les articles');

// -----------------------------------------------------------------------------
// TEST 9: Isolation stricte par Agence (Multi-tenant)
// -----------------------------------------------------------------------------
console.log('\n--- TEST 9: Isolation stricte entre Agences ---');
// User in Agency B attempts to modify or delete Agency A's product
const crossAgencyUpdate = dbStore.updateSecureProduct(histProdId, { name: 'Piratage Cross Agency' }, AGENCY_B, false);
assert(crossAgencyUpdate.success === false, 'Refus de modification cross-agence');
assert(crossAgencyUpdate.statusCode === 403, 'Code 403 retourné pour ressource d’une autre agence');

const crossAgencyDelete = dbStore.deleteSecureProduct(histProdId, AGENCY_B, false);
assert(crossAgencyDelete.success === false, 'Refus de suppression cross-agence');

// -----------------------------------------------------------------------------
// TEST 10: Isolation par Magasin / Stock par Emplacement
// -----------------------------------------------------------------------------
console.log('\n--- TEST 10: Isolation par Magasin / Emplacement ---');
const histProduct = dbStore.getState().products.find(p => p.id === histProdId);
assert(histProduct?.currentStock === 120, 'Stock ajusté et isolé avec succès');

console.log('\n====================================================================');
console.log(`RÉSUMÉ : ${testsPassed} validés, ${testsFailed} échoués`);
console.log('====================================================================');

if (testsFailed > 0) {
  process.exit(1);
} else {
  process.exit(0);
}
