import { describe, it, expect } from 'vitest';
import { filterBoms, groupBomsByProject } from './groupBoms.js';

const boms = [
  { id: 'a', projectNo: 'P-001', projectName: 'Conveyor', bomNo: 'B1', bomName: 'Main panel' },
  { id: 'b', projectNo: 'P-001', projectName: 'Conveyor', bomNo: 'B2', bomName: 'Field devices' },
  { id: 'c', projectNo: 'P-002', projectName: 'Mixer', bomNo: 'B1', bomName: 'Control' },
  { id: 'd', projectNo: '', projectName: '', bomNo: 'B9', bomName: 'Spare' },
];

describe('filterBoms', () => {
  it('returns everything when the query is empty or whitespace', () => {
    expect(filterBoms(boms, '')).toHaveLength(4);
    expect(filterBoms(boms, '   ')).toHaveLength(4);
    expect(filterBoms(boms)).toHaveLength(4);
  });

  it('handles null/undefined input safely', () => {
    expect(filterBoms(null, 'x')).toEqual([]);
    expect(filterBoms(undefined)).toEqual([]);
  });

  it('matches on project number', () => {
    expect(filterBoms(boms, 'P-002').map((b) => b.id)).toEqual(['c']);
  });

  it('matches on project name (case-insensitive)', () => {
    expect(filterBoms(boms, 'conveyor').map((b) => b.id).sort()).toEqual(['a', 'b']);
  });

  it('matches on bom no and bom name', () => {
    expect(filterBoms(boms, 'field').map((b) => b.id)).toEqual(['b']);
    expect(filterBoms(boms, 'spare').map((b) => b.id)).toEqual(['d']);
  });

  it('returns an empty list when nothing matches', () => {
    expect(filterBoms(boms, 'nope')).toEqual([]);
  });

  it('does not crash on boms with missing fields', () => {
    const sparse = [{ id: 'x' }, { id: 'y', bomName: 'Findable' }];
    expect(filterBoms(sparse, 'findable').map((b) => b.id)).toEqual(['y']);
  });
});

describe('groupBomsByProject', () => {
  it('groups boms sharing the same project no + name', () => {
    const groups = groupBomsByProject(boms);
    expect(groups).toHaveLength(3);
    const conveyor = groups.find((g) => g.projectNo === 'P-001');
    expect(conveyor.boms.map((b) => b.id)).toEqual(['a', 'b']);
    expect(conveyor.projectName).toBe('Conveyor');
  });

  it('builds a stable composite key from projectNo + projectName', () => {
    const groups = groupBomsByProject(boms);
    expect(groups.map((g) => g.key)).toContain('P-001||Conveyor');
  });

  it('preserves first-seen order of groups and of boms within a group', () => {
    const groups = groupBomsByProject(boms);
    expect(groups.map((g) => g.projectNo)).toEqual(['P-001', 'P-002', '']);
  });

  it('collapses missing project fields into a single empty-project group', () => {
    const noProject = [
      { id: '1', bomNo: 'B1' },
      { id: '2', bomNo: 'B2' },
    ];
    const groups = groupBomsByProject(noProject);
    expect(groups).toHaveLength(1);
    expect(groups[0].key).toBe('||');
    expect(groups[0].boms.map((b) => b.id)).toEqual(['1', '2']);
  });

  it('separates boms that share a project number but differ in name', () => {
    const mixed = [
      { id: '1', projectNo: 'P-1', projectName: 'Alpha' },
      { id: '2', projectNo: 'P-1', projectName: 'Beta' },
    ];
    expect(groupBomsByProject(mixed)).toHaveLength(2);
  });

  it('handles null/undefined input safely', () => {
    expect(groupBomsByProject(null)).toEqual([]);
    expect(groupBomsByProject(undefined)).toEqual([]);
  });
});
