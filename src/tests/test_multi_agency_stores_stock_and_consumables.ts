import { dbStore } from '../server/db/mockStore';
import { calculateOrderConsumablesRequirements, checkOrderConsumablesAvailability } from '../lib/stockEngine';
import { Order, OrderItem, Service, Product, Store, ConsumableMode } from '../types';

console.log('================================================================');
console.log('MASTER VALIDATION TEST SUITE: MULTI-AGENCY, STORES & CONSUMABLES');
console.log('================================================================\n');

let passedTests = 0;
let totalTests = 11;

function assert(condition: boolean, testName: string, details?: string) {
  if (condition) {
    passedTests++;
    console.log(`✅ [PASS] ${testName}`);
    if (details) console.log(`   👉 ${details}`);
  } else {
    console.error(`❌ [FAIL] ${testName}`);
    if (details) console.error(`   👉 Details: ${details}`);
  }
}

// Setup Test Data
const state = dbStore.getState();
const agencyA = 't-001'; // CPEP
const agencyB = 't-002'; // NICOST

// Product 1: Rames Papier A4
const prodPapierA4 = state.products.find(p => p.tenantId === agencyA && p.name.includes('Papier A4')) || {
  id: 'prod-test-a4',
  tenantId: agencyA,
  name: 'Rames de Papier A4',
  code: 'PAP-A4',
  category: 'Fournitures',
  currentStock: 500,
  unit: 'feuille',
  costPrice: 50,
  salePrice: 100,
  isActive: true,
  isConsumable: true,
  isSellable: true
} as Product;

// Product 2: Bristol 180g
const prodBristol = state.products.find(p => p.tenantId === agencyA && p.name.includes('Bristol')) || {
  id: 'prod-test-bristol',
  tenantId: agencyA,
  name: 'Papier Bristol 180g',
  code: 'PAP-BRI-180',
  category: 'Fournitures',
  currentStock: 10,
  unit: 'feuille',
  costPrice: 100,
  salePrice: 200,
  isActive: true,
  isConsumable: true,
  isSellable: true
} as Product;

// Product 3: Baguettes reliure
const prodBaguette = state.products.find(p => p.tenantId === agencyA && p.name.includes('Baguette')) || {
  id: 'prod-test-baguette',
  tenantId: agencyA,
  name: 'Baguettes de reliure',
  code: 'REL-BAG-01',
  category: 'Fournitures',
  currentStock: 10,
  unit: 'pièce',
  costPrice: 500,
  salePrice: 1000,
  isActive: true,
  isConsumable: true,
  isSellable: true
} as Product;

// Product 4: Couvertures transparentes
const prodCouverture = state.products.find(p => p.tenantId === agencyA && p.name.includes('Couverture')) || {
  id: 'prod-test-couverture',
  tenantId: agencyA,
  name: 'Couvertures transparentes PVC',
  code: 'REL-COUV-01',
  category: 'Fournitures',
  currentStock: 10,
  unit: 'feuille',
  costPrice: 300,
  salePrice: 600,
  isActive: true,
  isConsumable: true,
  isSellable: true
} as Product;

// Service 1: Photocopie N&B (INTERNAL_VARIABLE -> 1 feuille A4 per unit)
const srvPhotocopie: Service = {
  id: 'srv-test-photo',
  tenantId: agencyA,
  code: 'SRV-PH-01',
  name: 'Photocopie N&B A4',
  description: 'Photocopie monochrome',
  categoryId: 'cat-srv-01',
  unit: 'page',
  basePrice: 500,
  consumableMode: 'INTERNAL_VARIABLE',
  isClientSupportAllowed: true,
  consumables: [
    { productId: prodPapierA4.id, productName: prodPapierA4.name, quantityPerUnit: 1, unit: 'feuille', isClientSupplied: false }
  ],
  isActive: true
} as Service;

// Service 2: Reliure Document (INTERNAL_FIXED -> 1 Baguette, 1 Bristol, 1 Couverture per reliure)
const srvReliure: Service = {
  id: 'srv-test-reliure',
  tenantId: agencyA,
  code: 'SRV-REL-01',
  name: 'Reliure Plastique Standard',
  description: 'Reliure avec baguette et couvertures',
  categoryId: 'cat-srv-02',
  unit: 'document',
  basePrice: 5000,
  consumableMode: 'INTERNAL_FIXED',
  isClientSupportAllowed: true,
  consumables: [
    { productId: prodBaguette.id, productName: prodBaguette.name, quantityPerUnit: 1, unit: 'pièce', isClientSupplied: false },
    { productId: prodBristol.id, productName: prodBristol.name, quantityPerUnit: 1, unit: 'feuille', isClientSupplied: false },
    { productId: prodCouverture.id, productName: prodCouverture.name, quantityPerUnit: 1, unit: 'feuille', isClientSupplied: false }
  ],
  isActive: true
} as Service;

// Ensure test items exist in state
dbStore.updateState(draft => {
  if (!draft.products.some(p => p.id === prodPapierA4.id)) draft.products.push(prodPapierA4);
  if (!draft.products.some(p => p.id === prodBristol.id)) draft.products.push(prodBristol);
  if (!draft.products.some(p => p.id === prodBaguette.id)) draft.products.push(prodBaguette);
  if (!draft.products.some(p => p.id === prodCouverture.id)) draft.products.push(prodCouverture);
  
  // Set initial known stock counts for strict testing
  const pA4 = draft.products.find(p => p.id === prodPapierA4.id);
  if (pA4) {
    pA4.currentStock = 500;
    pA4.prestationStock = 500;
  }

  const pBri = draft.products.find(p => p.id === prodBristol.id);
  if (pBri) {
    pBri.currentStock = 10;
    pBri.prestationStock = 10;
  }

  const pBag = draft.products.find(p => p.id === prodBaguette.id);
  if (pBag) {
    pBag.currentStock = 10;
    pBag.prestationStock = 10;
  }

  const pCouv = draft.products.find(p => p.id === prodCouverture.id);
  if (pCouv) {
    pCouv.currentStock = 10;
    pCouv.prestationStock = 10;
  }

  if (!draft.services.some(s => s.id === srvPhotocopie.id)) draft.services.push(srvPhotocopie);
  if (!draft.services.some(s => s.id === srvReliure.id)) draft.services.push(srvReliure);
});

// TEST 1: Baseline Stock Check
console.log('--- TEST 1: Baseline Stock Check ---');
const curA4 = dbStore.getState().products.find(p => p.id === prodPapierA4.id)?.prestationStock;
const curBri = dbStore.getState().products.find(p => p.id === prodBristol.id)?.prestationStock;
const curBag = dbStore.getState().products.find(p => p.id === prodBaguette.id)?.prestationStock;
const curCouv = dbStore.getState().products.find(p => p.id === prodCouverture.id)?.prestationStock;

assert(
  curA4 === 500 && curBri === 10 && curBag === 10 && curCouv === 10,
  'Test 1: Baseline Stock Initialized Correctly',
  `Papier A4: ${curA4}, Bristol: ${curBri}, Baguette: ${curBag}, Couverture: ${curCouv}`
);

// TEST 2: Photocopy Order without client support (Qty: 2 pages -> deductions -2, stock drops 500 to 498)
console.log('\n--- TEST 2: Photocopy Order (Qty: 2) -> Stock 500 -> 498 ---');
const order1Item: OrderItem = {
  id: 'item-photo-1',
  serviceId: srvPhotocopie.id,
  serviceName: srvPhotocopie.name,
  quantity: 2,
  unit: 'page',
  unitPrice: 500,
  totalPrice: 1000,
  discountPercent: 0
};
const order1: Order = {
  id: 'ord-test-photo-01',
  tenantId: agencyA,
  orderNumber: 'CMD-TEST-001',
  customerType: 'WALK_IN',
  personName: 'Mamadou Diallo',
  status: 'PENDING',
  paymentStatus: 'PAID',
  deliveryStatus: 'UNDELIVERED',
  priority: 'NORMAL',
  items: [order1Item],
  subtotal: 1000,
  totalAmount: 1000,
  paidAmount: 1000,
  dueAmount: 0,
  createdAt: new Date().toISOString()
} as Order;

dbStore.updateState(draft => { draft.orders.push(order1); });
const deductRes1 = dbStore.deductConsumablesForOrder(order1.id, agencyA, 'Test Runner');
const stockA4After = dbStore.getState().products.find(p => p.id === prodPapierA4.id)?.prestationStock;

assert(
  deductRes1.success && stockA4After === 498,
  'Test 2: Photocopy Consumables Deducted (500 -> 498)',
  `Deduction result: ${deductRes1.movementsCount} movement(s), new stock: ${stockA4After}`
);

// TEST 3: Binding Order without client support (Qty: 1 reliure -> deductions: 1 A4, 1 Baguette, 1 Bristol, 1 Couverture)
console.log('\n--- TEST 3: Binding Order (Qty: 1) -> Baguette 10->9, Bristol 10->9, Couverture 10->9 ---');
const order2Item: OrderItem = {
  id: 'item-reliure-1',
  serviceId: srvReliure.id,
  serviceName: srvReliure.name,
  quantity: 1,
  unit: 'document',
  unitPrice: 5000,
  totalPrice: 5000,
  discountPercent: 0
};
const order2: Order = {
  id: 'ord-test-rel-01',
  tenantId: agencyA,
  orderNumber: 'CMD-TEST-002',
  customerType: 'WALK_IN',
  personName: 'Fatoumata Binta',
  status: 'PENDING',
  paymentStatus: 'PAID',
  deliveryStatus: 'UNDELIVERED',
  priority: 'NORMAL',
  items: [order2Item],
  subtotal: 5000,
  totalAmount: 5000,
  paidAmount: 5000,
  dueAmount: 0,
  createdAt: new Date().toISOString()
} as Order;

dbStore.updateState(draft => { draft.orders.push(order2); });
const deductRes2 = dbStore.deductConsumablesForOrder(order2.id, agencyA, 'Test Runner');
const stockBriAfter = dbStore.getState().products.find(p => p.id === prodBristol.id)?.prestationStock;
const stockBagAfter = dbStore.getState().products.find(p => p.id === prodBaguette.id)?.prestationStock;
const stockCouvAfter = dbStore.getState().products.find(p => p.id === prodCouverture.id)?.prestationStock;

assert(
  deductRes2.success && stockBriAfter === 9 && stockBagAfter === 9 && stockCouvAfter === 9,
  'Test 3: Binding Consumables Deducted (10->9 each)',
  `Bristol: ${stockBriAfter}, Baguette: ${stockBagAfter}, Couverture: ${stockCouvAfter}`
);

// TEST 4: Insufficient stock blocking (Order requiring Bristol when Bristol stock is 0 -> block with itemized error)
console.log('\n--- TEST 4: Insufficient Stock Blocking ---');
// Temporarily set Bristol stock to 0
dbStore.updateState(draft => {
  const p = draft.products.find(item => item.id === prodBristol.id);
  if (p) {
    p.currentStock = 0;
    p.prestationStock = 0;
    if (p.stockByStore) {
      Object.keys(p.stockByStore).forEach(k => { p.stockByStore![k] = 0; });
    }
  }
});

const availabilityCheck = dbStore.checkConsumablesStockAvailability([order2Item], agencyA);
assert(
  !availabilityCheck.isAvailable && availabilityCheck.missingItems.some(m => m.productId === prodBristol.id && m.missingQty === 1),
  'Test 4: Pre-validation blocks order creation when Bristol stock is 0',
  `Availability status: ${availabilityCheck.isAvailable}, Summary: ${availabilityCheck.summaryMessage}`
);

// Restore Bristol stock to 9
dbStore.updateState(draft => {
  const p = draft.products.find(item => item.id === prodBristol.id);
  if (p) {
    p.currentStock = 9;
    p.prestationStock = 9;
    if (p.stockByStore) {
      Object.keys(p.stockByStore).forEach(k => { p.stockByStore![k] = 9; });
    }
  }
});

// TEST 5: Client Support Provided (Client brings Bristol -> Bristol deduction is 0, other internal consumables deducted)
console.log('\n--- TEST 5: Client Support Provided Mode ---');
const order3Item: OrderItem = {
  id: 'item-reliure-client-supp',
  serviceId: srvReliure.id,
  serviceName: srvReliure.name,
  quantity: 1,
  unit: 'document',
  unitPrice: 5000,
  totalPrice: 5000,
  discountPercent: 0,
  isClientSuppliedSupport: true
};
const order3: Order = {
  id: 'ord-test-rel-client-01',
  tenantId: agencyA,
  orderNumber: 'CMD-TEST-003',
  customerType: 'WALK_IN',
  personName: 'Ousmane Bah',
  isClientSupportProvided: true,
  status: 'PENDING',
  paymentStatus: 'PAID',
  deliveryStatus: 'UNDELIVERED',
  priority: 'NORMAL',
  items: [order3Item],
  subtotal: 5000,
  totalAmount: 5000,
  paidAmount: 5000,
  dueAmount: 0,
  createdAt: new Date().toISOString()
} as Order;

dbStore.updateState(draft => { draft.orders.push(order3); });
const prevBri = dbStore.getState().products.find(p => p.id === prodBristol.id)?.prestationStock;
const deductRes3 = dbStore.deductConsumablesForOrder(order3.id, agencyA, 'Test Runner', undefined, { isClientSupportProvided: true });
const nextBri = dbStore.getState().products.find(p => p.id === prodBristol.id)?.prestationStock;

assert(
  deductRes3.success && nextBri === prevBri,
  'Test 5: Client Support Mode produces 0 deduction for client material',
  `Bristol stock unchanged: ${prevBri} -> ${nextBri}`
);

// TEST 6: Multi-Store creation within agency (Main store + Workshop store)
console.log('\n--- TEST 6: Multi-Store Creation ---');
const storeMainRes = dbStore.createStore({
  name: 'Magasin Principal Kaloum',
  code: 'MAG-KAL-MAIN',
  type: 'MAIN',
  location: 'Rez-de-chaussée',
  isDefault: true
}, agencyA, 'Admin Test');

const storeWorkshopRes = dbStore.createStore({
  name: 'Magasin Atelier Prestations',
  code: 'MAG-KAL-ATELIER',
  type: 'WORKSHOP',
  location: '1er Étage Atelier'
}, agencyA, 'Admin Test');

assert(
  storeMainRes.success && storeWorkshopRes.success && Boolean(storeMainRes.store?.id) && Boolean(storeWorkshopRes.store?.id),
  'Test 6: Multi-Stores Created within Agency A',
  `Main: ${storeMainRes.store?.id}, Workshop: ${storeWorkshopRes.store?.id}`
);

const storeMainId = storeMainRes.store!.id;
const storeWorkshopId = storeWorkshopRes.store!.id;

// Initialize product store stock for transfer test
dbStore.updateState(draft => {
  const p = draft.products.find(item => item.id === prodPapierA4.id);
  if (p) {
    if (!p.stockByStore) p.stockByStore = {};
    p.stockByStore[storeMainId] = 400;
    p.stockByStore[storeWorkshopId] = 98;
  }
});

// TEST 7: Inter-store transfer within same agency (Transfer 50 units from Main to Workshop)
console.log('\n--- TEST 7: Inter-Store Transfer within Same Agency ---');
const transferRes = dbStore.transferStockBetweenStores(
  prodPapierA4.id,
  storeMainId,
  storeWorkshopId,
  50,
  agencyA,
  'Chef Atelier',
  'Approvisionnement Atelier pour grosses commandes'
);

const pAfterTransfer = dbStore.getState().products.find(p => p.id === prodPapierA4.id);
const mainQty = pAfterTransfer?.stockByStore?.[storeMainId];
const workshopQty = pAfterTransfer?.stockByStore?.[storeWorkshopId];

assert(
  transferRes.success && mainQty === 350 && workshopQty === 148,
  'Test 7: Inter-Store Transfer Executed Successfully (400->350, 98->148)',
  `Transfer message: ${transferRes.message}, Main: ${mainQty}, Workshop: ${workshopQty}`
);

// TEST 8: Inter-agency transfer blocking (Attempting to transfer between Agency A and Agency B is strictly rejected)
console.log('\n--- TEST 8: Inter-Agency Transfer Blocking ---');
const storeBRes = dbStore.createStore({
  name: 'Magasin Agence B',
  code: 'MAG-AGB-01',
  type: 'MAIN'
}, agencyB, 'Admin Agency B');

const storeBId = storeBRes.store!.id;

const illegalTransferRes = dbStore.transferStockBetweenStores(
  prodPapierA4.id,
  storeMainId,
  storeBId,
  10,
  agencyA,
  'Hacker',
  'Transfert illégal inter-agences'
);

assert(
  !illegalTransferRes.success && illegalTransferRes.statusCode === 403,
  'Test 8: Inter-Agency Stock Transfer is Strictly Prohibited & Blocked with 403',
  `Blocked message: ${illegalTransferRes.message}`
);

// TEST 9: Agency Data Isolation
console.log('\n--- TEST 9: Agency Data Isolation ---');
const agencyAStores = dbStore.getStores(agencyA);
const agencyBStores = dbStore.getStores(agencyB);

const hasCrossPollution = agencyAStores.some(s => s.tenantId !== agencyA) || agencyBStores.some(s => s.tenantId !== agencyB);

assert(
  !hasCrossPollution && agencyAStores.length >= 2 && agencyBStores.length >= 1,
  'Test 9: Strict Multi-Agency Store Isolation Verified',
  `Agency A Stores: ${agencyAStores.length}, Agency B Stores: ${agencyBStores.length}`
);

// TEST 10: Order Cancellation Stock Restoration
console.log('\n--- TEST 10: Order Cancellation Stock Restoration ---');
const preRestoreStock = dbStore.getState().products.find(p => p.id === prodPapierA4.id)?.prestationStock || 0;
const restoreRes = dbStore.restoreConsumablesForOrder(order1.id, agencyA, 'Admin Annulation', 'Demande client avant début des travaux');
const postRestoreStock = dbStore.getState().products.find(p => p.id === prodPapierA4.id)?.prestationStock || 0;

assert(
  restoreRes.success && postRestoreStock === preRestoreStock + 2,
  'Test 10: Stock Restored Accurately on Order Cancellation (+2 sheets)',
  `Stock: ${preRestoreStock} -> ${postRestoreStock}, Restored count: ${restoreRes.restoredCount}`
);

// TEST 11: Generic Consumable Configuration Update via Engine
console.log('\n--- TEST 11: Generic Consumable Configuration Engine ---');
const updateServiceRes = dbStore.updateServiceConsumables(
  srvPhotocopie.id,
  'INTERNAL_VARIABLE',
  [
    { productId: prodPapierA4.id, productName: prodPapierA4.name, quantityPerUnit: 1, unit: 'feuille', isClientSupplied: false },
    { productId: prodCouverture.id, productName: prodCouverture.name, quantityPerUnit: 0.5, unit: 'feuille', isClientSupplied: false }
  ],
  true,
  agencyA
);

const updatedSrv = dbStore.getState().services.find(s => s.id === srvPhotocopie.id);

assert(
  updateServiceRes.success && updatedSrv?.consumables?.length === 2,
  'Test 11: Generic Consumable Configuration Updated with Multi-Articles',
  `Configured consumables count: ${updatedSrv?.consumables?.length}`
);

console.log('\n================================================================');
console.log(`TEST SUITE RESULTS: ${passedTests}/${totalTests} TESTS PASSED`);
if (passedTests === totalTests) {
  console.log('🎉 ALL 11 TESTS PASSED WITH 100% SUCCESS!');
} else {
  console.log('⚠️ SOME TESTS FAILED. PLEASE REVIEW.');
}
console.log('================================================================');
