import { useEffect, useMemo, useRef, useState } from 'react';
import { Check, ChevronDown, Search, X } from 'lucide-react';

function pluralize(label, n) {
  if (n === 1) return `1 ${label.toLowerCase()}`;
  return `${n} ${label.toLowerCase()}s`;
}

export default function MultiSelect({
  label,
  options,
  selected,
  onChange,
  allLabel,
  emptyMessage = 'No options',
  searchPlaceholder,
  searchThreshold = 6,
}) {
  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState('');
  const wrapRef = useRef(null);
  const searchInputRef = useRef(null);

  useEffect(() => {
    if (!open) return;
    const onDown = (e) => {
      if (wrapRef.current && !wrapRef.current.contains(e.target)) setOpen(false);
    };
    document.addEventListener('mousedown', onDown);
    return () => document.removeEventListener('mousedown', onDown);
  }, [open]);

  useEffect(() => {
    if (open) {
      // Focus the search input shortly after opening
      const t = setTimeout(() => searchInputRef.current?.focus(), 0);
      return () => clearTimeout(t);
    }
    setQuery('');
  }, [open]);

  const count = selected.length;
  const summary = count === 0 ? allLabel || `All ${label.toLowerCase()}s` : pluralize(label, count);

  const selectedSet = useMemo(() => new Set(selected), [selected]);

  const showSearch = options.length >= searchThreshold;

  const filteredOptions = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q) return options;
    return options.filter((o) => o.toLowerCase().includes(q));
  }, [options, query]);

  const toggle = (val) => {
    if (selectedSet.has(val)) onChange(selected.filter((v) => v !== val));
    else onChange([...selected, val]);
  };

  return (
    <div className="relative" ref={wrapRef}>
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        className={`inline-flex items-center gap-2 px-3 py-2 text-sm rounded-xl border focus:outline-none focus:ring-2 focus:ring-indigo-500 transition ${
          count > 0
            ? 'bg-indigo-50 dark:bg-indigo-500/15 border-indigo-300 dark:border-indigo-500/40 text-indigo-700 dark:text-indigo-300 font-semibold'
            : 'bg-white dark:bg-slate-900 border-slate-200 dark:border-slate-800 text-slate-700 dark:text-slate-200'
        }`}
      >
        <span className="truncate max-w-[180px]">{summary}</span>
        <ChevronDown className={`w-3.5 h-3.5 transition-transform ${open ? 'rotate-180' : ''}`} />
      </button>
      {open && (
        <div className="absolute z-30 mt-1.5 w-64 max-h-80 overflow-hidden bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl shadow-xl flex flex-col">
          {count > 0 && (
            <button
              type="button"
              onClick={() => onChange([])}
              className="flex items-center gap-1.5 px-4 py-2.5 text-sm font-semibold text-rose-600 dark:text-rose-400 hover:bg-rose-50 dark:hover:bg-rose-500/10 border-b border-slate-100 dark:border-slate-800"
            >
              <X className="w-4 h-4" strokeWidth={2.5} />
              Clear filter
            </button>
          )}
          {showSearch && (
            <div className="relative border-b border-slate-100 dark:border-slate-800">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-slate-400 dark:text-slate-500" />
              <input
                ref={searchInputRef}
                type="text"
                value={query}
                onChange={(e) => setQuery(e.target.value)}
                placeholder={searchPlaceholder || `Search ${label.toLowerCase()}…`}
                className="w-full pl-8 pr-7 py-2 text-xs bg-transparent text-slate-900 dark:text-slate-100 placeholder:text-slate-400 dark:placeholder:text-slate-500 focus:outline-none"
              />
              {query && (
                <button
                  type="button"
                  onClick={() => {
                    setQuery('');
                    searchInputRef.current?.focus();
                  }}
                  className="absolute right-2 top-1/2 -translate-y-1/2 p-0.5 rounded text-slate-400 hover:text-slate-700 dark:hover:text-slate-200"
                  aria-label="Clear search"
                >
                  <X className="w-3 h-3" />
                </button>
              )}
            </div>
          )}
          <div className="overflow-y-auto scrollbar-thin py-1">
            {options.length === 0 ? (
              <div className="px-4 py-3 text-xs text-slate-500 dark:text-slate-400 italic">
                {emptyMessage}
              </div>
            ) : filteredOptions.length === 0 ? (
              <div className="px-4 py-3 text-xs text-slate-500 dark:text-slate-400 italic">
                No matches for &ldquo;{query}&rdquo;
              </div>
            ) : (
              filteredOptions.map((opt) => {
                const isSel = selectedSet.has(opt);
                return (
                  <button
                    key={opt}
                    type="button"
                    onClick={() => toggle(opt)}
                    className={`w-full flex items-center gap-3 px-4 py-2 text-sm text-left transition ${
                      isSel
                        ? 'bg-indigo-50 dark:bg-indigo-500/15 text-indigo-900 dark:text-indigo-100'
                        : 'text-slate-700 dark:text-slate-200 hover:bg-slate-50 dark:hover:bg-slate-800'
                    }`}
                  >
                    <span className="flex-1 truncate font-medium">{opt}</span>
                    {isSel && (
                      <Check
                        className="w-4 h-4 text-indigo-600 dark:text-indigo-400 flex-shrink-0"
                        strokeWidth={3}
                      />
                    )}
                  </button>
                );
              })
            )}
          </div>
        </div>
      )}
    </div>
  );
}
