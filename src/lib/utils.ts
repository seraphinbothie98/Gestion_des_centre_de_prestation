import { type ClassValue, clsx } from "clsx";
import { twMerge } from "tailwind-merge";
import { format, parseISO } from "date-fns";
import { fr } from "date-fns/locale";

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

export function formatCurrency(amount: number, currency: string = 'GNF'): string {
  if (isNaN(amount)) return `0 ${currency}`;
  const formatted = new Intl.NumberFormat('fr-FR', {
    maximumFractionDigits: 0,
  }).format(amount);
  return `${formatted} ${currency}`;
}

export function formatDate(dateString?: string, formatStr: string = 'dd/MM/yyyy'): string {
  if (!dateString) return '-';
  try {
    const date = typeof dateString === 'string' ? parseISO(dateString) : dateString;
    return format(date, formatStr, { locale: fr });
  } catch (e) {
    return dateString;
  }
}

export function formatDateTime(dateString?: string): string {
  return formatDate(dateString, 'dd/MM/yyyy HH:mm');
}

export function generateDocNumber(prefix: string, sequence: number, year: number = new Date().getFullYear()): string {
  const padded = sequence.toString().padStart(6, '0');
  return `${prefix}-${year}-${padded}`;
}

export function truncateText(text: string, maxLength: number = 30): string {
  if (!text) return '';
  return text.length > maxLength ? `${text.slice(0, maxLength)}...` : text;
}
