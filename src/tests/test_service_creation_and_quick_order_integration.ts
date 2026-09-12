/**
 * Automated Test: Service Creation in Services & Tarifs -> Integration in Quick Order Multi-Prestations
 */
import { dbStore } from '../server/db/mockStore';
import { calculateOrderStockRequirements, deductConsumablesForOrder } from '../lib/stockEngine';
import { getServiceSpecificationGroups, resolveServiceSpecsImpact } from '../lib/serviceSpecs';
import { Service, Order } from '../types';

async function runTests() {
  console.log('🧪 Starting test: Service Creation & Quick Order Integration Flow...\n');
  const tenantId = 't-001';

  // 1. Initial State Check
  const initialServicesCount = dbStore.getState().services.filter(s => s.tenantId === tenantId).length;
  console.log(`Initial services count for tenant ${tenantId}: ${initialServicesCount}`);

  // 2. Add Consumable Product for the new service to consume
  const consumableProductId = `prod-pochette-a3-${Date.now()}`;
  dbStore.updateState(draft => {
    draft.products.push({
      id: consumableProductId,
      tenantId: tenantId,
      code: 'CONS-PLAST-A3',
      name: 'Pochettes Plastification A3 125µ',
      categoryId: 'cat-fournitures-01',
      categoryName: 'Consommables Plastification',
      unit: 'pièce',
      purchaseUnit: 'paquet (100 pcs)',
      conversionFactor: 100,
      currentStock: 50, // 50 pouches available
      minStockAlert: 10,
      purchasePrice: 2000,
      sellingPrice: 5000,
      isSellable: false,
      isConsumable: true,
      isActive: true,
      stockLocation: 'Rayon Atelier Finition',
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString()
    });
  });

  // 3. Admin creates a new Service in "Services & Tarifs"
  const newServiceId = `srv-plast-a3-${Date.now()}`;
  const newService: Service = {
    id: newServiceId,
    tenantId: tenantId,
    categoryId: 'cat-finition-01',
    categoryName: 'Finition & Plastification',
    code: 'SRV-PLAST-A3-PRO',
    name: 'Plastification Grand Format A3 Express',
    description: 'Plastification thermique haute résistance pour documents A3',
    unit: 'document',
    baseCost: 2000,
    basePrice: 15000,
    requiresFile: false,
    estimatedDurationMinutes: 10,
    isActive: true,
    options: [
      {
        id: 'opt-epaisseur',
        name: 'Épaisseur Film',
        type: 'SELECT',
        values: [
          { id: 'v1', label: 'Standard 80 microns', priceDelta: 0, costDelta: 0 },
          { id: 'v2', label: 'Premium 125 microns', priceDelta: 2000, costDelta: 500 },
          { id: 'v3', label: 'Rigide 250 microns', priceDelta: 5000, costDelta: 1200 }
        ]
      }
    ],
    configurations: [
      {
        id: `cfg-${newServiceId}-1`,
        serviceId: newServiceId,
        optionValues: {},
        price: 15000,
        billingUnit: 'document',
        consumables: [
          {
            productId: consumableProductId,
            productName: 'Pochettes Plastification A3 125µ',
            quantityPerUnit: 1, // 1 pouch per document
            unit: 'pièce',
            costPerServiceUnit: 2000
          }
        ],
        isActive: true,
        createdAt: new Date().toISOString()
      }
    ],
    pricingRules: []
  };

  dbStore.updateState(draft => {
    draft.services.unshift(newService);
  });

  // 4. Verify that the new service is present in tenantServices
  const updatedTenantServices = dbStore.getState().services.filter(s => s.tenantId === tenantId && s.isActive);
  const foundService = updatedTenantServices.find(s => s.id === newServiceId);

  if (!foundService) {
    throw new Error('❌ New service was not found in tenant active services list!');
  }
  console.log(`✅ TEST 1 PASSED: Admin created service "${foundService.name}" (${foundService.code}) successfully registered in database.`);

  // 5. Test Quick Order Form specs resolution for this newly created service
  const specGroups = getServiceSpecificationGroups(foundService);
  console.log(`Found ${specGroups.length} specification group(s) for new service.`);
  if (specGroups.length === 0 || specGroups[0].name !== 'Épaisseur Film') {
    throw new Error('❌ Service specifications engine failed to extract options for new service!');
  }
  console.log('✅ TEST 2 PASSED: Specification groups resolved correctly for the new service.');

  // 6. Test Price Resolution with Option Impact
  const impactStandard = resolveServiceSpecsImpact(foundService, 'Épaisseur Film: Standard 80 microns', dbStore.getState().products);
  if (impactStandard.standardUnitPrice !== 15000) {
    throw new Error(`❌ Expected standard price 15000, got ${impactStandard.standardUnitPrice}`);
  }
  const impactPremium = resolveServiceSpecsImpact(foundService, 'Épaisseur Film: Premium 125 microns', dbStore.getState().products);
  if (impactPremium.standardUnitPrice !== 17000) {
    throw new Error(`❌ Expected premium price 17000 (+2000), got ${impactPremium.standardUnitPrice}`);
  }
  console.log('✅ TEST 3 PASSED: Price calculation and option price delta work dynamically for new service.');

  // 7. Simulate Quick Order Creation using the newly added service
  const orderQty = 4; // 4 documents to laminate
  const lineUnitPrice = impactPremium.standardUnitPrice; // 17000
  const lineTotalPrice = orderQty * lineUnitPrice; // 68000 GNF

  const orderPayload: Partial<Order> = {
    id: `ord-test-new-srv-${Date.now()}`,
    orderNumber: `CMD-TEST-${Date.now().toString().slice(-4)}`,
    tenantId: tenantId,
    branchId: 'b-001',
    personId: 'walk-in-customer',
    clientName: 'Client Comptoir Express',
    clientPhone: '+224 620 00 11 22',
    isWalkIn: true,
    totalAmount: lineTotalPrice,
    paidAmount: lineTotalPrice,
    dueAmount: 0,
    paymentStatus: 'PAID',
    status: 'COMPLETED',
    priority: 'NORMAL',
    items: [
      {
        id: `item-${Date.now()}-1`,
        orderId: `ord-test-new-srv-${Date.now()}`,
        serviceId: foundService.id,
        serviceName: foundService.name,
        serviceCode: foundService.code,
        quantity: orderQty,
        unit: foundService.unit,
        unitPrice: lineUnitPrice,
        totalPrice: lineTotalPrice,
        discountPercent: 0,
        discountAmount: 0,
        notes: 'Épaisseur Film: Premium 125 microns',
        assignedDepartment: 'FINISHING',
        status: 'COMPLETED',
        consumablesRequirement: foundService.configurations[0].consumables.map(c => ({
          productId: c.productId,
          productName: c.productName,
          requiredQuantity: c.quantity * orderQty,
          unit: c.unit,
          cost: c.costPerServiceUnit * orderQty
        }))
      }
    ],
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString()
  };

  dbStore.updateState(draft => {
    draft.orders.unshift(orderPayload as Order);
  });

  // 8. Test Stock Evaluation for Order
  const stockReqs = calculateOrderStockRequirements(orderPayload as Order, dbStore.getState().products, dbStore.getState().services);
  const consumableReq = stockReqs.find(r => r.productId === consumableProductId);
  if (!consumableReq || consumableReq.requiredQtyBaseUnit !== 4) {
    throw new Error(`❌ Stock requirement mismatch: expected 4 pouches, got ${consumableReq?.requiredQtyBaseUnit}`);
  }
  console.log(`✅ TEST 4 PASSED: Order stock evaluation calculates exact consumable requirements (${consumableReq.requiredQtyBaseUnit} pouches).`);

  // 9. Deliver Order & Deduct Consumables
  const prodBefore = dbStore.getState().products.find(p => p.id === consumableProductId);
  const stockBeforeDelivery = prodBefore?.prestationStock !== undefined ? prodBefore.prestationStock : (prodBefore?.currentStock || 0);
  
  const deliverResult = dbStore.deliverCommercialOrder(orderPayload.id!, tenantId, { name: 'Admin Testeur' });
  if (!deliverResult.success) {
    throw new Error(`❌ Delivery validation failed: ${deliverResult.message}`);
  }

  const prodAfter = dbStore.getState().products.find(p => p.id === consumableProductId);
  const stockAfterDelivery = prodAfter?.prestationStock !== undefined ? prodAfter.prestationStock : (prodAfter?.currentStock || 0);
  
  if (stockAfterDelivery !== stockBeforeDelivery - orderQty) {
    throw new Error(`❌ Stock deduction failed: expected ${stockBeforeDelivery - orderQty}, got ${stockAfterDelivery}`);
  }
  console.log(`✅ TEST 5 PASSED: Order delivered and stock automatically deducted (Stock Atelier: ${stockBeforeDelivery} -> ${stockAfterDelivery}).`);

  console.log('\n🎉 ALL INTEGRATION TESTS FOR NEW SERVICE CREATION & QUICK ORDER USAGE PASSED WITH 100% SUCCESS!');
}

runTests().catch(err => {
  console.error('Test run failed:', err);
  process.exit(1);
});
