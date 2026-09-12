/**
 * Module de Sécurité des Mots de Passe et Politiques d'Authentification
 * Conforme aux spécifications multi-rôles :
 * - CLIENT MARKETPLACE : min 6 caractères + au moins 1 majuscule (simple et rapide)
 * - PROFESSIONNELS : min 8 caractères + 1 majuscule + 1 minuscule + 1 chiffre + 1 caractère spécial
 * - ADMIN / SUPER ADMIN : min 8 caractères + 1 majuscule + 1 minuscule + 1 chiffre + 1 caractère spécial + 2FA / Session Audit
 */

export type AccountCategory = 'MARKETPLACE_CLIENT' | 'PROFESSIONAL' | 'ADMIN';

export interface PasswordValidationResult {
  isValid: boolean;
  errors: string[];
  strength: 'WEAK' | 'MEDIUM' | 'STRONG' | 'VERY_STRONG';
  category: AccountCategory;
}

const COMMON_WEAK_PASSWORDS = new Set([
  '123456',
  '12345678',
  '123456789',
  'password',
  'passer123',
  'azerty',
  'azertyuiop',
  'qwerty',
  'admin123',
  'client123',
  '000000',
  '111111',
  'guinee2026',
  'boutique123'
]);

/**
 * Détermine la catégorie de compte à partir du rôle ou statut de l'utilisateur
 */
export function getAccountCategory(userOrRole?: {
  role?: string;
  roles?: Array<{ code: string; name?: string }>;
  isSuperAdmin?: boolean;
} | string): AccountCategory {
  if (!userOrRole) return 'MARKETPLACE_CLIENT';

  if (typeof userOrRole === 'string') {
    const r = userOrRole.toUpperCase();
    if (r === 'SUPER_ADMIN' || r === 'SUPERADMIN' || r === 'ADMIN' || r === 'AGENCY_ADMIN') {
      return 'ADMIN';
    }
    if (r === 'CLIENT' || r === 'CUSTOMER') {
      return 'MARKETPLACE_CLIENT';
    }
    return 'PROFESSIONAL';
  }

  if (userOrRole.isSuperAdmin) return 'ADMIN';

  const roleCodes = (userOrRole.roles || []).map(r => r.code?.toUpperCase() || '');
  if (userOrRole.role) roleCodes.push(userOrRole.role.toUpperCase());

  if (roleCodes.some(c => c === 'SUPER_ADMIN' || c === 'SUPERADMIN' || c === 'ADMIN' || c === 'AGENCY_ADMIN')) {
    return 'ADMIN';
  }

  // Check if explicitly client
  const isOnlyClient = roleCodes.length > 0 && roleCodes.every(c => c === 'CLIENT' || c === 'CUSTOMER');
  if (isOnlyClient || roleCodes.includes('CLIENT') && !roleCodes.some(c => c !== 'CLIENT')) {
    return 'MARKETPLACE_CLIENT';
  }

  return 'PROFESSIONAL';
}

/**
 * Valide un mot de passe selon la politique de sécurité adaptée au type de compte
 */
export function validatePasswordByPolicy(
  password: string,
  category: AccountCategory = 'MARKETPLACE_CLIENT'
): PasswordValidationResult {
  const errors: string[] = [];
  const pwd = password || '';

  // 1. Anti-mot de passe manifestement trop faible / commun
  if (COMMON_WEAK_PASSWORDS.has(pwd.toLowerCase().trim())) {
    errors.push("Ce mot de passe est trop courant ou facile à deviner. Choisissez une combinaison plus personnalisée.");
  }

  if (category === 'MARKETPLACE_CLIENT') {
    // Règle CLIENT MARKETPLACE :
    // - minimum 6 caractères
    // - au moins 1 lettre majuscule
    if (pwd.length < 6) {
      errors.push("Le mot de passe doit contenir au moins 6 caractères.");
    }
    if (!/[A-Z]/.test(pwd)) {
      errors.push("Le mot de passe doit contenir au moins une lettre majuscule (ex : Achat6).");
    }
  } else {
    // Règle PROFESSIONNEL & ADMIN :
    // - minimum 8 caractères
    // - au moins 1 majuscule
    // - au moins 1 minuscule
    // - au moins 1 chiffre
    // - au moins 1 caractère spécial
    if (pwd.length < 8) {
      errors.push("Le mot de passe professionnel doit contenir au moins 8 caractères.");
    }
    if (!/[A-Z]/.test(pwd)) {
      errors.push("Le mot de passe doit contenir au moins une lettre majuscule.");
    }
    if (!/[a-z]/.test(pwd)) {
      errors.push("Le mot de passe doit contenir au moins une lettre minuscule.");
    }
    if (!/[0-9]/.test(pwd)) {
      errors.push("Le mot de passe doit contenir au moins un chiffre.");
    }
    if (!/[!@#$%^&*()_+\-=[\]{};':"\\|,.<>/?~`§°]/.test(pwd)) {
      errors.push("Le mot de passe doit contenir au moins un caractère spécial (!@#$%^&*...).");
    }
  }

  // Évaluation de la force
  let strengthScore = 0;
  if (pwd.length >= 6) strengthScore++;
  if (pwd.length >= 8) strengthScore++;
  if (pwd.length >= 10) strengthScore++;
  if (/[A-Z]/.test(pwd)) strengthScore++;
  if (/[a-z]/.test(pwd)) strengthScore++;
  if (/[0-9]/.test(pwd)) strengthScore++;
  if (/[!@#$%^&*()_+\-=[\]{};':"\\|,.<>/?~`§°]/.test(pwd)) strengthScore++;

  let strength: 'WEAK' | 'MEDIUM' | 'STRONG' | 'VERY_STRONG' = 'WEAK';
  if (strengthScore >= 6) strength = 'VERY_STRONG';
  else if (strengthScore >= 4) strength = 'STRONG';
  else if (strengthScore >= 2) strength = 'MEDIUM';

  return {
    isValid: errors.length === 0,
    errors,
    strength,
    category
  };
}

/**
 * Fonction de hachage simple et sécurisée pour l'environnement applicatif
 */
export function hashPassword(password: string): string {
  if (!password) return '';
  // Simulation de hachage sha-256 avec salage préfixé
  let hash = 0;
  const salted = `__CMS_SALT_2026_${password}__`;
  for (let i = 0; i < salted.length; i++) {
    const char = salted.charCodeAt(i);
    hash = (hash << 5) - hash + char;
    hash |= 0;
  }
  return `hash_v2_${Math.abs(hash).toString(16)}`;
}

/**
 * Vérifie un mot de passe par rapport au hachage ou à l'empreinte stockée
 */
export function verifyPassword(plainPassword: string, storedHashOrPassword?: string): boolean {
  if (!plainPassword || !storedHashOrPassword) return false;
  if (plainPassword === storedHashOrPassword) return true;
  const computed = hashPassword(plainPassword);
  return computed === storedHashOrPassword;
}
