import { describe, it, expect } from 'vitest';
import { buildPartsById, resolveItem, resolveItems } from './resolveItems.js';

const parts = [
  { id: 'p1', description: 'PLC CPU', partNo: 'AB-1756', brand: 'Allen-Bradley', category: 'PLC', price: 500 },
  { id: 'p2', description: 'HMI', partNo: 'MT8071', brand: 'Weintek', category: 'HMI', price: null },
];

describe('buildPartsById', () => {
  it('indexes parts by id', () => {
    const map = buildPartsById(parts);
    expect(map.get('p1').partNo).toBe('AB-1756');
    expect(map.size).toBe(2);
  });
});

describe('resolveItem', () => {
  const map = buildPartsById(parts);

  it('resolves a live part and carries its fields', () => {
    const out = resolveItem({ partId: 'p1', qty: 3 }, map);
    expect(out).toMatchObject({
      partId: 'p1',
      qty: 3,
      description: 'PLC CPU',
      partNo: 'AB-1756',
      price: 500,
      missing: false,
    });
  });

  it('defaults qty to 1 when absent', () => {
    expect(resolveItem({ partId: 'p1' }, map).qty).toBe(1);
  });

  it('preserves a null price without turning it into 0', () => {
    expect(resolveItem({ partId: 'p2', qty: 1 }, map).price).toBeNull();
  });

  it('flags a removed part as missing with a placeholder', () => {
    const out = resolveItem({ partId: 'gone', qty: 2 }, map);
    expect(out.missing).toBe(true);
    expect(out.description).toBe('(Part removed from library)');
    expect(out.qty).toBe(2);
    expect(out.price).toBeNull();
  });
});

describe('resolveItems', () => {
  const map = buildPartsById(parts);

  it('resolves a list, mixing live and missing parts', () => {
    const out = resolveItems([{ partId: 'p1', qty: 1 }, { partId: 'gone', qty: 4 }], map);
    expect(out).toHaveLength(2);
    expect(out[0].missing).toBe(false);
    expect(out[1].missing).toBe(true);
  });

  it('handles null/empty item lists', () => {
    expect(resolveItems(null, map)).toEqual([]);
    expect(resolveItems([], map)).toEqual([]);
  });
});
