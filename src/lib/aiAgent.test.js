import { describe, it, expect } from 'vitest';
import {
  runAgent,
  extractContext,
  partMatchesFilter,
  ruleFilters,
  scoreRule,
} from './aiAgent.js';

const parts = [
  { id: 'plc1', description: 'PLC CPU module FX5U', partNo: 'FX5U-32MR', brand: 'Mitsubishi', category: 'PLC', price: 5000 },
  { id: 'plc2', description: 'PLC CPU compact', partNo: 'AB-1756', brand: 'Allen-Bradley', category: 'PLC', price: 8000 },
  { id: 'hmi1', description: 'HMI 7in touch', partNo: 'GT2107', brand: 'Mitsubishi', category: 'HMI', price: 3000 },
  { id: 'brk1', description: 'Circuit breaker 3P 100A', partNo: 'NSX100', brand: 'Schneider', category: 'Breaker', price: 1200 },
  { id: 'cbl1', description: 'Control cable 2C shielded', partNo: 'CB-2C', brand: ' Schneider ', category: 'Cable', price: 20 },
];

const plcRule = {
  id: 'r1',
  name: 'Standard PLC',
  enabled: true,
  triggers: ['plc', 'controller'],
  requires: [],
  filters: { categories: ['PLC'], brands: [], partNos: [], textIncludes: [] },
  defaultQty: 1,
  note: 'Every panel needs one PLC CPU per the standard design.',
};

const panelRule = {
  id: 'r2',
  name: 'Control panel starter kit',
  enabled: true,
  triggers: ['control panel', 'panel kit'],
  requires: ['brand'],
  filters: { categories: ['PLC', 'HMI'], brands: [], partNos: [], textIncludes: [] },
  defaultQty: 1,
  note: '',
};

describe('extractContext', () => {
  it('recognises brands present in the library', () => {
    const ctx = extractContext('I need a mitsubishi plc', parts);
    expect(ctx.brands).toContain('mitsubishi');
  });

  it('recognises categories present in the library', () => {
    const ctx = extractContext('add a breaker please', parts);
    expect(ctx.categories).toContain('breaker');
  });

  it('parses explicit quantities but not part numbers', () => {
    expect(extractContext('add 5 pcs plc', parts).qty).toBe(5);
    expect(extractContext('qty 12 breakers', parts).qty).toBe(12);
    expect(extractContext('x3 cables', parts).qty).toBe(3);
    // Part-number digits must not be read as a quantity.
    expect(extractContext('add the AB-1756 controller', parts).qty).toBe(null);
  });
});

describe('partMatchesFilter', () => {
  it('matches by category', () => {
    const f = ruleFilters(plcRule);
    expect(partMatchesFilter(parts[0], f)).toBe(true);
    expect(partMatchesFilter(parts[3], f)).toBe(false);
  });

  it('trims brand whitespace when matching', () => {
    const f = ruleFilters({ filters: { brands: ['Schneider'] } });
    expect(partMatchesFilter(parts[4], f)).toBe(true); // brand is " Schneider "
  });

  it('an all-empty filter matches nothing', () => {
    const f = ruleFilters({ filters: {} });
    expect(partMatchesFilter(parts[0], f)).toBe(false);
  });
});

describe('scoreRule', () => {
  it('scores longer trigger matches higher', () => {
    const a = scoreRule(panelRule, 'i want a control panel');
    const b = scoreRule(plcRule, 'i want a plc');
    expect(a.score).toBeGreaterThan(b.score);
  });
});

describe('runAgent', () => {
  it('asks what to add on an empty prompt', () => {
    const res = runAgent({ prompt: '  ', rules: [plcRule], parts });
    expect(res.question).toBeTruthy();
    expect(res.candidates).toHaveLength(0);
  });

  it('asks back (never guesses) when no rule matches', () => {
    const res = runAgent({ prompt: 'add a spaceship', rules: [plcRule], parts });
    expect(res.question).toBeTruthy();
    expect(res.candidates).toHaveLength(0);
    expect(res.matchedRules).toHaveLength(0);
  });

  it('returns candidate parts for a matched rule', () => {
    const res = runAgent({ prompt: 'add a plc', rules: [plcRule], parts });
    expect(res.question).toBeNull();
    expect(res.candidates.map((c) => c.partId).sort()).toEqual(['plc1', 'plc2']);
    expect(res.candidates.every((c) => c.qty === 1)).toBe(true);
  });

  it('narrows candidates by a brand named in the prompt', () => {
    const res = runAgent({ prompt: 'add a mitsubishi plc', rules: [plcRule], parts });
    expect(res.candidates.map((c) => c.partId)).toEqual(['plc1']);
  });

  it('applies an explicit quantity from the prompt', () => {
    const res = runAgent({ prompt: 'add 4 pcs plc', rules: [plcRule], parts });
    expect(res.candidates.every((c) => c.qty === 4)).toBe(true);
  });

  it('asks a clarifying question when a required param is missing', () => {
    const res = runAgent({ prompt: 'build a control panel', rules: [panelRule], parts });
    expect(res.question).toMatch(/brand/i);
    expect(res.candidates).toHaveLength(0);
  });

  it('proceeds once the required param is supplied', () => {
    const res = runAgent({ prompt: 'build a mitsubishi control panel', rules: [panelRule], parts });
    expect(res.question).toBeNull();
    expect(res.candidates.map((c) => c.partId).sort()).toEqual(['hmi1', 'plc1']);
  });

  it('surfaces the rule note as an official citation', () => {
    const res = runAgent({ prompt: 'add a plc', rules: [plcRule], parts });
    expect(res.citations.some((c) => c.content.includes('standard design'))).toBe(true);
  });

  it('includes relevant knowledge entries as citations', () => {
    const knowledge = [
      { id: 'k1', title: 'Breaker sizing standard', content: 'Use 100A for main.', source: 'IEC' },
    ];
    const breakerRule = { ...plcRule, id: 'r3', name: 'Breaker', triggers: ['breaker'], filters: { categories: ['Breaker'] } };
    const res = runAgent({ prompt: 'add a breaker', rules: [breakerRule], knowledge, parts });
    expect(res.citations.some((c) => c.title === 'Breaker sizing standard')).toBe(true);
  });

  it('gives a notice (not a crash) when a rule matches but no part fits', () => {
    const emptyLib = [];
    const res = runAgent({ prompt: 'add a plc', rules: [plcRule], parts: emptyLib });
    expect(res.notice).toBeTruthy();
    expect(res.candidates).toHaveLength(0);
  });

  it('ignores disabled rules', () => {
    const res = runAgent({ prompt: 'add a plc', rules: [{ ...plcRule, enabled: false }], parts });
    expect(res.candidates).toHaveLength(0);
    expect(res.question).toBeTruthy();
  });
});
