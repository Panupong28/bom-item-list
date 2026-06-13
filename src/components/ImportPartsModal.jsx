import { useContext, useMemo, useRef, useState } from 'react';
import { X, Upload, FileJson, AlertCircle, CheckCircle2, Copy, Sparkles, Check } from 'lucide-react';
import {
  addDoc,
  collection,
  serverTimestamp,
  writeBatch,
  doc,
} from 'firebase/firestore';
import { DataContext } from '../App.jsx';
import { db } from '../firebase.js';

const SAMPLE = [
  {
    description: 'Servo Motor 750W',
    partNo: 'MR-J4-70B',
    brand: 'Mitsubishi',
    category: 'Servo Drives',
    price: 28500,
  },
  {
    description: 'Limit Switch Roller Lever',
    partNo: 'D4N-2120',
    brand: 'Omron',
    category: 'Sensors',
    price: 450,
  },
];

const SAMPLE_JSON = JSON.stringify(SAMPLE, null, 2);

const AI_PROMPT = `You are extracting a parts list from a product catalog so it can be imported
into a BOM database.

DELIVERABLE: a downloadable .json file named "parts-import.json".

  - Claude: put it in an artifact of type application/vnd.ant.code with
    language "json" so I can click Download.
  - ChatGPT: use the code interpreter / Python tool to write the file and
    give me a download link, e.g.
        with open("/mnt/data/parts-import.json","w") as f:
            json.dump(data, f, ensure_ascii=False, indent=2)
  - Gemini / others: attach the file, or if attachments aren't available,
    put the JSON in a single fenced \`\`\`json code block I can copy.

The FILE CONTENT must be exactly one valid JSON array — nothing else. No
prose, no comments, no trailing text inside the file. UTF-8, indent 2.

Each array element must be an object with these fields:

  description  string,  REQUIRED. Short product description in English.
                        Include the key spec (size, rating, model variant)
                        when it disambiguates SKUs. Keep under ~120 chars.
  partNo       string,  REQUIRED. The manufacturer part number / model code
                        EXACTLY as printed in the catalog. Preserve case,
                        dashes, slashes. No spaces around it.
  brand        string,  REQUIRED if shown. The manufacturer (e.g. "Omron",
                        "Mitsubishi", "Siemens"). Use "" if truly unknown.
  category     string,  REQUIRED. Pick ONE short, reusable category name
                        in Title Case, e.g. "Sensors", "Servo Drives",
                        "Circuit Breakers", "Cables", "Push Buttons".
                        Be consistent — same kind of item = same category
                        across all rows.
  price        number | null. REQUIRED key. Numeric list price in the
                        currency shown by the catalog (no currency symbol,
                        no thousands separators, decimals OK). Use null if
                        no price is shown. NEVER guess.

Rules:
- One row per unique partNo. If the catalog lists the same partNo twice,
  keep one row.
- Do NOT invent part numbers, brands, prices, or categories. If a required
  field is missing in the source, OMIT THAT ROW entirely rather than
  fabricating data.
- Strip catalog noise: page numbers, "see page X", footnotes, illustrative
  bullets that are not part of the description.
- Numbers only for price. "฿28,500" → 28500. "USD 12.50" → 12.50.
- Keep partNo verbatim — do not normalize, lowercase, or trim internal
  characters.

Example file content (shape only — your file will be longer):

[
  {
    "description": "Servo Motor 750W with brake",
    "partNo": "MR-J4-70B",
    "brand": "Mitsubishi",
    "category": "Servo Drives",
    "price": 28500
  },
  {
    "description": "Limit Switch Roller Lever",
    "partNo": "D4N-2120",
    "brand": "Omron",
    "category": "Sensors",
    "price": null
  }
]

After producing the file, report ONLY:
  - the filename
  - the number of parts extracted
  - any parts you had to omit and why (one line each)

Now extract every part you can find in the catalog I provide and deliver
the file.`;

export default function ImportPartsModal({ onClose }) {
  const { parts, categories } = useContext(DataContext);
  const fileRef = useRef(null);
  const [raw, setRaw] = useState('');
  const [fileName, setFileName] = useState('');
  const [parsed, setParsed] = useState(null);
  const [parseError, setParseError] = useState('');
  const [importing, setImporting] = useState(false);
  const [result, setResult] = useState(null);
  const [createMissingCats, setCreateMissingCats] = useState(true);
  const [skipDuplicates, setSkipDuplicates] = useState(true);
  const [copiedKey, setCopiedKey] = useState('');
  const [showPrompt, setShowPrompt] = useState(false);

  const copy = async (key, text) => {
    try {
      await navigator.clipboard.writeText(text);
      setCopiedKey(key);
      setTimeout(() => setCopiedKey((c) => (c === key ? '' : c)), 1800);
    } catch (_) {}
  };

  const existingPartNos = useMemo(() => {
    const s = new Set();
    for (const p of parts) if (p.partNo) s.add(p.partNo.trim().toLowerCase());
    return s;
  }, [parts]);

  const existingCatNames = useMemo(
    () => new Set(categories.map((c) => c.name.toLowerCase())),
    [categories]
  );

  const handleFile = (e) => {
    const f = e.target.files?.[0];
    if (!f) return;
    setFileName(f.name);
    const reader = new FileReader();
    reader.onload = () => {
      const text = String(reader.result || '');
      setRaw(text);
      validate(text);
    };
    reader.readAsText(f);
  };

  const handleTextChange = (e) => {
    setRaw(e.target.value);
    setFileName('');
    validate(e.target.value);
  };

  const validate = (text) => {
    setResult(null);
    if (!text.trim()) {
      setParsed(null);
      setParseError('');
      return;
    }
    let data;
    try {
      data = JSON.parse(text);
    } catch (err) {
      setParsed(null);
      setParseError('Invalid JSON: ' + err.message);
      return;
    }
    if (!Array.isArray(data)) {
      setParsed(null);
      setParseError('Top level must be an array of part objects.');
      return;
    }

    const rows = [];
    const issues = [];
    const seenInFile = new Map();
    data.forEach((item, idx) => {
      const row = {
        index: idx,
        description: typeof item.description === 'string' ? item.description.trim() : '',
        partNo: typeof item.partNo === 'string' ? item.partNo.trim() : '',
        brand: typeof item.brand === 'string' ? item.brand.trim() : '',
        category: typeof item.category === 'string' ? item.category.trim() : '',
        price:
          item.price === null || item.price === undefined || item.price === ''
            ? null
            : Number(item.price),
        problems: [],
      };
      if (!row.description) row.problems.push('missing description');
      if (!row.partNo) row.problems.push('missing partNo');
      if (!row.category) row.problems.push('missing category');
      if (row.price !== null && !Number.isFinite(row.price)) {
        row.problems.push('price not a number');
        row.price = null;
      }
      const key = row.partNo.toLowerCase();
      row.dupInDb = !!key && existingPartNos.has(key);
      if (key && seenInFile.has(key)) {
        row.dupInFile = true;
        row.dupOfRow = seenInFile.get(key);
      } else {
        row.dupInFile = false;
        if (key) seenInFile.set(key, idx);
      }
      if (row.problems.length) issues.push({ idx, problems: row.problems });
      rows.push(row);
    });

    const validRows = rows.filter((r) => r.problems.length === 0);
    const dbDupRows = validRows.filter((r) => r.dupInDb);
    const fileDupRows = validRows.filter((r) => r.dupInFile);
    const newCatNames = Array.from(
      new Set(
        validRows
          .map((r) => r.category)
          .filter((c) => c && !existingCatNames.has(c.toLowerCase()))
      )
    );

    setParseError('');
    setParsed({
      rows,
      validRows,
      dbDupRows,
      fileDupRows,
      issues,
      newCatNames,
    });
  };

  const handleImport = async () => {
    if (!parsed) return;
    setImporting(true);
    setResult(null);
    try {
      const toInsert = parsed.validRows.filter(
        (r) => !r.dupInFile && (!skipDuplicates || !r.dupInDb)
      );

      if (createMissingCats && parsed.newCatNames.length) {
        const catBatch = writeBatch(db);
        for (const name of parsed.newCatNames) {
          const ref = doc(collection(db, 'categories'));
          catBatch.set(ref, { name, createdAt: serverTimestamp() });
        }
        await catBatch.commit();
      }

      let inserted = 0;
      for (let i = 0; i < toInsert.length; i += 400) {
        const chunk = toInsert.slice(i, i + 400);
        const batch = writeBatch(db);
        for (const r of chunk) {
          const ref = doc(collection(db, 'parts'));
          batch.set(ref, {
            description: r.description,
            partNo: r.partNo,
            brand: r.brand,
            category: r.category,
            price: r.price,
            createdAt: serverTimestamp(),
          });
        }
        await batch.commit();
        inserted += chunk.length;
      }

      setResult({
        ok: true,
        inserted,
        skippedDbDuplicates: skipDuplicates ? parsed.dbDupRows.length : 0,
        skippedFileDuplicates: parsed.fileDupRows.length,
        skippedInvalid: parsed.rows.length - parsed.validRows.length,
        categoriesCreated: createMissingCats ? parsed.newCatNames.length : 0,
      });
    } catch (err) {
      console.error(err);
      setResult({ ok: false, error: err.message });
    } finally {
      setImporting(false);
    }
  };

  const copySample = () => copy('sample', SAMPLE_JSON);
  const copyPrompt = () => copy('prompt', AI_PROMPT);

  const totalToInsert = parsed
    ? parsed.validRows.filter(
        (r) => !r.dupInFile && (!skipDuplicates || !r.dupInDb)
      ).length
    : 0;

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
            <div className="flex items-center gap-2.5">
              <div className="w-9 h-9 rounded-xl bg-white/10 backdrop-blur-md border border-white/20 flex items-center justify-center">
                <FileJson className="w-4 h-4 text-white" strokeWidth={2.5} />
              </div>
              <div>
                <h3 className="text-base font-extrabold tracking-tight">Import parts from JSON</h3>
                <p className="text-[11px] font-medium text-indigo-200">
                  Bulk add items to the parts library
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
        </div>

        <div className="flex-1 overflow-y-auto scrollbar-thin px-6 py-5 space-y-4">
          <div className="rounded-2xl border border-indigo-200 dark:border-indigo-500/30 bg-gradient-to-br from-indigo-50 to-violet-50 dark:from-indigo-500/10 dark:to-violet-500/10 p-4">
            <div className="flex items-start justify-between gap-3">
              <div className="flex items-start gap-2.5 min-w-0">
                <div className="w-8 h-8 rounded-lg bg-indigo-600 text-white flex items-center justify-center flex-shrink-0">
                  <Sparkles className="w-4 h-4" strokeWidth={2.5} />
                </div>
                <div className="min-w-0">
                  <p className="text-xs font-bold uppercase tracking-[0.16em] text-indigo-700 dark:text-indigo-300">
                    Extract parts with AI
                  </p>
                  <p className="text-xs text-indigo-900/80 dark:text-indigo-100/80 mt-1 leading-relaxed">
                    Copy this prompt, paste it into Claude / ChatGPT / Gemini together with your
                    catalog (PDF, images, or text). It returns JSON that drops straight into the
                    field below.
                  </p>
                </div>
              </div>
              <div className="flex flex-col gap-1.5 flex-shrink-0">
                <button
                  onClick={copyPrompt}
                  className={`inline-flex items-center justify-center gap-1.5 px-3 py-1.5 text-[11px] font-bold rounded-lg shadow-glow-indigo transition ${
                    copiedKey === 'prompt'
                      ? 'bg-emerald-600 text-white'
                      : 'bg-gradient-to-r from-indigo-600 to-violet-700 text-white hover:shadow-lg'
                  }`}
                >
                  {copiedKey === 'prompt' ? (
                    <>
                      <Check className="w-3 h-3" strokeWidth={3} /> Copied
                    </>
                  ) : (
                    <>
                      <Copy className="w-3 h-3" /> Copy AI prompt
                    </>
                  )}
                </button>
                <button
                  onClick={() => setShowPrompt((v) => !v)}
                  className="text-[11px] font-semibold text-indigo-700 dark:text-indigo-300 hover:underline"
                >
                  {showPrompt ? 'Hide preview' : 'Show preview'}
                </button>
              </div>
            </div>
            {showPrompt && (
              <pre className="mt-3 text-[11px] font-mono whitespace-pre-wrap bg-white/80 dark:bg-slate-950/80 border border-indigo-200/60 dark:border-indigo-500/20 text-slate-800 dark:text-slate-200 rounded-lg p-3 max-h-48 overflow-y-auto scrollbar-thin">
{AI_PROMPT}
              </pre>
            )}
          </div>

          <div className="rounded-2xl border border-slate-200 dark:border-slate-800 bg-slate-50/60 dark:bg-slate-900/60 p-4">
            <div className="flex items-start justify-between gap-3 mb-2">
              <div>
                <p className="text-xs font-bold uppercase tracking-[0.16em] text-slate-500 dark:text-slate-400">
                  Expected format
                </p>
                <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">
                  An array of objects. <code className="font-mono">description</code>,{' '}
                  <code className="font-mono">partNo</code>,{' '}
                  <code className="font-mono">category</code> are required;{' '}
                  <code className="font-mono">brand</code> and{' '}
                  <code className="font-mono">price</code> optional.
                </p>
              </div>
              <button
                onClick={copySample}
                className={`inline-flex items-center gap-1.5 px-2.5 py-1.5 text-[11px] font-semibold rounded-lg border transition flex-shrink-0 ${
                  copiedKey === 'sample'
                    ? 'bg-emerald-600 text-white border-emerald-600'
                    : 'bg-white dark:bg-slate-800 border-slate-200 dark:border-slate-700 text-slate-600 dark:text-slate-300 hover:text-slate-900 dark:hover:text-white'
                }`}
              >
                {copiedKey === 'sample' ? (
                  <>
                    <Check className="w-3 h-3" strokeWidth={3} /> Copied
                  </>
                ) : (
                  <>
                    <Copy className="w-3 h-3" /> Copy sample
                  </>
                )}
              </button>
            </div>
            <pre className="text-[11px] font-mono bg-slate-900 dark:bg-slate-950 text-slate-100 rounded-lg p-3 overflow-x-auto max-h-32 scrollbar-thin">
{SAMPLE_JSON}
            </pre>
          </div>

          <div className="flex flex-wrap items-center gap-3">
            <input
              ref={fileRef}
              type="file"
              accept="application/json,.json"
              onChange={handleFile}
              className="hidden"
            />
            <button
              onClick={() => fileRef.current?.click()}
              className="inline-flex items-center gap-2 px-4 py-2 rounded-xl bg-slate-900 dark:bg-white text-white dark:text-slate-900 text-sm font-semibold hover:opacity-90 transition"
            >
              <Upload className="w-4 h-4" /> Choose JSON file
            </button>
            {fileName && (
              <span className="text-xs text-slate-500 dark:text-slate-400">
                <strong className="font-semibold text-slate-700 dark:text-slate-300">
                  {fileName}
                </strong>
              </span>
            )}
            <span className="text-xs text-slate-400 dark:text-slate-500">or paste JSON below</span>
          </div>

          <textarea
            value={raw}
            onChange={handleTextChange}
            rows={6}
            spellCheck={false}
            placeholder='[ { "description": "…", "partNo": "…", "brand": "…", "category": "…", "price": 0 } ]'
            className="w-full px-3 py-2.5 text-xs font-mono bg-slate-50 dark:bg-slate-800 text-slate-900 dark:text-slate-100 rounded-xl border border-slate-200 dark:border-slate-700 focus:outline-none focus:ring-2 focus:ring-indigo-500"
          />

          {parseError && (
            <div className="rounded-xl bg-rose-50 dark:bg-rose-500/10 border border-rose-200 dark:border-rose-500/30 px-4 py-3 flex items-start gap-2.5">
              <AlertCircle className="w-4 h-4 text-rose-600 dark:text-rose-400 mt-0.5 flex-shrink-0" />
              <span className="text-sm text-rose-700 dark:text-rose-300">{parseError}</span>
            </div>
          )}

          {parsed && (
            <div className="rounded-2xl border border-slate-200 dark:border-slate-800 overflow-hidden">
              <div className="px-4 py-3 bg-slate-50/60 dark:bg-slate-900/60 border-b border-slate-200 dark:border-slate-800 grid grid-cols-2 md:grid-cols-5 gap-3 text-xs">
                <Stat label="Rows" value={parsed.rows.length} />
                <Stat label="Valid" value={parsed.validRows.length} tone="emerald" />
                <Stat
                  label="Dup in DB"
                  value={parsed.dbDupRows.length}
                  tone={parsed.dbDupRows.length ? 'amber' : 'slate'}
                />
                <Stat
                  label="Dup in file"
                  value={parsed.fileDupRows.length}
                  tone={parsed.fileDupRows.length ? 'rose' : 'slate'}
                />
                <Stat
                  label="Invalid"
                  value={parsed.issues.length}
                  tone={parsed.issues.length ? 'rose' : 'slate'}
                />
              </div>

              <div className="px-4 py-3 space-y-2 text-xs">
                {parsed.fileDupRows.length > 0 && (
                  <div className="flex items-start gap-2 text-rose-700 dark:text-rose-300">
                    <AlertCircle className="w-3.5 h-3.5 mt-0.5 flex-shrink-0" />
                    <span>
                      {parsed.fileDupRows.length} row
                      {parsed.fileDupRows.length === 1 ? '' : 's'} repeat a{' '}
                      <code className="font-mono">partNo</code> seen earlier in this file — these
                      are always skipped.
                    </span>
                  </div>
                )}
                <label className="flex items-center gap-2 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={skipDuplicates}
                    onChange={(e) => setSkipDuplicates(e.target.checked)}
                    className="rounded border-slate-300"
                  />
                  <span className="text-slate-700 dark:text-slate-300">
                    Skip rows whose <code className="font-mono">partNo</code> already exists in
                    the database ({parsed.dbDupRows.length})
                  </span>
                </label>
                {parsed.newCatNames.length > 0 && (
                  <label className="flex items-center gap-2 cursor-pointer">
                    <input
                      type="checkbox"
                      checked={createMissingCats}
                      onChange={(e) => setCreateMissingCats(e.target.checked)}
                      className="rounded border-slate-300"
                    />
                    <span className="text-slate-700 dark:text-slate-300">
                      Create {parsed.newCatNames.length} new categor
                      {parsed.newCatNames.length === 1 ? 'y' : 'ies'}:{' '}
                      <span className="font-medium text-slate-900 dark:text-white">
                        {parsed.newCatNames.slice(0, 5).join(', ')}
                        {parsed.newCatNames.length > 5
                          ? ` +${parsed.newCatNames.length - 5} more`
                          : ''}
                      </span>
                    </span>
                  </label>
                )}
              </div>

              {parsed.issues.length > 0 && (
                <div className="px-4 py-3 border-t border-slate-200 dark:border-slate-800 bg-rose-50/40 dark:bg-rose-500/5">
                  <p className="text-[11px] font-bold uppercase tracking-[0.16em] text-rose-700 dark:text-rose-300 mb-1.5">
                    Invalid rows (will be skipped)
                  </p>
                  <ul className="text-xs text-rose-700 dark:text-rose-300 space-y-0.5 max-h-24 overflow-y-auto scrollbar-thin">
                    {parsed.issues.slice(0, 20).map((i) => (
                      <li key={i.idx} className="font-mono">
                        row {i.idx}: {i.problems.join(', ')}
                      </li>
                    ))}
                    {parsed.issues.length > 20 && (
                      <li className="italic">…and {parsed.issues.length - 20} more</li>
                    )}
                  </ul>
                </div>
              )}

              {parsed.validRows.length > 0 && (
                <div className="border-t border-slate-200 dark:border-slate-800 max-h-48 overflow-y-auto scrollbar-thin">
                  <table className="w-full text-xs">
                    <thead className="sticky top-0 bg-white dark:bg-slate-900">
                      <tr className="border-b border-slate-200 dark:border-slate-800 text-left">
                        <th className="px-3 py-2 font-bold text-slate-500 dark:text-slate-400">Description</th>
                        <th className="px-3 py-2 font-bold text-slate-500 dark:text-slate-400">Part No.</th>
                        <th className="px-3 py-2 font-bold text-slate-500 dark:text-slate-400">Brand</th>
                        <th className="px-3 py-2 font-bold text-slate-500 dark:text-slate-400">Category</th>
                        <th className="px-3 py-2 font-bold text-slate-500 dark:text-slate-400 text-right">Price</th>
                      </tr>
                    </thead>
                    <tbody>
                      {parsed.validRows.slice(0, 50).map((r) => (
                        <tr
                          key={r.index}
                          className={`border-b border-slate-100 dark:border-slate-800/70 last:border-0 ${
                            r.dupInFile
                              ? 'bg-rose-50/60 dark:bg-rose-500/10'
                              : r.dupInDb
                              ? 'bg-amber-50/50 dark:bg-amber-500/5'
                              : ''
                          }`}
                        >
                          <td className="px-3 py-1.5 text-slate-700 dark:text-slate-300 truncate max-w-xs">
                            {r.description}
                          </td>
                          <td className="px-3 py-1.5 font-mono text-slate-700 dark:text-slate-300">
                            {r.partNo}
                            {r.dupInFile && (
                              <span
                                className="ml-1.5 text-[9px] font-bold uppercase tracking-wider text-rose-600 dark:text-rose-400"
                                title={`Same partNo as row ${r.dupOfRow}`}
                              >
                                dup in file
                              </span>
                            )}
                            {!r.dupInFile && r.dupInDb && (
                              <span className="ml-1.5 text-[9px] font-bold uppercase tracking-wider text-amber-600 dark:text-amber-400">
                                in db
                              </span>
                            )}
                          </td>
                          <td className="px-3 py-1.5 text-slate-700 dark:text-slate-300">{r.brand || '—'}</td>
                          <td className="px-3 py-1.5 text-slate-700 dark:text-slate-300">{r.category}</td>
                          <td className="px-3 py-1.5 font-mono text-right text-slate-700 dark:text-slate-300">
                            {r.price != null
                              ? r.price.toLocaleString('en-US', { minimumFractionDigits: 0 })
                              : '—'}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                  {parsed.validRows.length > 50 && (
                    <div className="px-3 py-2 text-center text-[11px] italic text-slate-400 dark:text-slate-500 border-t border-slate-100 dark:border-slate-800/70">
                      Preview limited to 50 rows · {parsed.validRows.length - 50} more
                    </div>
                  )}
                </div>
              )}
            </div>
          )}

          {result && (
            <div
              className={`rounded-xl px-4 py-3 flex items-start gap-2.5 ${
                result.ok
                  ? 'bg-emerald-50 dark:bg-emerald-500/10 border border-emerald-200 dark:border-emerald-500/30'
                  : 'bg-rose-50 dark:bg-rose-500/10 border border-rose-200 dark:border-rose-500/30'
              }`}
            >
              {result.ok ? (
                <CheckCircle2 className="w-4 h-4 text-emerald-600 dark:text-emerald-400 mt-0.5 flex-shrink-0" />
              ) : (
                <AlertCircle className="w-4 h-4 text-rose-600 dark:text-rose-400 mt-0.5 flex-shrink-0" />
              )}
              <div className="text-sm">
                {result.ok ? (
                  <>
                    <p className="font-semibold text-emerald-800 dark:text-emerald-200">
                      Imported {result.inserted} part{result.inserted === 1 ? '' : 's'}.
                    </p>
                    <p className="text-xs text-emerald-700 dark:text-emerald-300 mt-0.5">
                      {result.categoriesCreated > 0 && (
                        <>Created {result.categoriesCreated} new categor{result.categoriesCreated === 1 ? 'y' : 'ies'}. </>
                      )}
                      {result.skippedDbDuplicates > 0 && (
                        <>Skipped {result.skippedDbDuplicates} already in DB. </>
                      )}
                      {result.skippedFileDuplicates > 0 && (
                        <>Skipped {result.skippedFileDuplicates} repeated within file. </>
                      )}
                      {result.skippedInvalid > 0 && (
                        <>Skipped {result.skippedInvalid} invalid row{result.skippedInvalid === 1 ? '' : 's'}. </>
                      )}
                    </p>
                  </>
                ) : (
                  <p className="text-rose-700 dark:text-rose-300">Import failed: {result.error}</p>
                )}
              </div>
            </div>
          )}
        </div>

        <div className="px-6 py-4 border-t border-slate-100 dark:border-slate-800 flex justify-end gap-2 flex-shrink-0">
          <button
            onClick={onClose}
            className="px-4 py-2 text-sm font-semibold rounded-xl text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800 transition"
          >
            {result?.ok ? 'Close' : 'Cancel'}
          </button>
          <button
            onClick={handleImport}
            disabled={!parsed || totalToInsert === 0 || importing || result?.ok}
            className="inline-flex items-center gap-2 px-4 py-2 text-sm font-semibold rounded-xl bg-gradient-to-r from-indigo-600 to-violet-700 text-white shadow-glow-indigo hover:shadow-lg disabled:opacity-50 transition"
          >
            <Upload className="w-4 h-4" />
            {importing
              ? 'Importing…'
              : totalToInsert > 0
              ? `Import ${totalToInsert} part${totalToInsert === 1 ? '' : 's'}`
              : 'Import'}
          </button>
        </div>
      </div>
    </div>
  );
}

function Stat({ label, value, tone = 'slate' }) {
  const tones = {
    slate: 'text-slate-900 dark:text-white',
    emerald: 'text-emerald-600 dark:text-emerald-400',
    amber: 'text-amber-600 dark:text-amber-400',
    rose: 'text-rose-600 dark:text-rose-400',
  };
  return (
    <div>
      <div className="text-[10px] font-bold uppercase tracking-[0.16em] text-slate-500 dark:text-slate-400">
        {label}
      </div>
      <div className={`text-lg font-extrabold tabular-nums ${tones[tone]}`}>{value}</div>
    </div>
  );
}
