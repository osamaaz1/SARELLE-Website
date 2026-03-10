/**
 * Centralized currency formatting for the entire app.
 * Change CURRENCY_SYMBOL here to switch all prices across the platform.
 */

export const CURRENCY_SYMBOL = 'EGP';

/** Format a number as a price: "EGP 1,234" */
export function formatPrice(amount: number): string {
  return `${CURRENCY_SYMBOL} ${amount.toLocaleString()}`;
}

/** Format a number as a price with 2 decimals: "EGP 1,234.00" */
export function formatPriceExact(amount: number): string {
  return `${CURRENCY_SYMBOL} ${amount.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
}
