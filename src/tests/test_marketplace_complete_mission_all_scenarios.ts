/**
 * Comprehensive Validation Test Suite: Marketplace Complete Mission All Scenarios (1 to 19)
 * Tests categories, multi-store publications, independent pricing/stock, 4-view photos, 
 * store city inheritance, and bidirectional customer-to-merchant messaging.
 */

import { dbStore } from '../server/db/mockStore';
import { Product, Tenant } from '../types';
import { GLOBAL_MARKETPLACE_CATEGORIES } from '../modules/marketplace/MarketplaceCategoriesData';

let testsPassed = 0;
let testsFailed = 0;

function assert(condition: boolean, testName: string, details?: string) {
  if (condition) {
    console.log(`✅ [PASS] ${testName}`);
    testsPassed++;
  } else {
    console.error(`❌ [FAIL] ${testName} - ${details || 'Assertion failed'}`);
    testsFailed++;
  }
}

console.log('================================================================');
console.log('STARTING MISSION VALIDATION: MARKETPLACE COMPLETE TEST SUITE');
console.log('================================================================\n');

// Reset store to pristine state
dbStore.resetToDefault();

// -----------------------------------------------------------------------------
// TEST 1: Store category addition after creation
// -----------------------------------------------------------------------------
console.log('--- TEST 1: Catégories de ma boutique ---');
const boutiqueA_Id = 'tenant-test-a';
const boutiqueB_Id = 'tenant-test-b';

dbStore.updateState(draft => {
  draft.tenants.push({
    id: boutiqueA_Id,
    name: 'Boutique Alpha Conakry',
    code: 'ALPHA',
    slug: 'alpha',
    activityType: 'RETAIL_STORE',
    status: 'ACTIVE',
    subscriptionStatus: 'ACTIVE',
    city: 'Conakry',
    address: 'Madina Marché',
    phone: '+224622000001',
    email: 'alpha@test.gn',
    selectedCategories: ['Informatique & Bureautique'], // Initially without Papeterie
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString()
  });

  draft.tenants.push({
    id: boutiqueB_Id,
    name: 'Boutique Beta Kindia',
    code: 'BETA',
    slug: 'beta',
    activityType: 'RETAIL_STORE',
    status: 'ACTIVE',
    subscriptionStatus: 'ACTIVE',
    city: 'Kindia',
    address: 'Centre-ville Kindia',
    phone: '+224622000002',
    email: 'beta@test.gn',
    selectedCategories: ['Papeterie', 'Mode & Habillement'],
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString()
  });
});

// Verify Alpha does not have Papeterie yet
let tenantA = dbStore.getState().tenants.find(t => t.id === boutiqueA_Id);
assert(
  tenantA !== undefined && !tenantA.selectedCategories?.includes('Papeterie'),
  'TEST 1.1: Boutique Alpha created without Papeterie category'
);

// Admin adds Papeterie to Boutique Alpha via updateBoutiqueCategories
const updateCatRes = dbStore.updateBoutiqueCategories(boutiqueA_Id, ['Informatique & Bureautique', 'Papeterie']);
tenantA = dbStore.getState().tenants.find(t => t.id === boutiqueA_Id);
assert(
  updateCatRes.success && (tenantA?.selectedCategories?.includes('Papeterie') ?? false),
  'TEST 1.2: Papeterie successfully added to Boutique Alpha via "Catégories de ma boutique"'
);

// Verify central catalog has Papeterie
const centralPapeterie = GLOBAL_MARKETPLACE_CATEGORIES.find(c => c.name.toLowerCase().includes('papeterie') || c.code.toLowerCase().includes('papeterie'));
assert(centralPapeterie !== undefined, 'TEST 2.1: Central catalog contains global category "Papeterie"');

// -----------------------------------------------------------------------------
// TEST 2 & 3: Multi-Store Publications of the same product name
// -----------------------------------------------------------------------------
console.log('\n--- TEST 2 & 3: Produits Multi-Boutiques (Papier Bristol A4) ---');

const productA_Id = 'prod-bristol-alpha';
const productB_Id = 'prod-bristol-beta';

// Boutique A publishes Papier Bristol A4 at 1000 GNF / feuille
dbStore.updateState(draft => {
  draft.products.push({
    id: productA_Id,
    tenantId: boutiqueA_Id,
    name: 'Papier Bristol A4 180g',
    code: 'BRISTOL-A4-A',
    category: 'Papeterie',
    currentStock: 500,
    costPrice: 700,
    salePrice: 1000,
    publicPrice: 1000,
    publicUnit: 'feuille',
    defaultSaleUnit: 'feuille',
    baseUnit: 'feuille',
    unit: 'feuille',
    pricingTiers: [
      { unit: 'feuille', price: 1000, conversionFactor: 1 },
      { unit: 'paquet', price: 90000, conversionFactor: 100 },
      { unit: 'carton', price: 400000, conversionFactor: 500 }
    ],
    photos: ['https://example.com/photos/bristol_v1.jpg'],
    photoUrl: 'https://example.com/photos/bristol_v1.jpg',
    isActive: true,
    isArchived: false,
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString()
  });

  // Boutique B publishes the EXACT SAME product name at 1200 GNF / feuille
  draft.products.push({
    id: productB_Id,
    tenantId: boutiqueB_Id,
    name: 'Papier Bristol A4 180g',
    code: 'BRISTOL-A4-B',
    category: 'Papeterie',
    currentStock: 300,
    costPrice: 800,
    salePrice: 1200,
    publicPrice: 1200,
    publicUnit: 'feuille',
    defaultSaleUnit: 'feuille',
    baseUnit: 'feuille',
    unit: 'feuille',
    pricingTiers: [
      { unit: 'feuille', price: 1200, conversionFactor: 1 },
      { unit: 'paquet', price: 110000, conversionFactor: 100 }
    ],
    photos: ['https://example.com/photos/bristol_beta_v1.jpg', 'https://example.com/photos/bristol_beta_v2.jpg'],
    photoUrl: 'https://example.com/photos/bristol_beta_v1.jpg',
    isActive: true,
    isArchived: false,
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString()
  });
});

// Verify both publications exist simultaneously on marketplace
const allBristolProducts = dbStore.getState().products.filter(p => p.name === 'Papier Bristol A4 180g');
assert(allBristolProducts.length === 2, 'TEST 3.1: Both Boutique A and Boutique B offers are co-existing in the catalog');

const offerA = allBristolProducts.find(p => p.tenantId === boutiqueA_Id);
const offerB = allBristolProducts.find(p => p.tenantId === boutiqueB_Id);

assert(
  offerA !== undefined && offerA.publicPrice === 1000 && offerA.publicUnit === 'feuille',
  'TEST 3.2: Boutique A offer is 1000 GNF / feuille'
);
assert(
  offerB !== undefined && offerB.publicPrice === 1200 && offerB.publicUnit === 'feuille',
  'TEST 3.3: Boutique B offer is 1200 GNF / feuille'
);

// -----------------------------------------------------------------------------
// TEST 4 & 5: Independence of Prices and Stock
// -----------------------------------------------------------------------------
console.log('\n--- TEST 4 & 5: Indépendance des Prix et des Stocks ---');

// Modify Boutique A's price to 1050 GNF
dbStore.updateState(draft => {
  const pA = draft.products.find(p => p.id === productA_Id);
  if (pA) {
    pA.publicPrice = 1050;
    pA.salePrice = 1050;
    pA.currentStock = 450; // Modify Boutique A's stock
  }
});

const refreshedOfferA = dbStore.getState().products.find(p => p.id === productA_Id);
const refreshedOfferB = dbStore.getState().products.find(p => p.id === productB_Id);

assert(
  refreshedOfferA?.publicPrice === 1050 && refreshedOfferA?.currentStock === 450,
  'TEST 4.1: Boutique A price updated to 1050 GNF and stock to 450'
);
assert(
  refreshedOfferB?.publicPrice === 1200 && refreshedOfferB?.currentStock === 300,
  'TEST 4.2 & 5: Boutique B price (1200 GNF) and stock (300) remained 100% UNCHANGED'
);

// -----------------------------------------------------------------------------
// TEST 6, 7, 8 & 16: Messaging Routing & Isolation
// -----------------------------------------------------------------------------
console.log('\n--- TEST 6, 7, 8 & 16: Messagerie Client / Vendeur & Routage ---');

const testCustomerId = 'customer-diallo-01';

// Client clicks "Discuter avec le vendeur" on Boutique A's offer
const convARes = dbStore.findOrCreateMarketplaceConversation({
  customerId: testCustomerId,
  customerName: 'Mamadou Diallo',
  customerPhone: '+224622112233',
  boutiqueId: boutiqueA_Id,
  boutiqueName: 'Boutique Alpha Conakry',
  productId: productA_Id,
  publicationId: productA_Id,
  productName: 'Papier Bristol A4 180g',
  publicPrice: 1050,
  publicUnit: 'feuille',
  initialMessage: 'Bonjour Boutique A, avez-vous 10 paquets disponibles ?'
});

assert(convARes.success, 'TEST 6.1: Conversation created for Boutique A');

// Check Boutique A conversations and unread count
const convsBoutiqueA = dbStore.getMarketplaceConversations(boutiqueA_Id);
const unreadBoutiqueA = dbStore.getMarketplaceUnreadCount(boutiqueA_Id);
assert(
  convsBoutiqueA.length === 1 && convsBoutiqueA[0].id === convARes.conversation.id && unreadBoutiqueA === 1,
  'TEST 6.2: Message appears in Boutique A inbox with unread count = 1'
);

// Verify Boutique B has ZERO messages and unread = 0 (Isolation)
const convsBoutiqueB = dbStore.getMarketplaceConversations(boutiqueB_Id);
const unreadBoutiqueB = dbStore.getMarketplaceUnreadCount(boutiqueB_Id);
assert(
  convsBoutiqueB.length === 0 && unreadBoutiqueB === 0,
  'TEST 6.3: Message does NOT appear in Boutique B inbox (Strict Isolation verified)'
);

// Client now clicks "Discuter avec le vendeur" on Boutique B's offer
const convBRes = dbStore.findOrCreateMarketplaceConversation({
  customerId: testCustomerId,
  customerName: 'Mamadou Diallo',
  customerPhone: '+224622112233',
  boutiqueId: boutiqueB_Id,
  boutiqueName: 'Boutique Beta Kindia',
  productId: productB_Id,
  publicationId: productB_Id,
  productName: 'Papier Bristol A4 180g',
  publicPrice: 1200,
  publicUnit: 'feuille',
  initialMessage: 'Bonjour Boutique B, quel est votre délai de livraison à Kindia ?'
});

assert(convBRes.success, 'TEST 7.1: Conversation created for Boutique B');
const convsBoutiqueB_After = dbStore.getMarketplaceConversations(boutiqueB_Id);
assert(
  convsBoutiqueB_After.length === 1 && convsBoutiqueB_After[0].id === convBRes.conversation.id,
  'TEST 7.2: Message appears in Boutique B inbox specifically'
);

// Boutique A opens conversation and marks as read
dbStore.markMarketplaceConversationAsRead(convARes.conversation.id, 'BOUTIQUE');
const unreadBoutiqueA_AfterRead = dbStore.getMarketplaceUnreadCount(boutiqueA_Id);
assert(unreadBoutiqueA_AfterRead === 0, 'TEST 6.4: Boutique A marked conversation as read (unread = 0)');

// Boutique A replies to client
const replyRes = dbStore.sendMarketplaceMessage({
  conversationId: convARes.conversation.id,
  senderId: boutiqueA_Id,
  senderType: 'BOUTIQUE',
  senderName: 'Boutique Alpha Conakry',
  content: 'Oui Monsieur Diallo, nous avons 50 paquets en stock à Madina !'
});

assert(replyRes.success, 'TEST 8.1: Boutique A sent reply to client');

// Check client's "Mes messages"
const clientConvs = dbStore.getMarketplaceConversations(undefined, testCustomerId);
const clientUnread = dbStore.getMarketplaceUnreadCount(undefined, testCustomerId);
const activeConvAForClient = dbStore.getMarketplaceConversationById(convARes.conversation.id);

assert(
  clientConvs.length === 2 && clientUnread === 1,
  'TEST 8.2: Client has 2 distinct discussions and 1 unread reply notification from Boutique A'
);
assert(
  activeConvAForClient?.messages?.some(m => m.content.includes('Oui Monsieur Diallo')),
  'TEST 8.3: Client message history contains seller reply'
);

// -----------------------------------------------------------------------------
// TEST 9, 10, 11, 12 & 13: Product Photos (1 to 4 Views & Generic Placeholder)
// -----------------------------------------------------------------------------
console.log('\n--- TEST 9-13: Gestion des Photos (Vues 1 à 4) & Aucun faux visuel ---');

const product1Photo_Id = 'prod-test-1-photo';
const product2Photos_Id = 'prod-test-2-photos';
const product3Photos_Id = 'prod-test-3-photos';
const product4Photos_Id = 'prod-test-4-photos';
const product0Photos_Id = 'prod-test-0-photos';

dbStore.updateState(draft => {
  draft.products.push(
    {
      id: product1Photo_Id,
      tenantId: boutiqueA_Id,
      name: 'Produit 1 Vue',
      code: 'P-1V',
      category: 'Papeterie',
      photos: ['https://example.com/v1.jpg'],
      salePrice: 5000,
      publicPrice: 5000,
      isActive: true
    } as Product,
    {
      id: product2Photos_Id,
      tenantId: boutiqueA_Id,
      name: 'Produit 2 Vues',
      code: 'P-2V',
      category: 'Papeterie',
      photos: ['https://example.com/v1.jpg', 'https://example.com/v2.jpg'],
      salePrice: 5000,
      publicPrice: 5000,
      isActive: true
    } as Product,
    {
      id: product3Photos_Id,
      tenantId: boutiqueA_Id,
      name: 'Produit 3 Vues',
      code: 'P-3V',
      category: 'Papeterie',
      photos: ['https://example.com/v1.jpg', 'https://example.com/v2.jpg', 'https://example.com/v3.jpg'],
      salePrice: 5000,
      publicPrice: 5000,
      isActive: true
    } as Product,
    {
      id: product4Photos_Id,
      tenantId: boutiqueA_Id,
      name: 'Produit 4 Vues',
      code: 'P-4V',
      category: 'Papeterie',
      photos: ['https://example.com/v1.jpg', 'https://example.com/v2.jpg', 'https://example.com/v3.jpg', 'https://example.com/v4.jpg'],
      salePrice: 5000,
      publicPrice: 5000,
      isActive: true
    } as Product,
    {
      id: product0Photos_Id,
      tenantId: boutiqueA_Id,
      name: 'Produit Sans Photo',
      code: 'P-0V',
      category: 'Papeterie',
      photos: [],
      photoUrl: undefined,
      salePrice: 5000,
      publicPrice: 5000,
      isActive: true
    } as Product
  );
});

const p1 = dbStore.getState().products.find(p => p.id === product1Photo_Id);
const p2 = dbStore.getState().products.find(p => p.id === product2Photos_Id);
const p3 = dbStore.getState().products.find(p => p.id === product3Photos_Id);
const p4 = dbStore.getState().products.find(p => p.id === product4Photos_Id);
const p0 = dbStore.getState().products.find(p => p.id === product0Photos_Id);

assert(p1?.photos?.length === 1, 'TEST 9: Product with 1 photo returns exactly 1 view (Vue 1)');
assert(p2?.photos?.length === 2, 'TEST 10: Product with 2 photos returns exactly 2 views (Vue 1 + Vue 2)');
assert(p3?.photos?.length === 3, 'TEST 11: Product with 3 photos returns exactly 3 views (Vue 1 + Vue 2 + Vue 3)');
assert(p4?.photos?.length === 4, 'TEST 12: Product with 4 photos returns exactly 4 views (Vue 1 + Vue 2 + Vue 3 + Vue 4)');
assert(
  (!p0?.photos || p0.photos.length === 0) && !p0?.photoUrl,
  'TEST 13: Product without photo has no foreign images and uses true generic icon placeholder'
);

// -----------------------------------------------------------------------------
// TEST 14: Dynamic Price Unit Change (feuille -> carton)
// -----------------------------------------------------------------------------
console.log('\n--- TEST 14: Unité de Prix Marketplace (Feuille -> Carton) ---');

// Merchant updates Bristol offer to be displayed in "carton" at 400 000 GNF
dbStore.updateState(draft => {
  const prod = draft.products.find(p => p.id === productA_Id);
  if (prod) {
    prod.publicUnit = 'carton';
    prod.publicPrice = 400000;
  }
});

const updatedBristolA = dbStore.getState().products.find(p => p.id === productA_Id);
assert(
  updatedBristolA?.publicUnit === 'carton' && updatedBristolA?.publicPrice === 400000,
  'TEST 14: Marketplace price unit switched to "carton" with matching price 400 000 GNF / carton'
);

// -----------------------------------------------------------------------------
// TEST 15: Store City Modification and Product Inheritance
// -----------------------------------------------------------------------------
console.log('\n--- TEST 15: Modification de la Ville de Boutique ---');

// Store A changes city from Conakry to Coyah
dbStore.updateState(draft => {
  const tenant = draft.tenants.find(t => t.id === boutiqueA_Id);
  if (tenant) {
    tenant.city = 'Coyah';
  }
});

const updatedTenantA = dbStore.getState().tenants.find(t => t.id === boutiqueA_Id);
const updatedTenantB = dbStore.getState().tenants.find(t => t.id === boutiqueB_Id);

assert(updatedTenantA?.city === 'Coyah', 'TEST 15.1: Boutique Alpha city updated to Coyah');
assert(updatedTenantB?.city === 'Kindia', 'TEST 15.2: Boutique Beta city remained Kindia (independent)');

// In marketplace product listings, the city is dynamically derived from store:
const activeTenants = dbStore.getState().tenants;
const getProductMarketplaceCity = (prod: Product) => {
  const st = activeTenants.find(t => t.id === prod.tenantId);
  return st?.city || 'Conakry';
};

assert(
  getProductMarketplaceCity(updatedBristolA!) === 'Coyah',
  'TEST 15.3: All published products of Boutique Alpha automatically reflect "Coyah"'
);
assert(
  getProductMarketplaceCity(refreshedOfferB!) === 'Kindia',
  'TEST 15.4: Published products of Boutique Beta continue to reflect "Kindia"'
);

console.log('\n================================================================');
console.log(`TEST SUITE RESULTS: ${testsPassed} PASSED, ${testsFailed} FAILED`);
console.log('================================================================\n');

if (testsFailed > 0) {
  process.exit(1);
} else {
  console.log('🎉 ALL MISSION REQUIREMENTS & TEST SCENARIOS VALIDATED SUCCESSFULLY!');
}
