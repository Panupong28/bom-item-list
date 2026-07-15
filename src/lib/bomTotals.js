// Sum the extended price (price × qty) of a list of resolved BOM items.
// A null/undefined price counts as 0 (unpriced), and a missing qty counts
// as 1, mirroring how items are rendered in the BOM table.
export function bomTotal(items) {
  return (items || []).reduce(
    (sum, it) => sum + (it.price || 0) * (it.qty || 1),
    0
  );
}
