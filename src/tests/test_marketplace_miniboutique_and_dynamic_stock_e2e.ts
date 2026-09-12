import { dbStore } from '../server/db/mockStore';
import { Product, Tenant, Order, StockMovement } from '../types';
import { MarketplaceCartItem } from '../modules/marketplace/types';

function assert(condition: boolean, message: string) {
  if (!condition) {
    console.error(`❌ ASSERTION FAILED: ${message}`);
    throw new Error(`Assertion failed: ${message}`);
  }
  console.log(`  ✓ ${message}`);
}

async function runAll15Tests() {
  console.log('================================================================================');
  console.log('SUITE E2E — CORRECTION MARKETPLACE : MINI-BOUTIQUE + COMMANDES ET STOCK DYNAMIQUES');
  console.log('================================================================================\n');

  // Setup test environment
  const testTenantAId = 't-store-alpha';
  const testTenantBId = 't-store-beta';

  const tenantA: Tenant = {
    id: testTenantAId,
    name: 'Boutique Alpha Tech Conakry',
    slug: 'alpha-tech',
    status: 'ACTIVE',
    city: 'Conakry',
    isOnline: false, // For offline testing
    createdAt: new Date().toISOString()
  };

  const tenantB: Tenant = {
    id: testTenantBId,
    name: 'Boutique Beta Mode Madina',
    slug: 'beta-mode',
    status: 'ACTIVE',
    city: 'Conakry',
    isOnline: true,
    createdAt: new Date().toISOString()
  };

  const productSamsung: Product = {
    id: 'prod-samsung-s24',
    tenantId: testTenantAId,
    name: 'Smartphone Samsung Galaxy S24',
    category: 'Téléphonie',
    currentStock: 2,
    baseUnit: 'pièce',
    publicUnit: 'Unité',
    publicPrice: 10000000,
    salePrice: 10000000,
    costPrice: 8500000,
    conversionFactorToStockUnit: 1,
    isActive: true,
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString()
  };

  const productShoesB: Product = {
    id: 'prod-shoes-beta',
    tenantId: testTenantBId,
    name: 'Chaussures Cuir Beta',
    category: 'Mode',
    currentStock: 10,
    baseUnit: 'paire',
    publicUnit: 'Paire',
    publicPrice: 350000,
    salePrice: 350000,
    costPrice: 200000,
    conversionFactorToStockUnit: 1,
    isActive: true,
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString()
  };

  // Populate state
  dbStore.updateState(draft => {
    if (!draft.tenants) draft.tenants = [];
    draft.tenants = draft.tenants.filter(t => t.id !== testTenantAId && t.id !== testTenantBId);
    draft.tenants.push(tenantA, tenantB);

    if (!draft.products) draft.products = [];
    draft.products = draft.products.filter(p => p.id !== productSamsung.id && p.id !== productShoesB.id);
    draft.products.push(productSamsung, productShoesB);

    if (!draft.orders) draft.orders = [];
    draft.orders = draft.orders.filter(o => o.tenantId !== testTenantAId && o.tenantId !== testTenantBId);

    if (!draft.notifications) draft.notifications = [];
    draft.notifications = draft.notifications.filter(n => n.tenantId !== testTenantAId && n.tenantId !== testTenantBId);

    if (!draft.stockMovements) draft.stockMovements = [];
    draft.stockMovements = draft.stockMovements.filter(m => m.tenantId !== testTenantAId && m.tenantId !== testTenantBId);
  });

  // ---------------------------------------------------------------------------
  // TEST 1: Entrer dans Boutique A, cliquer sur un produit (contexte Boutique A)
  // ---------------------------------------------------------------------------
  console.log('\n--- TEST 1: Contexte Fiche Produit dans Boutique A ---');
  const storeA = dbStore.getState().tenants.find(t => t.id === testTenantAId);
  assert(!!storeA && storeA.name === 'Boutique Alpha Tech Conakry', 'Boutique A accessible');
  const pA = dbStore.getState().products.find(p => p.id === productSamsung.id && p.tenantId === storeA?.id);
  assert(!!pA && pA.tenantId === testTenantAId, 'Produit Samsung lié fidèlement au contexte de Boutique A (product_id + boutique_id)');

  // ---------------------------------------------------------------------------
  // TEST 2: Ajouter au panier directement depuis la mini-boutique
  // ---------------------------------------------------------------------------
  console.log('\n--- TEST 2: Ajout au panier direct depuis la mini-boutique ---');
  const cartItemA: MarketplaceCartItem = {
    productId: productSamsung.id,
    productName: productSamsung.name,
    productCode: 'TEL-001',
    storeId: testTenantAId,
    storeName: tenantA.name,
    storeCity: tenantA.city,
    isStoreOnline: false,
    unitPrice: productSamsung.publicPrice || 10000000,
    quantity: 1,
    unit: 'Unité'
  };
  assert(cartItemA.storeId === testTenantAId && cartItemA.productId === productSamsung.id, 'Panier conserve boutique_id, product_id, prix et quantité');

  // ---------------------------------------------------------------------------
  // TEST 3: Commander directement depuis la mini-boutique
  // ---------------------------------------------------------------------------
  console.log('\n--- TEST 3: Création de commande directe depuis la mini-boutique ---');
  const orderRes1 = dbStore.createMarketplaceOrders({
    items: [cartItemA],
    customerName: 'Ibrahima Diallo',
    customerPhone: '+224 620 11 22 33',
    customerId: 'user-client-001',
    deliveryCity: 'Conakry',
    deliveryAddress: 'Kipé Centre Émetteur',
    orderNotes: 'Livraison urgente'
  });
  assert(orderRes1.success && orderRes1.createdOrders.length === 1, 'Commande 1 créée avec succès directement depuis la mini-boutique');
  const order1 = orderRes1.createdOrders[0];
  assert(order1.status === 'PENDING', 'Statut initial de la commande = PENDING (en attente de validation vendeur)');
  assert(order1.items[0].requestedQuantity === 1, 'Quantité demandée enregistrée = 1');

  // ---------------------------------------------------------------------------
  // TEST 4: Produit avec stock = 2. Client commande 1. Vendeur valide 1. Vérifier 2 -> 1
  // ---------------------------------------------------------------------------
  console.log('\n--- TEST 4: Stock = 2, Commande = 1, Validation Vendeur = 1 -> Stock = 1 ---');
  const initialStockT4 = dbStore.getState().products.find(p => p.id === productSamsung.id)!.currentStock;
  assert(initialStockT4 === 2, 'Stock initial avant validation = 2');

  const valRes1 = dbStore.validateMarketplaceOrder({
    orderId: order1.id,
    itemValidations: [{ itemId: order1.items[0].id, validatedQuantity: 1 }],
    performedByName: 'Gérant Alpha Tech'
  });
  assert(valRes1.success, 'Validation vendeur de la commande 1 réussie');
  assert(valRes1.order?.status === 'CONFIRMED', 'Commande 1 confirmée');
  assert(valRes1.order?.items[0].validatedQuantity === 1, 'Quantité validée = 1');

  const stockAfterT4 = dbStore.getState().products.find(p => p.id === productSamsung.id)!.currentStock;
  assert(stockAfterT4 === 1, `Stock déduit correctement : 2 -> ${stockAfterT4}`);

  // ---------------------------------------------------------------------------
  // TEST 5: Produit avec stock = 1. Client demande 2 à 23h. Vérifier que la commande passe.
  // ---------------------------------------------------------------------------
  console.log('\n--- TEST 5: Stock = 1, Demande client = 2 -> Commande envoyée sans blocage ---');
  const cartItemA2: MarketplaceCartItem = {
    productId: productSamsung.id,
    productName: productSamsung.name,
    productCode: 'TEL-001',
    storeId: testTenantAId,
    storeName: tenantA.name,
    storeCity: tenantA.city,
    isStoreOnline: false,
    unitPrice: productSamsung.publicPrice || 10000000,
    quantity: 2, // Requested 2 while stock is 1
    unit: 'Unité'
  };

  const orderRes2 = dbStore.createMarketplaceOrders({
    items: [cartItemA2],
    customerName: 'Fatoumata Binta Camara',
    customerPhone: '+224 628 99 88 77',
    deliveryCity: 'Conakry',
    deliveryAddress: 'Taouyah',
    orderNotes: 'Commande de 2 téléphones'
  });
  assert(orderRes2.success && orderRes2.createdOrders.length === 1, 'Commande 2 enregistrée sans blocage même si demandée (2) > stock (1)');
  const order2 = orderRes2.createdOrders[0];
  assert(order2.items[0].requestedQuantity === 2, 'Quantité demandée = 2 enregistrée');
  assert(order2.status === 'PENDING', 'Commande 2 en attente de validation vendeur');

  // Verify stock is not yet deducted upon simple creation
  const stockBeforeValidation = dbStore.getState().products.find(p => p.id === productSamsung.id)!.currentStock;
  assert(stockBeforeValidation === 1, 'Stock toujours inchangé à 1 avant validation vendeur');

  // ---------------------------------------------------------------------------
  // TEST 6: Vendeur ouvre la commande. Stock = 1, Demandé = 2. Vendeur valide 1.
  // ---------------------------------------------------------------------------
  console.log('\n--- TEST 6: Validation partielle vendeur (1 validé sur 2 demandés) ---');
  const valRes2 = dbStore.validateMarketplaceOrder({
    orderId: order2.id,
    itemValidations: [{ itemId: order2.items[0].id, validatedQuantity: 1 }],
    performedByName: 'Gérant Alpha Tech',
    notes: 'Fourniture de 1 unité disponible immédiatement'
  });
  assert(valRes2.success, 'Validation partielle réussie');
  assert(valRes2.order?.items[0].requestedQuantity === 2, 'Quantité demandée initiale conservée : 2');
  assert(valRes2.order?.items[0].validatedQuantity === 1, 'Quantité validée par le vendeur : 1');
  assert(valRes2.order?.totalAmount === 10000000, 'Montant total réajusté à 1 unité (10 000 000 GNF au lieu de 20 000 000 GNF)');

  // ---------------------------------------------------------------------------
  // TEST 7: Après validation de 1 : Vérifier 1 -> 0
  // ---------------------------------------------------------------------------
  console.log('\n--- TEST 7: Stock après validation partielle : 1 -> 0 ---');
  const stockAfterT7 = dbStore.getState().products.find(p => p.id === productSamsung.id)!.currentStock;
  assert(stockAfterT7 === 0, `Stock déduit pour la quantité validée : 1 -> ${stockAfterT7}`);

  // ---------------------------------------------------------------------------
  // TEST 8: Vérifier qu'une nouvelle validation ne peut jamais créer stock = -1
  // ---------------------------------------------------------------------------
  console.log('\n--- TEST 8: Prévention absolue de stock négatif (-1 interdit) ---');
  const orderRes3 = dbStore.createMarketplaceOrders({
    items: [{ ...cartItemA, quantity: 1 }],
    customerName: 'Amadou Barry',
    customerPhone: '+224 622 33 44 55',
    deliveryCity: 'Conakry',
    deliveryAddress: 'Dixinn'
  });
  const order3 = orderRes3.createdOrders[0];

  // Attempt to validate 1 when stock is 0
  const invalidVal = dbStore.validateMarketplaceOrder({
    orderId: order3.id,
    itemValidations: [{ itemId: order3.items[0].id, validatedQuantity: 1 }],
    performedByName: 'Gérant Alpha Tech'
  });
  assert(!invalidVal.success, 'Validation rejetée car stock réel = 0');
  const stockAfterAttempt = dbStore.getState().products.find(p => p.id === productSamsung.id)!.currentStock;
  assert(stockAfterAttempt === 0 && stockAfterAttempt >= 0, 'Stock resté à 0, aucun stock négatif (-1) possible');

  // ---------------------------------------------------------------------------
  // TEST 9: Vendeur hors ligne. Client passe commande à 23h. Vérifier enregistrement.
  // ---------------------------------------------------------------------------
  console.log('\n--- TEST 9: Vendeur hors ligne (23h) -> Commande enregistrée 24/7 ---');
  assert(tenantA.isOnline === false, 'Boutique Alpha Tech est hors ligne');
  const orderOffline = dbStore.createMarketplaceOrders({
    items: [{ ...cartItemA, quantity: 1 }],
    customerName: 'Client Nuit 23h',
    customerPhone: '+224 625 00 11 22',
    deliveryCity: 'Conakry',
    deliveryAddress: 'Madina Marché'
  });
  assert(orderOffline.success && orderOffline.createdOrders[0].status === 'PENDING', 'Commande 23h enregistrée avec succès auprès de la boutique hors ligne');

  // ---------------------------------------------------------------------------
  // TEST 10: Vendeur revient le matin -> Commande visible dans son espace
  // ---------------------------------------------------------------------------
  console.log('\n--- TEST 10: Vendeur se connecte le matin -> Commande visible ---');
  const storeOrders = dbStore.getState().orders.filter(o => o.tenantId === testTenantAId);
  const foundMorningOrder = storeOrders.find(o => o.personName === 'Client Nuit 23h');
  assert(!!foundMorningOrder, 'Commande de nuit visible dans le tableau de bord du vendeur Boutique A');

  // ---------------------------------------------------------------------------
  // TEST 11: Isolation Boutique A vs Boutique B (Aucune fuite de notification)
  // ---------------------------------------------------------------------------
  console.log('\n--- TEST 11: Isolation stricte des notifications et données par boutique ---');
  const notifsB = dbStore.getState().notifications.filter(n => n.tenantId === testTenantBId);
  const leakedOrderNotif = notifsB.find(n => n.message.includes(order1.orderNumber) || n.message.includes(order2.orderNumber));
  assert(!leakedOrderNotif, 'Boutique B n’a reçu AUCUNE notification des commandes de Boutique A');

  // ---------------------------------------------------------------------------
  // TEST 12: Panier multi-boutiques (Boutique A + Boutique B) -> Séparation automatique
  // ---------------------------------------------------------------------------
  console.log('\n--- TEST 12: Panier Multi-Boutiques -> Séparation en 2 commandes distinctes ---');
  const multiCart: MarketplaceCartItem[] = [
    {
      productId: productSamsung.id,
      productName: productSamsung.name,
      storeId: testTenantAId,
      storeName: tenantA.name,
      unitPrice: 10000000,
      quantity: 1,
      unit: 'Unité'
    },
    {
      productId: productShoesB.id,
      productName: productShoesB.name,
      storeId: testTenantBId,
      storeName: tenantB.name,
      unitPrice: 350000,
      quantity: 2,
      unit: 'Paire'
    }
  ];

  const multiRes = dbStore.createMarketplaceOrders({
    items: multiCart,
    customerName: 'Kadiatou Diallo',
    customerPhone: '+224 624 55 66 77',
    deliveryCity: 'Conakry',
    deliveryAddress: 'Lambanyi'
  });

  assert(multiRes.success && multiRes.createdOrders.length === 2, '2 commandes distinctes créées pour les 2 boutiques');
  const orderForA = multiRes.createdOrders.find(o => o.tenantId === testTenantAId);
  const orderForB = multiRes.createdOrders.find(o => o.tenantId === testTenantBId);
  assert(!!orderForA && orderForA.items[0].productId === productSamsung.id, 'Commande A assignée à Boutique Alpha Tech');
  assert(!!orderForB && orderForB.items[0].productId === productShoesB.id, 'Commande B assignée à Boutique Beta Mode');

  // ---------------------------------------------------------------------------
  // TEST 13: Commandes concurrentes sur stock limité -> Aucun stock négatif
  // ---------------------------------------------------------------------------
  console.log('\n--- TEST 13: Commandes concurrentes sur stock limité ---');
  // Set productShoesB stock = 2
  dbStore.updateState(draft => {
    const p = draft.products.find(x => x.id === productShoesB.id);
    if (p) p.currentStock = 2;
  });

  // Order X requests 2, Order Y requests 1
  const ordXRes = dbStore.createMarketplaceOrders({
    items: [{ productId: productShoesB.id, productName: productShoesB.name, storeId: testTenantBId, unitPrice: 350000, quantity: 2, unit: 'Paire' }],
    customerName: 'Client X',
    customerPhone: '+224 620 01 01 01',
    deliveryCity: 'Conakry',
    deliveryAddress: 'Kaloum'
  });

  const ordYRes = dbStore.createMarketplaceOrders({
    items: [{ productId: productShoesB.id, productName: productShoesB.name, storeId: testTenantBId, unitPrice: 350000, quantity: 1, unit: 'Paire' }],
    customerName: 'Client Y',
    customerPhone: '+224 620 02 02 02',
    deliveryCity: 'Conakry',
    deliveryAddress: 'Matam'
  });

  const ordX = ordXRes.createdOrders[0];
  const ordY = ordYRes.createdOrders[0];

  // Vendor validates X first (takes 2)
  const valX = dbStore.validateMarketplaceOrder({
    orderId: ordX.id,
    itemValidations: [{ itemId: ordX.items[0].id, validatedQuantity: 2 }],
    performedByName: 'Gérant Beta Mode'
  });
  assert(valX.success, 'Validation de la commande X (2 unités) réussie');
  assert(dbStore.getState().products.find(p => p.id === productShoesB.id)!.currentStock === 0, 'Stock de Chaussures passé à 0');

  // Vendor attempts to validate Y (which requested 1)
  const valY = dbStore.validateMarketplaceOrder({
    orderId: ordY.id,
    itemValidations: [{ itemId: ordY.items[0].id, validatedQuantity: 1 }],
    performedByName: 'Gérant Beta Mode'
  });
  assert(!valY.success, 'Validation de la commande Y rejetée car le stock est désormais épuisé (0)');
  assert(dbStore.getState().products.find(p => p.id === productShoesB.id)!.currentStock === 0, 'Stock resté strictement à 0 (jamais de stock négatif)');

  // ---------------------------------------------------------------------------
  // TEST 14: Vérifier que le stock affiché correspond réellement au stock en base
  // ---------------------------------------------------------------------------
  console.log('\n--- TEST 14: Exactitude du stock en base de données ---');
  const liveStockSamsung = dbStore.getState().products.find(p => p.id === productSamsung.id)!.currentStock;
  const liveStockShoes = dbStore.getState().products.find(p => p.id === productShoesB.id)!.currentStock;
  assert(liveStockSamsung === 0, `Stock Samsung en base = ${liveStockSamsung}`);
  assert(liveStockShoes === 0, `Stock Chaussures en base = ${liveStockShoes}`);

  // ---------------------------------------------------------------------------
  // TEST 15: Vérifier les mouvements de stock (StockMovement)
  // ---------------------------------------------------------------------------
  console.log('\n--- TEST 15: Traçabilité des mouvements de stock (StockMovement) ---');
  const movements = dbStore.getState().stockMovements.filter(m => m.tenantId === testTenantAId || m.tenantId === testTenantBId);
  assert(movements.length >= 3, `Au moins 3 mouvements de stock enregistrés (${movements.length} trouvés)`);

  const movOrder1 = movements.find(m => m.relatedOrderId === order1.id);
  assert(!!movOrder1 && movOrder1.productId === productSamsung.id && movOrder1.quantity === -1, 'Mouvement pour Commande 1 bien tracé (-1 unité Samsung)');

  const movOrder2 = movements.find(m => m.relatedOrderId === order2.id);
  assert(!!movOrder2 && movOrder2.productId === productSamsung.id && movOrder2.quantity === -1, 'Mouvement pour Commande 2 bien tracé (validation partielle -1 unité Samsung)');

  const movOrderX = movements.find(m => m.relatedOrderId === ordX.id && m.tenantId === testTenantBId);
  assert(!!movOrderX && movOrderX.productId === productShoesB.id && movOrderX.quantity === -2, 'Mouvement pour Commande X bien tracé (-2 paires Chaussures Boutique Beta)');

  console.log('\n================================================================================');
  console.log('✅ LES 15 TESTS ONT ÉTÉ EXÉCUTÉS AVEC SUCCÈS SANS AUCUNE ERREUR !');
  console.log('================================================================================');
}

runAll15Tests().catch(err => {
  console.error('Test Suite Failed:', err);
  process.exit(1);
});
