import { z } from 'zod';

/**
 * ==============================================================================
 * CENTRAL PHONE & CONTACT VALIDATION UTILITY
 * ==============================================================================
 * 
 * Rules:
 * 1. Only digits (0-9), optional single '+' at the very beginning (index 0),
 *    spaces, hyphens (-), dots (.), and parentheses () are permitted.
 * 2. Letters (a-z, A-Z, accents) and special characters (@, #, $, %, etc.) are strictly FORBIDDEN.
 * 3. The '+' sign is strictly forbidden in the middle or multiple times.
 * 4. Leading zeroes (e.g. 0622...) are preserved as strings and never truncated.
 * 5. Minimum digits count: 4, Maximum digits count: 18 (E.164 compliance).
 */

export interface PhoneValidationOptions {
  allowEmpty?: boolean;
  required?: boolean;
  label?: string;
}

export interface PhoneValidationResult {
  isValid: boolean;
  error?: string;
  cleanedValue?: string;
}

/**
 * Validates whether a given string is a valid phone number.
 */
export function isValidPhoneNumber(
  value: string | undefined | null,
  options: PhoneValidationOptions = { allowEmpty: true }
): boolean {
  return validatePhoneWithDetails(value, options).isValid;
}

/**
 * Validates a phone number and returns detailed validation result with error messages.
 */
export function validatePhoneWithDetails(
  value: string | undefined | null,
  options: PhoneValidationOptions = { allowEmpty: true }
): PhoneValidationResult {
  const allowEmpty = options.allowEmpty ?? !options.required;

  if (value === undefined || value === null || value.trim() === '') {
    if (allowEmpty && !options.required) {
      return { isValid: true, cleanedValue: '' };
    }
    return {
      isValid: false,
      error: options.label
        ? `Le champ ${options.label} est obligatoire.`
        : 'Le numéro de téléphone est obligatoire.'
    };
  }

  const trimmed = value.trim();

  // 1. Check for any alphabetic characters
  if (/[a-zA-Z\u00C0-\u024F\u1E00-\u1EFF]/.test(trimmed)) {
    return {
      isValid: false,
      error: 'Les lettres et mots ne sont pas autorisés dans un numéro de téléphone.'
    };
  }

  // 2. Check for unauthorized special characters
  // Only digits, +, space, -, ., (, ) allowed
  if (/[^\d+\s\-\.\(\)]/.test(trimmed)) {
    return {
      isValid: false,
      error: 'Le numéro de téléphone contient des caractères spéciaux non autorisés (ex: @, #, $, etc.).'
    };
  }

  // 3. Check the '+' sign position and count
  const plusCount = (trimmed.match(/\+/g) || []).length;
  if (plusCount > 1) {
    return {
      isValid: false,
      error: "Le signe '+' ne peut apparaître qu'une seule fois, au tout début du numéro."
    };
  }
  if (plusCount === 1 && !trimmed.startsWith('+')) {
    return {
      isValid: false,
      error: "Le signe '+' n'est autorisé qu'en première position (indicatif international)."
    };
  }

  // 4. Extract pure digits to check length
  const digits = trimmed.replace(/\D/g, '');

  if (digits.length < 4) {
    return {
      isValid: false,
      error: 'Le numéro de téléphone est trop court (au moins 4 chiffres requis).'
    };
  }

  if (digits.length > 18) {
    return {
      isValid: false,
      error: 'Le numéro de téléphone est trop long (maximum 18 chiffres autorisés).'
    };
  }

  return {
    isValid: true,
    cleanedValue: trimmed
  };
}

/**
 * Sanitizes input text on-the-fly during typing or pasting.
 * Preserves leading '+', filters out all letters and non-phone characters.
 */
export function sanitizePhoneInput(rawInput: string): string {
  if (!rawInput) return '';

  const trimmed = rawInput.trim();
  const startsWithPlus = trimmed.startsWith('+');

  // Remove any character that is not a digit, space, hyphen, dot, or parenthesis
  let sanitized = rawInput.replace(/[^\d\s\-\.\(\)]/g, '');

  // Strip any internal plus signs and re-attach leading plus if it originally started with plus
  sanitized = sanitized.replace(/\+/g, '');
  if (startsWithPlus) {
    sanitized = '+' + sanitized;
  }

  // Collapse multiple consecutive spaces to a single space
  sanitized = sanitized.replace(/  +/g, ' ');

  return sanitized;
}

/**
 * Normalizes phone number formatting for consistency (e.g., trims spaces)
 */
export function normalizePhoneNumber(value?: string | null): string {
  if (!value) return '';
  const trimmed = value.trim();
  const startsWithPlus = trimmed.startsWith('+');
  const sanitized = trimmed.replace(/[^\d\s\-\.\(\)]/g, '').replace(/\+/g, '');
  return (startsWithPlus ? '+' : '') + sanitized.replace(/\s+/g, ' ').trim();
}

/**
 * Reusable Zod schema for phone number fields
 */
export const phoneZodSchema = z
  .string()
  .optional()
  .nullable()
  .refine(
    (val) => {
      if (!val || val.trim() === '') return true;
      return isValidPhoneNumber(val, { allowEmpty: true });
    },
    {
      message: 'Veuillez saisir un numéro de téléphone valide (les lettres et caractères spéciaux sont interdits).'
    }
  );

export const requiredPhoneZodSchema = z
  .string({ required_error: 'Le numéro de téléphone est obligatoire.' })
  .min(1, 'Le numéro de téléphone est obligatoire.')
  .refine(
    (val) => isValidPhoneNumber(val, { allowEmpty: false, required: true }),
    {
      message: 'Veuillez saisir un numéro de téléphone valide sans lettres ni caractères spéciaux non autorisés.'
    }
  );

/**
 * Backend API Phone Validator
 * Returns a standardized 400 Bad Request payload if the telephone format is invalid.
 */
export function validateBackendPhone(
  value: string | undefined | null,
  fieldLabel: string = 'téléphone',
  options: PhoneValidationOptions = { allowEmpty: true }
): { isValid: boolean; statusCode?: number; message?: string } {
  const result = validatePhoneWithDetails(value, options);
  if (!result.isValid) {
    return {
      isValid: false,
      statusCode: 400,
      message: `400 Erreur de validation : Le numéro de ${fieldLabel} est invalide (${result.error || 'format incorrect'}).`
    };
  }
  return { isValid: true };
}
