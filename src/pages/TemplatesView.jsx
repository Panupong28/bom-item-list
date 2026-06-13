import { useContext, useMemo, useState } from 'react';
import {
  Search,
  Plus,
  Trash2,
  Pencil,
  FileStack,
  Package,
  X,
  Save,
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
import PartPickerModal from '../components/PartPickerModal.jsx';
import { buildPartsById, resolveItems } from '../lib/resolveItems.js';

export default function TemplatesView() {
  const { templates } = useContext(DataContext);
  const [search, setSearch] = useState('');
  const [showEditor, setShowEditor] = useState(false);
  const [editing, setEditing] = useState(null);

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase();
    if (!q) return templates;
    return templates.filter(
      (t) =>
        t.name?.toLowerCase().includes(q) ||
        t.description?.toLowerCase().includes(q)
    );
  }, [templates, search]);

  const openCreate = () => {
    setEditing(null);
    setShowEditor(true);
  };
  const openEdit = (t) => {
    setEditing(t);
    setShowEditor(true);
  };
  const handleDelete = async (t) => {
    if (!confirm(`Delete template "${t.name}"?`)) return;
    await deleteDoc(doc(db, 'bomTemplates', t.id));
  };

  return (
    <div className="px-6 lg:px-10 py-8 max-w-[1500px] mx-auto">
      <div className="relative overflow-hidden rounded-3xl bg-gradient-to-br from-indigo-600 via-indigo-700 to-violet-700 text-white p-6 shadow-glow-indigo mb-6">
        <div className="pointer-events-none absolute -top-24 -right-24 w-64 h-64 rounded-full bg-white/15 blur-3xl"></div>
        <div className="pointer-events-none absolute -bottom-24 -left-16 w-56 h-56 rounded-full bg-violet-300/20 blur-3xl"></div>
        <div className="relative z-10">
          <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-white/10 backdrop-blur-md border border-white/20 text-[10px] font-semibold uppercase tracking-[0.18em] mb-4">
            <FileStack className="w-3 h-3" />
            BOM Templates
          </span>
          <div className="flex items-baseline gap-2 mb-2">
            <span className="text-5xl font-extrabold tracking-tight">{templates.length}</span>
            <span className="text-sm font-medium text-indigo-200">templates</span>
          </div>
          <p className="text-sm text-indigo-100/90 leading-relaxed max-w-2xl">
            Reusable item lists. Apply a template when creating a new BOM to pre-fill it with parts.
          </p>
        </div>
      </div>

      <div className="flex items-center justify-between gap-3 mb-4 flex-wrap">
        <div className="relative flex-1 min-w-[260px] max-w-md">
          <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400 dark:text-slate-500" />
          <input
            type="text"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search templates…"
            className="w-full pl-10 pr-3 py-2.5 text-sm bg-white dark:bg-slate-900 text-slate-900 dark:text-slate-100 border border-slate-200 dark:border-slate-800 rounded-xl shadow-soft-sm focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-transparent"
          />
        </div>
        <button
          onClick={openCreate}
          className="inline-flex items-center gap-2 px-4 py-2.5 rounded-xl bg-gradient-to-r from-indigo-600 to-violet-700 text-white text-sm font-semibold shadow-glow-indigo hover:shadow-lg hover:-translate-y-px transition-all"
        >
          <Plus className="w-4 h-4" strokeWidth={2.5} />
          New template
        </button>
      </div>

      {filtered.length === 0 ? (
        <div className="card p-16 text-center">
          <div className="inline-flex items-center justify-center w-12 h-12 rounded-xl bg-slate-100 dark:bg-slate-800 mb-4">
            <FileStack className="w-6 h-6 text-slate-400 dark:text-slate-500" />
          </div>
          <p className="text-sm font-medium text-slate-600 dark:text-slate-300">
            {templates.length === 0
              ? 'No templates yet. Create one to reuse common BOM structures.'
              : 'No templates match your search.'}
          </p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {filtered.map((t) => (
            <div key={t.id} className="card p-5 flex flex-col hover:-translate-y-0.5 hover:shadow-soft-md transition-all">
              <div className="flex items-start justify-between gap-2 mb-2">
                <div className="flex items-center gap-2 min-w-0">
                  <div className="w-9 h-9 rounded-xl bg-indigo-50 dark:bg-indigo-500/15 text-indigo-600 dark:text-indigo-300 flex items-center justify-center flex-shrink-0">
                    <FileStack className="w-4 h-4" />
                  </div>
                  <h4 className="font-bold text-slate-900 dark:text-white truncate">{t.name}</h4>
                </div>
                <div className="flex gap-1">
                  <button
                    onClick={() => openEdit(t)}
                    className="p-1.5 rounded-md text-slate-400 dark:text-slate-500 hover:bg-indigo-50 dark:hover:bg-indigo-500/15 hover:text-indigo-600 dark:hover:text-indigo-400"
                    aria-label="Edit"
                  >
                    <Pencil className="w-4 h-4" />
                  </button>
                  <button
                    onClick={() => handleDelete(t)}
                    className="p-1.5 rounded-md text-slate-400 dark:text-slate-500 hover:bg-rose-50 dark:hover:bg-rose-500/15 hover:text-rose-600 dark:hover:text-rose-400"
                    aria-label="Delete"
                  >
                    <Trash2 className="w-4 h-4" />
                  </button>
                </div>
              </div>
              {t.description && (
                <p className="text-xs text-slate-500 dark:text-slate-400 mb-3 line-clamp-2">
                  {t.description}
                </p>
              )}
              <div className="mt-auto pt-3 border-t border-slate-100 dark:border-slate-800 flex items-center justify-between text-xs">
                <span className="inline-flex items-center gap-1.5 text-slate-500 dark:text-slate-400">
                  <Package className="w-3.5 h-3.5" />
                  {t.items?.length || 0} item{(t.items?.length || 0) === 1 ? '' : 's'}
                </span>
              </div>
            </div>
          ))}
        </div>
      )}

      {showEditor && (
        <TemplateEditor
          initial={editing}
          onClose={() => setShowEditor(false)}
        />
      )}
    </div>
  );
}

function TemplateEditor({ initial, onClose }) {
  const { parts } = useContext(DataContext);
  const partsById = useMemo(() => buildPartsById(parts), [parts]);
  const [name, setName] = useState(initial?.name || '');
  const [description, setDescription] = useState(initial?.description || '');
  const [items, setItems] = useState(
    initial?.items
      ? initial.items.map((it) => ({ partId: it.partId, qty: it.qty || 1 }))
      : []
  );
  const [showPicker, setShowPicker] = useState(false);
  const [saving, setSaving] = useState(false);

  const resolvedItems = useMemo(() => resolveItems(items, partsById), [items, partsById]);

  const handleAddItems = (newItems) => {
    setItems((prev) => [...prev, ...newItems]);
    setShowPicker(false);
  };

  const handleQtyChange = (idx, qty) => {
    const n = parseInt(qty, 10);
    const safe = Number.isFinite(n) && n > 0 ? n : 1;
    setItems((prev) => prev.map((it, i) => (i === idx ? { ...it, qty: safe } : it)));
  };

  const handleRemove = (idx) => {
    setItems((prev) => prev.filter((_, i) => i !== idx));
  };

  const handleSave = async () => {
    if (!name.trim()) {
      alert('Template name is required');
      return;
    }
    setSaving(true);
    try {
      const payload = {
        name: name.trim(),
        description: description.trim(),
        items: items.map((it) => ({ partId: it.partId, qty: it.qty || 1 })),
        updatedAt: serverTimestamp(),
      };
      if (initial) {
        await updateDoc(doc(db, 'bomTemplates', initial.id), payload);
      } else {
        await addDoc(collection(db, 'bomTemplates'), {
          ...payload,
          createdAt: serverTimestamp(),
        });
      }
      onClose();
    } finally {
      setSaving(false);
    }
  };

  return (
    <div
      className="fixed inset-0 z-50 bg-slate-900/40 backdrop-blur-sm flex items-center justify-center p-4"
      onClick={onClose}
    >
      <div
        className="bg-white dark:bg-slate-900 rounded-3xl shadow-2xl w-full max-w-3xl max-h-[88vh] overflow-hidden border border-slate-200 dark:border-slate-800 flex flex-col"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="relative overflow-hidden bg-gradient-to-r from-indigo-600 to-violet-700 px-6 py-5 text-white flex-shrink-0">
          <div className="pointer-events-none absolute -top-12 -right-12 w-40 h-40 rounded-full bg-white/15 blur-3xl"></div>
          <div className="relative flex items-center justify-between">
            <div>
              <h3 className="text-base font-extrabold tracking-tight">
                {initial ? 'Edit template' : 'New template'}
              </h3>
              <p className="text-[11px] font-medium text-indigo-200">
                Reusable BOM structure
              </p>
            </div>
            <button
              onClick={onClose}
              className="p-1.5 rounded-lg text-white/70 hover:text-white hover:bg-white/10 transition"
              aria-label="Close"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        <div className="px-6 py-4 border-b border-slate-100 dark:border-slate-800 grid grid-cols-1 md:grid-cols-2 gap-3 flex-shrink-0">
          <Field label="Template name" required>
            <input
              autoFocus
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="e.g. Conveyor control panel"
              className={inputClass}
            />
          </Field>
          <Field label="Description">
            <input
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="Optional"
              className={inputClass}
            />
          </Field>
        </div>

        <div className="px-6 py-3 border-b border-slate-100 dark:border-slate-800 flex items-center justify-between flex-shrink-0">
          <span className="text-xs font-bold uppercase tracking-[0.16em] text-slate-500 dark:text-slate-400">
            Items · {items.length}
          </span>
          <button
            onClick={() => setShowPicker(true)}
            className="inline-flex items-center gap-2 px-3 py-1.5 rounded-lg bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-semibold transition"
          >
            <Plus className="w-3.5 h-3.5" strokeWidth={2.5} />
            Add items
          </button>
        </div>

        <div className="flex-1 overflow-y-auto scrollbar-thin">
          {items.length === 0 ? (
            <div className="p-12 text-center text-sm text-slate-500 dark:text-slate-400">
              No items yet. Click "Add items" to pick from your parts library.
            </div>
          ) : (
            <table className="w-full">
              <thead className="sticky top-0 bg-white dark:bg-slate-900">
                <tr className="border-b border-slate-200 dark:border-slate-800 bg-slate-50/60 dark:bg-slate-900/60">
                  <th className="text-left px-4 py-2.5 text-[10px] font-bold uppercase tracking-[0.16em] text-slate-500 dark:text-slate-400">Description</th>
                  <th className="text-left px-4 py-2.5 text-[10px] font-bold uppercase tracking-[0.16em] text-slate-500 dark:text-slate-400">Part No.</th>
                  <th className="text-left px-4 py-2.5 text-[10px] font-bold uppercase tracking-[0.16em] text-slate-500 dark:text-slate-400">Brand</th>
                  <th className="w-24 text-center px-4 py-2.5 text-[10px] font-bold uppercase tracking-[0.16em] text-slate-500 dark:text-slate-400">Qty</th>
                  <th className="w-10"></th>
                </tr>
              </thead>
              <tbody>
                {resolvedItems.map((it, idx) => (
                  <tr
                    key={`${it.partId}-${idx}`}
                    className={`border-b border-slate-100 dark:border-slate-800/70 last:border-0 group ${
                      it.missing ? 'bg-rose-50/40 dark:bg-rose-500/5' : ''
                    }`}
                  >
                    <td className="px-4 py-3 text-sm">
                      {it.missing ? (
                        <span className="font-medium italic text-rose-600 dark:text-rose-400">
                          Part removed from library
                        </span>
                      ) : (
                        <span className="font-medium text-slate-900 dark:text-slate-100">
                          {it.description}
                        </span>
                      )}
                    </td>
                    <td className="px-4 py-3 text-sm font-mono text-slate-700 dark:text-slate-300">
                      {it.partNo || '—'}
                    </td>
                    <td className="px-4 py-3 text-sm text-slate-700 dark:text-slate-300">
                      {it.brand || '—'}
                    </td>
                    <td className="px-4 py-3 text-center">
                      <input
                        type="number"
                        min="1"
                        value={it.qty || 1}
                        onChange={(e) => handleQtyChange(idx, e.target.value)}
                        className="w-16 px-2 py-1 text-sm text-center bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded focus:outline-none focus:ring-2 focus:ring-indigo-500"
                      />
                    </td>
                    <td className="px-4 py-3 text-center">
                      <button
                        onClick={() => handleRemove(idx)}
                        className="p-1.5 rounded-md text-slate-300 dark:text-slate-600 hover:bg-rose-50 dark:hover:bg-rose-500/15 hover:text-rose-600 dark:hover:text-rose-400 transition opacity-0 group-hover:opacity-100"
                        aria-label="Remove"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>

        <div className="px-6 py-4 border-t border-slate-100 dark:border-slate-800 flex justify-end gap-2 flex-shrink-0">
          <button
            onClick={onClose}
            className="px-4 py-2 text-sm font-semibold rounded-xl text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800 transition"
          >
            Cancel
          </button>
          <button
            onClick={handleSave}
            disabled={saving}
            className="inline-flex items-center gap-2 px-4 py-2 text-sm font-semibold rounded-xl bg-gradient-to-r from-indigo-600 to-violet-700 text-white shadow-glow-indigo hover:shadow-lg disabled:opacity-50 transition"
          >
            <Save className="w-4 h-4" />
            {saving ? 'Saving…' : initial ? 'Save changes' : 'Create template'}
          </button>
        </div>
      </div>

      {showPicker && (
        <PartPickerModal
          existingPartIds={items.map((it) => it.partId)}
          onAdd={handleAddItems}
          onCancel={() => setShowPicker(false)}
        />
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
