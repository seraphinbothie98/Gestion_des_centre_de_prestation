import { dbStore } from '../server/db/mockStore';

function assert(condition: boolean, message: string) {
  if (!condition) {
    console.error(`❌ ASSERTION FAILED: ${message}`);
    throw new Error(message);
  }
  console.log(`✅ ${message}`);
}

async function runTests() {
  console.log('\n====================================================================');
  console.log('TEST SUITE : MAINTENANCE & RESET DES DONNÉES MÉTIER (MULTI-TENANT)');
  console.log('====================================================================\n');

  // --- SCENARIO 1: Multi-tenant Initial Verification & Clean Baseline ---
  console.log('--- SCENARIO 1: Vérification initiale & Métriques à 0 GNF ---');
  
  const initialSummary = dbStore.getResetSummary('t-001');
  console.log('Summary t-001:', initialSummary);

  const treasuryT1 = dbStore.getTreasuryMetrics('t-001', false);
  console.log('Treasury t-001:', treasuryT1);

  assert(treasuryT1.totalTreasury === 0, 'La trésorerie consolidée t-001 est à 0 GNF au démarrage');
  assert(treasuryT1.cashTotal === 0, 'Le solde caisse t-001 est à 0 GNF au démarrage');
  assert(initialSummary.preservedConfig.usersCount >= 4, 'Les utilisateurs sont préservés (>= 4)');
  assert(initialSummary.preservedConfig.servicesCount >= 6, 'Les services sont préservés (>= 6)');
  assert(initialSummary.preservedConfig.productsCount >= 8, 'Les articles sont préservés (>= 8)');

  // --- SCENARIO 2: Création de données réelles sur t-001 et t-002 ---
  console.log('\n--- SCENARIO 2: Isolation multi-agences t-001 vs t-002 ---');

  // Add order + payment on t-001
  dbStore.updateState(draft => {
    draft.orders.push({
      id: 'ord-test-01',
      tenantId: 't-001',
      orderNumber: 'CMD-TEST-001',
      personId: 'p-001',
      personName: 'Sekou Kourouma',
      status: 'DELIVERED',
      totalAmount: 150000,
      paidAmount: 150000,
      dueAmount: 0,
      items: [],
      createdAt: new Date().toISOString()
    });
  });

  const payResT1 = dbStore.recordIncomingPayment({
    tenantId: 't-001',
    financialAccountId: 'fa-cp-01',
    amount: 150000,
    paymentMethod: 'CASH',
    category: 'CLIENT_PAYMENT',
    categoryLabel: 'Paiement Commande Test',
    reference: 'CMD-TEST-001',
    relatedEntityId: 'ord-test-01',
    relatedEntityType: 'ORDER',
    personId: 'p-001',
    personName: 'Sekou Kourouma',
    performedByUserName: 'Caissier Test'
  });

  assert(payResT1.success, 'Paiement de 150 000 GNF enregistré sur t-001');

  // Add order + payment on t-002
  dbStore.updateState(draft => {
    draft.orders.push({
      id: 'ord-test-02',
      tenantId: 't-002',
      orderNumber: 'CMD-TEST-002',
      personName: 'Client Horizon',
      status: 'DELIVERED',
      totalAmount: 500000,
      paidAmount: 500000,
      dueAmount: 0,
      items: [],
      createdAt: new Date().toISOString()
    });
  });

  const payResT2 = dbStore.recordIncomingPayment({
    tenantId: 't-002',
    financialAccountId: 'fa-b-cp-01',
    amount: 500000,
    paymentMethod: 'CASH',
    category: 'CLIENT_PAYMENT',
    categoryLabel: 'Vente Matériaux Horizon',
    reference: 'CMD-TEST-002',
    relatedEntityId: 'ord-test-02',
    relatedEntityType: 'ORDER',
    performedByUserName: 'Vendeur Horizon'
  });

  assert(payResT2.success, 'Paiement de 500 000 GNF enregistré sur t-002');

  const treasuryT1After = dbStore.getTreasuryMetrics('t-001', false);
  const treasuryT2After = dbStore.getTreasuryMetrics('t-002', false);
  assert(treasuryT1After.totalTreasury === 150000, 'Trésorerie t-001 = 150 000 GNF');
  assert(treasuryT2After.totalTreasury === 500000, 'Trésorerie t-002 = 500 000 GNF');

  // --- SCENARIO 3: Niveau 1 - Nettoyage des données de test sur t-001 ---
  console.log('\n--- SCENARIO 3: Exécution Niveau 1 (Nettoyage données de test sur t-001) ---');
  
  const resetRes1 = dbStore.cleanDemoTestData('t-001', 'admin', 'admin123', dbStore.getState().users.find(u => u.username === 'admin'));
  assert(resetRes1.success, 'Nettoyage des données de test exécuté avec succès sur t-001');

  const treasuryT1Reset = dbStore.getTreasuryMetrics('t-001', false);
  const treasuryT2Untouched = dbStore.getTreasuryMetrics('t-002', false);

  assert(treasuryT1Reset.totalTreasury === 0, 'Trésorerie t-001 recalculée à 0 GNF');
  assert(treasuryT1Reset.cashTotal === 0, 'Solde Caisse t-001 recalculé à 0 GNF');
  assert(treasuryT2Untouched.totalTreasury === 500000, 'STRICT MULTI-TENANT: Trésorerie t-002 (500 000 GNF) reste 100% INTACTE');

  // --- SCENARIO 4: Niveau 2 - Réinitialisation Commerciale ---
  console.log('\n--- SCENARIO 4: Exécution Niveau 2 (Réinitialisation commerciale) ---');

  // Add new commercial order & enrollment
  dbStore.updateState(draft => {
    draft.orders.push({
      id: 'ord-comm-01',
      tenantId: 't-001',
      orderNumber: 'CMD-COMM-001',
      status: 'CONFIRMED',
      totalAmount: 200000,
      paidAmount: 200000,
      dueAmount: 0,
      items: [],
      createdAt: new Date().toISOString()
    });
    draft.invoices.push({
      id: 'inv-comm-01',
      tenantId: 't-001',
      documentNumber: 'FAC-COMM-001',
      invoiceType: 'INVOICE',
      subtotal: 200000,
      taxRate: 0,
      taxAmount: 0,
      discountAmount: 0,
      totalAmount: 200000,
      paidAmount: 200000,
      status: 'PAID',
      issueDate: '2026-09-06',
      items: []
    });
  });

  const commReset = dbStore.resetCommercialData('t-001', false, 'admin', 'admin123', dbStore.getState().users.find(u => u.username === 'admin'));
  assert(commReset.success, 'Réinitialisation commerciale réussie');
  assert(dbStore.getState().orders.filter(o => o.tenantId === 't-001').length === 0, 'Toutes les commandes t-001 ont été purgées');
  assert(dbStore.getState().invoices.filter(i => i.tenantId === 't-001').length === 0, 'Toutes les factures t-001 ont été purgées');

  // --- SCENARIO 5: Niveau 4 - Options Stock (Conserver vs Purge mouvements vs Reset Stock) ---
  console.log('\n--- SCENARIO 5: Exécution Niveau 4 avec Gestion Spéciale Stock & Fournisseurs ---');

  // Check product stock before
  const prod1Before = dbStore.getState().products.find(p => p.id === 'prod-01');
  assert(prod1Before !== undefined && prod1Before.currentStock === 25000, 'Stock prod-01 = 25 000 feuilles');

  // Perform full operational reset preserving stock & supplier debts
  const fullReset1 = dbStore.resetAllOperationalData(
    't-001',
    {
      resetServices: true,
      resetTraining: true,
      resetBoutique: true,
      resetClients: false,
      stockOption: 'PRESERVE',
      resetFinancialTreasury: true,
      supplierDebtsOption: 'PRESERVE'
    },
    'admin',
    'admin123',
    dbStore.getState().users.find(u => u.username === 'admin')
  );

  assert(fullReset1.success, 'Niveau 4 avec stockOption=PRESERVE exécuté avec succès');
  const prod1AfterPreserve = dbStore.getState().products.find(p => p.id === 'prod-01');
  assert(prod1AfterPreserve?.currentStock === 25000, 'Le stock réel est parfaitement conservé (25 000 feuilles)');

  // Perform full stock reset on tenant
  const fullReset2 = dbStore.resetAllOperationalData(
    't-001',
    {
      resetServices: true,
      resetTraining: true,
      resetBoutique: true,
      resetClients: false,
      stockOption: 'FULL_STOCK_RESET',
      resetFinancialTreasury: true,
      supplierDebtsOption: 'PRESERVE'
    },
    'admin',
    'admin123',
    dbStore.getState().users.find(u => u.username === 'admin')
  );

  assert(fullReset2.success, 'Niveau 4 avec stockOption=FULL_STOCK_RESET exécuté avec succès');
  const prod1AfterReset = dbStore.getState().products.find(p => p.id === 'prod-01');
  assert(prod1AfterReset?.currentStock === 0, 'Le stock physique a été remis à 0 après FULL_STOCK_RESET');

  // Check t-002 product stock is untouched
  const prodB1 = dbStore.getState().products.find(p => p.id === 'prod-b-01');
  assert(prodB1?.currentStock === 400, 'Le stock de l agence B (prod-b-01 = 400 sacs) reste 100% INTACT');

  // --- SCENARIO 6: Contrôle d intégrité absolu de la configuration ---
  console.log('\n--- SCENARIO 6: Vérification de l intégrité de la configuration ---');
  
  const state = dbStore.getState();
  const t1Users = state.users.filter(u => u.tenantId === 't-001');
  const t1Roles = state.roles.filter(r => r.tenantId === 't-001');
  const t1Services = state.services.filter(s => s.tenantId === 't-001');
  const t1Tenants = state.tenants.filter(t => t.id === 't-001');

  assert(t1Users.length === 4, '4 utilisateurs t-001 intacts (Admin, Caissière, Opérateur, Formateur)');
  assert(t1Roles.length === 4, '4 rôles t-001 RBAC intacts');
  assert(t1Services.length === 6, '6 services du catalogue intacts avec tarifs et formules');
  assert(t1Tenants[0].settings.branding.slogan !== undefined, 'Identité visuelle, logo et paramètres agence intacts');

  console.log('\n====================================================================');
  console.log('🎯 TOUS LES TESTS DE MAINTENANCE & RESET SONT VALIDES À 100% !');
  console.log('====================================================================\n');
}

runTests().catch(err => {
  console.error(err);
  process.exit(1);
});
