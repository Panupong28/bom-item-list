import { useEffect, useMemo, useState } from 'react';
import { NavLink, useLocation, useNavigate, useParams, useSearchParams } from 'react-router-dom';
import {
  IceCream2,
  Plus,
  Tag,
  LayoutGrid,
  Sun,
  Moon,
  Building2,
  ChevronDown,
  ClipboardList,
  FileStack,
  LogOut,
} from 'lucide-react';
import { addDoc, collection, serverTimestamp } from 'firebase/firestore';
import { db } from '../firebase.js';
import { useTheme } from '../hooks/useTheme.js';

function usePersistedBool(key, initial) {
  const [val, setVal] = useState(() => {
    try {
      const stored = localStorage.getItem(key);
      if (stored === 'true' || stored === 'false') return stored === 'true';
    } catch (_) {}
    return initial;
  });
  useEffect(() => {
    try {
      localStorage.setItem(key, String(val));
    } catch (_) {}
  }, [key, val]);
  return [val, setVal];
}

export default function Sidebar({ parts, categories, brands, totalParts, bomCount = 0, templateCount = 0, user, onSignOut }) {
  const [newCatName, setNewCatName] = useState('');
  const [adding, setAdding] = useState(false);
  const [catsOpen, setCatsOpen] = usePersistedBool('sidebar.cats.v2', false);
  const [brandsOpen, setBrandsOpen] = usePersistedBool('sidebar.brands.v2', false);
  const { theme, toggle } = useTheme();
  const [searchParams] = useSearchParams();
  const activeBrand = searchParams.get('brand');
  const { category: catParam } = useParams();
  const activeCategory = catParam ? decodeURIComponent(catParam) : null;
  const navigate = useNavigate();
  const location = useLocation();

  const categoryCounts = useMemo(() => {
    const scope = activeBrand
      ? parts.filter((p) => (p.brand || '').trim() === activeBrand)
      : parts;
    const counts = {};
    for (const p of scope) {
      const c = p.category || 'Uncategorized';
      counts[c] = (counts[c] || 0) + 1;
    }
    return counts;
  }, [parts, activeBrand]);

  const brandCounts = useMemo(() => {
    const scope = activeCategory
      ? parts.filter((p) => p.category === activeCategory)
      : parts;
    const counts = {};
    for (const p of scope) {
      const b = (p.brand || '').trim();
      if (!b) continue;
      counts[b] = (counts[b] || 0) + 1;
    }
    return counts;
  }, [parts, activeCategory]);

  const visibleCategories = useMemo(
    () =>
      categories.filter(
        (c) => (categoryCounts[c.name] || 0) > 0 || c.name === activeCategory
      ),
    [categories, categoryCounts, activeCategory]
  );

  const visibleBrands = useMemo(
    () => brands.filter((b) => (brandCounts[b] || 0) > 0 || b === activeBrand),
    [brands, brandCounts, activeBrand]
  );

  const allPartsCount = activeBrand
    ? parts.filter((p) => (p.brand || '').trim() === activeBrand).length
    : totalParts;

  const handleAddCategory = async (e) => {
    e.preventDefault();
    const name = newCatName.trim();
    if (!name) return;
    if (categories.some((c) => c.name.toLowerCase() === name.toLowerCase())) {
      alert('Category already exists');
      return;
    }
    setAdding(true);
    try {
      await addDoc(collection(db, 'categories'), { name, createdAt: serverTimestamp() });
      setNewCatName('');
    } finally {
      setAdding(false);
    }
  };

  const catTo = (path) => ({
    pathname: path,
    search: activeBrand ? `?brand=${encodeURIComponent(activeBrand)}` : '',
  });

  const handleBrandClick = (brand) => {
    const params = new URLSearchParams(searchParams);
    if (activeBrand === brand) params.delete('brand');
    else params.set('brand', brand);
    const q = params.toString();
    navigate(`${location.pathname}${q ? '?' + q : ''}`);
  };

  const clearBrand = () => {
    const params = new URLSearchParams(searchParams);
    params.delete('brand');
    const q = params.toString();
    navigate(`${location.pathname}${q ? '?' + q : ''}`);
  };

  const navLinkClass = ({ isActive }) =>
    [
      'group flex items-center justify-between gap-2 px-3 py-2 rounded-xl text-sm transition-all duration-150',
      isActive
        ? 'bg-gradient-to-r from-indigo-600 to-violet-700 text-white shadow-glow-indigo'
        : 'text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800 hover:text-slate-900 dark:hover:text-white',
    ].join(' ');

  const brandButtonClass = (isActive) =>
    [
      'group w-full flex items-center justify-between gap-2 px-3 py-2 rounded-xl text-sm transition-all duration-150 text-left',
      isActive
        ? 'bg-gradient-to-r from-indigo-600 to-violet-700 text-white shadow-glow-indigo'
        : 'text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800 hover:text-slate-900 dark:hover:text-white',
    ].join(' ');

  const badgeClass = (isActive) =>
    [
      'text-[11px] font-semibold px-2 py-0.5 rounded-md min-w-[28px] text-center',
      isActive
        ? 'bg-white/20 text-white'
        : 'bg-slate-100 dark:bg-slate-800 text-slate-500 dark:text-slate-400',
    ].join(' ');

  return (
    <aside className="w-72 flex-shrink-0 bg-white dark:bg-slate-900 border-r border-slate-200 dark:border-slate-800 flex flex-col">
      <div className="px-6 py-6 flex items-center justify-between gap-3">
        <div className="flex items-center gap-3">
          <div className="relative w-10 h-10 rounded-xl bg-gradient-to-br from-indigo-600 to-violet-700 flex items-center justify-center shadow-glow-indigo">
            <IceCream2 className="w-5 h-5 text-white" strokeWidth={2.5} />
          </div>
          <div>
            <h1 className="text-base font-extrabold tracking-tight text-slate-900 dark:text-white leading-tight">
              Yogurt
            </h1>
            <p className="text-[11px] font-medium text-slate-500 dark:text-slate-400">
              Phi Automation
            </p>
          </div>
        </div>
        <button
          onClick={toggle}
          className="w-9 h-9 rounded-xl flex items-center justify-center text-slate-500 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white hover:bg-slate-100 dark:hover:bg-slate-800 transition"
          aria-label="Toggle theme"
          title={theme === 'dark' ? 'Switch to light mode' : 'Switch to dark mode'}
        >
          {theme === 'dark' ? <Sun className="w-4 h-4" /> : <Moon className="w-4 h-4" />}
        </button>
      </div>

      <div className="px-4 pb-2 space-y-0.5">
        <div className="micro-label px-3 mb-2">Workspace</div>
        <NavLink to={catTo('/')} end className={navLinkClass}>
          {({ isActive }) => (
            <>
              <span className="flex items-center gap-2.5 font-medium">
                <LayoutGrid className="w-4 h-4" strokeWidth={2.25} />
                All parts
              </span>
              <span className={badgeClass(isActive)}>{allPartsCount}</span>
            </>
          )}
        </NavLink>
        <NavLink to="/boms" className={navLinkClass}>
          {({ isActive }) => (
            <>
              <span className="flex items-center gap-2.5 font-medium">
                <ClipboardList className="w-4 h-4" strokeWidth={2.25} />
                BOMs
              </span>
              <span className={badgeClass(isActive)}>{bomCount}</span>
            </>
          )}
        </NavLink>
        <NavLink to="/templates" className={navLinkClass}>
          {({ isActive }) => (
            <>
              <span className="flex items-center gap-2.5 font-medium">
                <FileStack className="w-4 h-4" strokeWidth={2.25} />
                Templates
              </span>
              <span className={badgeClass(isActive)}>{templateCount}</span>
            </>
          )}
        </NavLink>
      </div>

      <div className="px-4 pt-3 flex-1 min-h-0 flex flex-col overflow-y-auto scrollbar-thin pr-1 space-y-5">
        <section>
          <SectionHeader
            open={catsOpen}
            onToggle={() => setCatsOpen(!catsOpen)}
            label="Categories"
            count={visibleCategories.length}
          />
          {catsOpen && (
            <div className="space-y-0.5">
              {visibleCategories.length === 0 ? (
                <EmptyHint>No categories with {activeBrand}.</EmptyHint>
              ) : (
                visibleCategories.map((c) => (
                  <NavLink
                    key={c.id}
                    to={catTo(`/category/${encodeURIComponent(c.name)}`)}
                    className={navLinkClass}
                  >
                    {({ isActive }) => (
                      <>
                        <span className="flex items-center gap-2.5 truncate font-medium">
                          <Tag className="w-4 h-4 flex-shrink-0" strokeWidth={2.25} />
                          <span className="truncate">{c.name}</span>
                        </span>
                        <span className={badgeClass(isActive)}>
                          {categoryCounts[c.name] || 0}
                        </span>
                      </>
                    )}
                  </NavLink>
                ))
              )}
            </div>
          )}
        </section>

        <section className="pb-4">
          <SectionHeader
            open={brandsOpen}
            onToggle={() => setBrandsOpen(!brandsOpen)}
            label="Brands"
            count={visibleBrands.length}
            actionLabel={activeBrand ? 'clear' : null}
            onAction={clearBrand}
          />
          {brandsOpen && (
            <div className="space-y-0.5">
              {visibleBrands.length === 0 ? (
                <EmptyHint>No brands in {activeCategory}.</EmptyHint>
              ) : (
                visibleBrands.map((b) => {
                  const isActive = activeBrand === b;
                  return (
                    <button
                      key={b}
                      onClick={() => handleBrandClick(b)}
                      className={brandButtonClass(isActive)}
                    >
                      <span className="flex items-center gap-2.5 truncate font-medium">
                        <Building2 className="w-4 h-4 flex-shrink-0" strokeWidth={2.25} />
                        <span className="truncate">{b}</span>
                      </span>
                      <span className={badgeClass(isActive)}>{brandCounts[b] || 0}</span>
                    </button>
                  );
                })
              )}
            </div>
          )}
        </section>
      </div>

      {user && (
        <div className="px-4 py-3 border-t border-slate-200 dark:border-slate-800 flex items-center gap-3">
          {user.photoURL ? (
            <img
              src={user.photoURL}
              alt=""
              referrerPolicy="no-referrer"
              className="w-8 h-8 rounded-full flex-shrink-0"
            />
          ) : (
            <div className="w-8 h-8 rounded-full bg-gradient-to-br from-indigo-600 to-violet-700 text-white text-xs font-bold flex items-center justify-center flex-shrink-0">
              {(user.displayName || user.email || '?').charAt(0).toUpperCase()}
            </div>
          )}
          <div className="flex-1 min-w-0">
            <div className="text-xs font-semibold text-slate-900 dark:text-white truncate">
              {user.displayName || 'Signed in'}
            </div>
            <div className="text-[11px] text-slate-500 dark:text-slate-400 truncate">
              {user.email}
            </div>
          </div>
          <button
            onClick={onSignOut}
            className="w-8 h-8 rounded-lg flex items-center justify-center text-slate-500 dark:text-slate-400 hover:text-red-600 dark:hover:text-red-400 hover:bg-slate-100 dark:hover:bg-slate-800 transition"
            aria-label="Sign out"
            title="Sign out"
          >
            <LogOut className="w-4 h-4" />
          </button>
        </div>
      )}

      <form
        onSubmit={handleAddCategory}
        className="p-4 border-t border-slate-200 dark:border-slate-800 flex gap-2"
      >
        <input
          value={newCatName}
          onChange={(e) => setNewCatName(e.target.value)}
          placeholder="New category"
          className="flex-1 min-w-0 px-3 py-2 text-sm bg-slate-100 dark:bg-slate-800 text-slate-900 dark:text-slate-100 rounded-lg border border-transparent focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:bg-white dark:focus:bg-slate-800 focus:border-slate-200 dark:focus:border-slate-700 placeholder:text-slate-400 dark:placeholder:text-slate-500 transition"
        />
        <button
          type="submit"
          disabled={adding}
          className="flex items-center justify-center w-9 h-9 rounded-lg bg-slate-900 dark:bg-white text-white dark:text-slate-900 hover:bg-slate-700 dark:hover:bg-slate-200 disabled:opacity-50 transition"
          aria-label="Add category"
        >
          <Plus className="w-4 h-4" strokeWidth={2.5} />
        </button>
      </form>
    </aside>
  );
}

function EmptyHint({ children }) {
  return (
    <div className="px-3 py-2 text-xs text-slate-400 dark:text-slate-500 italic">{children}</div>
  );
}

function SectionHeader({ open, onToggle, label, count, actionLabel, onAction }) {
  return (
    <div className="px-1 mb-2 flex items-center justify-between">
      <button
        type="button"
        onClick={onToggle}
        className="group flex items-center gap-1.5 px-2 py-1 rounded-md text-[10px] font-semibold uppercase tracking-[0.18em] text-slate-500 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white hover:bg-slate-100 dark:hover:bg-slate-800 transition"
      >
        <ChevronDown
          className={`w-3 h-3 transition-transform duration-200 ${open ? '' : '-rotate-90'}`}
          strokeWidth={2.5}
        />
        <span>{label}</span>
        <span className="text-slate-300 dark:text-slate-600 normal-case tracking-normal">·</span>
        <span className="text-slate-400 dark:text-slate-500 normal-case tracking-normal text-[10px]">
          {count}
        </span>
      </button>
      {actionLabel && (
        <button
          onClick={(e) => {
            e.stopPropagation();
            onAction?.();
          }}
          className="px-2 py-1 text-[10px] font-bold uppercase tracking-[0.14em] text-indigo-600 dark:text-indigo-400 hover:underline"
        >
          {actionLabel}
        </button>
      )}
    </div>
  );
}
