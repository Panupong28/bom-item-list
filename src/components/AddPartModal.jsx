import { useMemo, useState } from 'react';
import { X, Sparkles, AlertCircle, Pencil } from 'lucide-react';

export default function AddPartModal({
  categories,
  defaultCategory,
  defaultBrand,
  existingParts = [],
  initialPart = null,
  onSubmit,
  onCancel,
}) {
  const isEdit = !!initialPart;
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

  const update = (field) => (e) => setForm({ ...form, [field]: e.target.value });

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
              <input value={form.brand} onChange={update('brand')} className={inputClass} />
            </Field>
          </div>

          <Field label="Category" required>
            <select value={form.category} onChange={update('category')} className={inputClass}>
              <option value="">— select —</option>
              {categories.map((c) => (
                <option key={c} value={c}>
                  {c}
                </option>
              ))}
            </select>
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
