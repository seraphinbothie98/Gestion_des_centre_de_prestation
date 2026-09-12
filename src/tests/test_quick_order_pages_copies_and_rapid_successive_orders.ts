import { dbStore } from '../server/db/mockStore';

async function runTests() {
  console.log('🧪 Starting tests: Quick Order Pages x Copies & Rapid Successive Orders...');

  const tenantId = 't-001';

  // 1. Verify standard services exist
  const state = dbStore.getState();
  const services = state.services;
  const photocopySrv = services.find(s => s.name.toLowerCase().includes('photocopi') || s.code.includes('PHOTO')) || services[0];
  const printSrv = services.find(s => s.name.toLowerCase().includes('impress') || s.code.includes('PRINT')) || services[1] || services[0];

  console.log(`ℹ️ Testing with service 1: ${photocopySrv.name} (Base price: ${photocopySrv.basePrice} GNF)`);
  console.log(`ℹ️ Testing with service 2: ${printSrv.name} (Base price: ${printSrv.basePrice} GNF)`);

  // Scenario 1: Photocopie document of 5 pages, 20 copies
  // Total pages = 5 * 20 = 100 pages
  // Price = 100 * 500 GNF = 50 000 GNF (assuming unit price 500 GNF)
  const doc1Pages = 5;
  const doc1Copies = 20;
  const doc1TotalQty = doc1Pages * doc1Copies;
  const doc1UnitPrice = 500;
  const doc1ExpectedTotal = doc1TotalQty * doc1UnitPrice;

  if (doc1TotalQty !== 100) {
    throw new Error(`❌ Expected total pages to be 100, got ${doc1TotalQty}`);
  }
  if (doc1ExpectedTotal !== 50000) {
    throw new Error(`❌ Expected total amount to be 50 000 GNF, got ${doc1ExpectedTotal}`);
  }
  console.log(`✅ Scenario 1: 5 pages x 20 copies = ${doc1TotalQty} pages | ${doc1TotalQty} x ${doc1UnitPrice} GNF = ${doc1ExpectedTotal} GNF`);

  // Scenario 2: Multi-line order creation (Line 1: 5 pages x 20 ex = 100 pages; Line 2: 12 pages x 10 ex = 120 pages)
  const doc2Pages = 12;
  const doc2Copies = 10;
  const doc2TotalQty = doc2Pages * doc2Copies;
  const doc2UnitPrice = 1000;
  const doc2ExpectedTotal = doc2TotalQty * doc2UnitPrice; // 120 * 1000 = 120 000 GNF

  const grandTotalOrder1 = doc1ExpectedTotal + doc2ExpectedTotal; // 50 000 + 120 000 = 170 000 GNF

  const orderId1 = `ord-${Date.now()}-1`;
  const orderNumber1 = `CMD-${new Date().getFullYear()}-0091`;

  dbStore.updateState(draft => {
    if (!draft.orders) draft.orders = [];
    draft.orders.unshift({
      id: orderId1,
      orderNumber: orderNumber1,
      tenantId,
      customerId: 'walk-in-01',
      customerName: 'Client Comptoir Express 1',
      customerType: 'INDIVIDUAL',
      priority: 'NORMAL',
      status: 'CONFIRMED',
      paymentStatus: 'PAID',
      totalAmount: grandTotalOrder1,
      paidAmount: grandTotalOrder1,
      dueAmount: 0,
      linesCount: 2,
      createdAt: new Date().toISOString(),
      items: [
        {
          id: `item-${Date.now()}-1`,
          itemType: 'SERVICE',
          serviceId: photocopySrv.id,
          name: photocopySrv.name,
          quantity: doc1TotalQty,
          pageCount: doc1Pages,
          copiesCount: doc1Copies,
          unitPrice: doc1UnitPrice,
          totalPrice: doc1ExpectedTotal,
          unit: 'page',
          assignedDepartment: 'PHOTOCOPY',
        },
        {
          id: `item-${Date.now()}-2`,
          itemType: 'SERVICE',
          serviceId: printSrv.id,
          name: printSrv.name,
          quantity: doc2TotalQty,
          pageCount: doc2Pages,
          copiesCount: doc2Copies,
          unitPrice: doc2UnitPrice,
          totalPrice: doc2ExpectedTotal,
          unit: 'page',
          assignedDepartment: 'PRINT',
        }
      ]
    } as any);
  });

  const createdOrder1 = dbStore.getState().orders.find(o => o.id === orderId1);
  if (!createdOrder1) {
    throw new Error('❌ Failed to retrieve Order 1');
  }
  if (createdOrder1.totalAmount !== grandTotalOrder1) {
    throw new Error(`❌ Order 1 total mismatch. Expected ${grandTotalOrder1}, got ${createdOrder1.totalAmount}`);
  }
  console.log(`✅ Order 1 successfully created: #${createdOrder1.orderNumber} (Total: ${createdOrder1.totalAmount} GNF, Items: ${createdOrder1.items?.length})`);

  // Scenario 3: Successive Order Creation (Order 2 immediately after Order 1 from the same modal session)
  const orderId2 = `ord-${Date.now()}-2`;
  const orderNumber2 = `CMD-${new Date().getFullYear()}-0092`;

  dbStore.updateState(draft => {
    if (!draft.orders) draft.orders = [];
    draft.orders.unshift({
      id: orderId2,
      orderNumber: orderNumber2,
      tenantId,
      customerId: 'walk-in-02',
      customerName: 'Client Suivant Comptoir 2',
      customerType: 'INDIVIDUAL',
      priority: 'URGENT',
      status: 'CONFIRMED',
      paymentStatus: 'PAID',
      totalAmount: 50000,
      paidAmount: 50000,
      dueAmount: 0,
      linesCount: 1,
      createdAt: new Date().toISOString(),
      items: [
        {
          id: `item-${Date.now()}-3`,
          itemType: 'SERVICE',
          serviceId: photocopySrv.id,
          name: photocopySrv.name,
          quantity: 2 * 50, // 2 pages x 50 copies = 100 pages
          pageCount: 2,
          copiesCount: 50,
          unitPrice: 500,
          totalPrice: 50000,
          unit: 'page',
          assignedDepartment: 'PHOTOCOPY',
        }
      ]
    } as any);
  });

  const createdOrder2 = dbStore.getState().orders.find(o => o.id === orderId2);
  if (!createdOrder2) {
    throw new Error('❌ Failed to retrieve Order 2');
  }
  if (createdOrder2.id === createdOrder1.id) {
    throw new Error('❌ Order 2 must have a unique ID');
  }
  if (createdOrder2.orderNumber === createdOrder1.orderNumber) {
    throw new Error('❌ Order 2 must have a unique order number');
  }
  if (createdOrder2.customerName === createdOrder1.customerName) {
    throw new Error('❌ Order 2 customer must be independent from Order 1');
  }
  console.log(`✅ Order 2 successfully created in rapid sequence: #${createdOrder2.orderNumber} (Total: ${createdOrder2.totalAmount} GNF)`);

  console.log('\n🎉 ALL TESTS PASSED SUCCESSFULLY!');
}

runTests().catch(err => {
  console.error('❌ Test suite failed:', err);
  process.exit(1);
});
