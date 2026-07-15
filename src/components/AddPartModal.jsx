import { useEffect, useMemo, useRef, useState } from 'react';
import { X, Sparkles, AlertCircle, Pencil, Search, Plus, Check } from 'lucide-react';

export default function AddPartModal({
  categories,
  brands = [],
  defaultCategory,
  defaultBrand,
  existingParts = [],
  initialPart = null,
  onSubmit,
  onCancel,
}) {
  const isEdit = !!initialPart;

  // Derive all unique categories from both the categories collection and existing parts
  const allCategories = useMemo(() => {
    const set = new Set([...categories]);
    for (const p of existingParts) if (p.category) set.add(p.category);
    return [...set].sort((a, b) => a.localeCompare(b, undefined, { sensitivity: 'base' }));
  }, [categories, existingParts]);

  // Derive all unique brands from existing parts + passed brands list
  const allBrands = useMemo(() => {
    const set = new Set([...brands]);
    for (const p of existingParts) if (p.brand) set.add(p.brand.trim());
    return [...set].sort((a, b) => a.localeCompare(b, undefined, { sensitivity: 'base' }));
  }, [brands, existingParts]);

  const [form, setForm] = useState({
    description: initialPart?.description ?? '',
    partNo: initialPart?.partNo ?? '',
    brand: initialPart?.brand ?? defaultBrand ?? '',
    category: initialPart?.category ?? defaultCategory ?? categories[0] ?? '',
    price:
      initialPart?.price != null && initialPart?.price !== ''
        ? String(initialPart.price)
        : '',
  });
  const [saving, setSaving] = useState(false);

  const update = (field) => (val) =>
    setForm((prev) => ({ ...prev, [field]: typeof val === 'string' ? val : val.target.value }));

  const partNoKey = form.partNo.trim().toLowerCase();
  const duplicate = useMemo(() => {
    if (!partNoKey) return null;
    return (
      existingParts.find(
        (p) =>
          p.id !== initialPart?.id &&
          (p.partNo || '').trim().toLowerCase() === partNoKey
      ) || null
    );
  }, [existingParts, partNoKey, initialPart?.id]);

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!form.description.trim() || !form.partNo.trim()) {
      alert('Description and Part No. are required');
      return;
    }
    if (!form.category) {
      alert('Pick or create a category first');
      return;
    }
    if (duplicate) {
      alert(
        `Part No. "${form.partNo.trim()}" already exists in the catalog (${duplicate.description}). Use a different number or edit the existing part.`
      );
      return;
    }
    setSaving(true);
    try {
      const price = form.price.trim() === '' ? null : parseFloat(form.price.replace(/,/g, ''));
      await onSubmit({
        description: form.description.trim(),
        partNo: form.partNo.trim(),
        brand: form.brand.trim(),
        category: form.category,
        price: Number.isFinite(price) ? price : null,
      });
    } finally {
      setSaving(false);
    }
  };

  return (
    <div
      className="fixed inset-0 z-50 bg-slate-900/40 backdrop-blur-sm flex items-center justify-center p-4"
      onClick={onCancel}
    >
      <div
        className="bg-white dark:bg-slate-900 rounded-3xl shadow-2xl w-full max-w-md overflow-hidden border border-slate-200 dark:border-slate-800"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="relative overflow-hidden bg-gradient-to-r from-indigo-600 to-violet-700 px-6 py-5 text-white">
          <div className="pointer-events-none absolute -top-12 -right-12 w-40 h-40 rounded-full bg-white/15 blur-3xl"></div>
          <div className="relative flex items-center justify-between">
            <div className="flex items-center gap-2.5">
              <div className="w-9 h-9 rounded-xl bg-white/10 backdrop-blur-md border border-white/20 flex items-center justify-center">
                {isEdit ? (
                  <Pencil className="w-4 h-4 text-white" strokeWidth={2.5} />
                ) : (
                  <Sparkles className="w-4 h-4 text-white" strokeWidth={2.5} />
                )}
              </div>
              <div>
                <h3 className="text-base font-extrabold tracking-tight">
                  {isEdit ? 'Edit part' : 'Add part'}
                </h3>
                <p className="text-[11px] font-medium text-indigo-200">
                  {isEdit ? 'Update item in your catalog' : 'New item in your catalog'}
                </p>
              </div>
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

        <form onSubmit={handleSubmit} className="px-6 py-5 space-y-4">
          <Field label="Description" required>
            <input
              value={form.description}
              onChange={update('description')}
              autoFocus
              className={inputClass}
            />
          </Field>

          <div className="grid grid-cols-2 gap-3">
            <Field label="Part No." required>
              <input
                value={form.partNo}
                onChange={update('partNo')}
                className={`${inputClass} ${
                  duplicate
                    ? 'ring-2 ring-rose-500 border-rose-300 dark:border-rose-500/50'
                    : ''
                }`}
              />
              {duplicate && (
                <div className="mt-1.5 flex items-start gap-1.5 text-[11px] text-rose-600 dark:text-rose-400">
                  <AlertCircle className="w-3.5 h-3.5 mt-px flex-shrink-0" />
                  <span>
                    Already exists: <span className="font-semibold">{duplicate.description}</span>
                    {duplicate.brand ? ` · ${duplicate.brand}` : ''}
                    {duplicate.category ? ` · ${duplicate.category}` : ''}
                  </span>
                </div>
              )}
            </Field>
            <Field label="Brand">
              <ComboBox
                value={form.brand}
                onChange={update('brand')}
                options={allBrands}
                placeholder="Type or select…"
              />
            </Field>
          </div>

          <Field label="Category" required>
            <ComboBox
              value={form.category}
              onChange={update('category')}
              options={allCategories}
              placeholder="Type or select…"
            />
          </Field>

          <Field label="Price (THB)">
            <input
              type="number"
              step="0.01"
              value={form.price}
              onChange={update('price')}
              placeholder="leave blank if unknown"
              className={inputClass}
            />
          </Field>

          <div className="flex justify-end gap-2 pt-3 border-t border-slate-100 dark:border-slate-800">
            <button
              type="button"
              onClick={onCancel}
              className="px-4 py-2 text-sm font-semibold rounded-xl text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800 transition"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={saving || !!duplicate}
              className="px-4 py-2 text-sm font-semibold rounded-xl bg-gradient-to-r from-indigo-600 to-violet-700 text-white shadow-glow-indigo hover:shadow-lg disabled:opacity-50 transition"
            >
              {saving
                ? 'Saving…'
                : duplicate
                ? 'Duplicate part no.'
                : isEdit
                ? 'Save changes'
                : 'Save part'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

function ComboBox({ value, onChange, options, placeholder }) {
  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState(value);
  const wrapRef = useRef(null);
  const inputRef = useRef(null);

  // Keep query in sync when value changes externally
  useEffect(() => {
    setQuery(value);
  }, [value]);

  // Close on outside click
  useEffect(() => {
    if (!open) return;
    const handler = (e) => {
      if (wrapRef.current && !wrapRef.current.contains(e.target)) setOpen(false);
    };
    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, [open]);

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q) return options;
    return options.filter((o) => o.toLowerCase().includes(q));
  }, [options, query]);

  const isNew = query.trim() !== '' && !options.some(
    (o) => o.toLowerCase() === query.trim().toLowerCase()
  );

  const select = (opt) => {
    onChange(opt);
    setQuery(opt);
    setOpen(false);
  };

  const handleInput = (e) => {
    setQuery(e.target.value);
    onChange(e.target.value);
    setOpen(true);
  };

  const handleKeyDown = (e) => {
    if (e.key === 'Escape') { setOpen(false); inputRef.current?.blur(); }
    if (e.key === 'Enter' && open) { e.preventDefault(); if (filtered[0]) select(filtered[0]); }
  };

  return (
    <div className="relative" ref={wrapRef}>
      <div className="relative">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-slate-400 dark:text-slate-500 pointer-events-none" />
        <input
          ref={inputRef}
          type="text"
          value={query}
          onChange={handleInput}
          onFocus={() => setOpen(true)}
          onKeyDown={handleKeyDown}
          placeholder={placeholder}
          className={`${inputClass} pl-8 pr-8`}
          autoComplete="off"
        />
        {query && (
          <button
            type="button"
            onClick={() => { onChange(''); setQuery(''); inputRef.current?.focus(); }}
            className="absolute right-2.5 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 dark:hover:text-slate-300"
            tabIndex={-1}
          >
            <X className="w-3.5 h-3.5" />
          </button>
        )}
      </div>

      {open && (
        <div className="absolute z-50 mt-1 w-full max-h-52 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl shadow-xl overflow-y-auto scrollbar-thin">
          {isNew && (
            <button
              type="button"
              onMouseDown={(e) => { e.preventDefault(); select(query.trim()); }}
              className="w-full flex items-center gap-2 px-3 py-2 text-sm text-left text-indigo-600 dark:text-indigo-400 hover:bg-indigo-50 dark:hover:bg-indigo-500/10 border-b border-slate-100 dark:border-slate-800 font-semibold"
            >
              <Plus className="w-3.5 h-3.5 flex-shrink-0" />
              Create &ldquo;{query.trim()}&rdquo;
            </button>
          )}
          {filtered.length === 0 && !isNew ? (
            <div className="px-3 py-2.5 text-xs text-slate-400 dark:text-slate-500 italic">
              No matches
            </div>
          ) : (
            filtered.map((opt) => (
              <button
                key={opt}
                type="button"
                onMouseDown={(e) => { e.preventDefault(); select(opt); }}
                className={`w-full flex items-center gap-2 px-3 py-2 text-sm text-left transition ${
                  opt === value
                    ? 'bg-indigo-50 dark:bg-indigo-500/15 text-indigo-700 dark:text-indigo-300'
                    : 'text-slate-700 dark:text-slate-200 hover:bg-slate-50 dark:hover:bg-slate-800'
                }`}
              >
                <span className="flex-1 truncate">{opt}</span>
                {opt === value && <Check className="w-3.5 h-3.5 text-indigo-600 dark:text-indigo-400 flex-shrink-0" strokeWidth={3} />}
              </button>
            ))
          )}
        </div>
      )}
    </div>
  );
}

const inputClass =
  'w-full px-3 py-2.5 text-sm bg-slate-50 dark:bg-slate-800 text-slate-900 dark:text-slate-100 rounded-xl border border-slate-200 dark:border-slate-700 placeholder:text-slate-400 dark:placeholder:text-slate-500 focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:bg-white dark:focus:bg-slate-800 focus:border-transparent transition';

function Field({ label, required, children }) {
  return (
    <div>
      <label className="block text-[10px] font-bold uppercase tracking-[0.16em] text-slate-500 dark:text-slate-400 mb-1.5">
        {label} {required && <span className="text-rose-500">*</span>}
      </label>
      {children}
    </div>
  );
}
