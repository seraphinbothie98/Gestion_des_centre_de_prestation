import React, { useState } from 'react';
import { cn } from '../../lib/utils';
import { LucideIcon, Phone } from 'lucide-react';
import { sanitizePhoneInput, validatePhoneWithDetails, isValidPhoneNumber } from '../../lib/phoneValidation';

export interface PhoneInputProps extends Omit<React.InputHTMLAttributes<HTMLInputElement>, 'onChange'> {
  label?: string;
  error?: string;
  helperText?: string;
  icon?: LucideIcon;
  value?: string;
  onChange?: (e: React.ChangeEvent<HTMLInputElement>) => void;
  onValueChange?: (value: string) => void;
  allowEmpty?: boolean;
  showValidationOnBlur?: boolean;
}

export const PhoneInput = React.forwardRef<HTMLInputElement, PhoneInputProps>(
  (
    {
      className,
      label,
      error: externalError,
      helperText,
      icon: Icon = Phone,
      id,
      value = '',
      onChange,
      onValueChange,
      required,
      allowEmpty = true,
      showValidationOnBlur = true,
      placeholder = 'ex: +224 622 00 00 00',
      onKeyDown,
      onPaste,
      onBlur,
      ...props
    },
    ref
  ) => {
    const inputId = id || (label ? label.toLowerCase().replace(/\s+/g, '-') : undefined);
    const [internalError, setInternalError] = useState<string | undefined>();

    const activeError = externalError || internalError;

    // Intercept physical keypresses to physically block alphabetical letters and invalid chars
    const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
      const { key, ctrlKey, metaKey, altKey } = e;

      // Allow control combos (Ctrl+A, Ctrl+C, Ctrl+V, Ctrl+X, Ctrl+Z, Meta+...)
      if (ctrlKey || metaKey || altKey) {
        if (onKeyDown) onKeyDown(e);
        return;
      }

      // Allow navigation & editing keys
      const allowedSpecialKeys = [
        'Backspace',
        'Delete',
        'ArrowLeft',
        'ArrowRight',
        'ArrowUp',
        'ArrowDown',
        'Tab',
        'Home',
        'End',
        'Enter',
        'Escape'
      ];
      if (allowedSpecialKeys.includes(key)) {
        if (onKeyDown) onKeyDown(e);
        return;
      }

      // Allow '+' only at position 0 and if not already present
      if (key === '+') {
        const input = e.currentTarget;
        const selectionStart = input.selectionStart ?? 0;
        const currentValue = input.value || '';
        if (selectionStart === 0 && !currentValue.startsWith('+')) {
          if (onKeyDown) onKeyDown(e);
          return;
        } else {
          e.preventDefault();
          setInternalError("Le signe '+' n'est autorisé qu'au tout début du numéro.");
          return;
        }
      }

      // Allow allowed formatting characters: digits 0-9, space, hyphen, period, parentheses
      if (/^[\d\s\-\.\(\)]$/.test(key)) {
        // Clear letter error if user types a valid digit
        if (internalError) setInternalError(undefined);
        if (onKeyDown) onKeyDown(e);
        return;
      }

      // Block all alphabetical letters (a-z, A-Z, accents)
      if (/^[a-zA-Z\u00C0-\u024F\u1E00-\u1EFF]$/.test(key)) {
        e.preventDefault();
        setInternalError('Les lettres et mots ne sont pas autorisés dans un numéro de téléphone.');
        return;
      }

      // Block any other unauthorized special characters (@, #, $, %, etc.)
      e.preventDefault();
      setInternalError('Caractère non autorisé. Saisissez uniquement des chiffres (0-9).');
    };

    // Handle paste: sanitize pasted content removing letters and invalid chars
    const handlePaste = (e: React.ClipboardEvent<HTMLInputElement>) => {
      const pastedData = e.clipboardData.getData('text');
      
      // If pasted data contains letters or unauthorized chars
      if (/[a-zA-Z\u00C0-\u024F\u1E00-\u1EFF]/.test(pastedData)) {
        e.preventDefault();
        const sanitized = sanitizePhoneInput(pastedData);
        setInternalError('Les lettres ont été retirées du numéro collé.');
        
        // Update input with sanitized text
        const input = e.currentTarget;
        const start = input.selectionStart ?? 0;
        const end = input.selectionEnd ?? 0;
        const currentValue = input.value || '';
        const newValue = currentValue.substring(0, start) + sanitized + currentValue.substring(end);
        
        const syntheticEvent = {
          ...e,
          target: { ...input, value: newValue },
          currentTarget: { ...input, value: newValue }
        } as unknown as React.ChangeEvent<HTMLInputElement>;
        
        if (onChange) onChange(syntheticEvent);
        if (onValueChange) onValueChange(newValue);
        return;
      }

      if (onPaste) onPaste(e);
    };

    const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
      const raw = e.target.value;
      const sanitized = sanitizePhoneInput(raw);

      // Clear error if sanitized
      if (internalError && isValidPhoneNumber(sanitized, { allowEmpty: !required })) {
        setInternalError(undefined);
      }

      const syntheticEvent = {
        ...e,
        target: { ...e.target, value: sanitized }
      };

      if (onChange) {
        onChange(syntheticEvent);
      }
      if (onValueChange) {
        onValueChange(sanitized);
      }
    };

    const handleBlur = (e: React.FocusEvent<HTMLInputElement>) => {
      if (showValidationOnBlur) {
        const val = e.target.value;
        const validation = validatePhoneWithDetails(val, {
          allowEmpty: allowEmpty && !required,
          required,
          label
        });
        if (!validation.isValid) {
          setInternalError(validation.error);
        } else {
          setInternalError(undefined);
        }
      }

      if (onBlur) onBlur(e);
    };

    return (
      <div className="w-full space-y-1.5">
        {label && (
          <label htmlFor={inputId} className="block text-xs font-semibold text-slate-700 dark:text-slate-300">
            {label}
            {required && <span className="text-rose-500 ml-0.5">*</span>}
          </label>
        )}
        <div className="relative">
          {Icon && (
            <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-slate-400">
              <Icon className="w-4 h-4" />
            </div>
          )}
          <input
            id={inputId}
            ref={ref}
            type="tel"
            inputMode="tel"
            autoComplete="tel"
            placeholder={placeholder}
            value={value}
            required={required}
            onKeyDown={handleKeyDown}
            onPaste={handlePaste}
            onChange={handleChange}
            onBlur={handleBlur}
            className={cn(
              "w-full rounded-xl border border-slate-300 dark:border-slate-700/80 bg-white dark:bg-slate-900/90 px-3.5 py-2 text-sm text-slate-900 dark:text-slate-100 placeholder-slate-400 focus:border-brand-500 focus:outline-none focus:ring-2 focus:ring-brand-500/20 disabled:cursor-not-allowed disabled:opacity-50 transition-all",
              Boolean(Icon) && "pl-10",
              activeError && "border-rose-500 focus:border-rose-500 focus:ring-rose-500/20",
              className
            )}
            {...props}
          />
        </div>
        {activeError && <p className="text-xs text-rose-500 font-medium">{activeError}</p>}
        {helperText && !activeError && <p className="text-xs text-slate-500 dark:text-slate-400">{helperText}</p>}
      </div>
    );
  }
);

PhoneInput.displayName = 'PhoneInput';
