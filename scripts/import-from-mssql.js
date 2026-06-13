#!/usr/bin/env node
// Imports parts from MSSQL Express → Firestore, skipping existing partNos.
// Run discover-schema.js first to get the correct column names.
// Usage: node scripts/import-from-mssql.js

import { createRequire } from 'module';
import { fileURLToPath } from 'url';
import { dirname, resolve } from 'path';
import { readFileSync } from 'fs';

const __dirname = dirname(fileURLToPath(import.meta.url));
const require = createRequire(import.meta.url);

// Load .env.import
const envPath = resolve(__dirname, '../.env.import');
try {
  const lines = readFileSync(envPath, 'utf8').split('\n');
  for (const line of lines) {
    const trimmed = line.trim();
    if (!trimmed || trimmed.startsWith('#')) continue;
    const [key, ...rest] = trimmed.split('=');
    if (key) process.env[key.trim()] = rest.join('=').trim();
  }
} catch {
  console.error('ERROR: .env.import not found.\nCopy .env.import.example to .env.import and fill in your credentials.');
  process.exit(1);
}

// ── Column name config (from .env.import) ──────────────────────────────────
const COL = {
  partNo:      process.env.STD_COL_PARTNO       || 'Part_no',
  description: process.env.STD_COL_DESCRIPTION  || 'Description',
  brandFk:     process.env.STD_COL_BRAND_FK     || 'BrandId',
  categoryFk:  process.env.STD_COL_CATEGORY_FK  || 'CategoryId',
  brandId:     process.env.BRAND_COL_ID         || 'Id',
  brandName:   process.env.BRAND_COL_NAME       || 'Name',
  catId:       process.env.CATEGORY_COL_ID      || 'Id',
  catName:     process.env.CATEGORY_COL_NAME    || 'Name',
};

const sql = require('mssql');
const admin = require('firebase-admin');

// ── MSSQL connection ───────────────────────────────────────────────────────
const mssqlConfig = {
  server: process.env.MSSQL_SERVER,
  port: Number(process.env.MSSQL_PORT ?? 1433),
  database: process.env.MSSQL_DATABASE,
  user: process.env.MSSQL_USER,
  password: process.env.MSSQL_PASSWORD,
  options: { encrypt: false, trustServerCertificate: true },
};

// ── Firebase Admin ─────────────────────────────────────────────────────────
const serviceAccount = JSON.parse(
  readFileSync(resolve(__dirname, '../bom-item-list-firebase-adminsdk-fbsvc-9a6e7d58d4.json'), 'utf8')
);
admin.initializeApp({ credential: admin.credential.cert(serviceAccount) });
const db = admin.firestore();

async function run() {
  // 1. Fetch parts from MSSQL via JOIN
  console.log(`Connecting to MSSQL ${mssqlConfig.server}:${mssqlConfig.port} / ${mssqlConfig.database} ...`);
  await sql.connect(mssqlConfig);
  console.log('Connected.\n');

  const query = `
    SELECT
      s.[${COL.partNo}]      AS partNo,
      s.[${COL.description}] AS description,
      b.[${COL.brandName}]   AS brand,
      c.[${COL.catName}]     AS category
    FROM dbo.[Std] s
    LEFT JOIN dbo.[Brand]    b ON s.[${COL.brandFk}]    = b.[${COL.brandId}]
    LEFT JOIN dbo.[Category] c ON s.[${COL.categoryFk}] = c.[${COL.catId}]
  `;

  const result = await sql.query(query);
  await sql.close();

  const mssqlParts = result.recordset;
  console.log(`Fetched ${mssqlParts.length} row(s) from MSSQL`);

  // 2. Deduplicate within MSSQL result (keep first per partNo)
  const seenPartNos = new Set();
  const uniqueParts = mssqlParts.filter((p) => {
    const key = (p.partNo ?? '').toString().trim();
    if (!key || seenPartNos.has(key)) return false;
    seenPartNos.add(key);
    return true;
  });
  if (uniqueParts.length !== mssqlParts.length) {
    console.log(`Removed ${mssqlParts.length - uniqueParts.length} internal duplicate(s) from MSSQL result`);
  }

  // 3. Fetch existing partNos from Firestore
  console.log('Fetching existing parts from Firestore...');
  const snapshot = await db.collection('parts').get();
  const existingPartNos = new Set(
    snapshot.docs.map((d) => (d.data().partNo ?? '').toString().trim()).filter(Boolean)
  );
  console.log(`Found ${existingPartNos.size} existing part(s) in Firestore`);

  // 4. Filter out duplicates
  const newParts = uniqueParts.filter((p) => !existingPartNos.has((p.partNo ?? '').toString().trim()));
  const skipped = uniqueParts.length - newParts.length;
  console.log(`Skipping ${skipped} duplicate(s) — importing ${newParts.length} new part(s)\n`);

  if (newParts.length === 0) {
    console.log('Nothing to import. Firestore is already up to date.');
    return;
  }

  // 5. Collect new categories
  const existingCatsSnap = await db.collection('categories').get();
  const existingCatNames = new Set(existingCatsSnap.docs.map((d) => d.data().name).filter(Boolean));
  const newCategoryNames = [
    ...new Set(newParts.map((p) => p.category).filter(Boolean)),
  ].filter((c) => !existingCatNames.has(c));

  // 6. Build write ops: new categories first, then new parts
  const ops = [
    ...newCategoryNames.map((name) => ({
      col: 'categories',
      data: { name, createdAt: admin.firestore.FieldValue.serverTimestamp() },
    })),
    ...newParts.map((p) => ({
      col: 'parts',
      data: {
        partNo:      (p.partNo ?? '').toString().trim(),
        description: p.description ?? null,
        brand:       p.brand ?? null,
        category:    p.category ?? null,
        price:       null,
        createdAt:   admin.firestore.FieldValue.serverTimestamp(),
      },
    })),
  ];

  // 7. Commit in batches of 400
  const BATCH_SIZE = 400;
  let importedCount = 0;
  for (let i = 0; i < ops.length; i += BATCH_SIZE) {
    const chunk = ops.slice(i, i + BATCH_SIZE);
    const batch = db.batch();
    for (const op of chunk) {
      batch.set(db.collection(op.col).doc(), op.data);
    }
    await batch.commit();
    importedCount += chunk.filter((o) => o.col === 'parts').length;
    console.log(`  Batch ${Math.floor(i / BATCH_SIZE) + 1} committed (${importedCount} parts so far)`);
  }

  if (newCategoryNames.length > 0) {
    console.log(`\nAdded ${newCategoryNames.length} new category/categories: ${newCategoryNames.join(', ')}`);
  }
  console.log(`\nDone. Imported ${importedCount} new part(s) into Firestore.`);
}

run().catch((err) => {
  console.error('\nImport failed:', err.message);
  process.exit(1);
});
