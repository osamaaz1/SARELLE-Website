/**
 * Centralized currency formatting for the entire app.
 * Set NEXT_PUBLIC_CURRENCY in .env.local to change (e.g. "EGP", "USD", "EUR").
 * Defaults to EGP.
 */

export const CURRENCY_SYMBOL = process.env.NEXT_PUBLIC_CURRENCY || 'EGP';

/** Format a number as a price: "EGP 1,234" */
export function formatPrice(amount: number): string {
  return `${CURRENCY_SYMBOL} ${amount.toLocaleString()}`;
}

/** Format a number as a price with 2 decimals: "EGP 1,234.00" */
export function formatPriceExact(amount: number): string {
  return `${CURRENCY_SYMBOL} ${amount.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
}
