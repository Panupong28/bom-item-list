#!/usr/bin/env node
// Run this FIRST to discover exact column names in dbo.Std, dbo.Brand, dbo.Category
// Usage: node scripts/discover-schema.js

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

const sql = require('mssql');

const config = {
  server: process.env.MSSQL_SERVER,
  port: Number(process.env.MSSQL_PORT ?? 1433),
  database: process.env.MSSQL_DATABASE,
  user: process.env.MSSQL_USER,
  password: process.env.MSSQL_PASSWORD,
  options: { encrypt: false, trustServerCertificate: true },
};

async function discover() {
  console.log(`Connecting to ${config.server}:${config.port} / ${config.database} ...`);
  await sql.connect(config);
  console.log('Connected.\n');

  const tables = ['Std', 'Brand', 'Category'];

  for (const table of tables) {
    const result = await sql.query`
      SELECT COLUMN_NAME, DATA_TYPE, IS_NULLABLE
      FROM INFORMATION_SCHEMA.COLUMNS
      WHERE TABLE_SCHEMA = 'dbo' AND TABLE_NAME = ${table}
      ORDER BY ORDINAL_POSITION
    `;

    console.log(`── dbo.${table} (${result.recordset.length} columns) ──`);
    for (const col of result.recordset) {
      console.log(`   ${col.COLUMN_NAME.padEnd(30)} ${col.DATA_TYPE.padEnd(15)} nullable=${col.IS_NULLABLE}`);
    }

    // Show first 3 sample rows
    const sample = await sql.query(`SELECT TOP 3 * FROM dbo.[${table}]`);
    if (sample.recordset.length > 0) {
      console.log('   Sample rows:');
      for (const row of sample.recordset) {
        console.log('  ', JSON.stringify(row));
      }
    }
    console.log();
  }

  await sql.close();
  console.log('Done. Fill in the column names in .env.import, then run: npm run import-from-mssql');
}

discover().catch((err) => {
  console.error('Failed:', err.message);
  process.exit(1);
});
