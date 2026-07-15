// Free-text filter across a BOM's project no / project name / bom no / bom
// name. An empty query is a no-op that returns the original list. Matching is
// case-insensitive.
export function filterBoms(boms, search = '') {
  const q = search.trim().toLowerCase();
  if (!q) return boms || [];
  return (boms || []).filter(
    (b) =>
      b.projectNo?.toLowerCase().includes(q) ||
      b.projectName?.toLowerCase().includes(q) ||
      b.bomNo?.toLowerCase().includes(q) ||
      b.bomName?.toLowerCase().includes(q)
  );
}

// Group BOMs by their project (projectNo + projectName), preserving first-seen
// order of both the groups and the BOMs within each group. Missing project
// fields collapse to '' so BOMs with no project still group together.
export function groupBomsByProject(boms) {
  const map = new Map();
  for (const b of boms || []) {
    const key = `${b.projectNo || ''}||${b.projectName || ''}`;
    if (!map.has(key)) {
      map.set(key, {
        key,
        projectNo: b.projectNo || '',
        projectName: b.projectName || '',
        boms: [],
      });
    }
    map.get(key).boms.push(b);
  }
  return [...map.values()];
}
