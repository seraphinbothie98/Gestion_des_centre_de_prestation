import { dbStore } from '../server/db/mockStore';
import { CashSession } from '../types';

async function runTests() {
  console.log('🧪 [TEST SUITE] Début des tests - Gestion Commandes Fournisseurs & Trésorerie Multiple\n');
  let passedCount = 0;
  let totalCount = 0;

  function assert(condition: boolean, testName: string, detail?: string) {
    totalCount++;
    if (condition) {
      console.log(`  ✅ [PASS] ${testName}`);
      passedCount++;
    } else {
      console.error(`  ❌ [FAIL] ${testName}${detail ? ' - ' + detail : ''}`);
    }
  }

  const tenantId = 't-001';

  // 1. Audit initial des comptes financiers
  dbStore.updateState(draft => {
    const cash = draft.financialAccounts.find(a => a.tenantId === tenantId && a.isMainCash);
    if (cash) cash.currentBalance = 1000000;
    const bank = draft.financialAccounts.find(a => a.tenantId === tenantId && a.type === 'BANK');
    if (bank) bank.currentBalance = 5000000;
    const om = draft.financialAccounts.find(a => a.tenantId === tenantId && a.code === 'OM-01');
    if (om) om.currentBalance = 500000;
  });

  const initialAccounts = dbStore.getFinancialAccounts(tenantId, false);
  const initialCashAccount = initialAccounts.find(a => a.isMainCash);
  const initialBank = initialAccounts.find(a => a.type === 'BANK');
  const initialOm = initialAccounts.find(a => a.code === 'OM-01');

  assert(initialAccounts.length >= 4, 'Comptes financiers initialisés par défaut', `Trouvé: ${initialAccounts.length}`);
  assert(!!initialCashAccount && !!initialBank && !!initialOm, 'Types de comptes essentiels présents (Caisse Principale, Banque, Orange Money)');

  const totalInitialBalance = initialAccounts.reduce((sum, a) => sum + a.currentBalance, 0);

  // 2. TEST 1: Création d'une commande fournisseur -> PAS DE DÉDUCTION DE TRÉSORERIE
  console.log('\n--- 1. TEST CRÉATION COMMANDE FOURNISSEUR ---');
  const supplierId = 'sup-01';
  const state = dbStore.getState();
  const targetProduct = state.products.find(p => p.tenantId === tenantId) || state.products[0];
  const initialStock = targetProduct ? targetProduct.currentStock : 0;

  const poResult = dbStore.createSecurePurchaseOrder(
    {
      supplierId,
      items: [
        {
          productId: targetProduct.id,
          orderedQuantityPurchaseUnit: 10,
          unitPricePurchaseUnit: 50000,
          purchaseUnitName: targetProduct.unit || 'Paquet'
        }
      ],
      notes: 'Commande test audit trésorerie'
    },
    tenantId,
    'Administrateur Test'
  );

  assert(poResult.success && !!poResult.purchaseOrder, 'Création de commande fournisseur réussie');
  const po = poResult.purchaseOrder!;

  assert(po.paymentStatus === 'UNPAID', 'Statut de paiement initial = UNPAID', `Statut: ${po.paymentStatus}`);
  assert(po.paidAmount === 0, 'Montant payé initial = 0', `Payé: ${po.paidAmount}`);
  assert(po.dueAmount === 500000, 'Montant dû = 500 000 GNF', `Dû: ${po.dueAmount}`);

  // Vérifier qu'aucun compte n'a été débité
  const accountsAfterPO = dbStore.getFinancialAccounts(tenantId, false);
  const totalBalanceAfterPO = accountsAfterPO.reduce((sum, a) => sum + a.currentBalance, 0);
  assert(totalBalanceAfterPO === totalInitialBalance, 'RÈGLE D\'OR: Aucune déduction de trésorerie à la création du BC', `Initial: ${totalInitialBalance}, Après PO: ${totalBalanceAfterPO}`);

  // 3. TEST 2: Réception des marchandises -> Stock augmente, Dette créée, Trésorerie INTACTE
  console.log('\n--- 2. TEST RÉCEPTION DES MARCHANDISES & DETTE ---');
  const receiveResult = dbStore.receiveSecurePurchaseOrder(
    po.id,
    { [targetProduct.id]: 10 },
    tenantId,
    'Magasinier Test',
    false,
    'Réception conforme 10 unités'
  );

  assert(receiveResult.success, 'Réception du bon de commande validée');
  const poReceived = receiveResult.purchaseOrder!;
  assert(poReceived.status === 'RECEIVED', 'Statut du BC = RECEIVED', `Statut: ${poReceived.status}`);

  // Vérifier l'augmentation de stock
  const updatedProduct = dbStore.getState().products.find(p => p.id === targetProduct.id);
  assert(updatedProduct?.currentStock === initialStock + 10, 'Stock du produit correctement incrémenté', `Avant: ${initialStock}, Après: ${updatedProduct?.currentStock}`);

  // Vérifier qu'une dette fournisseur a été générée
  const debts = dbStore.getSupplierDebts(tenantId, false);
  const poDebt = debts.find(d => d.purchaseOrderId === po.id);
  assert(!!poDebt, 'Fiche de dette fournisseur automatiquement générée pour le BC');
  assert(poDebt?.remainingAmount === 500000, 'Montant restant de la dette = 500 000 GNF', `Restant: ${poDebt?.remainingAmount}`);
  assert(poDebt?.status === 'PARTIALLY_PAID' || poDebt?.status === 'PAID' || (poDebt?.status as string) === 'ACTIVE' || (poDebt?.status as string) === 'UNPAID', 'Statut de la dette valide');

  // Vérifier encore que la trésorerie est INTACTE
  const accountsAfterReceive = dbStore.getFinancialAccounts(tenantId, false);
  const totalBalanceAfterReceive = accountsAfterReceive.reduce((sum, a) => sum + a.currentBalance, 0);
  assert(totalBalanceAfterReceive === totalInitialBalance, 'RÈGLE D\'OR: Aucune déduction de trésorerie à la réception', `Initial: ${totalInitialBalance}, Après réception: ${totalBalanceAfterReceive}`);

  // 4. TEST 3: Blocage de paiement si Caisse Principale fermée
  console.log('\n--- 3. TEST RÈGLES DE SESSION CAISSE PRINCIPALE ---');
  // Fermer toutes les sessions de caisse ouvertes
  dbStore.updateState(draft => {
    (draft.cashSessions || []).forEach(cs => {
      if (cs.tenantId === tenantId && cs.status === 'OPEN') {
        cs.status = 'CLOSED';
        cs.closedAt = new Date().toISOString();
      }
    });
  });

  const blockedPayment = dbStore.recordSupplierPayment(
    po.id,
    200000,
    initialCashAccount!.id,
    'BLOCKED-TEST',
    'Tentative sur caisse fermée',
    tenantId,
    'user-001'
  );

  assert(!blockedPayment.success, 'Paiement bloqué depuis Caisse Principale si aucune session ouverte');

  // Ouvrir une session de caisse
  const newSession: CashSession = {
    id: `cs-test-${Date.now()}`,
    tenantId,
    cashRegisterId: 'cr-01',
    cashRegisterName: 'Caisse Principale',
    userId: 'user-001',
    userName: 'Caissier Test',
    openedAt: new Date().toISOString(),
    openingBalance: 500000,
    status: 'OPEN',
    movements: []
  };
  dbStore.updateState(draft => {
    if (!draft.cashSessions) draft.cashSessions = [];
    draft.cashSessions.unshift(newSession);
  });

  // 5. TEST 4: Paiement partiel (200 000 GNF) depuis Caisse Principale
  console.log('\n--- 4. TEST PAIEMENT PARTIEL DEPUIS CAISSE PRINCIPALE ---');
  const cashBeforePay = dbStore.getFinancialAccountById(initialCashAccount!.id, tenantId).account?.currentBalance || 0;

  const partPayResult = dbStore.recordSupplierPayment(
    po.id,
    200000,
    initialCashAccount!.id,
    'PAY-PART-01',
    'Acompte 200k espèces',
    tenantId,
    'Caissier Principal'
  );

  assert(partPayResult.success, 'Paiement partiel enregistré avec succès');
  const updatedPoAfterPart = dbStore.getPurchaseOrdersByTenant(tenantId).find(p => p.id === po.id);
  assert(updatedPoAfterPart?.paymentStatus === 'PARTIALLY_PAID', 'Statut BC = PARTIALLY_PAID', `Statut: ${updatedPoAfterPart?.paymentStatus}`);
  assert(updatedPoAfterPart?.paidAmount === 200000, 'Montant payé sur BC = 200 000 GNF', `Payé: ${updatedPoAfterPart?.paidAmount}`);
  assert(updatedPoAfterPart?.dueAmount === 300000, 'Montant restant sur BC = 300 000 GNF', `Restant: ${updatedPoAfterPart?.dueAmount}`);

  // Vérifier le débit sur le compte de caisse
  const cashAfterPay = dbStore.getFinancialAccountById(initialCashAccount!.id, tenantId).account?.currentBalance || 0;
  assert(cashAfterPay === cashBeforePay - 200000, 'Caisse Principale débitée exactement de 200 000 GNF', `Avant: ${cashBeforePay}, Après: ${cashAfterPay}`);

  // Vérifier la dette fournisseur mise à jour
  const updatedDebtAfterPart = dbStore.getSupplierDebts(tenantId, false).find(d => d.purchaseOrderId === po.id);
  assert(updatedDebtAfterPart?.remainingAmount === 300000, 'Dette fournisseur réduite à 300 000 GNF', `Dette: ${updatedDebtAfterPart?.remainingAmount}`);
  assert(updatedDebtAfterPart?.status === 'PARTIALLY_PAID', 'Statut dette = PARTIALLY_PAID');

  // Vérifier le mouvement financier généré
  const movements = dbStore.getFinancialMovements(tenantId, undefined, false);
  const payMovement = movements.find(m => m.relatedEntityId === po.id && m.movementType === 'OUTFLOW');
  assert(!!payMovement && payMovement.amount === 200000, 'Mouvement financier de dépense (OUTFLOW) tracé dans le journal');

  // 6. TEST 5: Paiement du solde (300 000 GNF) depuis un autre compte (Banque)
  console.log('\n--- 5. TEST SOLDE FINAL DEPUIS LE COMPTE BANCAIRE ---');
  const bankBeforePay = dbStore.getFinancialAccountById(initialBank!.id, tenantId).account?.currentBalance || 0;

  const fullPayResult = dbStore.recordSupplierPayment(
    po.id,
    300000,
    initialBank!.id,
    'VIR-SOLDE-01',
    'Solde virement bancaire',
    tenantId,
    'Comptable'
  );

  assert(fullPayResult.success, 'Paiement du solde bancaire enregistré avec succès');
  const poFinal = dbStore.getPurchaseOrdersByTenant(tenantId).find(p => p.id === po.id);
  assert(poFinal?.paymentStatus === 'PAID', 'Statut BC = PAID (Soldé)', `Statut: ${poFinal?.paymentStatus}`);
  assert(poFinal?.paidAmount === 500000, 'Total payé sur BC = 500 000 GNF', `Payé: ${poFinal?.paidAmount}`);
  assert(poFinal?.dueAmount === 0, 'Solde dû sur BC = 0 GNF', `Dû: ${poFinal?.dueAmount}`);
  assert((poFinal?.payments || []).length === 2, 'Historique contient les 2 règlements multi-comptes', `Nombre: ${(poFinal?.payments || []).length}`);

  // Vérifier le débit bancaire
  const bankAfterPay = dbStore.getFinancialAccountById(initialBank!.id, tenantId).account?.currentBalance || 0;
  assert(bankAfterPay === bankBeforePay - 300000, 'Compte bancaire débité exactement de 300 000 GNF', `Avant: ${bankBeforePay}, Après: ${bankAfterPay}`);

  // Vérifier la clôture de la dette
  const debtFinal = dbStore.getSupplierDebts(tenantId, false).find(d => d.purchaseOrderId === po.id);
  assert(debtFinal?.remainingAmount === 0 && debtFinal?.status === 'PAID', 'Dette fournisseur entièrement soldée (status: PAID, remaining: 0)');

  // 7. TEST 6: Transfert Inter-Comptes (Banque -> Orange Money)
  console.log('\n--- 6. TEST TRANSFERT INTER-COMPTES ---');
  const bankBeforeTransfer = dbStore.getFinancialAccountById(initialBank!.id, tenantId).account?.currentBalance || 0;
  const omBeforeTransfer = dbStore.getFinancialAccountById(initialOm!.id, tenantId).account?.currentBalance || 0;
  const totalBeforeTransfer = dbStore.getFinancialAccounts(tenantId, false).reduce((s, a) => s + a.currentBalance, 0);

  const transferResult = dbStore.recordFinancialTransfer(
    initialBank!.id,
    initialOm!.id,
    500000,
    'Approvisionnement Orange Money depuis Banque',
    tenantId,
    'Trésorier'
  );

  assert(transferResult.success, 'Transfert inter-comptes exécuté avec succès');
  const bankAfterTransfer = dbStore.getFinancialAccountById(initialBank!.id, tenantId).account?.currentBalance || 0;
  const omAfterTransfer = dbStore.getFinancialAccountById(initialOm!.id, tenantId).account?.currentBalance || 0;
  const totalAfterTransfer = dbStore.getFinancialAccounts(tenantId, false).reduce((s, a) => s + a.currentBalance, 0);

  assert(bankAfterTransfer === bankBeforeTransfer - 500000, 'Source (Banque) débitée de 500 000 GNF', `Avant: ${bankBeforeTransfer}, Après: ${bankAfterTransfer}`);
  assert(omAfterTransfer === omBeforeTransfer + 500000, 'Destination (Orange Money) créditée de 500 000 GNF', `Avant: ${omBeforeTransfer}, Après: ${omAfterTransfer}`);
  assert(totalAfterTransfer === totalBeforeTransfer, 'Trésorerie consolidée constante lors d\'un virement interne (Non-charge / Non-produit)', `Total: ${totalAfterTransfer}`);

  // Vérifier les 2 mouvements de transfert
  const transferMovements = dbStore.getFinancialMovements(tenantId, undefined, false).filter(m => m.movementType === 'TRANSFER');
  assert(transferMovements.length >= 2, 'Deux lignes de journal générées pour le transfert (TRANSFER_OUT & TRANSFER_IN)');

  // 8. TEST 7: Création d'un nouveau compte financier personnalisé
  console.log('\n--- 7. TEST CRÉATION NOUVEAU COMPTE FINANCIER ---');
  const newAccountResult = dbStore.createFinancialAccount(
    {
      name: 'Compte Wave Business',
      code: 'WAVE-01',
      type: 'MOBILE_MONEY',
      accountNumber: '+224 622 00 00 00',
      initialBalance: 250000,
      isDefault: false
    },
    tenantId,
    'Administrateur Test'
  );

  assert(newAccountResult.success && !!newAccountResult.account, 'Nouveau compte financier créé avec succès');
  const waveAccount = newAccountResult.account!;
  assert(waveAccount.currentBalance === 250000, 'Solde initial du nouveau compte = 250 000 GNF');

  // Basculer l'état du compte (Désactiver / Activer)
  const toggleResult = dbStore.toggleFinancialAccountStatus(waveAccount.id, tenantId, 'Administrateur Test');
  assert(toggleResult.success && toggleResult.isActive === false, 'Désactivation du compte financier réussie');

  console.log(`\n==================================================`);
  console.log(`RÉSULTATS DE LA VALIDATION : ${passedCount}/${totalCount} tests réussis (${Math.round((passedCount / totalCount) * 100)}%)`);
  console.log(`==================================================\n`);

  if (passedCount !== totalCount) {
    process.exit(1);
  }
}

runTests().catch(err => {
  console.error('Erreur fatale lors des tests:', err);
  process.exit(1);
});
