import { describe, it, expect } from 'vitest';
import { bomTotal } from './bomTotals.js';

describe('bomTotal', () => {
  it('sums price × qty across items', () => {
    const items = [
      { price: 100, qty: 2 },
      { price: 50, qty: 3 },
    ];
    expect(bomTotal(items)).toBe(350);
  });

  it('treats a null/undefined price as 0', () => {
    const items = [
      { price: null, qty: 5 },
      { price: undefined, qty: 2 },
      { price: 10, qty: 1 },
    ];
    expect(bomTotal(items)).toBe(10);
  });

  it('defaults a missing qty to 1', () => {
    expect(bomTotal([{ price: 42 }])).toBe(42);
  });

  it('treats qty of 0 as 1 (falsy fallback), matching the table renderer', () => {
    // qty || 1 means a stored 0 is rendered/counted as 1
    expect(bomTotal([{ price: 10, qty: 0 }])).toBe(10);
  });

  it('returns 0 for an empty list', () => {
    expect(bomTotal([])).toBe(0);
  });

  it('handles null/undefined input safely', () => {
    expect(bomTotal(null)).toBe(0);
    expect(bomTotal(undefined)).toBe(0);
  });

  it('supports fractional prices', () => {
    expect(bomTotal([{ price: 2.5, qty: 4 }])).toBe(10);
  });
});
