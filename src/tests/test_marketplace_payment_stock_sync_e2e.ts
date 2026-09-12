import { dbStore } from '../server/db/mockStore';
import { Product, Order, Store } from '../types';

function assert(condition: boolean, message: string) {
  if (!condition) {
    console.error(`❌ FAILED: ${message}`);
    throw new Error(`Assertion failed: ${message}`);
  } else {
    console.log(`✅ PASSED: ${message}`);
  }
}

async function runMarketplacePaymentStockSyncTests() {
  console.log('\n===============================================================');
  console.log('🧪 TEST SUITE: SYNCHRONISATION PAIEMENT / COMMANDE / STOCK MAGASIN');
  console.log('===============================================================\n');

  // Setup test environment with two distinct boutiques
  const STORE_A = 'tenant-boutique-alpha';
  const STORE_B = 'tenant-boutique-beta';

  dbStore.updateState(draft => {
    // Add tenants
    if (!draft.tenants) draft.tenants = [];
    draft.tenants = draft.tenants.filter(t => t.id !== STORE_A && t.id !== STORE_B);
    draft.tenants.push({
      id: STORE_A,
      name: 'Boutique Alpha Tech',
      status: 'ACTIVE',
      plan: 'PREMIUM',
      currency: 'GNF',
      email: 'alpha@test.com',
      phone: '+224620000001',
      city: 'Conakry',
      address: 'Kaloum',
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString()
    });
    draft.tenants.push({
      id: STORE_B,
      name: 'Boutique Beta Mode',
      status: 'ACTIVE',
      plan: 'PREMIUM',
      currency: 'GNF',
      email: 'beta@test.com',
      phone: '+224620000002',
      city: 'Kindia',
      address: 'Centre-Ville',
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString()
    });

    // Add POS Stores for both
    if (!draft.stores) draft.stores = [];
    draft.stores = draft.stores.filter(s => s.tenantId !== STORE_A && s.tenantId !== STORE_B);
    draft.stores.push({
      id: 'store-pos-alpha',
      tenantId: STORE_A,
      name: 'Magasin Principal Alpha',
      code: 'MAG-ALPHA',
      type: 'POINT_OF_SALE',
      isDefault: true,
      isActive: true,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString()
    });
    draft.stores.push({
      id: 'store-pos-beta',
      tenantId: STORE_B,
      name: 'Magasin Principal Beta',
      code: 'MAG-BETA',
      type: 'POINT_OF_SALE',
      isDefault: true,
      isActive: true,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString()
    });

    // Products
    if (!draft.products) draft.products = [];
    draft.products = draft.products.filter(p => p.tenantId !== STORE_A && p.tenantId !== STORE_B);
    
    // Product A1: Simple product, stock = 10
    draft.products.push({
      id: 'prod-alpha-phone',
      tenantId: STORE_A,
      name: 'Smartphone Alpha X',
      code: 'PH-01',
      category: 'ELECTRONICS',
      costPrice: 500000,
      sellingPrice: 800000,
      currentStock: 10,
      stockByLocation: { 'MAIN_STORE': 10 },
      stockByStore: { 'store-pos-alpha': 10 },
      baseUnit: 'Pièce',
      publicUnit: 'Pièce',
      conversionFactorToStockUnit: 1,
      allowNegativeStock: false,
      isPublishedMarketplace: true,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString()
    });

    // Product A2: Product with unit conversion (1 Carton = 5 Paquets), stock = 30 paquets
    draft.products.push({
      id: 'prod-alpha-carton',
      tenantId: STORE_A,
      name: 'Cartouche d\'encre (Carton de 5)',
      code: 'INK-CARTON',
      category: 'SUPPLIES',
      costPrice: 20000,
      sellingPrice: 50000,
      currentStock: 30,
      stockByLocation: { 'MAIN_STORE': 30 },
      stockByStore: { 'store-pos-alpha': 30 },
      baseUnit: 'Paquet',
      publicUnit: 'Carton',
      conversionFactorToStockUnit: 5,
      allowNegativeStock: false,
      isPublishedMarketplace: true,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString()
    });

    // Product B1: Product for Store B, stock = 50
    draft.products.push({
      id: 'prod-beta-shoes',
      tenantId: STORE_B,
      name: 'Chaussures Sport Beta',
      code: 'SH-01',
      category: 'FASHION',
      costPrice: 100000,
      sellingPrice: 150000,
      currentStock: 50,
      stockByLocation: { 'MAIN_STORE': 50 },
      stockByStore: { 'store-pos-beta': 50 },
      baseUnit: 'Paire',
      publicUnit: 'Paire',
      conversionFactorToStockUnit: 1,
      allowNegativeStock: false,
      isPublishedMarketplace: true,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString()
    });
  });

  console.log('--- TEST 1: Creation of Marketplace Order (UNPAID) does NOT deduct stock ---');
  const createOrderRes = dbStore.createMarketplaceOrders({
    items: [
      {
        id: 'cart-1',
        productId: 'prod-alpha-phone',
        productName: 'Smartphone Alpha X',
        productCode: 'PH-01',
        unitPrice: 800000,
        quantity: 2,
        unit: 'Pièce',
        storeId: STORE_A,
        storeName: 'Boutique Alpha Tech'
      }
    ],
    customerName: 'Mamadou Diallo',
    customerPhone: '+224621111111',
    deliveryCity: 'Conakry',
    deliveryAddress: 'Dixinn'
  });

  assert(createOrderRes.success === true, 'Order created successfully');
  assert(createOrderRes.createdOrders.length === 1, '1 order created for Store Alpha');
  const orderAlpha = createOrderRes.createdOrders[0];
  assert(orderAlpha.paymentStatus === 'UNPAID', 'Order paymentStatus is UNPAID');
  assert(orderAlpha.status === 'PENDING', 'Order status is PENDING');
  assert(orderAlpha.stockDeducted !== true, 'Order stockDeducted is undefined or false');

  const prodAlphaInitial = dbStore.getState().products.find(p => p.id === 'prod-alpha-phone')!;
  assert(prodAlphaInitial.currentStock === 10, 'Stock remains unchanged at 10 while order is UNPAID');

  console.log('\n--- TEST 2: Payment Confirmation triggers dynamic deduction in Boutique Stock ---');
  const paymentRes = dbStore.recordOrderPayment({
    orderId: orderAlpha.id,
    amount: orderAlpha.totalAmount,
    paymentMethod: 'ORANGE_MONEY',
    cashierName: 'Système Paiement OM'
  });

  assert(paymentRes.success === true, 'Payment recorded successfully');
  assert(paymentRes.order?.paymentStatus === 'PAID', 'Order paymentStatus became PAID');
  assert(paymentRes.order?.status === 'CONFIRMED', 'Order status became CONFIRMED');
  assert(paymentRes.order?.stockDeducted === true, 'Order marked with stockDeducted: true');

  const prodAlphaAfterPayment = dbStore.getState().products.find(p => p.id === 'prod-alpha-phone')!;
  assert(prodAlphaAfterPayment.currentStock === 8, `Stock decremented from 10 to 8 (currentStock = ${prodAlphaAfterPayment.currentStock})`);
  assert(prodAlphaAfterPayment.stockByLocation?.['MAIN_STORE'] === 8, 'MAIN_STORE location stock also updated to 8');

  // Verify Stock Movement
  const movements = dbStore.getState().stockMovements || [];
  const orderMovement = movements.find(m => m.relatedOrderId === orderAlpha.id && m.productId === 'prod-alpha-phone');
  assert(Boolean(orderMovement), 'Traceable stock movement created for the order');
  assert(orderMovement?.movementType === 'BOUTIQUE_SALE', `Movement type is BOUTIQUE_SALE (${orderMovement?.movementType})`);
  assert(orderMovement?.quantity === -2, `Movement quantity is -2 (${orderMovement?.quantity})`);
  assert(orderMovement?.oldStock === 10 && orderMovement?.newStock === 8, 'Movement tracks oldStock (10) and newStock (8)');

  console.log('\n--- TEST 3: Idempotency Protection (Repeated payment does not deduct twice) ---');
  const repeatPaymentRes = dbStore.recordOrderPayment({
    orderId: orderAlpha.id,
    amount: 1000,
    cashierName: 'Système Paiement OM'
  });
  const prodAlphaAfterRepeat = dbStore.getState().products.find(p => p.id === 'prod-alpha-phone')!;
  assert(prodAlphaAfterRepeat.currentStock === 8, `Stock remains exactly 8 after duplicate payment trigger (${prodAlphaAfterRepeat.currentStock})`);

  console.log('\n--- TEST 4: Unit Conversion Factor (e.g. 2 Cartons of 5 Paquets = 10 Paquets deducted) ---');
  const orderCartonRes = dbStore.createMarketplaceOrders({
    items: [
      {
        id: 'cart-2',
        productId: 'prod-alpha-carton',
        productName: 'Cartouche d\'encre (Carton de 5)',
        productCode: 'INK-CARTON',
        unitPrice: 50000,
        quantity: 2, // 2 Cartons = 2 * 5 = 10 Paquets
        unit: 'Carton',
        storeId: STORE_A,
        storeName: 'Boutique Alpha Tech'
      }
    ],
    customerName: 'Fatoumata Camara',
    customerPhone: '+224622222222',
    deliveryCity: 'Conakry',
    deliveryAddress: 'Matam'
  });
  const orderCarton = orderCartonRes.createdOrders[0];
  dbStore.recordOrderPayment({
    orderId: orderCarton.id,
    amount: orderCarton.totalAmount,
    cashierName: 'Orange Money'
  });

  const prodCartonAfter = dbStore.getState().products.find(p => p.id === 'prod-alpha-carton')!;
  assert(prodCartonAfter.currentStock === 20, `Stock reduced from 30 to 20 base units (deducted 10 paquets for 2 cartons, got ${prodCartonAfter.currentStock})`);

  console.log('\n--- TEST 5: Multi-Store Isolation (Store Alpha purchase does not affect Store Beta) ---');
  const prodBeta = dbStore.getState().products.find(p => p.id === 'prod-beta-shoes')!;
  assert(prodBeta.currentStock === 50, `Store Beta stock remains 100% intact at 50 (${prodBeta.currentStock})`);

  console.log('\n--- TEST 6: Real World Packaging Test - Papier Ramette A4 (500 feuilles/paquet) ---');
  // Add product prod-ramette with packaging level 2 (paquet = 500 feuilles)
  dbStore.updateState(draft => {
    draft.products.push({
      id: 'prod-ramette-test',
      tenantId: STORE_A,
      name: 'Papier Ramette A4 80g Double A',
      code: 'RAM-A4-80G',
      baseUnit: 'feuille',
      unit: 'feuille',
      currentStock: 7000,
      stockByLocation: { 'MAIN_STORE': 7000 },
      packagings: [
        {
          id: 'pkg-ram-1',
          level: 2,
          unitName: 'paquet',
          containedQuantity: 500,
          subUnitName: 'feuille',
          factorToBase: 500,
          salePrice: 45000,
          purchasePrice: 40000,
          isAllowedForSale: true,
          isAllowedForPurchase: true,
          isDefaultSaleUnit: false,
          isDefaultPurchaseUnit: false
        }
      ],
      allowNegativeStock: false,
      isPublishedMarketplace: true,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString()
    });
  });

  // Client buys 1 paquet of Papier Ramette A4 on Marketplace
  const orderRametteRes = dbStore.createMarketplaceOrders({
    items: [
      {
        id: 'cart-ram-1',
        productId: 'prod-ramette-test',
        productName: 'Papier Ramette A4 80g Double A',
        productCode: 'RAM-A4-80G',
        unitPrice: 45000,
        quantity: 1, // 1 paquet = 500 feuilles
        unit: 'paquet',
        storeId: STORE_A,
        storeName: 'Boutique Alpha Tech'
      }
    ],
    customerName: 'Client Marketplace',
    customerPhone: '+224623333333',
    deliveryCity: 'Conakry',
    deliveryAddress: 'Kaloum'
  });

  const orderRamette = orderRametteRes.createdOrders[0];
  assert(orderRamette.status === 'PENDING', 'Order is PENDING initially');
  assert(orderRamette.paymentStatus === 'UNPAID', 'Order is UNPAID initially');

  // Merchant processes the order by clicking "Confirmer" (handleUpdateOrderStatus -> CONFIRMED)
  const confirmMerchantRes = dbStore.updateOrderStatus(orderRamette.id, 'CONFIRMED', 'Commerçant Alpha');
  assert(confirmMerchantRes.success === true, 'Merchant confirms order successfully');
  
  const prodRametteAfterConfirm = dbStore.getState().products.find(p => p.id === 'prod-ramette-test')!;
  assert(
    prodRametteAfterConfirm.currentStock === 6500,
    `Stock Ramette reduced from 7000 to 6500 feuilles (500 feuilles deducted for 1 paquet), got: ${prodRametteAfterConfirm.currentStock}`
  );

  console.log('\n--- TEST 7: Order Cancellation Restores Stock Correctly ---');
  const cancelRes = dbStore.updateOrderStatus(orderAlpha.id, 'CANCELLED', 'Gérant Boutique', 'Client a changé d\'avis');
  assert(cancelRes.success === true, 'Order cancelled successfully');
  
  const prodAlphaAfterCancel = dbStore.getState().products.find(p => p.id === 'prod-alpha-phone')!;
  assert(prodAlphaAfterCancel.currentStock === 10, `Stock restored from 8 back to 10 upon cancellation (${prodAlphaAfterCancel.currentStock})`);
  
  const returnMovement = (dbStore.getState().stockMovements || []).find(m => m.relatedOrderId === orderAlpha.id && m.movementType === 'RETURN');
  assert(Boolean(returnMovement), 'RETURN stock movement generated with reason');
  assert(returnMovement?.quantity === 2, `RETURN movement quantity is +2 (${returnMovement?.quantity})`);

  console.log('\n===============================================================');
  console.log('🎉 ALL 7 MARKETPLACE PAYMENT & STOCK SYNC TESTS PASSED 100% !');
  console.log('===============================================================\n');
}

runMarketplacePaymentStockSyncTests().catch(err => {
  console.error('Test execution failed:', err);
  process.exit(1);
});
