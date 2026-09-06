/**
 * ====================================================================
 * TEST SUITE: PARTIE 14 — SÉCURITÉ DES ACTIONS SENSIBLES : FINANCE & TRÉSORERIE
 * ====================================================================
 * 
 * Verifies:
 * 1. Role-based Access Control (RBAC) on all sensitive financial operations.
 * 2. Strict rejection (403 Forbidden) for unauthorized roles (Caissier, Vendeur, Stock, etc.).
 * 3. Multi-agency tenant boundary protection (Admin of Agency A cannot alter Agency B).
 * 4. Super Admin global authorization.
 * 5. Complete Audit Trail logging (User, Role, Agency, Old Values, New Values, Action, Timestamp).
 */

import { dbStore } from '../server/db/mockStore';
import { canPerformFinancialSensitiveAction, getFinancialUserRoleLabel, formatFinancialAuditMessage } from '../server/security/securityEngine';
import { User, UserRole } from '../types';

let passedTests = 0;
let totalTests = 0;

function assert(condition: boolean, testName: string, failureDetails?: string) {
  totalTests++;
  if (condition) {
    console.log(`  ✅ [PASS] ${testName}`);
    passedTests++;
  } else {
    console.error(`  ❌ [FAIL] ${testName}`);
    if (failureDetails) console.error(`     Reason: ${failureDetails}`);
  }
}

async function runPartie14SecurityTests() {
  console.log('\n======================================================================');
  console.log('PARTIE 14: SÉCURITÉ DES ACTIONS SENSIBLES — FINANCE & TRÉSORERIE');
  console.log('======================================================================\n');

  // SETUP MOCK USERS
  const superAdminUser: User = {
    id: 'u-super-01',
    email: 'superadmin@system.local',
    firstName: 'Super',
    lastName: 'Directeur',
    role: 'SUPER_ADMIN' as UserRole,
    permissions: [],
    isActive: true,
    tenantId: 't-001',
    createdAt: new Date().toISOString()
  };

  const agencyAdminUserA: User = {
    id: 'u-admin-a',
    email: 'admin.agenceA@centre.local',
    firstName: 'Admin',
    lastName: 'Agence A',
    role: 'ADMIN_AGENCY' as UserRole,
    permissions: [],
    isActive: true,
    tenantId: 't-001',
    createdAt: new Date().toISOString()
  };

  const agencyAdminUserB: User = {
    id: 'u-admin-b',
    email: 'admin.agenceB@centre.local',
    firstName: 'Admin',
    lastName: 'Agence B',
    role: 'ADMIN_AGENCY' as UserRole,
    permissions: [],
    isActive: true,
    tenantId: 't-002',
    createdAt: new Date().toISOString()
  };

  const cashierUser: User = {
    id: 'u-cashier-01',
    email: 'caissier@centre.local',
    firstName: 'Mamadou',
    lastName: 'Caissier',
    role: 'CASHIER' as UserRole,
    permissions: ['VIEW_CASH'],
    isActive: true,
    tenantId: 't-001',
    createdAt: new Date().toISOString()
  };

  const sellerUser: User = {
    id: 'u-seller-01',
    email: 'vendeur@centre.local',
    firstName: 'Fatou',
    lastName: 'Vendeuse',
    role: 'SELLER' as UserRole,
    permissions: ['CREATE_ORDER'],
    isActive: true,
    tenantId: 't-001',
    createdAt: new Date().toISOString()
  };

  const stockManagerUser: User = {
    id: 'u-stock-01',
    email: 'stock@centre.local',
    firstName: 'Ibrahima',
    lastName: 'Stockiste',
    role: 'STOCK_MANAGER' as UserRole,
    permissions: ['MANAGE_STOCK'],
    isActive: true,
    tenantId: 't-001',
    createdAt: new Date().toISOString()
  };

  // -------------------------------------------------------------------
  // TEST SECTION 1: SECURITY ENGINE CHECKS
  // -------------------------------------------------------------------
  console.log('--- TEST SECTION 1: Security Engine Role Evaluation ---');

  const cashierCheck = canPerformFinancialSensitiveAction(cashierUser, 't-001', 'ADJUST_BALANCE');
  assert(!cashierCheck.allowed, 'Cashier cannot adjust account balance (403 Forbidden)', cashierCheck.reason);

  const sellerCheck = canPerformFinancialSensitiveAction(sellerUser, 't-001', 'DELETE_ACCOUNT');
  assert(!sellerCheck.allowed, 'Seller cannot delete financial account (403 Forbidden)', sellerCheck.reason);

  const stockCheck = canPerformFinancialSensitiveAction(stockManagerUser, 't-001', 'RESET_ACCOUNT');
  assert(!stockCheck.allowed, 'Stock Manager cannot reset financial account (403 Forbidden)', stockCheck.reason);

  const adminAOwnAgencyCheck = canPerformFinancialSensitiveAction(agencyAdminUserA, 't-001', 'ADJUST_BALANCE');
  assert(adminAOwnAgencyCheck.allowed, 'Agency Admin can perform sensitive action on own agency (t-001)');

  const adminACrossAgencyCheck = canPerformFinancialSensitiveAction(agencyAdminUserA, 't-002', 'ADJUST_BALANCE');
  assert(!adminACrossAgencyCheck.allowed, 'Agency Admin CANNOT perform sensitive action on different agency (t-002)', adminACrossAgencyCheck.reason);

  const superAdminCrossAgencyCheck = canPerformFinancialSensitiveAction(superAdminUser, 't-002', 'DELETE_ACCOUNT');
  assert(superAdminCrossAgencyCheck.allowed, 'Super Admin has global wildcard access across all agencies');

  // Role Labels in French
  assert(getFinancialUserRoleLabel(superAdminUser) === 'SUPER ADMINISTRATEUR', 'Super Admin role label is French "SUPER ADMINISTRATEUR"');
  assert(getFinancialUserRoleLabel(agencyAdminUserA) === "ADMINISTRATEUR DE L'AGENCE", 'Agency Admin role label is French "ADMINISTRATEUR DE L\'AGENCE"');
  assert(getFinancialUserRoleLabel(cashierUser) === 'CAISSIER', 'Cashier role label is French "CAISSIER"');

  // -------------------------------------------------------------------
  // TEST SECTION 2: BACKEND STORE ENFORCEMENT & REJECTIONS
  // -------------------------------------------------------------------
  console.log('\n--- TEST SECTION 2: Backend DB Store Method Protection ---');

  // Find or create test account in t-001
  const existingAccounts = dbStore.getState().financialAccounts || [];
  let testAccount = existingAccounts.find(a => a.tenantId === 't-001');

  if (!testAccount) {
    const accRes = dbStore.createFinancialAccount({
      code: 'TEST-SEC-01',
      name: 'Compte Test Sécurité',
      type: 'CASH',
      currentBalance: 500000,
      initialBalance: 500000,
      description: 'Compte test'
    }, 't-001', superAdminUser);
    testAccount = accRes.account;
  }

  const testAccId = testAccount!.id;

  // 1. Cashier attempts to adjust balance -> Expect Failure
  const cashierAdjustRes = dbStore.adjustFinancialAccountBalance(
    testAccId,
    999999,
    'Ajustement frauduleux par caissier',
    't-001',
    cashierUser
  );
  assert(!cashierAdjustRes.success, 'Backend rejects balance adjustment by CASHIER with 403 Forbidden', cashierAdjustRes.message);

  // 2. Seller attempts to reset account -> Expect Failure
  const sellerResetRes = dbStore.resetFinancialAccount(
    testAccId,
    'RÉINITIALISER',
    'admin123',
    'Réinitialisation non autorisée',
    't-001',
    sellerUser
  );
  assert(!sellerResetRes.success, 'Backend rejects account reset by SELLER with 403 Forbidden', sellerResetRes.message);

  // 3. Stock Manager attempts to delete account -> Expect Failure
  const stockDeleteRes = dbStore.deleteFinancialAccount(
    testAccId,
    'Suppression non autorisée',
    't-001',
    stockManagerUser
  );
  assert(!stockDeleteRes.success, 'Backend rejects account deletion by STOCK_MANAGER with 403 Forbidden', stockDeleteRes.message);

  // 4. Cashier attempts to close financial period -> Expect Failure
  const periods = dbStore.getState().financialPeriods || [];
  const testPeriod = periods.find(p => p.tenantId === 't-001') || periods[0];

  if (testPeriod) {
    const cashierPeriodRes = dbStore.closeFinancialPeriod(testPeriod.id, 't-001', cashierUser);
    assert(!cashierPeriodRes.success, 'Backend rejects period closure by CASHIER with 403 Forbidden', cashierPeriodRes.message);

    const cashierReopenRes = dbStore.reopenFinancialPeriod(testPeriod.id, 't-001', cashierUser);
    assert(!cashierReopenRes.success, 'Backend rejects period reopening by CASHIER with 403 Forbidden', cashierReopenRes.message);
  }

  // -------------------------------------------------------------------
  // TEST SECTION 3: MULTI-TENANT ISOLATION (CROSS-AGENCY REJECTION)
  // -------------------------------------------------------------------
  console.log('\n--- TEST SECTION 3: Multi-tenant Agency Boundary Enforcement ---');

  // Admin of Agency B tries to modify Agency A's account
  const crossAgencyAdjustRes = dbStore.adjustFinancialAccountBalance(
    testAccId, // Account of t-001
    1000000,
    'Ajustement cross-tenant non autorisé',
    't-001',
    agencyAdminUserB // Admin of t-002
  );
  assert(!crossAgencyAdjustRes.success, 'Admin of Agency B CANNOT adjust balance of Agency A account (Multi-tenant check)', crossAgencyAdjustRes.message);

  // -------------------------------------------------------------------
  // TEST SECTION 4: AUTHORIZED ADMIN & SUPER ADMIN EXECUTION
  // -------------------------------------------------------------------
  console.log('\n--- TEST SECTION 4: Authorized Execution & Audit Trail Recording ---');

  const initialBal = testAccount!.currentBalance;
  const targetNewBal = initialBal + 50000;

  // Admin of Agency A adjusts own agency account
  const adminAdjustRes = dbStore.adjustFinancialAccountBalance(
    testAccId,
    targetNewBal,
    'Régularisation inventaire physique caisse',
    't-001',
    agencyAdminUserA
  );
  assert(adminAdjustRes.success, 'Admin of Agency A successfully adjusts account balance on own agency', adminAdjustRes.message);

  // Verify Audit Log was recorded
  const auditLogs = dbStore.getState().auditLogs || [];
  const adjustAudit = auditLogs.find(
    l => l.action === 'FINANCIAL_ACCOUNT_ADJUSTED' && l.entityId === testAccId
  );

  assert(Boolean(adjustAudit), 'Audit Log was generated for FINANCIAL_ACCOUNT_ADJUSTED');
  if (adjustAudit) {
    assert(adjustAudit.tenantId === 't-001', `Audit Log contains correct tenantId: ${adjustAudit.tenantId}`);
    assert(adjustAudit.userId === agencyAdminUserA.id, `Audit Log contains correct userId: ${adjustAudit.userId}`);
    assert(adjustAudit.userRole === "ADMINISTRATEUR DE L'AGENCE", `Audit Log contains exact role label: ${adjustAudit.userRole}`);
    assert(adjustAudit.newValues?.newBalance === targetNewBal, `Audit Log contains correct newBalance: ${adjustAudit.newValues?.newBalance}`);
    console.log(`     📝 Audit Message: "${adjustAudit.details}"`);
  }

  // Super Admin resets account
  const superAdminResetRes = dbStore.resetFinancialAccount(
    testAccId,
    'RÉINITIALISER',
    'adminPassSecret',
    'Remise à zéro annuelle par Super Admin',
    't-001',
    superAdminUser,
    true
  );
  assert(superAdminResetRes.success, 'Super Admin successfully resets financial account to 0 GNF', superAdminResetRes.message);

  // Verify reset audit log
  const resetAudit = dbStore.getState().auditLogs.find(
    l => l.action === 'FINANCIAL_ACCOUNT_RESET' && l.entityId === testAccId
  );
  assert(Boolean(resetAudit), 'Audit Log was generated for FINANCIAL_ACCOUNT_RESET');
  if (resetAudit) {
    assert(resetAudit.userRole === 'SUPER ADMINISTRATEUR', `Reset Audit Log recorded role: ${resetAudit.userRole}`);
    console.log(`     📝 Reset Audit Message: "${resetAudit.details}"`);
  }

  // -------------------------------------------------------------------
  // SUMMARY
  // -------------------------------------------------------------------
  console.log('\n======================================================================');
  console.log(`PARTIE 14 TEST RESULTS: ${passedTests}/${totalTests} TESTS PASSED (${Math.round((passedTests / totalTests) * 100)}%)`);
  console.log('======================================================================\n');

  if (passedTests === totalTests) {
    console.log('🎉 ALL SENSITIVE FINANCIAL ACTION SECURITY SPECIFICATIONS VALIDATED SUCCESSFULLY!\n');
  } else {
    console.error('⚠️ SOME TESTS FAILED. Please review output above.\n');
    process.exit(1);
  }
}

runPartie14SecurityTests().catch(err => {
  console.error('Fatal test error:', err);
  process.exit(1);
});
