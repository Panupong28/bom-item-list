import { useContext, useEffect, useMemo, useState } from 'react';
import { X, ClipboardList, Lock } from 'lucide-react';
import { DataContext } from '../App.jsx';

export default function BOMFormModal({
  initial,
  templates = [],
  title = 'New BOM',
  submitLabel = 'Create BOM',
  showTemplate = true,
  onSubmit,
  onCancel,
}) {
  const { boms } = useContext(DataContext);

  const { existingProjects, existingBoms } = useMemo(() => {
    const projects = new Map();
    const bomMap = new Map();
    for (const b of boms) {
      const pn = (b.projectNo || '').trim();
      if (pn && !projects.has(pn)) projects.set(pn, (b.projectName || '').trim());
      const bn = (b.bomNo || '').trim();
      if (bn && !bomMap.has(bn)) bomMap.set(bn, (b.bomName || '').trim());
    }
    return { existingProjects: projects, existingBoms: bomMap };
  }, [boms]);

  const [form, setForm] = useState({
    projectNo: initial?.projectNo || '',
    projectName: initial?.projectName || '',
    bomNo: initial?.bomNo || '',
    bomName: initial?.bomName || '',
    notes: initial?.notes || '',
    templateId: '',
  });
  const [saving, setSaving] = useState(false);

  const projectKey = form.projectNo.trim();
  const bomKey = form.bomNo.trim();
  const projectLocked = existingProjects.has(projectKey);
  const bomLocked = existingBoms.has(bomKey);

  useEffect(() => {
    if (projectLocked) {
      const name = existingProjects.get(projectKey) || '';
      if (form.projectName !== name) setForm((f) => ({ ...f, projectName: name }));
    }
  }, [projectKey, projectLocked, existingProjects]);

  useEffect(() => {
    if (bomLocked) {
      const name = existingBoms.get(bomKey) || '';
      if (form.bomName !== name) setForm((f) => ({ ...f, bomName: name }));
    }
  }, [bomKey, bomLocked, existingBoms]);

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
            <Field
              label="Project No."
              required
              hint={
                projectLocked
                  ? 'Existing project — name locked'
                  : projectKey
                  ? 'New project'
                  : 'Pick from list or type new'
              }
            >
              <input
                list="bom-existing-projects"
                value={form.projectNo}
                onChange={update('projectNo')}
                placeholder="e.g. PRJ-001"
                autoFocus
                className={inputClass}
              />
              <datalist id="bom-existing-projects">
                {[...existingProjects.entries()].map(([no, name]) => (
                  <option key={no} value={no}>
                    {name}
                  </option>
                ))}
              </datalist>
            </Field>
            <Field
              label="Project Name"
              required
              locked={projectLocked}
            >
              <input
                value={form.projectName}
                onChange={update('projectName')}
                readOnly={projectLocked}
                placeholder={projectLocked ? '' : 'Project name'}
                className={projectLocked ? lockedInputClass : inputClass}
              />
            </Field>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <Field
              label="BOM No."
              required
              hint={
                bomLocked
                  ? 'Existing BOM no. — name locked'
                  : bomKey
                  ? 'New BOM'
                  : 'Pick from list or type new'
              }
            >
              <input
                list="bom-existing-boms"
                value={form.bomNo}
                onChange={update('bomNo')}
                placeholder="e.g. BOM-A1"
                className={inputClass}
              />
              <datalist id="bom-existing-boms">
                {[...existingBoms.entries()].map(([no, name]) => (
                  <option key={no} value={no}>
                    {name}
                  </option>
                ))}
              </datalist>
            </Field>
            <Field
              label="BOM Name"
              required
              locked={bomLocked}
            >
              <input
                value={form.bomName}
                onChange={update('bomName')}
                readOnly={bomLocked}
                placeholder={bomLocked ? '' : 'BOM name'}
                className={bomLocked ? lockedInputClass : inputClass}
              />
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

const lockedInputClass =
  'w-full px-3 py-2.5 text-sm bg-slate-100 dark:bg-slate-800/60 text-slate-600 dark:text-slate-400 rounded-xl border border-slate-200 dark:border-slate-700/50 cursor-not-allowed select-none';

function Field({ label, required, locked, hint, children }) {
  return (
    <div>
      <label className="flex items-center gap-1.5 text-[10px] font-bold uppercase tracking-[0.16em] text-slate-500 dark:text-slate-400 mb-1.5">
        <span>{label}</span>
        {required && <span className="text-rose-500">*</span>}
        {locked && <Lock className="w-3 h-3 text-slate-400 dark:text-slate-500" />}
      </label>
      {children}
      {hint && (
        <p
          className={`mt-1 text-[10px] font-medium ${
            locked
              ? 'text-indigo-600 dark:text-indigo-400'
              : 'text-slate-400 dark:text-slate-500'
          }`}
        >
          {hint}
        </p>
      )}
    </div>
  );
}
