import { renderHook, act } from '@testing-library/react';
import { calcRemaining, useSharedCountdown } from '@/hooks/useCountdown';

describe('calcRemaining', () => {
  beforeEach(() => {
    jest.useFakeTimers();
  });

  afterEach(() => {
    jest.useRealTimers();
  });

  test('returns "Ended" for a past date', () => {
    jest.setSystemTime(new Date('2026-03-11T12:00:00Z'));
    const past = '2026-03-10T00:00:00Z';
    expect(calcRemaining(past)).toBe('Ended');
  });

  test('returns "Xd Xh" for dates more than 1 day away', () => {
    jest.setSystemTime(new Date('2026-03-11T12:00:00Z'));
    // 2 days and 5 hours from now
    const future = '2026-03-13T17:00:00Z';
    const result = calcRemaining(future);
    expect(result).toMatch(/2d\s+5h/);
  });

  test('returns "Xh Xm" for dates less than 1 day away', () => {
    jest.setSystemTime(new Date('2026-03-11T12:00:00Z'));
    // 3 hours and 30 minutes from now
    const future = '2026-03-11T15:30:00Z';
    const result = calcRemaining(future);
    expect(result).toMatch(/3h\s+30m/);
  });
});

describe('useSharedCountdown', () => {
  beforeEach(() => {
    jest.useFakeTimers();
  });

  afterEach(() => {
    jest.useRealTimers();
  });

  test('returns countdown text for a future date', () => {
    jest.setSystemTime(new Date('2026-03-11T12:00:00Z'));
    const future = '2026-03-13T12:00:00Z';

    const { result } = renderHook(() => useSharedCountdown(future));
    expect(result.current).toBeTruthy();
    expect(result.current).not.toBe('');
  });

  test('returns empty string for null endsAt', () => {
    const { result } = renderHook(() => useSharedCountdown(null));
    expect(result.current).toBe('');
  });
});
