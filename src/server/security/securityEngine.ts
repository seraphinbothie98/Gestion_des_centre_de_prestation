import { User } from '../../types';

/**
 * ==============================================================================
 * CENTRAL SECURITY & ANTI-BRUTE-FORCE ENGINE
 * ==============================================================================
 * 
 * Standardized security policy across all roles and tenants:
 * 1. 3 consecutive failed login attempts -> temporary lock.
 * 2. Incremental progressive lockout periods:
 *    - 1st lockout: 15 minutes
 *    - 2nd lockout: 30 minutes
 *    - 3rd lockout: 60 minutes (1 hour)
 *    - 4th+ lockout: 120 minutes (2 hours)
 * 3. Lockout enforcement on backend/store:
 *    - If locked: immediately reject even if correct credentials are supplied.
 *    - Return remaining time clearly formatted.
 * 4. Automatic unlock after lockedUntil expiration:
 *    - Successful login resets consecutive failedLoginAttempts to 0.
 * 5. IP-based sliding window rate limiting:
 *    - Max 15 failed requests per 5 minutes per IP.
 * 6. Multi-tenant administrative unlock:
 *    - Agency admin can only unlock users in their own agency.
 *    - Super admin can unlock any account globally.
 * 7. Sensitive data sanitization:
 *    - Passwords, hashes, and secrets are strictly forbidden in logs and API payloads.
 */

export const SECURITY_CONFIG = {
  MAX_FAILED_ATTEMPTS: 3,
  LOCKOUT_LEVELS_MINUTES: [15, 30, 60, 120] as const,
  IP_RATE_LIMIT_WINDOW_MS: 5 * 60 * 1000, // 5 minutes
  IP_MAX_FAILED_REQUESTS: 15,
};

export interface LockoutStatus {
  isLocked: boolean;
  remainingMinutes: number;
  remainingSeconds: number;
  lockedUntil?: string;
  lockoutDurationMinutes?: number;
}

export interface AuthEvaluationResult {
  success: boolean;
  message?: string;
  isLocked?: boolean;
  rateLimited?: boolean;
  remainingMinutes?: number;
  user?: User;
}

// Memory tracking for IP rate limiting
interface IpAttemptRecord {
  timestamps: number[];
}

const ipAttemptsMap = new Map<string, IpAttemptRecord>();

/**
 * Reset IP rate limit tracking (useful for testing or server restart)
 */
export function resetIpRateLimiter(): void {
  ipAttemptsMap.clear();
}

/**
 * Calculate lockout duration in minutes according to previous lockout history
 */
export function getLockoutDurationMinutes(previousLockoutCount: number = 0): number {
  const index = Math.min(previousLockoutCount, SECURITY_CONFIG.LOCKOUT_LEVELS_MINUTES.length - 1);
  return SECURITY_CONFIG.LOCKOUT_LEVELS_MINUTES[index];
}

/**
 * Calculate lockout duration in milliseconds
 */
export function getLockoutDurationMs(previousLockoutCount: number = 0): number {
  return getLockoutDurationMinutes(previousLockoutCount) * 60 * 1000;
}

/**
 * Checks if a user account is currently locked out
 */
export function checkAccountLockout(user: User, now: Date = new Date()): LockoutStatus {
  if (!user.lockedUntil) {
    return {
      isLocked: false,
      remainingMinutes: 0,
      remainingSeconds: 0
    };
  }

  const lockedUntilDate = new Date(user.lockedUntil);
  const nowMs = now.getTime();
  const lockedUntilMs = lockedUntilDate.getTime();

  if (isNaN(lockedUntilMs) || lockedUntilMs <= nowMs) {
    // Lock has expired
    return {
      isLocked: false,
      remainingMinutes: 0,
      remainingSeconds: 0,
      lockedUntil: user.lockedUntil
    };
  }

  const diffMs = lockedUntilMs - nowMs;
  const totalSeconds = Math.ceil(diffMs / 1000);
  const remainingMinutes = Math.ceil(diffMs / (60 * 1000));
  const remainingSeconds = totalSeconds % 60;

  return {
    isLocked: true,
    remainingMinutes,
    remainingSeconds,
    lockedUntil: user.lockedUntil,
    lockoutDurationMinutes: user.lockoutCount ? getLockoutDurationMinutes(user.lockoutCount - 1) : 15
  };
}

/**
 * Format user-friendly lockout message
 */
export function formatLockoutMessage(remainingMinutes: number, remainingSeconds: number = 0): string {
  if (remainingMinutes <= 1) {
    const secText = remainingSeconds > 0 ? ` (${remainingSeconds} seconde${remainingSeconds > 1 ? 's' : ''})` : '';
    return `Compte temporairement bloqué pour des raisons de sécurité. Veuillez réessayer dans moins d'une minute${secText}.`;
  }
  return `Compte temporairement bloqué pour des raisons de sécurité. Veuillez réessayer dans ${remainingMinutes} minute${remainingMinutes > 1 ? 's' : ''}.`;
}

/**
 * Checks IP rate limiting
 */
export function checkIpRateLimit(
  ipAddress: string = '127.0.0.1',
  now: Date = new Date()
): { allowed: boolean; remainingAttempts: number; retryAfterSeconds: number } {
  const cleanIp = ipAddress.trim() || '127.0.0.1';
  const nowMs = now.getTime();
  const windowStart = nowMs - SECURITY_CONFIG.IP_RATE_LIMIT_WINDOW_MS;

  const record = ipAttemptsMap.get(cleanIp);
  if (!record) {
    return {
      allowed: true,
      remainingAttempts: SECURITY_CONFIG.IP_MAX_FAILED_REQUESTS,
      retryAfterSeconds: 0
    };
  }

  // Filter timestamps within current window
  const activeTimestamps = record.timestamps.filter(ts => ts > windowStart);
  record.timestamps = activeTimestamps;

  if (activeTimestamps.length >= SECURITY_CONFIG.IP_MAX_FAILED_REQUESTS) {
    const oldestTs = activeTimestamps[0];
    const retryAfterMs = Math.max(0, oldestTs + SECURITY_CONFIG.IP_RATE_LIMIT_WINDOW_MS - nowMs);
    const retryAfterSeconds = Math.ceil(retryAfterMs / 1000);
    return {
      allowed: false,
      remainingAttempts: 0,
      retryAfterSeconds
    };
  }

  return {
    allowed: true,
    remainingAttempts: SECURITY_CONFIG.IP_MAX_FAILED_REQUESTS - activeTimestamps.length,
    retryAfterSeconds: 0
  };
}

/**
 * Record a failed attempt from an IP address
 */
export function recordFailedIpAttempt(ipAddress: string = '127.0.0.1', now: Date = new Date()): void {
  const cleanIp = ipAddress.trim() || '127.0.0.1';
  const nowMs = now.getTime();
  const windowStart = nowMs - SECURITY_CONFIG.IP_RATE_LIMIT_WINDOW_MS;

  const record = ipAttemptsMap.get(cleanIp) || { timestamps: [] };
  const filtered = record.timestamps.filter(ts => ts > windowStart);
  filtered.push(nowMs);
  record.timestamps = filtered;
  ipAttemptsMap.set(cleanIp, record);
}

/**
 * Clean up or reduce IP failed attempts upon success
 */
export function recordSuccessfulIpAttempt(ipAddress: string = '127.0.0.1'): void {
  const cleanIp = ipAddress.trim() || '127.0.0.1';
  ipAttemptsMap.delete(cleanIp);
}

/**
 * Sanitize any log or payload to strictly eliminate plaintext passwords, hashes, and secrets
 */
export function sanitizeAuditPayload(data: any): any {
  if (!data || typeof data !== 'object') return data;
  if (Array.isArray(data)) {
    return data.map(sanitizeAuditPayload);
  }

  const forbiddenKeys = [
    'password',
    'passwordhash',
    'pass',
    'secret',
    'token',
    'oldpassword',
    'newpassword',
    'resetcode',
    'resetpasswordcode',
    'mfasecret'
  ];

  const sanitized: Record<string, any> = {};
  for (const [key, value] of Object.entries(data)) {
    if (forbiddenKeys.includes(key.toLowerCase())) {
      sanitized[key] = '[REDACTED_SECURITY]';
    } else if (value && typeof value === 'object') {
      sanitized[key] = sanitizeAuditPayload(value);
    } else {
      sanitized[key] = value;
    }
  }

  return sanitized;
}

/**
 * ==============================================================================
 * PARTIE 14 : SÉCURITÉ DES ACTIONS SENSIBLES (FINANCE & TRÉSORERIE)
 * ==============================================================================
 * 
 * Règles d'autorisation :
 * 1. SUPER ADMINISTRATEUR :
 *    - Accès global multi-agences à toutes les actions sensibles.
 * 2. ADMINISTRATEUR DE L'AGENCE (ADMIN_CENTRE / ADMIN_AGENCY / GERANT) :
 *    - Accès aux fonctions financières de son agence uniquement.
 * 3. AUTRES UTILISATEURS (Caissier, Vendeur, Gestionnaire de stock, Formateur, etc.) :
 *    - Rejet de toute action financière sensible (403 Forbidden) sauf permission explicite.
 */

export type FinancialSensitiveAction =
  | 'CREATE_FINANCIAL_ACCOUNT'
  | 'UPDATE_FINANCIAL_ACCOUNT'
  | 'DELETE_FINANCIAL_ACCOUNT'
  | 'DEACTIVATE_FINANCIAL_ACCOUNT'
  | 'REACTIVATE_FINANCIAL_ACCOUNT'
  | 'RESET_FINANCIAL_ACCOUNT'
  | 'ADJUST_FINANCIAL_ACCOUNT_BALANCE'
  | 'RESET_TREASURY'
  | 'CLOSE_FINANCIAL_YEAR'
  | 'REOPEN_FINANCIAL_YEAR'
  | 'CLOSE_FINANCIAL_PERIOD'
  | 'REOPEN_FINANCIAL_PERIOD'
  | 'UPDATE_FINANCIAL_SETTINGS'
  | 'ARCHIVE_FINANCIAL_ACCOUNT'
  | 'TRANSFER_BALANCE_BEFORE_DELETE'
  | 'DELETE_FINANCIAL_MOVEMENT'
  | 'DELETE_EXPENSE';

export interface FinancialAuthorizationResult {
  allowed: boolean;
  statusCode: number;
  message: string;
  roleCategory: 'SUPER_ADMIN' | 'ADMIN_AGENCY' | 'UNAUTHORIZED';
  userRoleLabel: string;
}

/**
 * Helper to determine a user's role category in French
 */
export function getFinancialUserRoleLabel(user: User | null | undefined): string {
  if (!user) return 'UTILISATEUR NON AUTHENTIFIÉ';
  const roleCode = String(user.role || '').toUpperCase();
  const hasRoleObj = (code: string) => user.roles?.some(r => String(r.code).toUpperCase() === code);

  if (
    user.isSuperAdmin ||
    user.username === 'superadmin' ||
    roleCode === 'SUPER_ADMIN' ||
    roleCode === 'SUPER_ADMINISTRATEUR' ||
    hasRoleObj('SUPER_ADMIN')
  ) {
    return 'SUPER ADMINISTRATEUR';
  }
  if (
    roleCode === 'ADMIN_CENTRE' ||
    roleCode === 'ADMIN_AGENCY' ||
    roleCode === 'GERANT' ||
    roleCode === 'DIRECTEUR' ||
    hasRoleObj('ADMIN_CENTRE') ||
    hasRoleObj('ADMIN_AGENCY') ||
    hasRoleObj('GERANT')
  ) {
    return "ADMINISTRATEUR DE L'AGENCE";
  }
  if (roleCode === 'CASHIER' || roleCode === 'CAISSIER' || hasRoleObj('CASHIER')) {
    return 'CAISSIER';
  }
  if (roleCode === 'SELLER' || roleCode === 'COMMERCIAL' || roleCode === 'VENDEUR' || hasRoleObj('SELLER')) {
    return 'VENDEUR';
  }
  if (roleCode === 'STOCK_MANAGER' || roleCode === 'MAGASINIER' || hasRoleObj('STOCK_MANAGER')) {
    return 'GESTIONNAIRE DE STOCK';
  }
  if (roleCode === 'TRAINER' || roleCode === 'FORMATEUR' || hasRoleObj('TRAINER')) {
    return 'FORMATEUR';
  }
  if (roleCode === 'RECEPTIONIST' || roleCode === 'RECEPTIONNISTE' || hasRoleObj('RECEPTIONIST')) {
    return 'RÉCEPTIONNISTE';
  }
  return user.roles?.[0]?.name?.toUpperCase() || 'COLLABORATEUR';
}

/**
 * Evaluates whether a user is authorized to perform a sensitive financial action.
 * Enforces:
 * 1. Authentication
 * 2. Role authorization (SUPER_ADMIN or ADMIN_AGENCY / GERANT)
 * 3. Multi-tenant agency boundary (ADMIN_AGENCY cannot touch another agency)
 */
export function canPerformFinancialSensitiveAction(
  user: User | null | undefined,
  targetTenantId: string,
  actionType: FinancialSensitiveAction
): FinancialAuthorizationResult {
  if (!user) {
    return {
      allowed: false,
      statusCode: 401,
      message: "Authentification requise pour effectuer une opération financière.",
      roleCategory: 'UNAUTHORIZED',
      userRoleLabel: 'NON AUTHENTIFIÉ'
    };
  }

  if (!user.isActive) {
    return {
      allowed: false,
      statusCode: 403,
      message: "Compte utilisateur désactivé. Opération financière refusée.",
      roleCategory: 'UNAUTHORIZED',
      userRoleLabel: 'COMPTE DÉSACTIVÉ'
    };
  }

  const roleLabel = getFinancialUserRoleLabel(user);
  const roleCode = String(user.role || '').toUpperCase();
  const hasRoleObj = (code: string) => user.roles?.some(r => String(r.code).toUpperCase() === code);

  // 1. Super Admin: Global access across all agencies
  const isSuper = Boolean(
    user.isSuperAdmin ||
    user.username === 'superadmin' ||
    roleCode === 'SUPER_ADMIN' ||
    roleCode === 'SUPER_ADMINISTRATEUR' ||
    hasRoleObj('SUPER_ADMIN')
  );

  if (isSuper) {
    return {
      allowed: true,
      statusCode: 200,
      message: "Autorisation accordée (Super Administrateur Global).",
      roleCategory: 'SUPER_ADMIN',
      userRoleLabel: 'SUPER ADMINISTRATEUR'
    };
  }

  // 2. Agency Admin / Gerant
  const isAgencyAdmin = Boolean(
    roleCode === 'ADMIN_CENTRE' ||
    roleCode === 'ADMIN_AGENCY' ||
    roleCode === 'GERANT' ||
    roleCode === 'DIRECTEUR' ||
    hasRoleObj('ADMIN_CENTRE') ||
    hasRoleObj('ADMIN_AGENCY') ||
    hasRoleObj('GERANT') ||
    user.permissions?.includes('*') ||
    user.permissions?.includes('admin.*') ||
    user.permissions?.includes('finance.admin') ||
    user.permissions?.includes('finance.sensitive.*')
  );

  if (isAgencyAdmin) {
    // Check agency boundary
    const userTenant = user.tenantId;
    const isTargetGlobal = !targetTenantId || targetTenantId === 'global' || targetTenantId === 'ALL';

    if (isTargetGlobal || userTenant === targetTenantId) {
      return {
        allowed: true,
        statusCode: 200,
        message: "Autorisation accordée (Administrateur de l'agence).",
        roleCategory: 'ADMIN_AGENCY',
        userRoleLabel: "ADMINISTRATEUR DE L'AGENCE"
      };
    } else {
      return {
        allowed: false,
        statusCode: 403,
        message: "Accès refusé : En tant qu'Administrateur d'agence, vous ne pouvez modifier que les données financières de votre propre agence.",
        roleCategory: 'UNAUTHORIZED',
        userRoleLabel: 'ADMINISTRATEUR AUTRE AGENCE'
      };
    }
  }

  // 3. Other Roles (Caissier, Vendeur, Gestionnaire de Stock, Formateur, Receptionniste, Collaborateur)
  // Check if explicit permission exists
  const hasExplicitSensitivePermission = Boolean(
    user.permissions?.includes('finance.manage_sensitive') ||
    user.permissions?.includes(`finance.${actionType.toLowerCase()}`)
  );

  if (hasExplicitSensitivePermission) {
    const userTenant = user.tenantId;
    if (!targetTenantId || targetTenantId === 'global' || userTenant === targetTenantId) {
      return {
        allowed: true,
        statusCode: 200,
        message: "Autorisation accordée via permission explicite.",
        roleCategory: 'ADMIN_AGENCY',
        userRoleLabel: roleLabel
      };
    }
  }

  return {
    allowed: false,
    statusCode: 403,
    message: `Action financière sensible interdite pour le rôle "${roleLabel}". Seuls le Super Administrateur et l'Administrateur de l'agence sont autorisés à modifier, supprimer, désactiver ou réinitialiser les données financières critiques.`,
    roleCategory: 'UNAUTHORIZED',
    userRoleLabel: roleLabel
  };
}

/**
 * Generates standardized human-readable audit summaries as required by Part 14.
 * Examples:
 * - "ADMINISTRATEUR X a modifié le solde initial de la Caisse Principale."
 * - "SUPER ADMINISTRATEUR X a désactivé une caisse."
 * - "ADMINISTRATEUR X a réinitialisé le compte Caisse Secondaire."
 */
export function formatFinancialAuditMessage(
  actionType: FinancialSensitiveAction | string,
  userRoleLabel: string,
  userNameOrUser: any,
  resourceName: string,
  details?: Record<string, any>
): string {
  const cleanName = (typeof userNameOrUser === 'object' && userNameOrUser !== null)
    ? `${userNameOrUser.firstName || ''} ${userNameOrUser.lastName || ''}`.trim() || userNameOrUser.username || 'Administrateur'
    : String(userNameOrUser || 'Administrateur').trim();
  const userTag = `${userRoleLabel.toUpperCase()} ${cleanName}`;
  switch (actionType) {
    case 'CREATE_FINANCIAL_ACCOUNT':
      return `${userTag} a créé le compte financier "${resourceName}".`;
    case 'UPDATE_FINANCIAL_ACCOUNT':
      return `${userTag} a modifié les paramètres du compte "${resourceName}".`;
    case 'ADJUST_FINANCIAL_ACCOUNT_BALANCE':
      return `${userTag} a ajusté le solde du compte "${resourceName}" (${details?.differenceFormatted || ''}). Motif: ${details?.reason || 'Non précisé'}.`;
    case 'RESET_FINANCIAL_ACCOUNT':
      return `${userTag} a réinitialisé le solde du compte "${resourceName}" à 0 GNF. Motif: ${details?.reason || 'Remise à zéro'}.`;
    case 'DEACTIVATE_FINANCIAL_ACCOUNT':
      return `${userTag} a désactivé le compte financier "${resourceName}".`;
    case 'REACTIVATE_FINANCIAL_ACCOUNT':
      return `${userTag} a réactivé le compte financier "${resourceName}".`;
    case 'DELETE_FINANCIAL_ACCOUNT':
      return `${userTag} a supprimé définitivement le compte financier "${resourceName}".`;
    case 'ARCHIVE_FINANCIAL_ACCOUNT':
      return `${userTag} a archivé le compte financier "${resourceName}".`;
    case 'TRANSFER_BALANCE_BEFORE_DELETE':
      return `${userTag} a transféré le solde du compte "${resourceName}" vers "${details?.toAccountName || 'Compte cible'}" avant clôture.`;
    case 'CLOSE_FINANCIAL_YEAR':
      return `${userTag} a clôturé l'exercice financier "${resourceName}".`;
    case 'REOPEN_FINANCIAL_YEAR':
      return `${userTag} a rouvert l'exercice financier "${resourceName}".`;
    case 'CLOSE_FINANCIAL_PERIOD':
      return `${userTag} a clôturé la période financière "${resourceName}".`;
    case 'REOPEN_FINANCIAL_PERIOD':
      return `${userTag} a rouvert la période financière "${resourceName}".`;
    case 'RESET_TREASURY':
      return `${userTag} a réinitialisé la trésorerie de l'agence.`;
    default:
      return `${userTag} a effectué l'action sensible "${actionType}" sur "${resourceName}".`;
  }
}

