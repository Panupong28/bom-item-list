import { useContext, useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import {
  Search,
  Plus,
  Pencil,
  Trash2,
  ClipboardList,
  FileStack,
  Package,
  ChevronRight,
  FolderOpen,
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
import BOMFormModal from '../components/BOMFormModal.jsx';
import { filterBoms, groupBomsByProject } from '../lib/groupBoms.js';

export default function BOMsView() {
  const { boms, templates, parts } = useContext(DataContext);
  const [search, setSearch] = useState('');
  const [showCreate, setShowCreate] = useState(false);
  const [editTarget, setEditTarget] = useState(null);
  const [expanded, setExpanded] = useState({});

  const filtered = useMemo(() => filterBoms(boms, search), [boms, search]);

  const groups = useMemo(() => groupBomsByProject(filtered), [filtered]);

  const toggleGroup = (key) =>
    setExpanded((prev) => ({ ...prev, [key]: !prev[key] }));

  const searching = !!search.trim();

  const handleCreate = async (data) => {
    const { templateId, ...rest } = data;
    let items = [];
    if (templateId) {
      const tpl = templates.find((t) => t.id === templateId);
      if (tpl?.items?.length) {
        items = tpl.items.map((it) => ({ partId: it.partId, qty: it.qty || 1 }));
      }
    }
    await addDoc(collection(db, 'boms'), {
      ...rest,
      items,
      createdAt: serverTimestamp(),
      updatedAt: serverTimestamp(),
    });
    setShowCreate(false);
  };

  const handleEdit = async (data) => {
    if (!editTarget) return;
    const { templateId: _ignore, ...rest } = data;
    await updateDoc(doc(db, 'boms', editTarget.id), {
      ...rest,
      updatedAt: serverTimestamp(),
    });
    setEditTarget(null);
  };

  const handleDelete = async (b) => {
    if (!confirm(`Delete BOM "${b.bomNo} — ${b.bomName}"?`)) return;
    await deleteDoc(doc(db, 'boms', b.id));
  };

  return (
    <div className="px-6 lg:px-10 py-8 max-w-[1500px] mx-auto">
      <div className="grid grid-cols-1 lg:grid-cols-4 gap-4 mb-6">
        <div className="lg:col-span-2 relative overflow-hidden rounded-3xl bg-gradient-to-br from-indigo-600 via-indigo-700 to-violet-700 text-white p-6 shadow-glow-indigo">
          <div className="pointer-events-none absolute -top-24 -right-24 w-64 h-64 rounded-full bg-white/15 blur-3xl"></div>
          <div className="pointer-events-none absolute -bottom-24 -left-16 w-56 h-56 rounded-full bg-violet-300/20 blur-3xl"></div>
          <div className="relative z-10">
            <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-white/10 backdrop-blur-md border border-white/20 text-[10px] font-semibold uppercase tracking-[0.18em] mb-6">
              <ClipboardList className="w-3 h-3" />
              BOMs
            </span>
            <div className="flex items-baseline gap-2 mb-2">
              <span className="text-5xl font-extrabold tracking-tight">{boms.length}</span>
              <span className="text-sm font-medium text-indigo-200">total</span>
            </div>
            <p className="text-sm text-indigo-100/90 leading-relaxed">
              Manage project bills of materials. Each BOM is anchored to a project and pulls items
              from your parts library.
            </p>
          </div>
        </div>

        <StatCard
          label="Templates"
          value={templates.length}
          icon={<FileStack className="w-4 h-4" />}
          accent="text-indigo-600 bg-indigo-50 dark:bg-indigo-500/15 dark:text-indigo-300"
          to="/templates"
        />
        <StatCard
          label="Parts library"
          value={parts.length}
          icon={<Package className="w-4 h-4" />}
          accent="text-emerald-600 bg-emerald-50 dark:bg-emerald-500/15 dark:text-emerald-300"
          to="/"
        />
      </div>

      <div className="flex items-center justify-between gap-3 mb-4 flex-wrap">
        <div className="relative flex-1 min-w-[260px] max-w-md">
          <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400 dark:text-slate-500" />
          <input
            type="text"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search project no, project name, BOM no, BOM name…"
            className="w-full pl-10 pr-3 py-2.5 text-sm bg-white dark:bg-slate-900 text-slate-900 dark:text-slate-100 border border-slate-200 dark:border-slate-800 rounded-xl shadow-soft-sm placeholder:text-slate-400 dark:placeholder:text-slate-500 focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-transparent"
          />
        </div>
        <button
          onClick={() => setShowCreate(true)}
          className="group inline-flex items-center gap-2 px-4 py-2.5 rounded-xl bg-gradient-to-r from-indigo-600 to-violet-700 text-white text-sm font-semibold shadow-glow-indigo hover:shadow-lg hover:-translate-y-px transition-all"
        >
          <Plus className="w-4 h-4" strokeWidth={2.5} />
          New BOM
        </button>
      </div>

      {filtered.length === 0 ? (
        <div className="card p-16 text-center">
          <div className="inline-flex items-center justify-center w-12 h-12 rounded-xl bg-slate-100 dark:bg-slate-800 mb-4">
            <ClipboardList className="w-6 h-6 text-slate-400 dark:text-slate-500" />
          </div>
          <p className="text-sm font-medium text-slate-600 dark:text-slate-300">
            {boms.length === 0 ? 'No BOMs yet. Click "New BOM" to create one.' : 'No BOMs match your search.'}
          </p>
        </div>
      ) : (
        <div className="space-y-3">
          {groups.map((g) => {
            const isOpen = searching || !!expanded[g.key];
            return (
              <div key={g.key} className="card overflow-hidden">
                <button
                  type="button"
                  onClick={() => toggleGroup(g.key)}
                  className="w-full flex items-center gap-3 px-5 py-4 text-left hover:bg-slate-50/80 dark:hover:bg-slate-800/40 transition-colors"
                >
                  <ChevronRight
                    className={`w-4 h-4 text-slate-400 dark:text-slate-500 flex-shrink-0 transition-transform ${
                      isOpen ? 'rotate-90' : ''
                    }`}
                    strokeWidth={2.5}
                  />
                  <span className="p-2 rounded-lg bg-indigo-50 dark:bg-indigo-500/15 text-indigo-600 dark:text-indigo-300 flex-shrink-0">
                    <FolderOpen className="w-4 h-4" />
                  </span>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-baseline gap-2">
                      <span className="font-mono text-xs font-semibold text-slate-500 dark:text-slate-400">
                        {g.projectNo || '—'}
                      </span>
                    </div>
                    <div className="font-semibold text-slate-900 dark:text-slate-100 truncate">
                      {g.projectName || 'Untitled project'}
                    </div>
                  </div>
                  <span className="inline-flex items-center px-2.5 py-1 rounded-full text-[11px] font-semibold bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300 flex-shrink-0">
                    {g.boms.length} BOM{g.boms.length === 1 ? '' : 's'}
                  </span>
                </button>
                {isOpen && (
                  <div className="border-t border-slate-100 dark:border-slate-800 overflow-x-auto scrollbar-thin">
                    <table className="w-full">
                      <thead>
                        <tr className="border-b border-slate-200 dark:border-slate-800 bg-slate-50/60 dark:bg-slate-900/60">
                          <Th>BOM No.</Th>
                          <Th>BOM Name</Th>
                          <Th align="right">Items</Th>
                          <Th align="center" className="w-24">Actions</Th>
                        </tr>
                      </thead>
                      <tbody>
                        {g.boms.map((b) => (
                          <tr
                            key={b.id}
                            className="border-b border-slate-100 dark:border-slate-800/70 last:border-0 hover:bg-slate-50/80 dark:hover:bg-slate-800/40 transition-colors group"
                          >
                            <Td className="font-mono text-slate-700 dark:text-slate-300">{b.bomNo}</Td>
                            <Td>
                              <Link
                                to={`/boms/${b.id}`}
                                className="font-medium text-slate-900 dark:text-slate-100 hover:text-indigo-600 dark:hover:text-indigo-400"
                              >
                                {b.bomName}
                              </Link>
                            </Td>
                            <Td align="right" className="tabular-nums">
                              <span className="inline-flex items-center px-2 py-0.5 rounded-md text-[11px] font-semibold bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300">
                                {b.items?.length || 0}
                              </span>
                            </Td>
                            <Td align="center">
                              <div className="inline-flex gap-1 opacity-0 group-hover:opacity-100 transition">
                                <button
                                  onClick={() => setEditTarget(b)}
                                  className="p-1.5 rounded-md text-slate-400 dark:text-slate-500 hover:bg-indigo-50 dark:hover:bg-indigo-500/15 hover:text-indigo-600 dark:hover:text-indigo-400 transition"
                                  aria-label="Edit"
                                >
                                  <Pencil className="w-4 h-4" />
                                </button>
                                <button
                                  onClick={() => handleDelete(b)}
                                  className="p-1.5 rounded-md text-slate-400 dark:text-slate-500 hover:bg-rose-50 dark:hover:bg-rose-500/15 hover:text-rose-600 dark:hover:text-rose-400 transition"
                                  aria-label="Delete"
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
                )}
              </div>
            );
          })}
          <div className="px-1">
            <span className="micro-label">
              {groups.length} project{groups.length === 1 ? '' : 's'} · {filtered.length} of {boms.length} BOMs
            </span>
          </div>
        </div>
      )}

      {showCreate && (
        <BOMFormModal
          templates={templates}
          title="New BOM"
          submitLabel="Create BOM"
          onSubmit={handleCreate}
          onCancel={() => setShowCreate(false)}
        />
      )}
      {editTarget && (
        <BOMFormModal
          initial={editTarget}
          showTemplate={false}
          title="Edit BOM"
          submitLabel="Save changes"
          onSubmit={handleEdit}
          onCancel={() => setEditTarget(null)}
        />
      )}
    </div>
  );
}

function StatCard({ label, value, icon, accent, to }) {
  const inner = (
    <div className="card p-5 hover:-translate-y-0.5 hover:shadow-soft-md transition-all duration-200 h-full">
      <div className="flex items-center justify-between mb-3">
        <span className="micro-label">{label}</span>
        <span className={`p-1.5 rounded-lg ${accent}`}>{icon}</span>
      </div>
      <div className="text-2xl font-extrabold tracking-tight text-slate-900 dark:text-white">
        {value}
      </div>
    </div>
  );
  return to ? <Link to={to}>{inner}</Link> : inner;
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
