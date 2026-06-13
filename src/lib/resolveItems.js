export function buildPartsById(parts) {
  const map = new Map();
  for (const p of parts) map.set(p.id, p);
  return map;
}

export function resolveItem(item, partsById) {
  const live = partsById.get(item.partId);
  if (!live) {
    return {
      partId: item.partId,
      qty: item.qty || 1,
      description: '(Part removed from library)',
      partNo: '',
      brand: '',
      category: '',
      price: null,
      missing: true,
    };
  }
  return {
    partId: item.partId,
    qty: item.qty || 1,
    description: live.description || '',
    partNo: live.partNo || '',
    brand: live.brand || '',
    category: live.category || '',
    price: live.price ?? null,
    missing: false,
  };
}

export function resolveItems(items, partsById) {
  return (items || []).map((it) => resolveItem(it, partsById));
}
