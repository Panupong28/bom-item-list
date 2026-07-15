import { describe, it, expect } from 'vitest';
import { getPageNumbers } from './pagination.js';

describe('getPageNumbers', () => {
  it('lists every page when there are 7 or fewer', () => {
    expect(getPageNumbers(1, 1)).toEqual([1]);
    expect(getPageNumbers(3, 5)).toEqual([1, 2, 3, 4, 5]);
    expect(getPageNumbers(4, 7)).toEqual([1, 2, 3, 4, 5, 6, 7]);
  });

  it('collapses the tail with a trailing ellipsis near the start', () => {
    expect(getPageNumbers(1, 10)).toEqual([1, 2, '…', 10]);
    expect(getPageNumbers(2, 10)).toEqual([1, 2, 3, '…', 10]);
    expect(getPageNumbers(3, 10)).toEqual([1, 2, 3, 4, '…', 10]);
  });

  it('collapses the head with a leading ellipsis near the end', () => {
    expect(getPageNumbers(10, 10)).toEqual([1, '…', 9, 10]);
    expect(getPageNumbers(9, 10)).toEqual([1, '…', 8, 9, 10]);
    expect(getPageNumbers(8, 10)).toEqual([1, '…', 7, 8, 9, 10]);
  });

  it('shows ellipses on both sides in the middle', () => {
    expect(getPageNumbers(6, 12)).toEqual([1, '…', 5, 6, 7, '…', 12]);
  });

  it('always includes the first and last page', () => {
    const pages = getPageNumbers(6, 20);
    expect(pages[0]).toBe(1);
    expect(pages[pages.length - 1]).toBe(20);
  });

  it('never emits duplicate page numbers', () => {
    for (let total = 8; total <= 15; total++) {
      for (let cur = 1; cur <= total; cur++) {
        const nums = getPageNumbers(cur, total).filter((p) => p !== '…');
        expect(new Set(nums).size).toBe(nums.length);
      }
    }
  });
});
