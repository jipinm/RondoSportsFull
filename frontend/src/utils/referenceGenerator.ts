/**
 * Utility functions for generating booking and invoice references
 */

/**
 * Generates a unique invoice reference
 * Format: INV-YYYY-MMDD-HHMMSS-XXXX
 * Example: INV-2025-0915-143022-A7B2
 */
export const generateInvoiceReference = (): string => {
  const now = new Date();
  const year = now.getFullYear();
  const month = String(now.getMonth() + 1).padStart(2, '0');
  const day = String(now.getDate()).padStart(2, '0');
  const hours = String(now.getHours()).padStart(2, '0');
  const minutes = String(now.getMinutes()).padStart(2, '0');
  const seconds = String(now.getSeconds()).padStart(2, '0');
  
  // Generate 4-character random alphanumeric suffix
  const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789';
  let suffix = '';
  for (let i = 0; i < 4; i++) {
    suffix += chars.charAt(Math.floor(Math.random() * chars.length));
  }
  
  return `INV-${year}-${month}${day}-${hours}${minutes}${seconds}-${suffix}`;
};

/**
 * Generates a unique booking reference
 * Format: BOOK-YYYY-MMDD-HHMMSS-XXXX
 * Example: BOOK-2025-0915-143022-M9K4
 */
export const generateBookingReference = (): string => {
  const now = new Date();
  const year = now.getFullYear();
  const month = String(now.getMonth() + 1).padStart(2, '0');
  const day = String(now.getDate()).padStart(2, '0');
  const hours = String(now.getHours()).padStart(2, '0');
  const minutes = String(now.getMinutes()).padStart(2, '0');
  const seconds = String(now.getSeconds()).padStart(2, '0');
  
  // Generate 4-character random alphanumeric suffix
  const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789';
  let suffix = '';
  for (let i = 0; i < 4; i++) {
    suffix += chars.charAt(Math.floor(Math.random() * chars.length));
  }
  
  return `BOOK-${year}-${month}${day}-${hours}${minutes}${seconds}-${suffix}`;
};

/**
 * Generates a unique short reference (8 characters)
 * Format: XXXXXXXX
 * Example: A7B2M9K4
 */
export const generateShortReference = (): string => {
  const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789';
  let reference = '';
  for (let i = 0; i < 8; i++) {
    reference += chars.charAt(Math.floor(Math.random() * chars.length));
  }
  return reference;
};

/**
 * Available payment methods
 */
export const PAYMENT_METHODS = {
  INVOICE: 'invoice',
  CREDIT_CARD: 'credit_card',
  PAYPAL: 'paypal',
  BANK_TRANSFER: 'bank_transfer'
} as const;

export type PaymentMethod = typeof PAYMENT_METHODS[keyof typeof PAYMENT_METHODS];