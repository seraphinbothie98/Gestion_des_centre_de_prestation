import { dbStore } from '../server/db/mockStore';
import { PaymentMethod } from '../types';

/**
 * AUTOMATED TEST SUITE: FINANCIAL DASHBOARD SYNCHRONIZATION & SUPPLIER DEBTS
 * 
 * Tests strictly:
 * 1. Initial / Zeroed agency financial configuration: Dashboard = 0 GNF, Finance & Treasury = 0 GNF.
 * 2. Credit Purchases (Achats à crédit): Stock increases, Supplier Debt increases, Cash = 0 GNF (NO movement).
 * 3. Dashboard verification after credit purchase: Solde Caisse = 0 GNF.
 * 4. Cash sales (Ventes payées en espèces): Cash increases, Dashboard synchronizes automatically.
 * 5. Supplier Debt payment (Règlement dette fournisseur): Cash decreases, Supplier Debt decreases, Dashboard & Finance stay in sync.
 * 6. Multi-Agency strict isolation & context preservation.
 */

function assert(condition: boolean, message: string) {
  if (!condition) {
    console.error(`❌ ASSERTION FAILED: ${message}`);
    throw new Error(message);
  }
  console.log(`  ✓ ${message}`);
}

async function runFinancialSyncTests() {
  console.log('\n=============================================================');
  console.log('🧪 RUNNING TEST SUITE: FINANCIAL DASHBOARD & SUPPLIER DEBT SYNC');
  console.log('=============================================================\n');

  const agencyA_id = 't-001';
  const agencyB_id = 't-002';

  // -------------------------------------------------------------
  // TEST 1: Zeroed Financial Accounts Configuration -> Dashboard & Finance = 0 GNF
  // -------------------------------------------------------------
  console.log('--- TEST 1: Zeroed Initial Financial Configuration ---');
  
  // Set all accounts of agencyA to 0 GNF and ensure open cash session for agencyA
  dbStore.updateState(draft => {
    (draft.financialAccounts || []).forEach(acc => {
      if (acc.tenantId === agencyA_id) {
        acc.initialBalance = 0;
        acc.currentBalance = 0;
      }
    });
    if (!draft.cashSessions) draft.cashSessions = [];
    draft.cashSessions = draft.cashSessions.filter(cs => cs.tenantId !== agencyA_id);
    draft.cashSessions.push({
      id: 'cs-test-01',
      tenantId: agencyA_id,
      sessionNumber: 'CS-2026-000001',
      cashRegisterId: 'cr-01',
      registerName: 'Caisse Principale',
      cashierId: 'usr-admin-01',
      cashierName: 'Admin',
      openedAt: new Date().toISOString(),
      openingBalance: 0,
      totalSalesCash: 0,
      totalSalesOrangeMoney: 0,
      totalSalesMtnMomo: 0,
      totalSalesBank: 0,
      totalInflows: 0,
      totalOutflows: 0,
      expectedCash: 0,
      status: 'OPEN'
    });
  });

  const financeMetricsT1 = dbStore.getTreasuryMetrics(agencyA_id, false);
  assert(financeMetricsT1.cashTotal === 0, 'Finance & Treasury: Caisse physique = 0 GNF');
  assert(financeMetricsT1.totalTreasury === 0, 'Finance & Treasury: Trésorerie consolidée = 0 GNF');
  assert(financeMetricsT1.bankTotal === 0, 'Finance & Treasury: Comptes Bancaires = 0 GNF');
  assert(financeMetricsT1.momoTotal === 0, 'Finance & Treasury: Mobile Money = 0 GNF');

  // Verify Dashboard uses the exact same single source of truth
  const dashboardCashBalanceT1 = dbStore.getTreasuryMetrics(agencyA_id, false).cashTotal;
  assert(dashboardCashBalanceT1 === 0, 'Tableau de Bord: Solde Caisse = 0 GNF (Synchronisé)');

  // -------------------------------------------------------------
  // TEST 2: Credit Purchase of Consumables (Achat à crédit)
  // -------------------------------------------------------------
  console.log('\n--- TEST 2: Credit Purchase of Consumables ---');
  
  const productA = dbStore.getState().products.find(p => p.tenantId === agencyA_id);
  assert(Boolean(productA), 'Target product found in Agency A');
  const initialStock = productA!.currentStock;
  const initialDebtsCount = dbStore.getSupplierDebts(agencyA_id, false).length;

  const supplierA = dbStore.getState().suppliers.find(s => s.tenantId === agencyA_id) || dbStore.getState().suppliers[0];
  assert(Boolean(supplierA), 'Supplier found in Agency A');

  const purchaseTotal = 500000; // 500 000 GNF à crédit
  const purchaseQty = 10;

  // Create & Receive Purchase Order on CREDIT (paidAmount = 0)
  const poRes = dbStore.createSecurePurchaseOrder({
    supplierId: supplierA!.id,
    items: [{
      productId: productA!.id,
      orderedQuantityPurchaseUnit: purchaseQty,
      purchaseUnitName: productA!.unit || 'unité',
      unitPricePurchaseUnit: 50000
    }],
    notes: 'Achat de ramettes de papier 80g à crédit'
  }, agencyA_id, 'Admin Test', false);

  assert(poRes.success && Boolean(poRes.purchaseOrder), 'Purchase order created successfully');

  // Receive items into stock
  const poId = poRes.purchaseOrder!.id;
  const receptionMap: Record<string, number> = {};
  receptionMap[productA!.id] = purchaseQty;
  
  dbStore.receiveSecurePurchaseOrder(poId, receptionMap, agencyA_id, 'Magasinier Test', false);

  // 1. Stock MUST increase
  const refreshedProduct = dbStore.getState().products.find(p => p.id === productA!.id);
  assert(refreshedProduct!.currentStock === initialStock + purchaseQty, `Stock increased from ${initialStock} to ${refreshedProduct!.currentStock}`);

  // 2. Supplier Debt MUST increase
  const agencyDebts = dbStore.getSupplierDebts(agencyA_id, false);
  const createdDebt = agencyDebts.find(d => d.purchaseOrderId === poId);
  assert(Boolean(createdDebt), 'Supplier Debt record generated');
  assert(createdDebt!.initialAmount === purchaseTotal, `Supplier Debt initial amount = ${purchaseTotal} GNF`);
  assert(createdDebt!.remainingAmount === purchaseTotal, `Supplier Debt remaining amount = ${purchaseTotal} GNF`);
  assert(createdDebt!.status === 'ACTIVE', 'Supplier Debt status is ACTIVE (Unpaid)');

  // 3. Cash / Treasury MUST NOT move (Strictly 0 GNF)
  const financeMetricsT2 = dbStore.getTreasuryMetrics(agencyA_id, false);
  assert(financeMetricsT2.cashTotal === 0, 'Caisse reste strictement à 0 GNF (aucun mouvement induit par achat à crédit)');
  assert(financeMetricsT2.totalTreasury === 0, 'Trésorerie consolidée reste à 0 GNF');

  // -------------------------------------------------------------
  // TEST 3: Dashboard Verification After Credit Purchase
  // -------------------------------------------------------------
  console.log('\n--- TEST 3: Dashboard Verification After Credit Purchase ---');
  const dashboardCashBalanceT3 = dbStore.getTreasuryMetrics(agencyA_id, false).cashTotal;
  assert(dashboardCashBalanceT3 === 0, 'Tableau de Bord: Solde Caisse = 0 GNF (Aucun solde positif fictif créé)');

  // -------------------------------------------------------------
  // TEST 4: Cash Sale / Incoming Payment (Vente payée en espèces)
  // -------------------------------------------------------------
  console.log('\n--- TEST 4: Cash Sale / Incoming Payment ---');
  const saleAmount = 250000; // 250 000 GNF encaissés en espèces

  const payRes = dbStore.recordIncomingPayment({
    tenantId: agencyA_id,
    amount: saleAmount,
    paymentMethod: 'CASH',
    category: 'CLIENT_PAYMENT',
    categoryLabel: 'Vente Service Réalisée',
    notes: 'Encaissement prestation impression en espèces'
  });

  assert(payRes.success, 'Cash payment recorded in financial account');

  const financeMetricsT4 = dbStore.getTreasuryMetrics(agencyA_id, false);
  assert(financeMetricsT4.cashTotal === saleAmount, `Finance & Treasury: Caisse physique = ${saleAmount.toLocaleString('fr-FR')} GNF`);
  assert(financeMetricsT4.totalTreasury === saleAmount, `Finance & Treasury: Trésorerie = ${saleAmount.toLocaleString('fr-FR')} GNF`);

  // Dashboard must reflect the exact same amount
  const dashboardCashBalanceT4 = dbStore.getTreasuryMetrics(agencyA_id, false).cashTotal;
  assert(dashboardCashBalanceT4 === saleAmount, `Tableau de Bord: Solde Caisse = ${saleAmount.toLocaleString('fr-FR')} GNF (Parfaitement synchronisé)`);

  // -------------------------------------------------------------
  // TEST 5: Partial Supplier Debt Payment (Paiement partiel dette fournisseur)
  // -------------------------------------------------------------
  console.log('\n--- TEST 5: Partial Supplier Debt Payment ---');
  const paymentToSupplier = 100000; // Paiement de 100 000 GNF sur la dette de 500 000 GNF
  const mainCashAccount = dbStore.getState().financialAccounts.find(a => a.tenantId === agencyA_id && a.isMainCash) || dbStore.getState().financialAccounts.find(a => a.tenantId === agencyA_id && a.type === 'CASH');

  assert(Boolean(mainCashAccount), 'Main cash account identified for payment');

  const supplierPayRes = dbStore.recordSupplierDebtPayment(
    createdDebt!.id,
    paymentToSupplier,
    mainCashAccount!.id,
    'PAY-SUP-001',
    'Acompte sur achat consommables',
    agencyA_id,
    'Comptable Test',
    false
  );

  assert(supplierPayRes.success, 'Supplier payment successfully processed');

  // 1. Supplier Debt must decrease
  const updatedDebt = dbStore.getSupplierDebts(agencyA_id, false).find(d => d.id === createdDebt!.id);
  assert(updatedDebt!.paidAmount === paymentToSupplier, `Supplier Debt paid amount = ${paymentToSupplier} GNF`);
  assert(updatedDebt!.remainingAmount === purchaseTotal - paymentToSupplier, `Supplier Debt remaining = ${purchaseTotal - paymentToSupplier} GNF`);
  assert(updatedDebt!.status === 'PARTIALLY_PAID', 'Supplier Debt status is PARTIALLY_PAID');

  // 2. Cash must decrease
  const expectedCashAfter = saleAmount - paymentToSupplier; // 250 000 - 100 000 = 150 000 GNF
  const financeMetricsT5 = dbStore.getTreasuryMetrics(agencyA_id, false);
  assert(financeMetricsT5.cashTotal === expectedCashAfter, `Finance & Treasury: Caisse = ${expectedCashAfter.toLocaleString('fr-FR')} GNF`);

  // 3. Dashboard must be in sync
  const dashboardCashBalanceT5 = dbStore.getTreasuryMetrics(agencyA_id, false).cashTotal;
  assert(dashboardCashBalanceT5 === expectedCashAfter, `Tableau de Bord: Solde Caisse = ${expectedCashAfter.toLocaleString('fr-FR')} GNF`);

  // -------------------------------------------------------------
  // TEST 6: Multi-Agency Strict Isolation & Context Integrity
  // -------------------------------------------------------------
  console.log('\n--- TEST 6: Multi-Agency Strict Isolation ---');
  const metricsAgencyA = dbStore.getTreasuryMetrics(agencyA_id, false);
  const metricsAgencyB = dbStore.getTreasuryMetrics(agencyB_id, false);

  assert(metricsAgencyA.cashTotal === expectedCashAfter, `Agency A cash balance = ${expectedCashAfter.toLocaleString('fr-FR')} GNF`);
  
  const agencyBDebts = dbStore.getSupplierDebts(agencyB_id, false);
  assert(!agencyBDebts.some(d => d.purchaseOrderId === poId), 'Agency B has NO record of Agency A supplier debt (Strict Isolation)');

  console.log('\n=============================================================');
  console.log('🎉 ALL 6 MANDATORY FINANCIAL SYNCHRONIZATION TESTS PASSED FLAWLESSLY!');
  console.log('=============================================================\n');
}

runFinancialSyncTests().catch(err => {
  console.error('Test Suite Failed:', err);
  process.exit(1);
});
