import { useContext, useEffect, useMemo, useState } from 'react';
import { useParams, useSearchParams } from 'react-router-dom';
import {
  Search,
  Plus,
  Trash2,
  Database,
  Sparkles,
  Package,
  Layers3,
  Tag,
  Wallet,
  X,
  Upload,
  Pencil,
} from 'lucide-react';
import {
  addDoc,
  collection,
  deleteDoc,
  doc,
  serverTimestamp,
  updateDoc,
} from 'firebase/firestore';
import { DataContext } from '../App.jsx';
import { db } from '../firebase.js';
import AddPartModal from '../components/AddPartModal.jsx';
import ImportPartsModal from '../components/ImportPartsModal.jsx';
import MultiSelect from '../components/MultiSelect.jsx';
import { runSeed } from '../seed.js';
import { filterParts } from '../lib/filterParts.js';
import { getPageNumbers } from '../lib/pagination.js';

const baht = (n) =>
  '฿' + n.toLocaleString('en-US', { minimumFractionDigits: 0, maximumFractionDigits: 0 });

// Cap rendered rows so large catalogs stay responsive; "Show more" reveals the rest.
const PAGE_SIZE = 50;

export default function PartsView() {
  const { category } = useParams();
  const decodedCategory = category ? decodeURIComponent(category) : null;
  const [searchParams, setSearchParams] = useSearchParams();
  const urlBrand = searchParams.get('brand') || '';
  // brandFilter is kept around for HeroCard/StatCard which display the
  // single-brand context (when exactly one brand is active it equals urlBrand).
  const brandFilter = urlBrand;

  const { parts, partsByCategory, categories, loading, upsertPart, removePart } =
    useContext(DataContext);

  const [search, setSearch] = useState('');
  const [brandFilters, setBrandFilters] = useState(() => (urlBrand ? [urlBrand] : []));
  const [categoryFilters, setCategoryFilters] = useState([]);
  const [showAddModal, setShowAddModal] = useState(false);
  const [editingPart, setEditingPart] = useState(null);
  const [showImport, setShowImport] = useState(false);
  const [seeding, setSeeding] = useState(false);
  const [currentPage, setCurrentPage] = useState(1);

  // Two-way sync: URL ?brand <-> brandFilters when there's exactly one brand.
  useEffect(() => {
    setBrandFilters((prev) => {
      if (urlBrand) {
        if (prev.length === 1 && prev[0] === urlBrand) return prev;
        return [urlBrand];
      }
      if (prev.length === 1) return [];
      return prev;
    });
  }, [urlBrand]);

  const updateBrandFilters = (next) => {
    setBrandFilters(next);
    const params = new URLSearchParams(searchParams);
    if (next.length === 1) params.set('brand', next[0]);
    else params.delete('brand');
    setSearchParams(params, { replace: true });
  };

  const scopeParts = decodedCategory ? partsByCategory[decodedCategory] || [] : parts;

  const availableBrands = useMemo(() => {
    const set = new Set();
    for (const p of scopeParts) {
      const b = (p.brand || '').trim();
      if (b) set.add(b);
    }
    return [...set].sort((a, b) => a.localeCompare(b, undefined, { sensitivity: 'base' }));
  }, [scopeParts]);

  const availableCategories = useMemo(() => {
    const set = new Set();
    for (const p of scopeParts) if (p.category) set.add(p.category);
    return [...set].sort((a, b) => a.localeCompare(b, undefined, { sensitivity: 'base' }));
  }, [scopeParts]);

  const filteredParts = useMemo(
    () => filterParts(scopeParts, { search, brandFilters, categoryFilters }),
    [scopeParts, search, brandFilters, categoryFilters]
  );

  // Reset to page 1 when the filter criteria change (not when the underlying
  // data mutates), so editing or deleting a row keeps you on the current page.
  useEffect(() => {
    setCurrentPage(1);
  }, [search, brandFilters, categoryFilters, decodedCategory]);

  const totalPages = Math.max(1, Math.ceil(filteredParts.length / PAGE_SIZE));
  // Clamp during render so a shrinking result set can't leave us past the last
  // page (which would show an empty slice for a frame).
  const page = Math.min(currentPage, totalPages);
  const visibleParts = filteredParts.slice((page - 1) * PAGE_SIZE, page * PAGE_SIZE);

  const stats = useMemo(() => {
    let scope = scopeParts;
    if (brandFilters.length > 0) {
      const set = new Set(brandFilters);
      scope = scope.filter((p) => set.has((p.brand || '').trim()));
    }
    if (categoryFilters.length > 0) {
      const set = new Set(categoryFilters);
      scope = scope.filter((p) => set.has(p.category));
    }
    const priced = scope.filter((p) => p.price != null);
    const total = priced.reduce((s, p) => s + (p.price || 0), 0);
    const brands = new Set(scope.map((p) => p.brand).filter(Boolean));
    return {
      partCount: scope.length,
      brandCount: brands.size,
      pricedCount: priced.length,
      totalValue: total,
    };
  }, [scopeParts, brandFilters, categoryFilters]);

  const handleAddPart = async (data) => {
    const ref = await addDoc(collection(db, 'parts'), { ...data, createdAt: serverTimestamp() });
    upsertPart({ id: ref.id, ...data, createdAt: new Date() });
    setShowAddModal(false);
  };

  const handleUpdatePart = async (data) => {
    if (!editingPart) return;
    await updateDoc(doc(db, 'parts', editingPart.id), {
      ...data,
      updatedAt: serverTimestamp(),
    });
    upsertPart({ id: editingPart.id, ...data, updatedAt: new Date() });
    setEditingPart(null);
  };

  const handleDeletePart = async (id) => {
    if (!confirm('Delete this part?')) return;
    await deleteDoc(doc(db, 'parts', id));
    removePart(id);
  };

  const handleSeed = async () => {
    if (!confirm('Load ~249 parts from the source spreadsheet into Firestore?')) return;
    setSeeding(true);
    try {
      const n = await runSeed();
      alert(`Seeded ${n} parts.`);
    } catch (err) {
      console.error(err);
      alert('Seed failed: ' + err.message);
    } finally {
      setSeeding(false);
    }
  };

  const clearAllFilters = () => {
    setSearch('');
    setCategoryFilters([]);
    updateBrandFilters([]);
  };

  const hasFilter =
    !!search.trim() || brandFilters.length > 0 || categoryFilters.length > 0;
  const activeFilterCount =
    (search.trim() ? 1 : 0) + brandFilters.length + categoryFilters.length;

  return (
    <div className="px-6 lg:px-10 py-8 max-w-[1500px] mx-auto">
      {!loading && parts.length === 0 && <SeedBanner onSeed={handleSeed} seeding={seeding} />}

      <div className="grid grid-cols-1 lg:grid-cols-5 gap-4 mb-6">
        <HeroCard
          category={decodedCategory}
          brand={brandFilter}
          partCount={stats.partCount}
          categoryCount={categories.length}
        />
        <StatCard
          label="Categories"
          value={decodedCategory ? 1 : categories.length}
          icon={<Layers3 className="w-4 h-4" />}
          accent="text-indigo-600 bg-indigo-50 dark:bg-indigo-500/15 dark:text-indigo-300"
        />
        <StatCard
          label="Brands"
          value={brandFilter ? 1 : stats.brandCount}
          icon={<Tag className="w-4 h-4" />}
          accent="text-violet-600 bg-violet-50 dark:bg-violet-500/15 dark:text-violet-300"
        />
        <StatCard
          label="Catalog value"
          value={baht(stats.totalValue)}
          subtitle={`${stats.pricedCount}/${stats.partCount} priced`}
          icon={<Wallet className="w-4 h-4" />}
          accent="text-emerald-600 bg-emerald-50 dark:bg-emerald-500/15 dark:text-emerald-300"
          mono
        />
      </div>

      <div className="flex items-center justify-between gap-3 mb-3 flex-wrap">
        <div className="flex items-center gap-2 flex-wrap flex-1 min-w-[260px]">
          <div className="relative flex-1 min-w-[240px] max-w-md">
            <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400 dark:text-slate-500" />
            <input
              type="text"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Search description, part no, brand…"
              className="w-full pl-10 pr-3 py-2.5 text-sm bg-white dark:bg-slate-900 text-slate-900 dark:text-slate-100 border border-slate-200 dark:border-slate-800 rounded-xl shadow-soft-sm placeholder:text-slate-400 dark:placeholder:text-slate-500 focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-transparent"
            />
          </div>
          <MultiSelect
            label="Brand"
            allLabel="All brands"
            options={availableBrands}
            selected={brandFilters}
            onChange={updateBrandFilters}
            emptyMessage="No brands"
          />
          {!decodedCategory && (
            <MultiSelect
              label="Category"
              allLabel="All categories"
              options={availableCategories}
              selected={categoryFilters}
              onChange={setCategoryFilters}
              emptyMessage="No categories"
            />
          )}
          {hasFilter && (
            <button
              onClick={clearAllFilters}
              className="inline-flex items-center gap-1.5 px-3 py-2 text-xs font-semibold rounded-xl text-indigo-600 dark:text-indigo-400 hover:bg-indigo-50 dark:hover:bg-indigo-500/10 transition"
            >
              <X className="w-3.5 h-3.5" />
              Clear filters
            </button>
          )}
        </div>
        <div className="flex items-center gap-2">
          <button
            onClick={() => setShowImport(true)}
            className="inline-flex items-center gap-2 px-4 py-2.5 rounded-xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 text-slate-700 dark:text-slate-200 text-sm font-semibold hover:bg-slate-50 dark:hover:bg-slate-800 transition"
          >
            <Upload className="w-4 h-4" strokeWidth={2.5} />
            Import JSON
          </button>
          <button
            onClick={() => setShowAddModal(true)}
            className="group inline-flex items-center gap-2 px-4 py-2.5 rounded-xl bg-gradient-to-r from-indigo-600 to-violet-700 text-white text-sm font-semibold shadow-glow-indigo hover:shadow-lg hover:-translate-y-px transition-all"
          >
            <Plus className="w-4 h-4" strokeWidth={2.5} />
            Add part
          </button>
        </div>
      </div>

      {(brandFilters.length > 0 || categoryFilters.length > 0) && (
        <div className="flex flex-wrap items-center gap-1.5 mb-4">
          <span className="text-[10px] font-bold uppercase tracking-[0.16em] text-slate-500 dark:text-slate-400 mr-1">
            Active:
          </span>
          {brandFilters.map((b) => (
            <ActiveFilterChip
              key={`b-${b}`}
              label="Brand"
              value={b}
              onRemove={() => updateBrandFilters(brandFilters.filter((x) => x !== b))}
            />
          ))}
          {categoryFilters.map((c) => (
            <ActiveFilterChip
              key={`c-${c}`}
              label="Category"
              value={c}
              onRemove={() => setCategoryFilters((prev) => prev.filter((x) => x !== c))}
            />
          ))}
        </div>
      )}

      {loading ? (
        <div className="p-16 text-center text-slate-500 dark:text-slate-400 card">Loading…</div>
      ) : filteredParts.length === 0 ? (
        <EmptyState hasParts={parts.length > 0} />
      ) : (
        <div className="card overflow-hidden">
          <div className="overflow-x-auto scrollbar-thin">
            <table className="w-full">
              <thead>
                <tr className="border-b border-slate-200 dark:border-slate-800 bg-slate-50/60 dark:bg-slate-900/60">
                  <Th>Description</Th>
                  <Th>Part No.</Th>
                  <Th>Brand</Th>
                  {!decodedCategory && <Th>Category</Th>}
                  <Th align="right">Price (THB)</Th>
                  <Th align="center" className="w-20"></Th>
                </tr>
              </thead>
              <tbody>
                {visibleParts.map((p) => (
                  <tr
                    key={p.id}
                    className="border-b border-slate-100 dark:border-slate-800/70 last:border-0 hover:bg-slate-50/80 dark:hover:bg-slate-800/40 transition-colors group"
                  >
                    <Td>
                      <span className="font-medium text-slate-900 dark:text-slate-100">
                        {p.description}
                      </span>
                    </Td>
                    <Td className="font-mono text-slate-700 dark:text-slate-300">{p.partNo}</Td>
                    <Td>
                      {p.brand ? (
                        <span className="text-slate-700 dark:text-slate-300">{p.brand}</span>
                      ) : (
                        <span className="text-slate-300 dark:text-slate-700">—</span>
                      )}
                    </Td>
                    {!decodedCategory && (
                      <Td>
                        <span className="inline-flex items-center px-2 py-0.5 rounded-md text-[11px] font-semibold bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300">
                          {p.category}
                        </span>
                      </Td>
                    )}
                    <Td align="right" className="font-mono tabular-nums">
                      {p.price != null ? (
                        <span className="font-semibold text-emerald-600 dark:text-emerald-400">
                          {p.price.toLocaleString('en-US', { minimumFractionDigits: 2 })}
                        </span>
                      ) : (
                        <span className="text-slate-300 dark:text-slate-700">—</span>
                      )}
                    </Td>
                    <Td align="center">
                      <div className="inline-flex items-center gap-1 opacity-0 group-hover:opacity-100 transition">
                        <button
                          onClick={() => setEditingPart(p)}
                          className="p-1.5 rounded-md text-slate-400 dark:text-slate-500 hover:bg-indigo-50 dark:hover:bg-indigo-500/15 hover:text-indigo-600 dark:hover:text-indigo-400 transition"
                          aria-label="Edit"
                          title="Edit part"
                        >
                          <Pencil className="w-4 h-4" />
                        </button>
                        <button
                          onClick={() => handleDeletePart(p.id)}
                          className="p-1.5 rounded-md text-slate-400 dark:text-slate-500 hover:bg-rose-50 dark:hover:bg-rose-500/15 hover:text-rose-600 dark:hover:text-rose-400 transition"
                          aria-label="Delete"
                          title="Delete part"
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                      </div>
                    </Td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          <div className="px-5 py-3 bg-slate-50/40 dark:bg-slate-900/40 border-t border-slate-200 dark:border-slate-800 flex items-center justify-between gap-3 flex-wrap">
            <span className="micro-label">
              Showing {(page - 1) * PAGE_SIZE + 1}–{Math.min(page * PAGE_SIZE, filteredParts.length)} of {filteredParts.length}
            </span>
            {totalPages > 1 && (
              <Pagination
                currentPage={page}
                totalPages={totalPages}
                onChange={setCurrentPage}
              />
            )}
            {activeFilterCount > 0 && (
              <button
                onClick={clearAllFilters}
                className="text-xs font-semibold text-indigo-600 dark:text-indigo-400 hover:text-indigo-700 dark:hover:text-indigo-300"
              >
                Clear filters
              </button>
            )}
          </div>
        </div>
      )}

      {showAddModal && (
        <AddPartModal
          categories={categories.map((c) => c.name)}
          defaultCategory={decodedCategory}
          defaultBrand={brandFilter}
          existingParts={parts}
          onSubmit={handleAddPart}
          onCancel={() => setShowAddModal(false)}
        />
      )}

      {editingPart && (
        <AddPartModal
          categories={categories.map((c) => c.name)}
          existingParts={parts}
          initialPart={editingPart}
          onSubmit={handleUpdatePart}
          onCancel={() => setEditingPart(null)}
        />
      )}

      {showImport && <ImportPartsModal onClose={() => setShowImport(false)} />}
    </div>
  );
}

function ActiveFilterChip({ label, value, onRemove }) {
  return (
    <span className="inline-flex items-center gap-1.5 pl-2.5 pr-1 py-1 rounded-lg text-xs font-semibold bg-indigo-50 dark:bg-indigo-500/15 text-indigo-700 dark:text-indigo-300 border border-indigo-200 dark:border-indigo-500/30">
      <span className="text-[10px] uppercase tracking-[0.12em] text-indigo-500 dark:text-indigo-400">
        {label}
      </span>
      <span>{value}</span>
      <button
        onClick={onRemove}
        className="p-0.5 rounded hover:bg-indigo-100 dark:hover:bg-indigo-500/25"
        aria-label={`Remove ${label} ${value}`}
      >
        <X className="w-3 h-3" />
      </button>
    </span>
  );
}

function HeroCard({ category, brand, partCount, categoryCount }) {
  const scopeLabel = category ? 'Category' : brand ? 'Brand' : 'Overview';
  const title = category || brand || 'All parts';
  const subtitle = (() => {
    if (category && brand) return `Parts in ${category} from ${brand}.`;
    if (category) return `Browse, search, and manage all items in the ${category} category.`;
    if (brand) return `All parts supplied by ${brand} across your catalog.`;
    return `Across ${categoryCount} categor${categoryCount === 1 ? 'y' : 'ies'} — your real-time BOM catalog backed by Firestore.`;
  })();

  return (
    <div className="lg:col-span-2 relative overflow-hidden rounded-3xl bg-gradient-to-br from-indigo-600 via-indigo-700 to-violet-700 text-white p-6 shadow-glow-indigo">
      <div className="pointer-events-none absolute -top-24 -right-24 w-64 h-64 rounded-full bg-white/15 blur-3xl"></div>
      <div className="pointer-events-none absolute -bottom-24 -left-16 w-56 h-56 rounded-full bg-violet-300/20 blur-3xl"></div>

      <div className="relative z-10 flex items-center justify-between mb-6">
        <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-white/10 backdrop-blur-md border border-white/20 text-[10px] font-semibold uppercase tracking-[0.18em]">
          <Sparkles className="w-3 h-3" />
          {scopeLabel}
        </span>
        <span className="text-[10px] font-medium uppercase tracking-[0.18em] text-indigo-200">
          Live · Firestore
        </span>
      </div>

      <div className="relative z-10">
        <p className="text-[10px] font-semibold uppercase tracking-[0.2em] text-indigo-200 mb-2 truncate">
          {title}
        </p>
        <div className="flex items-baseline gap-2 mb-4">
          <span className="text-5xl font-extrabold tracking-tight">{partCount}</span>
          <span className="text-sm font-medium text-indigo-200">
            {partCount === 1 ? 'part' : 'parts'}
          </span>
        </div>
        <p className="text-sm text-indigo-100/90 leading-relaxed">{subtitle}</p>
      </div>
    </div>
  );
}

function StatCard({ label, value, subtitle, icon, accent, mono }) {
  return (
    <div className="card p-5 hover:-translate-y-0.5 hover:shadow-soft-md transition-all duration-200">
      <div className="flex items-center justify-between mb-3">
        <span className="micro-label">{label}</span>
        <span className={`p-1.5 rounded-lg ${accent}`}>{icon}</span>
      </div>
      <div
        className={`text-2xl font-extrabold tracking-tight text-slate-900 dark:text-white ${mono ? 'tabular-nums' : ''}`}
      >
        {value}
      </div>
      {subtitle && (
        <div className="mt-1 text-[11px] font-medium text-slate-500 dark:text-slate-400">
          {subtitle}
        </div>
      )}
    </div>
  );
}

function SeedBanner({ onSeed, seeding }) {
  return (
    <div className="relative overflow-hidden mb-6 rounded-2xl bg-gradient-to-r from-amber-50 to-orange-50 dark:from-amber-500/10 dark:to-orange-500/10 border border-amber-200 dark:border-amber-500/30 p-5 flex items-center justify-between gap-4">
      <div className="flex items-center gap-3">
        <div className="w-10 h-10 rounded-xl bg-amber-500/15 flex items-center justify-center">
          <Database className="w-5 h-5 text-amber-700 dark:text-amber-300" />
        </div>
        <div>
          <p className="text-sm font-semibold text-amber-900 dark:text-amber-200">
            Catalog is empty
          </p>
          <p className="text-xs text-amber-700 dark:text-amber-300/80 mt-0.5">
            Seed the initial 249 parts from your source spreadsheet to get started.
          </p>
        </div>
      </div>
      <button
        onClick={onSeed}
        disabled={seeding}
        className="flex-shrink-0 inline-flex items-center gap-2 px-4 py-2 rounded-xl bg-amber-600 hover:bg-amber-700 text-white text-sm font-semibold shadow-soft-md disabled:opacity-50"
      >
        <Database className="w-4 h-4" />
        {seeding ? 'Seeding…' : 'Seed initial data'}
      </button>
    </div>
  );
}

function EmptyState({ hasParts }) {
  return (
    <div className="card p-16 text-center">
      <div className="inline-flex items-center justify-center w-12 h-12 rounded-xl bg-slate-100 dark:bg-slate-800 mb-4">
        <Package className="w-6 h-6 text-slate-400 dark:text-slate-500" />
      </div>
      <p className="text-sm font-medium text-slate-600 dark:text-slate-300">
        {hasParts ? 'No parts match your filter.' : 'No parts yet.'}
      </p>
    </div>
  );
}

function Pagination({ currentPage, totalPages, onChange }) {
  const pages = getPageNumbers(currentPage, totalPages);

  const btn =
    'inline-flex items-center justify-center w-8 h-8 rounded-lg text-xs font-semibold transition';
  const active = 'bg-indigo-600 text-white shadow-sm';
  const idle = 'text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800';
  const disabled = 'text-slate-300 dark:text-slate-700 cursor-not-allowed';

  return (
    <div className="flex items-center gap-1">
      <button
        className={`${btn} ${currentPage === 1 ? disabled : idle}`}
        onClick={() => onChange(currentPage - 1)}
        disabled={currentPage === 1}
        aria-label="Previous page"
      >
        ‹
      </button>
      {pages.map((p, i) =>
        p === '…' ? (
          <span key={`ellipsis-${i}`} className="w-8 text-center text-xs text-slate-400 dark:text-slate-600 select-none">
            …
          </span>
        ) : (
          <button
            key={p}
            className={`${btn} ${p === currentPage ? active : idle}`}
            onClick={() => onChange(p)}
            aria-current={p === currentPage ? 'page' : undefined}
          >
            {p}
          </button>
        )
      )}
      <button
        className={`${btn} ${currentPage === totalPages ? disabled : idle}`}
        onClick={() => onChange(currentPage + 1)}
        disabled={currentPage === totalPages}
        aria-label="Next page"
      >
        ›
      </button>
    </div>
  );
}

function Th({ children, align = 'left', className = '' }) {
  return (
    <th
      className={`px-5 py-3.5 text-[10px] font-bold uppercase tracking-[0.16em] text-slate-500 dark:text-slate-400 ${className}`}
      style={{ textAlign: align }}
    >
      {children}
    </th>
  );
}

function Td({ children, align = 'left', className = '' }) {
  return (
    <td
      className={`px-5 py-3.5 text-sm text-slate-700 dark:text-slate-300 ${className}`}
      style={{ textAlign: align }}
    >
      {children}
    </td>
  );
}
