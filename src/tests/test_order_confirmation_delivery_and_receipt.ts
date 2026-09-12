import { dbStore } from '../server/db/mockStore';

async function runTests() {
  console.log('🧪 Starting tests: Confirmation Modal Delivery Validation & Receipt Printing...');

  const tenantId = 't-001';
  const state = dbStore.getState();
  const service1 = state.services[0];
  const service2 = state.services[1] || service1;

  // -------------------------------------------------------------
  // TEST 1: Fully Paid Order -> Delivery Validation Success
  // -------------------------------------------------------------
  console.log('\n--- TEST 1: Commande Entièrement Payée -> Validation Livraison ---');
  const orderId1 = `ord-test-paid-${Date.now()}`;
  const orderNum1 = `CMD-2026-PAID-01`;
  const orderAmount1 = 50000;

  dbStore.updateState(draft => {
    if (!draft.orders) draft.orders = [];
    draft.orders.unshift({
      id: orderId1,
      orderNumber: orderNum1,
      tenantId,
      customerId: 'client-1',
      customerName: 'M. Mamadou Diallo',
      customerType: 'INDIVIDUAL',
      priority: 'NORMAL',
      status: 'PENDING',
      paymentStatus: 'PAID',
      deliveryStatus: 'UNDELIVERED',
      totalAmount: orderAmount1,
      paidAmount: orderAmount1,
      dueAmount: 0,
      stockDeducted: false,
      items: [
        {
          id: `item-1`,
          itemType: 'SERVICE',
          serviceId: service1.id,
          name: service1.name,
          quantity: 100,
          unitPrice: 500,
          totalPrice: orderAmount1,
          productionStatus: 'PENDING',
        }
      ],
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString()
    } as any);

    if (!draft.payments) draft.payments = [];
    draft.payments.unshift({
      id: `pay-test-1`,
      tenantId,
      personName: 'M. Mamadou Diallo',
      targetType: 'ORDER',
      orderId: orderId1,
      orderNumber: orderNum1,
      paymentNumber: `PAY-2026-0001`,
      amount: orderAmount1,
      balanceBefore: orderAmount1,
      balanceAfter: 0,
      paymentType: 'BALANCE_PAYMENT',
      paymentMethod: 'CASH',
      receivedByUserName: 'Caissier Test',
      createdAt: new Date().toISOString()
    } as any);
  });

  const deliveryRes1 = dbStore.deliverCommercialOrder(orderId1, tenantId, {
    id: 'usr-caissier-1',
    name: 'Aissatou Barry'
  });

  if (!deliveryRes1.success) {
    throw new Error(`❌ Delivery failed unexpectedly: ${deliveryRes1.message}`);
  }

  const deliveredOrder1 = dbStore.getState().orders.find(o => o.id === orderId1);
  if (!deliveredOrder1 || deliveredOrder1.status !== 'DELIVERED' || deliveredOrder1.deliveryStatus !== 'DELIVERED') {
    throw new Error(`❌ Order status was not updated to DELIVERED. Got ${deliveredOrder1?.status}`);
  }
  if (deliveredOrder1.deliveredByUserName !== 'Aissatou Barry') {
    throw new Error(`❌ DeliveredBy user mismatch: ${deliveredOrder1.deliveredByUserName}`);
  }
  if (deliveredOrder1.items[0].productionStatus !== 'DELIVERED') {
    throw new Error(`❌ Order items were not marked DELIVERED`);
  }
  console.log(`✅ Order ${orderNum1} successfully delivered with status DELIVERED.`);

  // -------------------------------------------------------------
  // TEST 2: Anti-Double Delivery Protection (Idempotence)
  // -------------------------------------------------------------
  console.log('\n--- TEST 2: Protection Anti-Double Livraison ---');
  const doubleDeliveryRes = dbStore.deliverCommercialOrder(orderId1, tenantId, {
    id: 'usr-caissier-1',
    name: 'Aissatou Barry'
  });

  if (doubleDeliveryRes.success) {
    throw new Error(`❌ Second delivery should have been rejected as already delivered!`);
  }
  console.log(`✅ Double delivery prevented properly: "${doubleDeliveryRes.message}"`);

  // -------------------------------------------------------------
  // TEST 3: Unpaid / Partially Paid Order -> Delivery Rejection
  // -------------------------------------------------------------
  console.log('\n--- TEST 3: Commande Non Soldée -> Refus de Livraison ---');
  const orderId2 = `ord-test-unpaid-${Date.now()}`;
  const orderNum2 = `CMD-2026-UNPAID-02`;
  const orderAmount2 = 100000;
  const paidAmount2 = 40000;
  const dueAmount2 = 60000;

  dbStore.updateState(draft => {
    if (!draft.orders) draft.orders = [];
    draft.orders.unshift({
      id: orderId2,
      orderNumber: orderNum2,
      tenantId,
      customerId: 'client-2',
      customerName: 'Entreprise GSB',
      customerType: 'COMPANY',
      priority: 'HIGH',
      status: 'PENDING',
      paymentStatus: 'PARTIALLY_PAID',
      deliveryStatus: 'UNDELIVERED',
      totalAmount: orderAmount2,
      paidAmount: paidAmount2,
      dueAmount: dueAmount2,
      stockDeducted: false,
      items: [
        {
          id: `item-2`,
          itemType: 'SERVICE',
          serviceId: service2.id,
          name: service2.name,
          quantity: 50,
          unitPrice: 2000,
          totalPrice: orderAmount2,
          productionStatus: 'PENDING',
        }
      ],
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString()
    } as any);
  });

  const unpaidDeliveryRes = dbStore.deliverCommercialOrder(orderId2, tenantId, {
    id: 'usr-caissier-1',
    name: 'Aissatou Barry'
  });

  if (unpaidDeliveryRes.success) {
    throw new Error(`❌ Unpaid order was delivered, which violates the payment rule!`);
  }
  if (!unpaidDeliveryRes.message.includes("n'est pas entièrement payée")) {
    throw new Error(`❌ Unexpected rejection message: ${unpaidDeliveryRes.message}`);
  }

  const order2Check = dbStore.getState().orders.find(o => o.id === orderId2);
  if (order2Check?.status === 'DELIVERED') {
    throw new Error(`❌ Unpaid order status changed to DELIVERED`);
  }
  console.log(`✅ Unpaid delivery rejected as required: "${unpaidDeliveryRes.message}"`);

  // -------------------------------------------------------------
  // TEST 4: Receipt Data Matching
  // -------------------------------------------------------------
  console.log('\n--- TEST 4: Données du Reçu de Paiement ---');
  const paymentForOrder1 = dbStore.getState().payments.find(p => p.orderId === orderId1);
  if (!paymentForOrder1) {
    throw new Error(`❌ Payment record for order 1 not found`);
  }
  if (paymentForOrder1.amount !== orderAmount1 || paymentForOrder1.balanceAfter !== 0) {
    throw new Error(`❌ Payment record figures mismatch`);
  }
  console.log(`✅ Reçu #${paymentForOrder1.paymentNumber} parfaitement conforme pour ${deliveredOrder1?.customerName} (${deliveredOrder1?.totalAmount} GNF).`);

  // -------------------------------------------------------------
  // TEST 5: Client Notification Triggered
  // -------------------------------------------------------------
  console.log('\n--- TEST 5: Notification Client Enregistrée ---');
  const notifs = dbStore.getState().notifications.filter(n => n.title?.includes(orderNum1) || n.message?.includes(orderNum1));
  if (notifs.length === 0) {
    throw new Error(`❌ Client notification for delivered order not generated`);
  }
  console.log(`✅ Notification client générée avec succès : "${notifs[0].title}"`);

  console.log('\n🎉 TOUS LES TESTS DE VALIDATION DE LIVRAISON & REÇU SONT VALIDÉS AVEC SUCCÈS !');
}

runTests().catch(err => {
  console.error('❌ Test suite failed:', err);
  process.exit(1);
});
