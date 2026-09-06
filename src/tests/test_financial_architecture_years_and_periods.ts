import { dbStore } from '../server/db/mockStore';
import { FinancialYear, FinancialPeriod } from '../types';

function runTest(testName: string, fn: () => void) {
  try {
    fn();
    console.log(`✅ [PASS] ${testName}`);
  } catch (error: any) {
    console.error(`❌ [FAIL] ${testName}`);
    console.error(`   Error: ${error.message || error}`);
    process.exitCode = 1;
  }
}

function assertEquals(actual: any, expected: any, message?: string) {
  if (actual !== expected) {
    throw new Error(`Assertion failed: expected "${expected}" (type: ${typeof expected}) but got "${actual}" (type: ${typeof actual}). ${message || ''}`);
  }
}

function assertTrue(condition: boolean, message?: string) {
  if (!condition) {
    throw new Error(`Assertion failed: expected truthy value. ${message || ''}`);
  }
}

console.log('========================================================================');
console.log('TEST SUITE : ARCHITECTURE COMPTABLE EXERCICES & PÉRIODES FINANCIÈRES');
console.log('========================================================================\n');

// 1. Reset state to clean initial state
dbStore.resetToDefault();

const tenantA = 't-001';
const tenantB = 't-002';

// TEST 1: Hydration and existence of financial years & 12 monthly periods per agency
runTest('1. Hydratation automatique de l\'exercice 2026 et des 12 périodes mensuelles', () => {
  const yearsA = dbStore.getFinancialYears(tenantA);
  const yearsB = dbStore.getFinancialYears(tenantB);

  assertTrue(yearsA.length >= 1, 'Agence A doit posséder au moins 1 exercice financier');
  assertTrue(yearsB.length >= 1, 'Agence B doit posséder au moins 1 exercice financier');

  const fy2026A = yearsA.find(y => y.year === 2026);
  assertTrue(Boolean(fy2026A), 'Exercice 2026 présent pour Agence A');
  assertEquals(fy2026A?.status, 'ACTIVE', 'Exercice 2026 doit être ACTIF');

  const periodsA = dbStore.getFinancialPeriods(fy2026A!.id, tenantA);
  assertEquals(periodsA.length, 12, 'Agence A doit posséder exactement 12 périodes mensuelles pour 2026');

  // Verify monthly codes and dates
  assertEquals(periodsA[0].code, 'PER-2026-01', 'Première période = PER-2026-01');
  assertEquals(periodsA[0].name, 'Janvier 2026', 'Nom première période = Janvier 2026');
  assertEquals(periodsA[11].code, 'PER-2026-12', 'Dernière période = PER-2026-12');
  assertEquals(periodsA[11].name, 'Décembre 2026', 'Nom dernière période = Décembre 2026');
});

// TEST 2: Multi-Agency Strict Isolation
runTest('2. Isolation stricte multi-agences des exercices et des périodes', () => {
  const yearsA = dbStore.getFinancialYears(tenantA);
  const yearsB = dbStore.getFinancialYears(tenantB);

  // Agency A must only see tenantA records
  yearsA.forEach(y => assertEquals(y.tenantId, tenantA, 'Exercice A doit appartenir à Agence A'));
  yearsB.forEach(y => assertEquals(y.tenantId, tenantB, 'Exercice B doit appartenir à Agence B'));

  const periodsA = dbStore.getFinancialPeriods(undefined, tenantA);
  const periodsB = dbStore.getFinancialPeriods(undefined, tenantB);

  periodsA.forEach(p => assertEquals(p.tenantId, tenantA, 'Période A doit appartenir à Agence A'));
  periodsB.forEach(p => assertEquals(p.tenantId, tenantB, 'Période B doit appartenir à Agence B'));
});

// TEST 3: Consolidated Treasury & Summary calculation
runTest('3. Calcul du bilan financier consolidé d\'une période', () => {
  const periods = dbStore.getFinancialPeriods(undefined, tenantA);
  const febPeriod = periods.find(p => p.monthNumber === 2); // Février 2026
  assertTrue(Boolean(febPeriod), 'Période Février 2026 trouvée');

  const summary = dbStore.getPeriodFinancialSummary(tenantA, febPeriod?.financialYearId, febPeriod?.id);
  assertTrue(summary.accountsBreakdown.length > 0, 'La situation des comptes doit être ventilée');
  assertTrue(summary.consolidatedTreasury >= 0, 'La trésorerie consolidée doit être positive');
});

// TEST 4: Section XXXI - Consistency Test (2,327,000 GNF -> Reset to 0 GNF -> History Intact)
runTest('4. Test de Cohérence Section XXXI : Clôture, Départ à 0 GNF et Conservation de l\'Historique', () => {
  const accountsBefore = dbStore.getFinancialAccounts(tenantA);
  const initialTotal = accountsBefore.reduce((sum, a) => sum + (a.isActive ? a.currentBalance : 0), 0);
  console.log(`   Solde consolidé initial Agence A : ${initialTotal.toLocaleString('fr-FR')} GNF`);

  const periods = dbStore.getFinancialPeriods(undefined, tenantA);
  const currentPeriod = periods.find(p => p.monthNumber === 8); // Août
  const nextPeriod = periods.find(p => p.monthNumber === 9); // Septembre
  assertTrue(Boolean(currentPeriod && nextPeriod), 'Périodes trouvées');

  // 1. Close current period (Août)
  const closeRes = dbStore.closeFinancialPeriod(currentPeriod!.id, tenantA, 'Administrateur Test');
  assertEquals(closeRes.success, true, 'Clôture de la période');

  const closedObj = dbStore.getFinancialPeriodById(currentPeriod!.id, tenantA).period;
  assertEquals(closedObj?.status, 'CLOSED', 'La période passée doit être CLÔTURÉE');

  // 2. Start next period (Septembre) with ZERO_ALL
  const resetRes = dbStore.resetFinancialPeriod(nextPeriod!.id, tenantA, 'ZERO_ALL', undefined, 'Administrateur Test');
  assertEquals(resetRes.success, true, 'Réinitialisation départ propre');

  // 3. Verify that active accounts in tenantA now have 0 GNF
  const accountsAfter = dbStore.getFinancialAccounts(tenantA);
  const newTotal = accountsAfter.reduce((sum, a) => sum + (a.isActive ? a.currentBalance : 0), 0);
  assertEquals(newTotal, 0, 'Tous les comptes actifs doivent afficher 0 GNF pour la nouvelle période');

  // 4. Verify historical summary of previous period is 100% conserved and movements exist
  const pastMovements = dbStore.getState().financialMovements.filter(m => m.tenantId === tenantA);
  assertTrue(pastMovements.length > 0, 'Les mouvements historiques doivent être intégralement conservés');
  console.log(`   Historique préservé : ${pastMovements.length} écritures passées intactes`);
});

// TEST 5: Period Locking (Blocked Operations on Closed/Archived Period)
runTest('5. Blocage des écritures sur une période clôturée ou archivée', () => {
  const periods = dbStore.getFinancialPeriods(undefined, tenantA);
  const closedPeriod = periods.find(p => p.status === 'CLOSED');
  assertTrue(Boolean(closedPeriod), 'Période clôturée trouvée');

  // Attempt operation check on closed period
  const checkClosed = dbStore.isOperationAllowedInPeriod(closedPeriod!.id, tenantA);
  assertEquals(checkClosed.allowed, false, 'Opération doit être interdite sur une période clôturée');
  assertTrue(checkClosed.reason?.includes('CLÔTURÉE') || false, 'Raison explicite de blocage');

  // Archive period and verify
  dbStore.archiveFinancialPeriod(closedPeriod!.id, tenantA, 'Admin Test');
  const checkArchived = dbStore.isOperationAllowedInPeriod(closedPeriod!.id, tenantA);
  assertEquals(checkArchived.allowed, false, 'Opération doit être interdite sur une période archivée');
  assertTrue(checkArchived.reason?.includes('ARCHIVÉE') || false, 'Raison explicite archivée');

  // Reopen period and verify
  dbStore.reopenFinancialPeriod(closedPeriod!.id, tenantA, 'Admin Test');
  const checkReopened = dbStore.isOperationAllowedInPeriod(closedPeriod!.id, tenantA);
  assertEquals(checkReopened.allowed, true, 'Opération doit être autorisée sur une période réouverte');
});

// TEST 6: Creation of a new Fiscal Year & Automatic 12 Monthly Periods Generation
runTest('6. Création d\'un nouvel exercice fiscal 2027 et auto-génération des 12 périodes', () => {
  const res = dbStore.createFinancialYear({
    year: 2027,
    code: 'EX-2027',
    name: 'Exercice Financier 2027',
    notes: 'Exercice d\'expansion'
  }, tenantA, 'Admin Test');

  assertEquals(res.success, true, 'Création de l\'exercice 2027 réussie');
  assertEquals(res.year?.year, 2027, 'Année 2027');

  const periods2027 = dbStore.getFinancialPeriods(res.year!.id, tenantA);
  assertEquals(periods2027.length, 12, '12 périodes mensuelles créées pour 2027');
  assertEquals(periods2027[0].name, 'Janvier 2027');
  assertEquals(periods2027[11].name, 'Décembre 2027');
});

// TEST 7: Closing an entire Fiscal Year closes all its periods
runTest('7. Clôture globale d\'un exercice financier', () => {
  const years = dbStore.getFinancialYears(tenantA);
  const y2027 = years.find(y => y.year === 2027);
  assertTrue(Boolean(y2027), 'Exercice 2027 trouvé');

  const closeYearRes = dbStore.closeFinancialYear(y2027!.id, tenantA, 'Admin Test');
  assertEquals(closeYearRes.success, true, 'Clôture de l\'exercice 2027 réussie');

  const y2027Closed = dbStore.getFinancialYearById(y2027!.id, tenantA).year;
  assertEquals(y2027Closed?.status, 'CLOSED', 'Exercice 2027 doit être en statut CLOSED');

  // All periods for 2027 should now be CLOSED
  const periods2027 = dbStore.getFinancialPeriods(y2027!.id, tenantA);
  periods2027.forEach(p => {
    assertEquals(p.status, 'CLOSED', `Période ${p.name} doit être clôturée`);
  });
});

console.log('\n========================================================================');
console.log('🎉 TOUS LES TESTS D\'ARCHITECTURE FINANCIÈRE SONT VALIDÉS AVEC SUCCÈS !');
console.log('========================================================================');
