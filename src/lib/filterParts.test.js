import { describe, it, expect } from 'vitest';
import { filterParts } from './filterParts.js';

const parts = [
  { id: '1', description: 'PLC CPU module', partNo: 'AB-1756', brand: 'Allen-Bradley', category: 'PLC', price: 500 },
  { id: '2', description: 'HMI 7in touch', partNo: 'MT8071', brand: 'Weintek', category: 'HMI', price: 300 },
  { id: '3', description: 'Circuit breaker 3P', partNo: 'NSX100', brand: 'Schneider', category: 'Breaker', price: null },
  { id: '4', description: 'Control cable', partNo: 'CB-2C', brand: ' Schneider ', category: 'Cable', price: 20 },
  { id: '5', description: 'Relay', partNo: 'RY-01', brand: '', category: 'Relay', price: 5 },
];

describe('filterParts', () => {
  it('returns everything when no filters are set', () => {
    expect(filterParts(parts, {})).toHaveLength(5);
    expect(filterParts(parts)).toHaveLength(5);
  });

  it('handles null/undefined input safely', () => {
    expect(filterParts(null, {})).toEqual([]);
    expect(filterParts(undefined)).toEqual([]);
  });

  it('filters by a single brand', () => {
    const out = filterParts(parts, { brandFilters: ['Weintek'] });
    expect(out.map((p) => p.id)).toEqual(['2']);
  });

  it('filters by multiple brands (OR)', () => {
    const out = filterParts(parts, { brandFilters: ['Weintek', 'Allen-Bradley'] });
    expect(out.map((p) => p.id).sort()).toEqual(['1', '2']);
  });

  it('trims whitespace when matching brands', () => {
    // part 4 has brand " Schneider " with padding
    const out = filterParts(parts, { brandFilters: ['Schneider'] });
    expect(out.map((p) => p.id).sort()).toEqual(['3', '4']);
  });

  it('filters by category', () => {
    const out = filterParts(parts, { categoryFilters: ['PLC', 'HMI'] });
    expect(out.map((p) => p.id).sort()).toEqual(['1', '2']);
  });

  it('searches across description, part number, and brand (case-insensitive)', () => {
    expect(filterParts(parts, { search: 'plc' }).map((p) => p.id)).toEqual(['1']);
    expect(filterParts(parts, { search: 'nsx100' }).map((p) => p.id)).toEqual(['3']);
    expect(filterParts(parts, { search: 'weintek' }).map((p) => p.id)).toEqual(['2']);
  });

  it('ignores whitespace-only search', () => {
    expect(filterParts(parts, { search: '   ' })).toHaveLength(5);
  });

  it('combines brand, category, and search as AND', () => {
    const out = filterParts(parts, {
      brandFilters: ['Schneider'],
      categoryFilters: ['Cable'],
      search: 'control',
    });
    expect(out.map((p) => p.id)).toEqual(['4']);
  });

  it('returns an empty list when nothing matches', () => {
    expect(filterParts(parts, { search: 'nonexistent' })).toEqual([]);
  });

  it('does not crash on parts with missing fields', () => {
    const sparse = [{ id: 'x' }, { id: 'y', description: 'has desc' }];
    expect(filterParts(sparse, { search: 'desc' }).map((p) => p.id)).toEqual(['y']);
  });
});
