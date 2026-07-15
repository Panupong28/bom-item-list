import { describe, it, expect } from 'vitest';
import { safeFilename } from './filename.js';

describe('safeFilename', () => {
  it('leaves an already-safe string untouched', () => {
    expect(safeFilename('Main_Panel-01')).toBe('Main_Panel-01');
  });

  it('replaces filesystem-illegal characters with underscores', () => {
    expect(safeFilename('a/b\\c:d*e?f"g<h>i|j')).toBe('a_b_c_d_e_f_g_h_i_j');
  });

  it('collapses whitespace runs to a single underscore', () => {
    expect(safeFilename('Project   No 1')).toBe('Project_No_1');
    expect(safeFilename('tab\tand\nnewline')).toBe('tab_and_newline');
  });

  it('falls back to "BOM" for empty or nullish input', () => {
    expect(safeFilename('')).toBe('BOM');
    expect(safeFilename(null)).toBe('BOM');
    expect(safeFilename(undefined)).toBe('BOM');
  });

  it('coerces non-string input to a string', () => {
    expect(safeFilename(123)).toBe('123');
  });

  it('handles a value that is both illegal and space-laden', () => {
    expect(safeFilename('P/N 100: rev A')).toBe('P_N_100__rev_A');
  });
});
