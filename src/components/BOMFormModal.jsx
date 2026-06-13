import { useState } from 'react';
import { X, ClipboardList } from 'lucide-react';

export default function BOMFormModal({
  initial,
  templates = [],
  title = 'New BOM',
  submitLabel = 'Create BOM',
  showTemplate = true,
  onSubmit,
  onCancel,
}) {
  const [form, setForm] = useState({
    projectNo: initial?.projectNo || '',
    projectName: initial?.projectName || '',
    bomNo: initial?.bomNo || '',
    bomName: initial?.bomName || '',
    notes: initial?.notes || '',
    templateId: '',
  });
  const [saving, setSaving] = useState(false);

  const update = (field) => (e) => setForm({ ...form, [field]: e.target.value });

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!form.projectNo.trim() || !form.projectName.trim() || !form.bomNo.trim() || !form.bomName.trim()) {
      alert('Project No, Project Name, BOM No, and BOM Name are required');
      return;
    }
    setSaving(true);
    try {
      await onSubmit({
        projectNo: form.projectNo.trim(),
        projectName: form.projectName.trim(),
        bomNo: form.bomNo.trim(),
        bomName: form.bomName.trim(),
        notes: form.notes.trim(),
        templateId: form.templateId || null,
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
        className="bg-white dark:bg-slate-900 rounded-3xl shadow-2xl w-full max-w-lg overflow-hidden border border-slate-200 dark:border-slate-800"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="relative overflow-hidden bg-gradient-to-r from-indigo-600 to-violet-700 px-6 py-5 text-white">
          <div className="pointer-events-none absolute -top-12 -right-12 w-40 h-40 rounded-full bg-white/15 blur-3xl"></div>
          <div className="relative flex items-center justify-between">
            <div className="flex items-center gap-2.5">
              <div className="w-9 h-9 rounded-xl bg-white/10 backdrop-blur-md border border-white/20 flex items-center justify-center">
                <ClipboardList className="w-4 h-4 text-white" strokeWidth={2.5} />
              </div>
              <div>
                <h3 className="text-base font-extrabold tracking-tight">{title}</h3>
                <p className="text-[11px] font-medium text-indigo-200">
                  Project &amp; BOM identification
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
          <div className="grid grid-cols-2 gap-3">
            <Field label="Project No." required>
              <input value={form.projectNo} onChange={update('projectNo')} autoFocus className={inputClass} />
            </Field>
            <Field label="Project Name" required>
              <input value={form.projectName} onChange={update('projectName')} className={inputClass} />
            </Field>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <Field label="BOM No." required>
              <input value={form.bomNo} onChange={update('bomNo')} className={inputClass} />
            </Field>
            <Field label="BOM Name" required>
              <input value={form.bomName} onChange={update('bomName')} className={inputClass} />
            </Field>
          </div>

          {showTemplate && templates.length > 0 && (
            <Field label="Start from template">
              <select value={form.templateId} onChange={update('templateId')} className={inputClass}>
                <option value="">— blank BOM —</option>
                {templates.map((t) => (
                  <option key={t.id} value={t.id}>
                    {t.name} {t.items?.length ? `(${t.items.length} items)` : ''}
                  </option>
                ))}
              </select>
            </Field>
          )}

          <Field label="Notes">
            <textarea
              rows={3}
              value={form.notes}
              onChange={update('notes')}
              placeholder="Optional"
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
              disabled={saving}
              className="px-4 py-2 text-sm font-semibold rounded-xl bg-gradient-to-r from-indigo-600 to-violet-700 text-white shadow-glow-indigo hover:shadow-lg disabled:opacity-50 transition"
            >
              {saving ? 'Saving…' : submitLabel}
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
