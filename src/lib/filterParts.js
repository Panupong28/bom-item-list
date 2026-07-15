// Filter a list of parts by brand, category, and a free-text search across
// description / part number / brand. Empty filters are no-ops. Brand matching
// trims whitespace to mirror how brands are normalised elsewhere in the app.
export function filterParts(parts, { search = '', brandFilters = [], categoryFilters = [] } = {}) {
  let list = parts || [];

  if (brandFilters.length > 0) {
    const set = new Set(brandFilters);
    list = list.filter((p) => set.has((p.brand || '').trim()));
  }

  if (categoryFilters.length > 0) {
    const set = new Set(categoryFilters);
    list = list.filter((p) => set.has(p.category));
  }

  if (search.trim()) {
    const q = search.toLowerCase();
    list = list.filter(
      (p) =>
        p.description?.toLowerCase().includes(q) ||
        p.partNo?.toLowerCase().includes(q) ||
        p.brand?.toLowerCase().includes(q)
    );
  }

  return list;
}
