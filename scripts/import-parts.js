#!/usr/bin/env node
// Imports parts from seed-data.json into Firestore, skipping duplicate partNos.
// Usage: node scripts/import-parts.js [path-to-data.json]

import { readFileSync } from 'fs';
import { createRequire } from 'module';
import { fileURLToPath } from 'url';
import { dirname, resolve } from 'path';

const __dirname = dirname(fileURLToPath(import.meta.url));
const require = createRequire(import.meta.url);

const admin = require('firebase-admin');

const serviceAccount = JSON.parse(
  readFileSync(resolve(__dirname, '../bom-item-list-firebase-adminsdk-fbsvc-9a6e7d58d4.json'), 'utf8')
);

admin.initializeApp({
  credential: admin.credential.cert(serviceAccount),
});

const db = admin.firestore();

async function importParts(dataPath) {
  const raw = readFileSync(dataPath, 'utf8');
  const parts = JSON.parse(raw);
  console.log(`Loaded ${parts.length} parts from ${dataPath}`);

  // Fetch all existing partNos from Firestore
  console.log('Fetching existing parts from Firestore...');
  const snapshot = await db.collection('parts').get();
  const existingPartNos = new Set(snapshot.docs.map((d) => d.data().partNo).filter(Boolean));
  console.log(`Found ${existingPartNos.size} existing parts in Firestore`);

  // Deduplicate within source file (keep first occurrence per partNo)
  const seenInFile = new Set();
  const deduped = parts.filter((p) => {
    if (!p.partNo || seenInFile.has(p.partNo)) return false;
    seenInFile.add(p.partNo);
    return true;
  });
  const selfDupes = parts.length - deduped.length;
  if (selfDupes > 0) console.log(`Removed ${selfDupes} duplicate(s) within source file`);

  // Filter out parts already in Firestore
  const newParts = deduped.filter((p) => !existingPartNos.has(p.partNo));
  const skipped = deduped.length - newParts.length;
  console.log(`Skipping ${skipped} already-in-Firestore duplicate(s), importing ${newParts.length} new part(s)`);

  if (newParts.length === 0) {
    console.log('Nothing to import.');
    return;
  }

  // Collect new categories
  const existingCatsSnap = await db.collection('categories').get();
  const existingCatNames = new Set(existingCatsSnap.docs.map((d) => d.data().name).filter(Boolean));
  const newCategoryNames = [...new Set(newParts.map((p) => p.category).filter(Boolean))].filter(
    (c) => !existingCatNames.has(c)
  );

  // Build ops list: categories first, then parts
  const ops = [
    ...newCategoryNames.map((name) => ({ col: 'categories', data: { name, createdAt: admin.firestore.FieldValue.serverTimestamp() } })),
    ...newParts.map((p) => ({ col: 'parts', data: { ...p, createdAt: admin.firestore.FieldValue.serverTimestamp() } })),
  ];

  // Commit in batches of 400 (Firestore max is 500)
  const BATCH_SIZE = 400;
  let imported = 0;
  for (let i = 0; i < ops.length; i += BATCH_SIZE) {
    const batch = db.batch();
    for (const op of ops.slice(i, i + BATCH_SIZE)) {
      const ref = db.collection(op.col).doc();
      batch.set(ref, op.data);
    }
    await batch.commit();
    imported += ops.slice(i, i + BATCH_SIZE).filter((o) => o.col === 'parts').length;
    console.log(`  Committed batch ${Math.floor(i / BATCH_SIZE) + 1}`);
  }

  if (newCategoryNames.length > 0) {
    console.log(`Added ${newCategoryNames.length} new category/categories: ${newCategoryNames.join(', ')}`);
  }
  console.log(`Done. Imported ${imported} part(s).`);
}

const dataPath = process.argv[2] ?? resolve(__dirname, '../seed-data.json');
importParts(dataPath).catch((err) => {
  console.error('Import failed:', err);
  process.exit(1);
});
