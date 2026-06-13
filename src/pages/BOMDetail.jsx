import { useContext, useMemo, useState } from 'react';
import { Link, useNavigate, useParams } from 'react-router-dom';
import {
  ArrowLeft,
  Plus,
  Trash2,
  Pencil,
  Save,
  FileStack,
  ClipboardList,
} from 'lucide-react';
import { deleteDoc, doc, serverTimestamp, updateDoc, addDoc, collection } from 'firebase/firestore';
import { DataContext } from '../App.jsx';
import { db } from '../firebase.js';
import PartPickerModal from '../components/PartPickerModal.jsx';
import BOMFormModal from '../components/BOMFormModal.jsx';
import { buildPartsById, resolveItems } from '../lib/resolveItems.js';

const baht = (n) =>
  '฿' + n.toLocaleString('en-US', { minimumFractionDigits: 0, maximumFractionDigits: 0 });

export default function BOMDetail() {
  const { id } = useParams();
  const { boms, parts } = useContext(DataContext);
  const navigate = useNavigate();
  const bom = boms.find((b) => b.id === id);

  const [showPicker, setShowPicker] = useState(false);
  const [showEdit, setShowEdit] = useState(false);
  const [showSaveTpl, setShowSaveTpl] = useState(false);

  const partsById = useMemo(() => buildPartsById(parts), [parts]);
  const resolvedItems = useMemo(
    () => resolveItems(bom?.items, partsById),
    [bom?.items, partsById]
  );

  const total = useMemo(
    () => resolvedItems.reduce((s, it) => s + (it.price || 0) * (it.qty || 1), 0),
    [resolvedItems]
  );

  if (!bom) {
    return (
      <div className="px-6 lg:px-10 py-8 max-w-[1500px] mx-auto">
        <div className="card p-16 text-center">
          <p className="text-sm font-medium text-slate-600 dark:text-slate-300">
            BOM not found. It may have been deleted.
          </p>
          <Link
            to="/boms"
            className="inline-flex items-center gap-2 mt-4 px-4 py-2 rounded-xl bg-indigo-600 text-white text-sm font-semibold"
          >
            <ArrowLeft className="w-4 h-4" /> Back to BOMs
          </Link>
        </div>
      </div>
    );
  }

  const items = bom.items || [];

  const slimItems = (list) =>
    list.map((it) => ({ partId: it.partId, qty: it.qty || 1 }));

  const persistItems = async (next) => {
    await updateDoc(doc(db, 'boms', bom.id), {
      items: slimItems(next),
      updatedAt: serverTimestamp(),
    });
  };

  const handleAddItems = async (newItems) => {
    await persistItems([...items, ...newItems]);
    setShowPicker(false);
  };

  const handleQtyChange = async (idx, qty) => {
    const n = parseInt(qty, 10);
    const safe = Number.isFinite(n) && n > 0 ? n : 1;
    const next = items.map((it, i) => (i === idx ? { ...it, qty: safe } : it));
    await persistItems(next);
  };

  const handleRemove = async (idx) => {
    if (!confirm('Remove this item from the BOM?')) return;
    const next = items.filter((_, i) => i !== idx);
    await persistItems(next);
  };

  const handleEditHeader = async (data) => {
    const { templateId: _ignore, ...rest } = data;
    await updateDoc(doc(db, 'boms', bom.id), { ...rest, updatedAt: serverTimestamp() });
    setShowEdit(false);
  };

  const handleDeleteBom = async () => {
    if (!confirm(`Delete BOM "${bom.bomNo} — ${bom.bomName}"?`)) return;
    await deleteDoc(doc(db, 'boms', bom.id));
    navigate('/boms');
  };

  const handleSaveTemplate = async (name) => {
    const trimmed = name.trim();
    if (!trimmed) return;
    await addDoc(collection(db, 'bomTemplates'), {
      name: trimmed,
      description: `From BOM ${bom.bomNo} — ${bom.bomName}`,
      items: slimItems(items),
      createdAt: serverTimestamp(),
    });
    setShowSaveTpl(false);
    alert(`Saved template "${trimmed}" with ${items.length} item(s).`);
  };

  return (
    <div className="px-6 lg:px-10 py-8 max-w-[1500px] mx-auto">
      <Link
        to="/boms"
        className="inline-flex items-center gap-1.5 text-xs font-semibold text-slate-500 dark:text-slate-400 hover:text-indigo-600 dark:hover:text-indigo-400 mb-4"
      >
        <ArrowLeft className="w-3.5 h-3.5" /> All BOMs
      </Link>

      <div className="relative overflow-hidden rounded-3xl bg-gradient-to-br from-indigo-600 via-indigo-700 to-violet-700 text-white p-6 shadow-glow-indigo mb-6">
        <div className="pointer-events-none absolute -top-24 -right-24 w-64 h-64 rounded-full bg-white/15 blur-3xl"></div>
        <div className="pointer-events-none absolute -bottom-24 -left-16 w-56 h-56 rounded-full bg-violet-300/20 blur-3xl"></div>
        <div className="relative z-10 flex flex-col lg:flex-row lg:items-center lg:justify-between gap-4">
          <div>
            <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-white/10 backdrop-blur-md border border-white/20 text-[10px] font-semibold uppercase tracking-[0.18em] mb-3">
              <ClipboardList className="w-3 h-3" />
              BOM
            </span>
            <h2 className="text-2xl font-extrabold tracking-tight mb-2">
              {bom.bomNo} — {bom.bomName}
            </h2>
            <div className="text-sm text-indigo-100/90 space-x-4">
              <span>
                <strong className="font-semibold">Project:</strong> {bom.projectNo} — {bom.projectName}
              </span>
              <span>
                <strong className="font-semibold">Items:</strong> {items.length}
              </span>
              <span>
                <strong className="font-semibold">Value:</strong> {baht(total)}
              </span>
            </div>
            {bom.notes && (
              <p className="mt-2 text-xs text-indigo-100/80 max-w-2xl">{bom.notes}</p>
            )}
          </div>
          <div className="flex flex-wrap gap-2">
            <button
              onClick={() => setShowEdit(true)}
              className="inline-flex items-center gap-2 px-3 py-2 rounded-xl bg-white/10 hover:bg-white/20 border border-white/20 text-xs font-semibold transition"
            >
              <Pencil className="w-3.5 h-3.5" /> Edit
            </button>
            <button
              onClick={() => setShowSaveTpl(true)}
              disabled={items.length === 0}
              className="inline-flex items-center gap-2 px-3 py-2 rounded-xl bg-white/10 hover:bg-white/20 border border-white/20 text-xs font-semibold transition disabled:opacity-50"
            >
              <FileStack className="w-3.5 h-3.5" /> Save as template
            </button>
            <button
              onClick={handleDeleteBom}
              className="inline-flex items-center gap-2 px-3 py-2 rounded-xl bg-rose-500/80 hover:bg-rose-500 text-xs font-semibold transition"
            >
              <Trash2 className="w-3.5 h-3.5" /> Delete
            </button>
          </div>
        </div>
      </div>

      <div className="flex items-center justify-between gap-3 mb-4 flex-wrap">
        <h3 className="text-lg font-bold tracking-tight text-slate-900 dark:text-white">
          Items <span className="text-slate-400 dark:text-slate-500 font-medium">· {items.length}</span>
        </h3>
        <button
          onClick={() => setShowPicker(true)}
          className="group inline-flex items-center gap-2 px-4 py-2.5 rounded-xl bg-gradient-to-r from-indigo-600 to-violet-700 text-white text-sm font-semibold shadow-glow-indigo hover:shadow-lg hover:-translate-y-px transition-all"
        >
          <Plus className="w-4 h-4" strokeWidth={2.5} />
          Add items from library
        </button>
      </div>

      {items.length === 0 ? (
        <div className="card p-16 text-center">
          <p className="text-sm font-medium text-slate-600 dark:text-slate-300 mb-4">
            No items yet. Add some from the parts library.
          </p>
          <button
            onClick={() => setShowPicker(true)}
            className="inline-flex items-center gap-2 px-4 py-2 rounded-xl bg-indigo-600 text-white text-sm font-semibold"
          >
            <Plus className="w-4 h-4" /> Add items
          </button>
        </div>
      ) : (
        <div className="card overflow-hidden">
          <div className="overflow-x-auto scrollbar-thin">
            <table className="w-full">
              <thead>
                <tr className="border-b border-slate-200 dark:border-slate-800 bg-slate-50/60 dark:bg-slate-900/60">
                  <Th className="w-12" align="center">#</Th>
                  <Th>Description</Th>
                  <Th>Part No.</Th>
                  <Th>Brand</Th>
                  <Th>Category</Th>
                  <Th align="center" className="w-24">Qty</Th>
                  <Th align="right">Unit price</Th>
                  <Th align="right">Subtotal</Th>
                  <Th align="center" className="w-12"></Th>
                </tr>
              </thead>
              <tbody>
                {resolvedItems.map((it, idx) => {
                  const subtotal = (it.price || 0) * (it.qty || 1);
                  return (
                    <tr
                      key={`${it.partId}-${idx}`}
                      className={`border-b border-slate-100 dark:border-slate-800/70 last:border-0 hover:bg-slate-50/80 dark:hover:bg-slate-800/40 transition-colors group ${
                        it.missing ? 'bg-rose-50/40 dark:bg-rose-500/5' : ''
                      }`}
                    >
                      <Td align="center" className="text-slate-400 dark:text-slate-500">{idx + 1}</Td>
                      <Td>
                        {it.missing ? (
                          <span className="font-medium italic text-rose-600 dark:text-rose-400">
                            Part removed from library
                          </span>
                        ) : (
                          <span className="font-medium text-slate-900 dark:text-slate-100">
                            {it.description}
                          </span>
                        )}
                      </Td>
                      <Td className="font-mono text-slate-700 dark:text-slate-300">{it.partNo || <span className="text-slate-300 dark:text-slate-700">—</span>}</Td>
                      <Td>{it.brand || <span className="text-slate-300 dark:text-slate-700">—</span>}</Td>
                      <Td>
                        {it.category ? (
                          <span className="inline-flex items-center px-2 py-0.5 rounded-md text-[11px] font-semibold bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300">
                            {it.category}
                          </span>
                        ) : (
                          <span className="text-slate-300 dark:text-slate-700">—</span>
                        )}
                      </Td>
                      <Td align="center">
                        <input
                          type="number"
                          min="1"
                          value={it.qty || 1}
                          onChange={(e) => handleQtyChange(idx, e.target.value)}
                          className="w-16 px-2 py-1 text-sm text-center bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded focus:outline-none focus:ring-2 focus:ring-indigo-500"
                        />
                      </Td>
                      <Td align="right" className="font-mono tabular-nums">
                        {it.price != null ? (
                          it.price.toLocaleString('en-US', { minimumFractionDigits: 2 })
                        ) : (
                          <span className="text-slate-300 dark:text-slate-700">—</span>
                        )}
                      </Td>
                      <Td align="right" className="font-mono tabular-nums font-semibold text-emerald-600 dark:text-emerald-400">
                        {subtotal > 0
                          ? subtotal.toLocaleString('en-US', { minimumFractionDigits: 2 })
                          : '—'}
                      </Td>
                      <Td align="center">
                        <button
                          onClick={() => handleRemove(idx)}
                          className="p-1.5 rounded-md text-slate-300 dark:text-slate-600 hover:bg-rose-50 dark:hover:bg-rose-500/15 hover:text-rose-600 dark:hover:text-rose-400 transition opacity-0 group-hover:opacity-100"
                          aria-label="Remove"
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                      </Td>
                    </tr>
                  );
                })}
              </tbody>
              <tfoot>
                <tr className="bg-slate-50/60 dark:bg-slate-900/60 border-t border-slate-200 dark:border-slate-800">
                  <td colSpan={7} className="px-5 py-3 text-right text-xs font-bold uppercase tracking-[0.16em] text-slate-500 dark:text-slate-400">
                    Total
                  </td>
                  <td className="px-5 py-3 text-right font-mono tabular-nums font-bold text-emerald-600 dark:text-emerald-400">
                    {baht(total)}
                  </td>
                  <td></td>
                </tr>
              </tfoot>
            </table>
          </div>
        </div>
      )}

      {showPicker && (
        <PartPickerModal
          existingPartIds={items.map((it) => it.partId)}
          onAdd={handleAddItems}
          onCancel={() => setShowPicker(false)}
        />
      )}
      {showEdit && (
        <BOMFormModal
          initial={bom}
          showTemplate={false}
          title="Edit BOM"
          submitLabel="Save changes"
          onSubmit={handleEditHeader}
          onCancel={() => setShowEdit(false)}
        />
      )}
      {showSaveTpl && (
        <SaveTemplatePrompt
          defaultName={bom.bomName}
          onCancel={() => setShowSaveTpl(false)}
          onSave={handleSaveTemplate}
        />
      )}
    </div>
  );
}

function SaveTemplatePrompt({ defaultName, onSave, onCancel }) {
  const [name, setName] = useState(defaultName || '');
  return (
    <div
      className="fixed inset-0 z-50 bg-slate-900/40 backdrop-blur-sm flex items-center justify-center p-4"
      onClick={onCancel}
    >
      <div
        className="bg-white dark:bg-slate-900 rounded-2xl shadow-2xl w-full max-w-sm p-6 border border-slate-200 dark:border-slate-800"
        onClick={(e) => e.stopPropagation()}
      >
        <h4 className="text-base font-extrabold tracking-tight text-slate-900 dark:text-white mb-1">
          Save as template
        </h4>
        <p className="text-xs text-slate-500 dark:text-slate-400 mb-4">
          Items will be copied into a reusable template.
        </p>
        <input
          autoFocus
          value={name}
          onChange={(e) => setName(e.target.value)}
          placeholder="Template name"
          className="w-full px-3 py-2.5 text-sm bg-slate-50 dark:bg-slate-800 text-slate-900 dark:text-slate-100 rounded-xl border border-slate-200 dark:border-slate-700 focus:outline-none focus:ring-2 focus:ring-indigo-500 mb-4"
        />
        <div className="flex justify-end gap-2">
          <button
            onClick={onCancel}
            className="px-4 py-2 text-sm font-semibold rounded-xl text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800 transition"
          >
            Cancel
          </button>
          <button
            onClick={() => onSave(name)}
            disabled={!name.trim()}
            className="inline-flex items-center gap-2 px-4 py-2 text-sm font-semibold rounded-xl bg-gradient-to-r from-indigo-600 to-violet-700 text-white shadow-glow-indigo disabled:opacity-50"
          >
            <Save className="w-4 h-4" /> Save template
          </button>
        </div>
      </div>
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
