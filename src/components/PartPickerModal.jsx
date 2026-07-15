import { useContext, useMemo, useState } from 'react';
import { X, Search, Check, Plus } from 'lucide-react';
import { DataContext } from '../App.jsx';
import MultiSelect from './MultiSelect.jsx';

export default function PartPickerModal({ existingPartIds = [], onAdd, onCancel }) {
  const { parts } = useContext(DataContext);
  const [search, setSearch] = useState('');
  const [categoryFilters, setCategoryFilters] = useState([]);
  const [brandFilters, setBrandFilters] = useState([]);
  const [selected, setSelected] = useState({});

  const hasFilter = !!(search.trim() || categoryFilters.length > 0 || brandFilters.length > 0);

  const availableCategories = useMemo(() => {
    const set = new Set();
    for (const p of parts) if (p.category) set.add(p.category);
    return [...set].sort((a, b) => a.localeCompare(b, undefined, { sensitivity: 'base' }));
  }, [parts]);

  const availableBrands = useMemo(() => {
    const set = new Set();
    for (const p of parts) {
      const b = (p.brand || '').trim();
      if (b) set.add(b);
    }
    return [...set].sort((a, b) => a.localeCompare(b, undefined, { sensitivity: 'base' }));
  }, [parts]);

  const filtered = useMemo(() => {
    if (!hasFilter) return [];
    let list = parts;
    if (categoryFilters.length > 0) {
      const set = new Set(categoryFilters);
      list = list.filter((p) => set.has(p.category));
    }
    if (brandFilters.length > 0) {
      const set = new Set(brandFilters);
      list = list.filter((p) => set.has((p.brand || '').trim()));
    }
    const q = search.trim().toLowerCase();
    if (q) {
      list = list.filter(
        (p) =>
          p.description?.toLowerCase().includes(q) ||
          p.partNo?.toLowerCase().includes(q) ||
          p.brand?.toLowerCase().includes(q)
      );
    }
    return list;
  }, [parts, search, categoryFilters, brandFilters, hasFilter]);

  const existingSet = useMemo(() => new Set(existingPartIds), [existingPartIds]);

  const toggle = (p) => {
    if (existingSet.has(p.id)) return;
    setSelected((s) => {
      const next = { ...s };
      if (next[p.id]) delete next[p.id];
      else next[p.id] = 1;
      return next;
    });
  };

  const setQty = (id, qty) => {
    const n = parseInt(qty, 10);
    setSelected((s) => ({ ...s, [id]: Number.isFinite(n) && n > 0 ? n : 1 }));
  };

  const handleAdd = () => {
    const items = Object.entries(selected).map(([partId, qty]) => ({ partId, qty }));
    onAdd(items);
  };

  const selectedCount = Object.keys(selected).length;

  return (
    <div
      className="fixed inset-0 z-50 bg-slate-900/40 backdrop-blur-sm flex items-center justify-center p-4"
      onClick={onCancel}
    >
      <div
        className="bg-white dark:bg-slate-900 rounded-3xl shadow-2xl w-full max-w-4xl max-h-[88vh] border border-slate-200 dark:border-slate-800 flex flex-col"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="relative overflow-hidden rounded-t-3xl bg-gradient-to-r from-indigo-600 to-violet-700 px-6 py-5 text-white flex-shrink-0">
          <div className="pointer-events-none absolute -top-12 -right-12 w-40 h-40 rounded-full bg-white/15 blur-3xl"></div>
          <div className="relative flex items-center justify-between">
            <div>
              <h3 className="text-base font-extrabold tracking-tight">Add items from parts library</h3>
              <p className="text-[11px] font-medium text-indigo-200">
                Tick to select, set quantity on the right
              </p>
            </div>
            <button
              onClick={onCancel}
              className="p-1.5 rounded-lg text-white/70 hover:text-white hover:bg-white/10 transition"
              aria-label="Close"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        <div className="px-6 py-4 border-b border-slate-100 dark:border-slate-800 flex flex-wrap items-center gap-3 flex-shrink-0">
          <div className="relative flex-1 min-w-[220px]">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
            <input
              type="text"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Search description, part no, brand…"
              className="w-full pl-9 pr-3 py-2 text-sm bg-slate-50 dark:bg-slate-800 text-slate-900 dark:text-slate-100 border border-slate-200 dark:border-slate-700 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500"
            />
          </div>
          <MultiSelect
            label="Category"
            allLabel="All categories"
            options={availableCategories}
            selected={categoryFilters}
            onChange={setCategoryFilters}
            emptyMessage="No categories"
          />
          <MultiSelect
            label="Brand"
            allLabel="All brands"
            options={availableBrands}
            selected={brandFilters}
            onChange={setBrandFilters}
            emptyMessage="No brands"
          />
          {hasFilter && (
            <button
              onClick={() => {
                setCategoryFilters([]);
                setBrandFilters([]);
                setSearch('');
              }}
              className="text-xs font-semibold text-indigo-600 dark:text-indigo-400 hover:underline"
            >
              Clear
            </button>
          )}
          <span className="text-xs font-semibold text-slate-500 dark:text-slate-400">
            {hasFilter ? `${filtered.length} parts` : 'Filter to view parts'} · {selectedCount} selected
          </span>
        </div>

        <div className="flex-1 overflow-y-auto scrollbar-thin">
          <table className="w-full">
            <thead className="sticky top-0 bg-white dark:bg-slate-900 z-10">
              <tr className="border-b border-slate-200 dark:border-slate-800 bg-slate-50/60 dark:bg-slate-900/60">
                <th className="w-10 px-4 py-2.5"></th>
                <th className="text-left px-4 py-2.5 text-[10px] font-bold uppercase tracking-[0.16em] text-slate-500 dark:text-slate-400">
                  Description
                </th>
                <th className="text-left px-4 py-2.5 text-[10px] font-bold uppercase tracking-[0.16em] text-slate-500 dark:text-slate-400">
                  Part No.
                </th>
                <th className="text-left px-4 py-2.5 text-[10px] font-bold uppercase tracking-[0.16em] text-slate-500 dark:text-slate-400">
                  Brand
                </th>
                <th className="text-left px-4 py-2.5 text-[10px] font-bold uppercase tracking-[0.16em] text-slate-500 dark:text-slate-400">
                  Category
                </th>
                <th className="w-24 text-center px-4 py-2.5 text-[10px] font-bold uppercase tracking-[0.16em] text-slate-500 dark:text-slate-400">
                  Qty
                </th>
              </tr>
            </thead>
            <tbody>
              {!hasFilter ? (
                <tr>
                  <td colSpan={6} className="text-center py-12 text-sm text-slate-500">
                    Search or pick a category/brand to view parts.
                  </td>
                </tr>
              ) : filtered.length === 0 ? (
                <tr>
                  <td colSpan={6} className="text-center py-12 text-sm text-slate-500">
                    No parts match the filter.
                  </td>
                </tr>
              ) : (
                filtered.map((p) => {
                  const inBom = existingSet.has(p.id);
                  const isSel = !!selected[p.id];
                  return (
                    <tr
                      key={p.id}
                      onClick={() => toggle(p)}
                      className={`border-b border-slate-100 dark:border-slate-800/70 last:border-0 transition-colors ${
                        inBom
                          ? 'opacity-50 cursor-not-allowed'
                          : 'cursor-pointer hover:bg-slate-50/80 dark:hover:bg-slate-800/40'
                      } ${isSel ? 'bg-indigo-50/60 dark:bg-indigo-500/10' : ''}`}
                    >
                      <td className="px-4 py-3 text-center">
                        <div
                          className={`w-5 h-5 rounded border flex items-center justify-center mx-auto ${
                            isSel
                              ? 'bg-indigo-600 border-indigo-600 text-white'
                              : 'bg-white dark:bg-slate-800 border-slate-300 dark:border-slate-600'
                          }`}
                        >
                          {isSel && <Check className="w-3 h-3" strokeWidth={3} />}
                        </div>
                      </td>
                      <td className="px-4 py-3 text-sm">
                        <span className="font-medium text-slate-900 dark:text-slate-100">
                          {p.description}
                        </span>
                        {inBom && (
                          <span className="ml-2 text-[10px] font-bold uppercase tracking-wider text-amber-600 dark:text-amber-400">
                            already added
                          </span>
                        )}
                      </td>
                      <td className="px-4 py-3 text-sm font-mono text-slate-700 dark:text-slate-300">
                        {p.partNo}
                      </td>
                      <td className="px-4 py-3 text-sm text-slate-700 dark:text-slate-300">
                        {p.brand || '—'}
                      </td>
                      <td className="px-4 py-3 text-sm">
                        <span className="inline-flex items-center px-2 py-0.5 rounded-md text-[11px] font-semibold bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300">
                          {p.category}
                        </span>
                      </td>
                      <td className="px-4 py-3 text-center" onClick={(e) => e.stopPropagation()}>
                        {isSel ? (
                          <input
                            type="number"
                            min="1"
                            value={selected[p.id]}
                            onChange={(e) => setQty(p.id, e.target.value)}
                            className="w-16 px-2 py-1 text-sm text-center bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded focus:outline-none focus:ring-2 focus:ring-indigo-500"
                          />
                        ) : (
                          <span className="text-slate-300 dark:text-slate-700">—</span>
                        )}
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>

        <div className="px-6 py-4 border-t border-slate-100 dark:border-slate-800 rounded-b-3xl bg-white dark:bg-slate-900 flex justify-end gap-2 flex-shrink-0">
          <button
            onClick={onCancel}
            className="px-4 py-2 text-sm font-semibold rounded-xl text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800 transition"
          >
            Cancel
          </button>
          <button
            onClick={handleAdd}
            disabled={selectedCount === 0}
            className="inline-flex items-center gap-2 px-4 py-2 text-sm font-semibold rounded-xl bg-gradient-to-r from-indigo-600 to-violet-700 text-white shadow-glow-indigo hover:shadow-lg disabled:opacity-50 transition"
          >
            <Plus className="w-4 h-4" strokeWidth={2.5} />
            Add {selectedCount > 0 ? `${selectedCount} item${selectedCount === 1 ? '' : 's'}` : 'items'}
          </button>
        </div>
      </div>
    </div>
  );
}
