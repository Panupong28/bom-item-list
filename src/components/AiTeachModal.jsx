import { useMemo, useState } from 'react';
import { X, GraduationCap, Plus, Trash2, Pencil, BookOpen, Sparkles, Save } from 'lucide-react';
import {
  addDoc,
  collection,
  deleteDoc,
  doc,
  serverTimestamp,
  updateDoc,
} from 'firebase/firestore';
import { db } from '../firebase.js';

const inputClass =
  'w-full px-3 py-2.5 text-sm bg-slate-50 dark:bg-slate-800 text-slate-900 dark:text-slate-100 rounded-xl border border-slate-200 dark:border-slate-700 placeholder:text-slate-400 dark:placeholder:text-slate-500 focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:bg-white dark:focus:bg-slate-800 focus:border-transparent transition';

const splitList = (s) =>
  (s || '')
    .split(',')
    .map((x) => x.trim())
    .filter(Boolean);

const REQUIRE_OPTIONS = [
  { key: 'brand', label: 'Brand' },
  { key: 'category', label: 'Category' },
  { key: 'qty', label: 'Quantity' },
];

const emptyRuleForm = {
  name: '',
  triggers: '',
  requires: [],
  categories: '',
  brands: '',
  partNos: '',
  textIncludes: '',
  defaultQty: '1',
  note: '',
  enabled: true,
};

const emptyKnowledgeForm = { title: '', content: '', source: '' };

export default function AiTeachModal({
  rules = [],
  knowledge = [],
  availableCategories = [],
  availableBrands = [],
  onClose,
}) {
  const [tab, setTab] = useState('rules');

  return (
    <div
      className="fixed inset-0 z-[60] bg-slate-900/40 backdrop-blur-sm flex items-center justify-center p-4"
      onClick={onClose}
    >
      <div
        className="bg-white dark:bg-slate-900 rounded-3xl shadow-2xl w-full max-w-3xl max-h-[90vh] border border-slate-200 dark:border-slate-800 flex flex-col overflow-hidden"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="relative overflow-hidden bg-gradient-to-r from-indigo-600 to-violet-700 px-6 py-5 text-white flex-shrink-0">
          <div className="pointer-events-none absolute -top-12 -right-12 w-40 h-40 rounded-full bg-white/15 blur-3xl"></div>
          <div className="relative flex items-center justify-between">
            <div className="flex items-center gap-2.5">
              <div className="w-9 h-9 rounded-xl bg-white/10 backdrop-blur-md border border-white/20 flex items-center justify-center">
                <GraduationCap className="w-4 h-4 text-white" strokeWidth={2.5} />
              </div>
              <div>
                <h3 className="text-base font-extrabold tracking-tight">Teach the AI</h3>
                <p className="text-[11px] font-medium text-indigo-200">
                  The assistant only follows what you teach here — rules &amp; official knowledge
                </p>
              </div>
            </div>
            <button
              onClick={onClose}
              className="p-1.5 rounded-lg text-white/70 hover:text-white hover:bg-white/10 transition"
              aria-label="Close"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
          <div className="relative mt-4 flex gap-1 bg-white/10 rounded-xl p-1 w-max">
            <TabButton active={tab === 'rules'} onClick={() => setTab('rules')} icon={Sparkles}>
              Rules · {rules.length}
            </TabButton>
            <TabButton active={tab === 'knowledge'} onClick={() => setTab('knowledge')} icon={BookOpen}>
              Knowledge · {knowledge.length}
            </TabButton>
          </div>
        </div>

        <div className="flex-1 overflow-y-auto scrollbar-thin px-6 py-5">
          {tab === 'rules' ? (
            <RulesTab
              rules={rules}
              availableCategories={availableCategories}
              availableBrands={availableBrands}
            />
          ) : (
            <KnowledgeTab knowledge={knowledge} />
          )}
        </div>
      </div>
    </div>
  );
}

function TabButton({ active, onClick, icon: Icon, children }) {
  return (
    <button
      onClick={onClick}
      className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold transition ${
        active ? 'bg-white text-indigo-700' : 'text-white/80 hover:text-white'
      }`}
    >
      <Icon className="w-3.5 h-3.5" />
      {children}
    </button>
  );
}

/* ----------------------------- Rules ----------------------------- */

function RulesTab({ rules, availableCategories, availableBrands }) {
  const [editingId, setEditingId] = useState(null); // 'new' | id | null
  const [form, setForm] = useState(emptyRuleForm);
  const [saving, setSaving] = useState(false);

  const startNew = () => {
    setForm(emptyRuleForm);
    setEditingId('new');
  };

  const startEdit = (rule) => {
    const f = rule.filters || {};
    setForm({
      name: rule.name || '',
      triggers: (rule.triggers || []).join(', '),
      requires: rule.requires || [],
      categories: (f.categories || []).join(', '),
      brands: (f.brands || []).join(', '),
      partNos: (f.partNos || []).join(', '),
      textIncludes: (f.textIncludes || []).join(', '),
      defaultQty: String(rule.defaultQty ?? 1),
      note: rule.note || '',
      enabled: rule.enabled !== false,
    });
    setEditingId(rule.id);
  };

  const cancel = () => {
    setEditingId(null);
    setForm(emptyRuleForm);
  };

  const toggleRequire = (key) =>
    setForm((s) => ({
      ...s,
      requires: s.requires.includes(key)
        ? s.requires.filter((r) => r !== key)
        : [...s.requires, key],
    }));

  const save = async () => {
    if (!form.name.trim()) {
      alert('Give the rule a name.');
      return;
    }
    if (!splitList(form.triggers).length) {
      alert('Add at least one trigger phrase so the AI knows when to apply this rule.');
      return;
    }
    const qtyNum = parseInt(form.defaultQty, 10);
    const payload = {
      name: form.name.trim(),
      triggers: splitList(form.triggers),
      requires: form.requires,
      filters: {
        categories: splitList(form.categories),
        brands: splitList(form.brands),
        partNos: splitList(form.partNos),
        textIncludes: splitList(form.textIncludes),
      },
      defaultQty: Number.isFinite(qtyNum) && qtyNum > 0 ? qtyNum : 1,
      note: form.note.trim(),
      enabled: form.enabled,
      updatedAt: serverTimestamp(),
    };
    setSaving(true);
    try {
      if (editingId === 'new') {
        await addDoc(collection(db, 'aiRules'), { ...payload, createdAt: serverTimestamp() });
      } else {
        await updateDoc(doc(db, 'aiRules', editingId), payload);
      }
      cancel();
    } catch (err) {
      console.error('Failed to save rule:', err);
      alert(`Failed to save rule: ${err.message || err}`);
    } finally {
      setSaving(false);
    }
  };

  const remove = async (rule) => {
    if (!confirm(`Delete rule "${rule.name}"?`)) return;
    try {
      await deleteDoc(doc(db, 'aiRules', rule.id));
    } catch (err) {
      console.error('Failed to delete rule:', err);
      alert(`Failed to delete: ${err.message || err}`);
    }
  };

  const toggleEnabled = async (rule) => {
    try {
      await updateDoc(doc(db, 'aiRules', rule.id), {
        enabled: rule.enabled === false,
        updatedAt: serverTimestamp(),
      });
    } catch (err) {
      console.error('Failed to toggle rule:', err);
    }
  };

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <p className="text-xs text-slate-500 dark:text-slate-400 max-w-md">
          A rule maps <strong>trigger phrases</strong> in your request to a set of{' '}
          <strong>filters</strong> (category / brand / part no. / text) that pick real parts from
          your library.
        </p>
        {editingId === null && (
          <button
            onClick={startNew}
            className="inline-flex items-center gap-1.5 px-3 py-2 rounded-xl bg-gradient-to-r from-indigo-600 to-violet-700 text-white text-xs font-semibold shadow-glow-indigo hover:shadow-lg transition flex-shrink-0"
          >
            <Plus className="w-3.5 h-3.5" strokeWidth={2.5} /> New rule
          </button>
        )}
      </div>

      {editingId !== null && (
        <div className="card p-4 space-y-3">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <Field label="Rule name" required>
              <input
                autoFocus
                value={form.name}
                onChange={(e) => setForm({ ...form, name: e.target.value })}
                placeholder="e.g. Standard PLC panel"
                className={inputClass}
              />
            </Field>
            <Field label="Default quantity">
              <input
                type="number"
                min="1"
                value={form.defaultQty}
                onChange={(e) => setForm({ ...form, defaultQty: e.target.value })}
                className={inputClass}
              />
            </Field>
          </div>

          <Field
            label="Trigger phrases"
            required
            hint="Comma-separated. The rule fires when the request contains any of these."
          >
            <input
              value={form.triggers}
              onChange={(e) => setForm({ ...form, triggers: e.target.value })}
              placeholder="plc, controller, cpu module"
              className={inputClass}
            />
          </Field>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <Field label="Filter · Categories" hint="Comma-separated. OR within field.">
              <input
                list="teach-categories"
                value={form.categories}
                onChange={(e) => setForm({ ...form, categories: e.target.value })}
                placeholder="PLC, HMI"
                className={inputClass}
              />
              <datalist id="teach-categories">
                {availableCategories.map((c) => (
                  <option key={c} value={c} />
                ))}
              </datalist>
            </Field>
            <Field label="Filter · Brands" hint="Comma-separated.">
              <input
                list="teach-brands"
                value={form.brands}
                onChange={(e) => setForm({ ...form, brands: e.target.value })}
                placeholder="Mitsubishi, Omron"
                className={inputClass}
              />
              <datalist id="teach-brands">
                {availableBrands.map((b) => (
                  <option key={b} value={b} />
                ))}
              </datalist>
            </Field>
            <Field label="Filter · Part numbers" hint="Exact part numbers, comma-separated.">
              <input
                value={form.partNos}
                onChange={(e) => setForm({ ...form, partNos: e.target.value })}
                placeholder="FX5U-32MR"
                className={inputClass}
              />
            </Field>
            <Field label="Filter · Description contains" hint="Any word/phrase in the description.">
              <input
                value={form.textIncludes}
                onChange={(e) => setForm({ ...form, textIncludes: e.target.value })}
                placeholder="shielded, 24vdc"
                className={inputClass}
              />
            </Field>
          </div>

          <Field
            label="Ask before selecting"
            hint="If ticked and the request doesn't specify it, the AI asks you first instead of guessing."
          >
            <div className="flex flex-wrap gap-2">
              {REQUIRE_OPTIONS.map((opt) => {
                const on = form.requires.includes(opt.key);
                return (
                  <button
                    key={opt.key}
                    type="button"
                    onClick={() => toggleRequire(opt.key)}
                    className={`px-3 py-1.5 rounded-lg text-xs font-semibold border transition ${
                      on
                        ? 'bg-indigo-600 border-indigo-600 text-white'
                        : 'bg-white dark:bg-slate-800 border-slate-200 dark:border-slate-700 text-slate-600 dark:text-slate-300'
                    }`}
                  >
                    {opt.label}
                  </button>
                );
              })}
            </div>
          </Field>

          <Field
            label="Official reference / note"
            hint="Shown as a citation so the reason for each pick is traceable."
          >
            <textarea
              rows={2}
              value={form.note}
              onChange={(e) => setForm({ ...form, note: e.target.value })}
              placeholder="e.g. Per company standard EE-STD-04, every panel uses one CPU."
              className={inputClass}
            />
          </Field>

          <label className="flex items-center gap-2 text-xs font-semibold text-slate-600 dark:text-slate-300 select-none cursor-pointer">
            <input
              type="checkbox"
              checked={form.enabled}
              onChange={(e) => setForm({ ...form, enabled: e.target.checked })}
              className="w-4 h-4 rounded accent-indigo-600"
            />
            Rule enabled
          </label>

          <div className="flex justify-end gap-2 pt-2 border-t border-slate-100 dark:border-slate-800">
            <button
              onClick={cancel}
              className="px-4 py-2 text-sm font-semibold rounded-xl text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800 transition"
            >
              Cancel
            </button>
            <button
              onClick={save}
              disabled={saving}
              className="inline-flex items-center gap-2 px-4 py-2 text-sm font-semibold rounded-xl bg-gradient-to-r from-indigo-600 to-violet-700 text-white shadow-glow-indigo disabled:opacity-50 transition"
            >
              <Save className="w-4 h-4" /> {saving ? 'Saving…' : 'Save rule'}
            </button>
          </div>
        </div>
      )}

      {rules.length === 0 && editingId === null ? (
        <div className="card p-10 text-center">
          <p className="text-sm text-slate-500 dark:text-slate-400">
            No rules yet. Teach your first rule so the assistant can start selecting parts.
          </p>
        </div>
      ) : (
        <div className="space-y-2">
          {rules.map((rule) => (
            <div
              key={rule.id}
              className="card p-3.5 flex items-start justify-between gap-3"
            >
              <div className="min-w-0">
                <div className="flex items-center gap-2 flex-wrap">
                  <span className="font-semibold text-sm text-slate-900 dark:text-white">
                    {rule.name}
                  </span>
                  {rule.enabled === false && (
                    <span className="text-[10px] font-bold uppercase tracking-wider px-1.5 py-0.5 rounded bg-slate-200 dark:bg-slate-700 text-slate-500 dark:text-slate-400">
                      Disabled
                    </span>
                  )}
                </div>
                <div className="mt-1 flex flex-wrap gap-1">
                  {(rule.triggers || []).map((t) => (
                    <span
                      key={t}
                      className="text-[10px] font-medium px-1.5 py-0.5 rounded bg-indigo-50 dark:bg-indigo-500/15 text-indigo-700 dark:text-indigo-300"
                    >
                      {t}
                    </span>
                  ))}
                </div>
                <p className="mt-1.5 text-[11px] text-slate-500 dark:text-slate-400 truncate">
                  {describeFilters(rule.filters)}
                  {rule.requires?.length ? ` · asks: ${rule.requires.join(', ')}` : ''}
                </p>
              </div>
              <div className="flex items-center gap-1 flex-shrink-0">
                <button
                  onClick={() => toggleEnabled(rule)}
                  title={rule.enabled === false ? 'Enable' : 'Disable'}
                  className="p-1.5 rounded-lg text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800 hover:text-slate-600 dark:hover:text-slate-300 transition text-[10px] font-bold uppercase tracking-wide"
                >
                  {rule.enabled === false ? 'On' : 'Off'}
                </button>
                <button
                  onClick={() => startEdit(rule)}
                  className="p-1.5 rounded-lg text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800 hover:text-indigo-600 dark:hover:text-indigo-400 transition"
                  aria-label="Edit"
                >
                  <Pencil className="w-4 h-4" />
                </button>
                <button
                  onClick={() => remove(rule)}
                  className="p-1.5 rounded-lg text-slate-400 hover:bg-rose-50 dark:hover:bg-rose-500/15 hover:text-rose-600 dark:hover:text-rose-400 transition"
                  aria-label="Delete"
                >
                  <Trash2 className="w-4 h-4" />
                </button>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

function describeFilters(filters) {
  const f = filters || {};
  const parts = [];
  if (f.categories?.length) parts.push(`cat: ${f.categories.join('/')}`);
  if (f.brands?.length) parts.push(`brand: ${f.brands.join('/')}`);
  if (f.partNos?.length) parts.push(`part#: ${f.partNos.join('/')}`);
  if (f.textIncludes?.length) parts.push(`text: ${f.textIncludes.join('/')}`);
  return parts.length ? parts.join(' · ') : 'No filters set (matches nothing)';
}

/* --------------------------- Knowledge --------------------------- */

function KnowledgeTab({ knowledge }) {
  const [editingId, setEditingId] = useState(null);
  const [form, setForm] = useState(emptyKnowledgeForm);
  const [saving, setSaving] = useState(false);

  const startNew = () => {
    setForm(emptyKnowledgeForm);
    setEditingId('new');
  };
  const startEdit = (k) => {
    setForm({ title: k.title || '', content: k.content || '', source: k.source || '' });
    setEditingId(k.id);
  };
  const cancel = () => {
    setEditingId(null);
    setForm(emptyKnowledgeForm);
  };

  const save = async () => {
    if (!form.title.trim() || !form.content.trim()) {
      alert('Title and content are required.');
      return;
    }
    const payload = {
      title: form.title.trim(),
      content: form.content.trim(),
      source: form.source.trim(),
      updatedAt: serverTimestamp(),
    };
    setSaving(true);
    try {
      if (editingId === 'new') {
        await addDoc(collection(db, 'aiKnowledge'), { ...payload, createdAt: serverTimestamp() });
      } else {
        await updateDoc(doc(db, 'aiKnowledge', editingId), payload);
      }
      cancel();
    } catch (err) {
      console.error('Failed to save knowledge:', err);
      alert(`Failed to save: ${err.message || err}`);
    } finally {
      setSaving(false);
    }
  };

  const remove = async (k) => {
    if (!confirm(`Delete knowledge "${k.title}"?`)) return;
    try {
      await deleteDoc(doc(db, 'aiKnowledge', k.id));
    } catch (err) {
      console.error('Failed to delete knowledge:', err);
    }
  };

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <p className="text-xs text-slate-500 dark:text-slate-400 max-w-md">
          Official facts &amp; standards the AI may cite. Entries whose title words appear in your
          request are shown as references alongside the results.
        </p>
        {editingId === null && (
          <button
            onClick={startNew}
            className="inline-flex items-center gap-1.5 px-3 py-2 rounded-xl bg-gradient-to-r from-indigo-600 to-violet-700 text-white text-xs font-semibold shadow-glow-indigo hover:shadow-lg transition flex-shrink-0"
          >
            <Plus className="w-3.5 h-3.5" strokeWidth={2.5} /> New entry
          </button>
        )}
      </div>

      {editingId !== null && (
        <div className="card p-4 space-y-3">
          <Field label="Title" required>
            <input
              autoFocus
              value={form.title}
              onChange={(e) => setForm({ ...form, title: e.target.value })}
              placeholder="e.g. Breaker sizing standard"
              className={inputClass}
            />
          </Field>
          <Field label="Content" required>
            <textarea
              rows={4}
              value={form.content}
              onChange={(e) => setForm({ ...form, content: e.target.value })}
              placeholder="The official guidance the AI should reference…"
              className={inputClass}
            />
          </Field>
          <Field label="Source" hint="Where this comes from (standard no., document, URL).">
            <input
              value={form.source}
              onChange={(e) => setForm({ ...form, source: e.target.value })}
              placeholder="e.g. IEC 60947 / internal EE-STD-04"
              className={inputClass}
            />
          </Field>
          <div className="flex justify-end gap-2 pt-2 border-t border-slate-100 dark:border-slate-800">
            <button
              onClick={cancel}
              className="px-4 py-2 text-sm font-semibold rounded-xl text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800 transition"
            >
              Cancel
            </button>
            <button
              onClick={save}
              disabled={saving}
              className="inline-flex items-center gap-2 px-4 py-2 text-sm font-semibold rounded-xl bg-gradient-to-r from-indigo-600 to-violet-700 text-white shadow-glow-indigo disabled:opacity-50 transition"
            >
              <Save className="w-4 h-4" /> {saving ? 'Saving…' : 'Save entry'}
            </button>
          </div>
        </div>
      )}

      {knowledge.length === 0 && editingId === null ? (
        <div className="card p-10 text-center">
          <p className="text-sm text-slate-500 dark:text-slate-400">
            No knowledge entries yet.
          </p>
        </div>
      ) : (
        <div className="space-y-2">
          {knowledge.map((k) => (
            <div key={k.id} className="card p-3.5 flex items-start justify-between gap-3">
              <div className="min-w-0">
                <span className="font-semibold text-sm text-slate-900 dark:text-white">
                  {k.title}
                </span>
                <p className="mt-1 text-[11px] text-slate-500 dark:text-slate-400 line-clamp-2">
                  {k.content}
                </p>
                {k.source && (
                  <p className="mt-1 text-[10px] font-semibold uppercase tracking-wider text-indigo-500 dark:text-indigo-400">
                    {k.source}
                  </p>
                )}
              </div>
              <div className="flex items-center gap-1 flex-shrink-0">
                <button
                  onClick={() => startEdit(k)}
                  className="p-1.5 rounded-lg text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800 hover:text-indigo-600 dark:hover:text-indigo-400 transition"
                  aria-label="Edit"
                >
                  <Pencil className="w-4 h-4" />
                </button>
                <button
                  onClick={() => remove(k)}
                  className="p-1.5 rounded-lg text-slate-400 hover:bg-rose-50 dark:hover:bg-rose-500/15 hover:text-rose-600 dark:hover:text-rose-400 transition"
                  aria-label="Delete"
                >
                  <Trash2 className="w-4 h-4" />
                </button>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

/* ----------------------------- shared ----------------------------- */

function Field({ label, required, hint, children }) {
  return (
    <div>
      <label className="flex items-center gap-1.5 text-[10px] font-bold uppercase tracking-[0.16em] text-slate-500 dark:text-slate-400 mb-1.5">
        <span>{label}</span>
        {required && <span className="text-rose-500">*</span>}
      </label>
      {children}
      {hint && (
        <p className="mt-1 text-[10px] font-medium text-slate-400 dark:text-slate-500">{hint}</p>
      )}
    </div>
  );
}
