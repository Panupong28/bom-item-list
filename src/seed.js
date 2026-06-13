import { db } from './firebase.js';
import {
  collection,
  getDocs,
  writeBatch,
  doc,
  serverTimestamp,
} from 'firebase/firestore';

export async function runSeed() {
  const existing = await getDocs(collection(db, 'parts'));
  if (!existing.empty) {
    throw new Error(`Parts collection already has ${existing.size} docs. Refusing to re-seed.`);
  }

  const res = await fetch('/seed-data.json');
  if (!res.ok) throw new Error('Failed to fetch seed-data.json');
  const parts = await res.json();

  const categoryNames = [...new Set(parts.map((p) => p.category))];
  const existingCats = await getDocs(collection(db, 'categories'));
  const existingCatNames = new Set(existingCats.docs.map((d) => d.data().name));

  // Firestore batches are limited to 500 ops
  const ops = [];
  for (const name of categoryNames) {
    if (existingCatNames.has(name)) continue;
    ops.push({ type: 'cat', data: { name, createdAt: serverTimestamp() } });
  }
  for (const p of parts) {
    ops.push({ type: 'part', data: { ...p, createdAt: serverTimestamp() } });
  }

  const chunkSize = 400;
  for (let i = 0; i < ops.length; i += chunkSize) {
    const batch = writeBatch(db);
    for (const op of ops.slice(i, i + chunkSize)) {
      const ref = doc(collection(db, op.type === 'cat' ? 'categories' : 'parts'));
      batch.set(ref, op.data);
    }
    await batch.commit();
  }

  return parts.length;
}
