import { dbStore } from '../server/db/mockStore';
import { FinancialAccount } from '../types';

export async function runFinancialAccountsAdminTests() {
  console.log('🧪 [TEST SUITE] Début des tests : Gestion Administrative Complète des Comptes Financiers\n');
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
  const adminUser = 'Administrateur Principal Test';

  // 1. Audit initial
  const initialAccounts = dbStore.getFinancialAccounts(tenantId, false);
  const mainCash = initialAccounts.find(a => a.isMainCash);
  assert(initialAccounts.length >= 4, 'Comptes initiaux présents', `Nombre: ${initialAccounts.length}`);
  assert(!!mainCash, 'Caisse Principale initiale identifiée');

  // 2. CRÉATION D'UN COMPTE FINANCIER
  console.log('\n--- 1. CRÉATION D\'UN COMPTE FINANCIER ---');
  const createRes = dbStore.createFinancialAccount(
    {
      name: 'Orange Money Kindia',
      code: 'OM-KIN',
      type: 'MOBILE_MONEY',
      initialBalance: 500000,
      description: 'Compte Orange Money dédié aux encaissements agence Kindia',
      accountNumber: '+224 622 00 11 22',
      associatedPaymentMethods: ['ORANGE_MONEY'],
      isDefault: false
    },
    tenantId,
    adminUser,
    false
  );

  assert(createRes.success && !!createRes.account, 'Création du compte Orange Money Kindia réussie');
  const omAccount = createRes.account!;
  assert(omAccount.currentBalance === 500000, 'Solde initial correctement initialisé à 500 000 GNF');
  assert(omAccount.associatedPaymentMethods?.includes('ORANGE_MONEY') === true, 'Mode de paiement associé ORANGE_MONEY présent');

  // 3. MODIFICATION DU COMPTE (RENOMMAGE SANS SUPPRESSION DE L'HISTORIQUE)
  console.log('\n--- 2. MODIFICATION & RENOMMAGE (PRÉSERVATION DE L\'HISTORIQUE) ---');
  const updateRes = dbStore.updateFinancialAccount(
    omAccount.id,
    {
      name: 'Orange Money Agence Centrale',
      description: 'Renommé en Agence Centrale',
      associatedPaymentMethods: ['ORANGE_MONEY', 'OTHER']
    },
    tenantId,
    adminUser,
    false
  );

  assert(updateRes.success && updateRes.account?.name === 'Orange Money Agence Centrale', 'Renommage du compte réussi');
  
  // Vérification que les mouvements liés pointent toujours sur cet ID
  const movementsAfterRename = dbStore.getFinancialMovements(tenantId, omAccount.id);
  assert(movementsAfterRename.length >= 1, 'Historique des mouvements intact après renommage', `Mouvements: ${movementsAfterRename.length}`);

  // 4. AJUSTEMENT MANUEL DU SOLDE AVEC JUSTIFICATION
  console.log('\n--- 3. AJUSTEMENT MANUEL DU SOLDE (ÉCART & TRACE COMPTABLE) ---');
  // Saisie du nouveau solde : 450 000 GNF (Écart de -50 000 GNF)
  const adjustRes = dbStore.adjustFinancialAccountBalance(
    omAccount.id,
    450000,
    'Correction après vérification physique de la caisse / solde SIM',
    tenantId,
    adminUser,
    false
  );

  assert(adjustRes.success, 'Ajustement de solde accepté avec justification');
  assert(adjustRes.difference === -50000, 'Écart calculé = -50 000 GNF', `Écart: ${adjustRes.difference}`);
  
  const accAfterAdjust = dbStore.getFinancialAccountById(omAccount.id, tenantId).account;
  assert(accAfterAdjust?.currentBalance === 450000, 'Nouveau solde = 450 000 GNF');

  const adjMvt = dbStore.getFinancialMovements(tenantId, omAccount.id).find(m => m.category === 'BALANCE_ADJUSTMENT');
  assert(!!adjMvt, 'Mouvement BALANCE_ADJUSTMENT généré automatiquement');
  assert(adjMvt?.movementType === 'OUTFLOW' && adjMvt?.amount === 50000, 'Mouvement de débit de 50 000 GNF');

  // Ajustement sans motif -> DOIT ÉCHOUER
  const invalidAdjust = dbStore.adjustFinancialAccountBalance(
    omAccount.id,
    400000,
    '', // Motif vide
    tenantId,
    adminUser,
    false
  );
  assert(!invalidAdjust.success, 'Ajustement sans motif obligatoire refusé');

  // 5. RÉINITIALISATION INDIVIDUELLE SÉCURISÉE (ISOLEMENT STRICT)
  console.log('\n--- 4. RÉINITIALISATION INDIVIDUELLE SÉCURISÉE ---');
  const bankBeforeReset = initialAccounts.find(a => a.type === 'BANK')?.currentBalance || 0;

  // Tentative avec mot-clé invalide
  const failedReset1 = dbStore.resetFinancialAccount(
    omAccount.id,
    'OUI', // Mauvais mot-clé
    'password123',
    'Test réinitialisation',
    tenantId,
    adminUser,
    false
  );
  assert(!failedReset1.success, 'Réinitialisation avec mot-clé erroné refusée');

  // Tentative sans mot de passe
  const failedReset2 = dbStore.resetFinancialAccount(
    omAccount.id,
    'RÉINITIALISER',
    '', // Mot de passe manquant
    'Test',
    tenantId,
    adminUser,
    false
  );
  assert(!failedReset2.success, 'Réinitialisation sans mot de passe refusée');

  // Réinitialisation valide
  const validReset = dbStore.resetFinancialAccount(
    omAccount.id,
    'RÉINITIALISER',
    'adminPassword123',
    'Remise à zéro pour clôture annuelle',
    tenantId,
    adminUser,
    false
  );

  assert(validReset.success, 'Réinitialisation validée avec triple sécurité');
  const accAfterReset = dbStore.getFinancialAccountById(omAccount.id, tenantId).account;
  assert(accAfterReset?.currentBalance === 0, 'Solde du compte réinitialisé ramené à 0 GNF');

  // Vérification de l'isolation : Le compte bancaire NE DOIT PAS avoir changé
  const bankAfterReset = dbStore.getFinancialAccountById(initialAccounts.find(a => a.type === 'BANK')!.id, tenantId).account?.currentBalance || 0;
  assert(bankAfterReset === bankBeforeReset, 'Isolation vérifiée : Les autres comptes financiers sont strictement inchangés');

  // 6. SÉCURITÉ DE SUPPRESSION & ASSISTANT DE TRANSFERT
  console.log('\n--- 5. SÉCURITÉ DE SUPPRESSION & TRANSFERT ---');

  // Création d'un compte avec solde > 0
  const petiteCaisseRes = dbStore.createFinancialAccount(
    {
      name: 'Petite Caisse Annexe',
      code: 'PCA-01',
      type: 'CASH',
      initialBalance: 300000,
      isPettyCash: true
    },
    tenantId,
    adminUser,
    false
  );
  const petiteCaisse = petiteCaisseRes.account!;

  // Tentative de suppression directe avec solde > 0 -> DOIT ÉCHOUER
  const deleteWithBalance = dbStore.deleteFinancialAccount(petiteCaisse.id, tenantId, adminUser, false);
  assert(!deleteWithBalance.success, 'Suppression directe d\'un compte avec solde > 0 refusée');

  // Utilisation de l'assistant de transfert avant suppression
  const targetMainCashId = mainCash!.id;
  const mainCashBalBefore = dbStore.getFinancialAccountById(targetMainCashId, tenantId).account?.currentBalance || 0;

  const transferBeforeDelRes = dbStore.transferBalanceBeforeDelete(
    petiteCaisse.id,
    targetMainCashId,
    'Vidage de caisse avant suppression',
    tenantId,
    adminUser,
    false
  );

  assert(transferBeforeDelRes.success, 'Assistant de transfert avant suppression exécuté avec succès');
  assert(transferBeforeDelRes.transferredAmount === 300000, 'Montant total transféré = 300 000 GNF');

  const pcAfterTransfer = dbStore.getFinancialAccountById(petiteCaisse.id, tenantId).account;
  assert(pcAfterTransfer?.currentBalance === 0, 'Solde de Petite Caisse après transfert = 0 GNF');

  const mainCashBalAfter = dbStore.getFinancialAccountById(targetMainCashId, tenantId).account?.currentBalance || 0;
  assert(mainCashBalAfter === mainCashBalBefore + 300000, 'Caisse Principale créditée de 300 000 GNF');

  // Tentative de suppression définitive d'un compte avec historique -> DOIT ÊTRE BLOQUÉE ET PROPOSER ARCHIVAGE
  const deleteWithHistory = dbStore.deleteFinancialAccount(petiteCaisse.id, tenantId, adminUser, false);
  assert(!deleteWithHistory.success, 'Suppression définitive d\'un compte avec historique bloquée');

  // Archivage du compte
  const archiveRes = dbStore.archiveFinancialAccount(petiteCaisse.id, tenantId, adminUser, false);
  assert(archiveRes.success, 'Archivage du compte réussi');
  const pcArchived = dbStore.getFinancialAccountById(petiteCaisse.id, tenantId).account;
  assert(pcArchived?.isArchived === true && pcArchived?.isActive === false, 'Compte marqué archivé et inactif');

  // 7. SUPPRESSION D'UN COMPTE VIERGE (0 SOLDE, 0 MOUVEMENT)
  console.log('\n--- 6. SUPPRESSION DÉFINITIVE D\'UN COMPTE VIERGE ---');
  const cleanAccountRes = dbStore.createFinancialAccount(
    {
      name: 'Compte Temporaire Test',
      code: 'TMP-01',
      type: 'OTHER',
      initialBalance: 0
    },
    tenantId,
    adminUser,
    false
  );
  const cleanAcc = cleanAccountRes.account!;

  const deleteCleanRes = dbStore.deleteFinancialAccount(cleanAcc.id, tenantId, adminUser, false);
  assert(deleteCleanRes.success, 'Suppression définitive d\'un compte vierge (0 solde, 0 mouvement) autorisée');
  assert(!dbStore.getState().financialAccounts?.some(a => a.id === cleanAcc.id), 'Compte vierge retiré définitivement de la base');

  // 8. PROTECTION DE LA CAISSE PRINCIPALE
  console.log('\n--- 7. PROTECTION DE LA CAISSE PRINCIPALE ---');
  const deleteMainCashRes = dbStore.deleteFinancialAccount(mainCash!.id, tenantId, adminUser, false);
  assert(!deleteMainCashRes.success, 'Suppression de la Caisse Principale obligatoire strictement refusée');

  // 9. AUDIT TRAIL ADMINISTRATIF
  console.log('\n--- 8. JOURNAL D\'AUDIT ADMINISTRATIF DÉDIÉ ---');
  const auditLogs = dbStore.getFinancialAccountAuditLogs(omAccount.id, tenantId);
  assert(auditLogs.length >= 3, 'Audit logs enregistrés pour le compte (création, mise à jour, ajustement, reset)', `Total logs: ${auditLogs.length}`);

  console.log(`\n📊 [RÉSULTAT GLOBAL] Tests réussis : ${passedCount}/${totalCount} (${Math.round((passedCount / totalCount) * 100)}%)\n`);

  return passedCount === totalCount;
}

runFinancialAccountsAdminTests().catch(err => {
  console.error('Erreur exécution test :', err);
});
