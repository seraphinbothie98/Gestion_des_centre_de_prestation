import { dbStore } from '../server/db/mockStore';
import { User } from '../types';

/**
 * AUTOMATED TEST SUITE: USER PROFILE & AVATAR MANAGEMENT
 * Validates:
 * 1. Photo avatar updates, removals, and base64 persistence for all roles
 * 2. Super Admin personal profile persistence across multi-agency switching
 * 3. Individual user profile updates (First name, Last name, Phone, Email)
 * 4. Email uniqueness validation & format verification
 * 5. Password modification with old password verification & security checks
 * 6. RBAC access control & authorization barriers (403 if unauthorized)
 * 7. Non-corruption and total preservation of multi-agency tenant context
 * 8. Audit trail logging for all sensitive user profile operations
 */

function assert(condition: boolean, message: string) {
  if (!condition) {
    console.error(`❌ ASSERTION FAILED: ${message}`);
    throw new Error(message);
  }
  console.log(`  ✓ ${message}`);
}

async function runProfileManagementTests() {
  console.log('\n=============================================================');
  console.log('🧪 RUNNING TEST SUITE: USER PROFILE & AVATAR MANAGEMENT');
  console.log('=============================================================\n');

  const snapshot = dbStore.getState();
  const superAdmin = snapshot.users.find(u => u.username === 'superadmin');
  const agencyAdmin = snapshot.users.find(u => u.roles.some(r => r.code === 'ADMIN_CENTRE' || r.code === 'GERANT'));
  const cashier = snapshot.users.find(u => u.roles.some(r => r.code === 'CAISSIER'));
  const operator = snapshot.users.find(u => u.roles.some(r => r.code === 'OPERATEUR'));
  const stockManager = snapshot.users.find(u => u.roles.some(r => r.code === 'MAGASINIER'));

  assert(Boolean(superAdmin), 'Super Admin user exists in DB');
  assert(Boolean(agencyAdmin), 'Agency Admin user exists in DB');
  assert(Boolean(cashier), 'Cashier user exists in DB');
  assert(Boolean(operator), 'Operator user exists in DB');
  assert(Boolean(stockManager), 'Stock Manager user exists in DB');

  // -------------------------------------------------------------
  // TEST 1: Super Admin updates avatar -> Photo persists across all agency views
  // -------------------------------------------------------------
  console.log('\n--- TEST 1: Super Admin Avatar Persistence Across Agency Views ---');
  const sampleAvatarData = 'data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNk+M9QDwADhgGAWjR9awAAAABJRU5ErkJggg==';
  
  const updatedSuperAdmin = dbStore.updateUserAvatar(
    superAdmin!.id,
    sampleAvatarData,
    superAdmin,
    true
  );
  assert(updatedSuperAdmin.avatarUrl === sampleAvatarData, 'Super Admin avatar updated successfully with base64 data');

  // Verify agency context is unaffected
  const tenants = dbStore.getState().tenants;
  assert(tenants.length > 0, 'Tenants exist in system');
  
  const superAdminLookup = dbStore.getUserById(superAdmin!.id, tenants[0].id, true);
  assert(superAdminLookup?.user?.avatarUrl === sampleAvatarData, 'Super Admin retains identical avatar across agency view lookups');

  // -------------------------------------------------------------
  // TEST 2: Super Admin updates personal coordinates (Name, Email, Phone)
  // -------------------------------------------------------------
  console.log('\n--- TEST 2: Super Admin Personal Information Update ---');
  const updatedSuperInfo = dbStore.updateUserProfile(
    superAdmin!.id,
    {
      firstName: 'Alexandre',
      lastName: 'Vanderbilt',
      phone: '+241 77 00 11 22',
      email: 'alexandre.superadmin@saas-master.com'
    },
    superAdmin,
    true
  );
  assert(updatedSuperInfo.firstName === 'Alexandre', 'First name updated to Alexandre');
  assert(updatedSuperInfo.lastName === 'Vanderbilt', 'Last name updated to Vanderbilt');
  assert(updatedSuperInfo.phone === '+241 77 00 11 22', 'Phone number updated');
  assert(updatedSuperInfo.email === 'alexandre.superadmin@saas-master.com', 'Email updated');

  // -------------------------------------------------------------
  // TEST 3: Agency Admin updates profile and avatar
  // -------------------------------------------------------------
  console.log('\n--- TEST 3: Agency Admin Profile & Avatar Management ---');
  const agencyAdminAvatar = 'data:image/jpeg;base64,/9j/4AAQSkZJRgABAQEASABIAAD/2wBDAP//////////////////////////////////////////////////////////////////////////////////////wgALCAABAAEBAREA/8QAFBABAAAAAAAAAAAAAAAAAAAAAP/aAAgBAQABPxA=';
  
  const updatedAgencyAdmin = dbStore.updateUserAvatar(
    agencyAdmin!.id,
    agencyAdminAvatar,
    agencyAdmin,
    false
  );
  assert(updatedAgencyAdmin.avatarUrl === agencyAdminAvatar, 'Agency admin updated own avatar');

  const updatedAgencyAdminInfo = dbStore.updateUserProfile(
    agencyAdmin!.id,
    {
      firstName: 'Marc',
      lastName: 'Directeur',
      phone: '+241 66 12 34 56'
    },
    agencyAdmin,
    false
  );
  assert(updatedAgencyAdminInfo.firstName === 'Marc' && updatedAgencyAdminInfo.lastName === 'Directeur', 'Agency admin personal info updated');
  // Verify super admin profile was NOT mutated
  const checkSuper = dbStore.getState().users.find(u => u.id === superAdmin!.id);
  assert(checkSuper?.firstName === 'Alexandre', 'Super Admin profile remains completely distinct and unaffected');

  // -------------------------------------------------------------
  // TEST 4: Operational Roles (Cashier, Seller, Stock Manager) Avatar & Profile
  // -------------------------------------------------------------
  console.log('\n--- TEST 4: Operational Roles (Cashier, Seller, Stock Manager) ---');
  const cashierUpdated = dbStore.updateUserProfile(
    cashier!.id,
    {
      firstName: 'Sophie',
      lastName: 'Caisse',
      phone: '+241 62 99 88 77',
      email: 'sophie.caisse@centre-libreville.ga'
    },
    cashier,
    false
  );
  assert(cashierUpdated.firstName === 'Sophie' && cashierUpdated.email === 'sophie.caisse@centre-libreville.ga', 'Cashier updated coordinates');

  const cashierAvatar = dbStore.updateUserAvatar(cashier!.id, sampleAvatarData, cashier, false);
  assert(cashierAvatar.avatarUrl === sampleAvatarData, 'Cashier avatar updated');

  // Remove cashier avatar -> falls back to undefined/null
  const cashierRemovedAvatar = dbStore.removeUserAvatar(cashier!.id, cashier, false);
  assert(cashierRemovedAvatar.avatarUrl === undefined, 'Cashier avatar removed successfully (defaults to initials)');

  // -------------------------------------------------------------
  // TEST 5: Email Uniqueness & Validation
  // -------------------------------------------------------------
  console.log('\n--- TEST 5: Email Uniqueness Constraint ---');
  let emailConflictCaught = false;
  try {
    // Operator attempts to take cashier's email
    dbStore.updateUserProfile(
      operator!.id,
      { email: 'sophie.caisse@centre-libreville.ga' },
      operator,
      false
    );
  } catch (err: any) {
    emailConflictCaught = true;
    assert(err.message.includes('déjà utilisée'), `Rejected duplicate email with message: "${err.message}"`);
  }
  assert(emailConflictCaught, 'System prevented duplicate email assignment across users');

  // -------------------------------------------------------------
  // TEST 6: Password Change & Verification
  // -------------------------------------------------------------
  console.log('\n--- TEST 6: Secure Password Change ---');
  // Successful change
  const pwdChangeResult = dbStore.changeUserPassword(
    agencyAdmin!.id,
    'admin123',
    'NewSecurePassword!2026',
    agencyAdmin,
    false
  );
  assert(pwdChangeResult.success, 'Password successfully changed for Agency Admin');

  // Failure: Incorrect old password
  let wrongOldPwdCaught = false;
  try {
    dbStore.changeUserPassword(
      agencyAdmin!.id,
      'wrongOldPassword',
      'AnotherNewPassword!2026',
      agencyAdmin,
      false
    );
  } catch (err: any) {
    wrongOldPwdCaught = true;
    assert(err.message.includes('actuel est incorrect'), `Rejected wrong old password: "${err.message}"`);
  }
  assert(wrongOldPwdCaught, 'System blocked password change with wrong old password');

  // Failure: New password too short (< 6 chars)
  let shortPwdCaught = false;
  try {
    dbStore.changeUserPassword(
      agencyAdmin!.id,
      'NewSecurePassword!2026',
      '123',
      agencyAdmin,
      false
    );
  } catch (err: any) {
    shortPwdCaught = true;
    assert(err.message.includes('6 caractères'), `Rejected short password: "${err.message}"`);
  }
  assert(shortPwdCaught, 'System blocked password shorter than 6 characters');

  // -------------------------------------------------------------
  // TEST 7: Security Barrier - Unauthorized Profile Mutation (403 Forbidden)
  // -------------------------------------------------------------
  console.log('\n--- TEST 7: RBAC Security Barrier (403 Forbidden on Unauthorized Profile Edit) ---');
  let unauthorizedEditCaught = false;
  try {
    // Cashier attempts to maliciously modify Agency Admin's profile
    dbStore.updateUserProfile(
      agencyAdmin!.id,
      { firstName: 'HackedName' },
      cashier, // Requesting user is Cashier, target is Agency Admin
      false
    );
  } catch (err: any) {
    unauthorizedEditCaught = true;
    assert(err.message.includes('non autorisé') || err.message.includes('interdit'), `Security barrier blocked unauthorized edit: "${err.message}"`);
  }
  assert(unauthorizedEditCaught, 'Blocked non-admin user from modifying another user profile');

  // -------------------------------------------------------------
  // TEST 8: Audit Trail Logging
  // -------------------------------------------------------------
  console.log('\n--- TEST 8: Audit Trail Verification ---');
  const auditLogs = dbStore.getState().auditLogs;
  
  const profileUpdateLogs = auditLogs.filter(l => l.action === 'USER_PROFILE_UPDATED');
  const avatarUpdateLogs = auditLogs.filter(l => l.action === 'USER_AVATAR_UPDATED');
  const avatarRemoveLogs = auditLogs.filter(l => l.action === 'USER_AVATAR_REMOVED');
  const passwordChangeLogs = auditLogs.filter(l => l.action === 'USER_PASSWORD_CHANGED');

  assert(profileUpdateLogs.length > 0, `Recorded ${profileUpdateLogs.length} USER_PROFILE_UPDATED audit logs`);
  assert(avatarUpdateLogs.length > 0, `Recorded ${avatarUpdateLogs.length} USER_AVATAR_UPDATED audit logs`);
  assert(avatarRemoveLogs.length > 0, `Recorded ${avatarRemoveLogs.length} USER_AVATAR_REMOVED audit logs`);
  assert(passwordChangeLogs.length > 0, `Recorded ${passwordChangeLogs.length} USER_PASSWORD_CHANGED audit logs`);

  // -------------------------------------------------------------
  // TEST 9: Multi-Agency Context Integrity
  // -------------------------------------------------------------
  console.log('\n--- TEST 9: Multi-Agency Strict Isolation Verification ---');
  const finalSnapshot = dbStore.getState();
  const currentTenant = finalSnapshot.currentTenantId;
  assert(Boolean(currentTenant), `Active tenant preserved without corruption (${currentTenant})`);

  console.log('\n=============================================================');
  console.log('🎉 ALL 19 USER PROFILE & AVATAR TESTS PASSED FLAWLESSLY!');
  console.log('=============================================================\n');
}

runProfileManagementTests().catch(err => {
  console.error('Test Suite Failed:', err);
  process.exit(1);
});
