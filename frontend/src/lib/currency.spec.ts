import { formatPrice, formatPriceExact, CURRENCY_SYMBOL } from '@/lib/currency';

describe('currency utilities', () => {
  test('CURRENCY_SYMBOL is EGP', () => {
    expect(CURRENCY_SYMBOL).toBe('EGP');
  });

  test('formatPrice formats integer with thousands separator', () => {
    expect(formatPrice(1234)).toBe('EGP 1,234');
  });

  test('formatPrice handles zero', () => {
    expect(formatPrice(0)).toBe('EGP 0');
  });

  test('formatPriceExact formats with two decimal places', () => {
    expect(formatPriceExact(1234)).toBe('EGP 1,234.00');
  });

  test('formatPriceExact preserves and pads decimals', () => {
    expect(formatPriceExact(99.5)).toBe('EGP 99.50');
  });
});
