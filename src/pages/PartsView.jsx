import { useContext, useMemo, useState } from 'react';
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
import { runSeed } from '../seed.js';

const baht = (n) =>
  '฿' + n.toLocaleString('en-US', { minimumFractionDigits: 0, maximumFractionDigits: 0 });

export default function PartsView() {
  const { category } = useParams();
  const decodedCategory = category ? decodeURIComponent(category) : null;
  const [searchParams, setSearchParams] = useSearchParams();
  const brandFilter = searchParams.get('brand') || '';

  const { parts, partsByCategory, categories, loading } = useContext(DataContext);

  const [search, setSearch] = useState('');
  const [showAddModal, setShowAddModal] = useState(false);
  const [editingPart, setEditingPart] = useState(null);
  const [showImport, setShowImport] = useState(false);
  const [seeding, setSeeding] = useState(false);

  const scopeParts = decodedCategory ? partsByCategory[decodedCategory] || [] : parts;

  const filteredParts = useMemo(() => {
    let list = scopeParts;
    if (brandFilter) {
      list = list.filter((p) => (p.brand || '').trim() === brandFilter);
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
  }, [scopeParts, search, brandFilter]);

  const stats = useMemo(() => {
    const scope = brandFilter
      ? scopeParts.filter((p) => (p.brand || '').trim() === brandFilter)
      : scopeParts;
    const priced = scope.filter((p) => p.price != null);
    const total = priced.reduce((s, p) => s + (p.price || 0), 0);
    const brands = new Set(scope.map((p) => p.brand).filter(Boolean));
    return {
      partCount: scope.length,
      brandCount: brands.size,
      pricedCount: priced.length,
      totalValue: total,
    };
  }, [scopeParts, brandFilter]);

  const handleAddPart = async (data) => {
    await addDoc(collection(db, 'parts'), { ...data, createdAt: serverTimestamp() });
    setShowAddModal(false);
  };

  const handleUpdatePart = async (data) => {
    if (!editingPart) return;
    await updateDoc(doc(db, 'parts', editingPart.id), {
      ...data,
      updatedAt: serverTimestamp(),
    });
    setEditingPart(null);
  };

  const handleDeletePart = async (id) => {
    if (!confirm('Delete this part?')) return;
    await deleteDoc(doc(db, 'parts', id));
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

  const clearBrand = () => {
    const next = new URLSearchParams(searchParams);
    next.delete('brand');
    setSearchParams(next);
  };

  const activeFilterCount = (search.trim() ? 1 : 0) + (brandFilter ? 1 : 0);

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

      {brandFilter && (
        <div className="mb-4 flex items-center gap-2">
          <span className="micro-label">Filters</span>
          <FilterChip label={`Brand: ${brandFilter}`} onClear={clearBrand} />
        </div>
      )}

      <div className="flex items-center justify-between gap-3 mb-4 flex-wrap">
        <div className="relative flex-1 min-w-[260px] max-w-md">
          <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400 dark:text-slate-500" />
          <input
            type="text"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search description, part no, brand…"
            className="w-full pl-10 pr-3 py-2.5 text-sm bg-white dark:bg-slate-900 text-slate-900 dark:text-slate-100 border border-slate-200 dark:border-slate-800 rounded-xl shadow-soft-sm placeholder:text-slate-400 dark:placeholder:text-slate-500 focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-transparent"
          />
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
                {filteredParts.map((p) => (
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
          <div className="px-5 py-3 bg-slate-50/40 dark:bg-slate-900/40 border-t border-slate-200 dark:border-slate-800 flex items-center justify-between">
            <span className="micro-label">
              Showing {filteredParts.length} of {scopeParts.length}
            </span>
            {activeFilterCount > 0 && (
              <button
                onClick={() => {
                  setSearch('');
                  clearBrand();
                }}
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

function FilterChip({ label, onClear }) {
  return (
    <span className="inline-flex items-center gap-1.5 pl-3 pr-1.5 py-1 rounded-lg text-xs font-semibold bg-indigo-50 dark:bg-indigo-500/15 text-indigo-700 dark:text-indigo-300 border border-indigo-200 dark:border-indigo-500/30">
      {label}
      <button
        onClick={onClear}
        className="p-0.5 rounded hover:bg-indigo-100 dark:hover:bg-indigo-500/25"
        aria-label="Clear filter"
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
