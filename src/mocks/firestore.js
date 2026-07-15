// In-memory Firestore shim for local/container testing WITHOUT a real backend.
//
// It implements only the tiny slice of the Firestore modular API that this app
// actually uses (see the survey in the repo history). It is wired in via a Vite
// alias that only activates when VITE_MOCK is set (see vite.config.js), so the
// production bundle never touches this file.
//
// Data is seeded synchronously at import time from the bundled seed-data.json,
// plus a demo BOM and starter AI rules/knowledge, so the app is fully populated
// the moment it mounts.

import seedParts from '../../seed-data.json';

/* --------------------------- in-memory store --------------------------- */

const store = new Map(); // collectionName -> Map(id -> data)
const listeners = new Map(); // collectionName -> Set({ rebuild })

function coll(name) {
  let m = store.get(name);
  if (!m) {
    m = new Map();
    store.set(name, m);
  }
  return m;
}

let idSeq = 0;
function genId() {
  return `mock-${Date.now().toString(36)}-${(idSeq++).toString(36)}-${Math.random()
    .toString(36)
    .slice(2, 7)}`;
}

function notify(name) {
  const set = listeners.get(name);
  if (!set) return;
  for (const l of set) l.rebuild();
}

/* ------------------------------- seeding ------------------------------- */

function seed() {
  const parts = coll('parts');
  const categories = coll('categories');
  const partIdByPartNo = new Map();

  const catNames = new Set();
  let i = 0;
  for (const p of seedParts) {
    const id = `part-${i++}`;
    parts.set(id, { ...p, createdAt: new Date(Date.now() + i) });
    if (p.partNo) partIdByPartNo.set(p.partNo, id);
    if (p.category) catNames.add(p.category);
  }
  let c = 0;
  for (const name of catNames) {
    categories.set(`cat-${c++}`, { name, createdAt: new Date(Date.now() + c) });
  }

  // A demo BOM referencing a few real seeded parts (looked up by part number).
  const pick = (partNo, qty) => {
    const partId = partIdByPartNo.get(partNo);
    return partId ? { partId, qty } : null;
  };
  const demoItems = [
    pick('CJ2M-CPU32', 1),
    pick('CJ2M-CPU33', 1),
  ].filter(Boolean);
  coll('boms').set('demo-bom', {
    projectNo: 'PRJ-DEMO',
    projectName: 'Demo Project',
    bomNo: 'BOM-DEMO-1',
    bomName: 'Sample Control Panel',
    notes: 'Seeded demo BOM for local testing. Try the AI Assist panel.',
    items: demoItems,
    createdAt: new Date(),
    updatedAt: new Date(),
  });

  // Starter AI rules so the assistant works immediately.
  coll('aiRules').set('rule-plc', {
    name: 'Standard PLC',
    triggers: ['plc', 'controller', 'cpu'],
    requires: [],
    filters: { categories: ['PLC'], brands: [], partNos: [], textIncludes: [] },
    defaultQty: 1,
    note: 'Company standard EE-STD-04: every control panel uses one PLC CPU.',
    enabled: true,
    createdAt: new Date(Date.now() + 2),
  });
  coll('aiRules').set('rule-panel', {
    name: 'Control panel starter kit',
    triggers: ['control panel', 'panel kit', 'starter'],
    requires: ['brand'],
    filters: { categories: ['PLC', 'HMI'], brands: [], partNos: [], textIncludes: [] },
    defaultQty: 1,
    note: 'A control panel starter pairs a CPU with an operator HMI.',
    enabled: true,
    createdAt: new Date(Date.now() + 1),
  });
  coll('aiRules').set('rule-breaker', {
    name: 'Main breaker',
    triggers: ['breaker', 'circuit breaker'],
    requires: [],
    filters: { categories: ['Breaker'], brands: [], partNos: [], textIncludes: [] },
    defaultQty: 1,
    note: 'Protect each panel feed with a main breaker.',
    enabled: true,
    createdAt: new Date(),
  });

  coll('aiKnowledge').set('know-breaker', {
    title: 'Breaker selection standard',
    content: 'Size the main breaker to the panel load with 25% headroom (IEC 60947).',
    source: 'IEC 60947',
    createdAt: new Date(),
  });
}

seed();

/* ------------------------------ ref types ------------------------------ */
// collectionRef: { __t:'coll', name }
// docRef:        { __t:'doc', name, id }
// query:         { __t:'query', name, constraints:[] }

export function initializeFirestore() {
  return { __t: 'db' };
}
export const getFirestore = initializeFirestore;
export function persistentLocalCache() {
  return {};
}
export function persistentMultipleTabManager() {
  return {};
}

export function collection(_db, name) {
  return { __t: 'coll', name };
}

export function doc(a, name, id) {
  // doc(collectionRef)            -> new auto id
  // doc(collectionRef, id)        -> explicit id
  // doc(db, name, id)             -> explicit
  if (a && a.__t === 'coll') {
    return { __t: 'doc', name: a.name, id: name || genId() };
  }
  return { __t: 'doc', name, id };
}

export function query(ref, ...constraints) {
  return { __t: 'query', name: ref.name, constraints };
}

export function orderBy(field, dir = 'asc') {
  return { __c: 'orderBy', field, dir };
}

export function serverTimestamp() {
  return new Date();
}

/* ------------------------------ snapshots ------------------------------ */

function compare(a, b) {
  if (a == null && b == null) return 0;
  if (a == null) return -1;
  if (b == null) return 1;
  if (a instanceof Date) a = a.getTime();
  if (b instanceof Date) b = b.getTime();
  if (typeof a === 'string' && typeof b === 'string') return a.localeCompare(b);
  return a < b ? -1 : a > b ? 1 : 0;
}

function buildSnapshot(name, constraints = []) {
  let rows = [...coll(name).entries()].map(([id, data]) => ({ id, data }));
  for (const con of constraints) {
    if (con && con.__c === 'orderBy') {
      rows.sort((x, y) => {
        const r = compare(x.data[con.field], y.data[con.field]);
        return con.dir === 'desc' ? -r : r;
      });
    }
  }
  const docs = rows.map(({ id, data }) => ({
    id,
    exists: () => true,
    data: () => data,
  }));
  return {
    docs,
    empty: docs.length === 0,
    size: docs.length,
    forEach: (fn) => docs.forEach(fn),
  };
}

function nameAndConstraints(target) {
  if (target.__t === 'query') return [target.name, target.constraints];
  return [target.name, []];
}

export async function getDocs(target) {
  const [name, constraints] = nameAndConstraints(target);
  return buildSnapshot(name, constraints);
}

export function onSnapshot(target, cb, _errCb) {
  const [name, constraints] = nameAndConstraints(target);
  const l = { rebuild: () => cb(buildSnapshot(name, constraints)) };
  let set = listeners.get(name);
  if (!set) {
    set = new Set();
    listeners.set(name, set);
  }
  set.add(l);
  // Fire the initial snapshot asynchronously, mirroring Firestore.
  Promise.resolve().then(() => l.rebuild());
  return () => set.delete(l);
}

/* -------------------------------- writes -------------------------------- */

export async function addDoc(collRef, data) {
  const id = genId();
  coll(collRef.name).set(id, { ...data });
  notify(collRef.name);
  return { id, __t: 'doc', name: collRef.name };
}

export async function setDoc(docRef, data) {
  coll(docRef.name).set(docRef.id, { ...data });
  notify(docRef.name);
}

export async function updateDoc(docRef, data) {
  const m = coll(docRef.name);
  const prev = m.get(docRef.id) || {};
  m.set(docRef.id, { ...prev, ...data });
  notify(docRef.name);
}

export async function deleteDoc(docRef) {
  coll(docRef.name).delete(docRef.id);
  notify(docRef.name);
}

export function writeBatch() {
  const ops = [];
  const touched = new Set();
  return {
    set(ref, data) {
      ops.push(() => coll(ref.name).set(ref.id, { ...data }));
      touched.add(ref.name);
    },
    update(ref, data) {
      ops.push(() => {
        const m = coll(ref.name);
        m.set(ref.id, { ...(m.get(ref.id) || {}), ...data });
      });
      touched.add(ref.name);
    },
    delete(ref) {
      ops.push(() => coll(ref.name).delete(ref.id));
      touched.add(ref.name);
    },
    async commit() {
      for (const op of ops) op();
      for (const name of touched) notify(name);
    },
  };
}
