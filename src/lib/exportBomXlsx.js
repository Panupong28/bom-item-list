import ExcelJS from 'exceljs';

const TEMPLATE_PATH = '/samples/revision-history-template.xlsx';
const DATA_START_ROW = 11;
const STYLE_TEMPLATE_ROW = 12; // row 11 has an outlier font; row 12 is consistent
const COLS = ['B', 'C', 'D', 'E', 'F', 'G', 'H', 'I', 'J', 'K'];

const clone = (v) => (v == null ? v : JSON.parse(JSON.stringify(v)));
const safe = (s) =>
  String(s || 'BOM').replace(/[\\/:*?"<>|]/g, '_').replace(/\s+/g, '_');

function snapshotRow(ws, row, cols) {
  const out = {};
  for (const col of cols) {
    const c = ws.getCell(`${col}${row}`);
    out[col] = {
      font: clone(c.font),
      fill: clone(c.fill),
      alignment: clone(c.alignment),
      border: clone(c.border),
      numFmt: c.numFmt,
    };
  }
  return out;
}

function applySnapshot(cell, snap) {
  if (snap.font) cell.font = clone(snap.font);
  if (snap.fill) cell.fill = clone(snap.fill);
  if (snap.alignment) cell.alignment = clone(snap.alignment);
  if (snap.border) cell.border = clone(snap.border);
  if (snap.numFmt) cell.numFmt = snap.numFmt;
}

export async function exportBomXlsx(bom, items, user) {
  const res = await fetch(TEMPLATE_PATH);
  if (!res.ok) throw new Error(`Could not load Excel template (${res.status})`);
  const buf = await res.arrayBuffer();

  const wb = new ExcelJS.Workbook();
  await wb.xlsx.load(buf);
  const ws = wb.worksheets[0];

  const signer = user?.displayName || user?.email?.split('@')[0] || '';

  // === Header section ===
  // B6 and B7 keep the source's TODAY() formula and numFmt.
  ws.getCell('F6').value = `Project : ${[bom.projectNo, bom.projectName]
    .filter(Boolean)
    .join(' ')}`;
  ws.getCell('G6').value = [bom.projectNo, bom.projectName, bom.bomName]
    .filter(Boolean)
    .join(' ');
  ws.getCell('J7').value = signer;
  ws.getCell('K7').value = signer;

  // === Data rows ===
  // Detect source's last data row by scanning column F (Part no) downwards
  let sourceLastDataRow = DATA_START_ROW - 1;
  for (let r = DATA_START_ROW; r <= 100; r++) {
    const v = ws.getCell(`F${r}`).value;
    if (v != null && String(v).trim() !== '') sourceLastDataRow = r;
  }

  // Snapshot row 12 for overflow rows + for normalizing row 11's F outlier
  const rowSnap = snapshotRow(ws, STYLE_TEMPLATE_ROW, COLS);

  items.forEach((it, i) => {
    const r = DATA_START_ROW + i;
    const overflow = r > sourceLastDataRow;
    const setCell = (col, value) => {
      const cell = ws.getCell(`${col}${r}`);
      cell.value = value == null ? null : value;
      // For rows beyond what the source pre-styled, paint row 12's styles
      // so they don't render as plain cells.
      if (overflow) applySnapshot(cell, rowSnap[col]);
    };
    setCell('B', null);
    ws.getCell(`B${r}`).value = new Date();
    if (overflow) applySnapshot(ws.getCell(`B${r}`), rowSnap.B);
    setCell('C', null);
    setCell('D', 'Add Item');
    setCell('E', 'Elec ');
    setCell('F', it.partNo || '');
    setCell('G', it.description || '');
    setCell('H', it.brand || '');
    setCell('I', it.qty || 1);
    setCell('J', signer);
    setCell('K', null);
  });

  // Clear source's leftover sample rows (keep styles, blank the values)
  for (let r = DATA_START_ROW + items.length; r <= sourceLastDataRow; r++) {
    for (const col of COLS) {
      ws.getCell(`${col}${r}`).value = null;
    }
  }

  // Force a clean left alignment on Part No (F) and Description (G) across
  // the entire data range. Source rows had inconsistent alignment (some
  // centered, some unset, F11 had wrapText:true) — drop everything and set
  // an explicit, uniform alignment object so the column reads consistently.
  const lastForceRow = Math.max(
    sourceLastDataRow,
    DATA_START_ROW + items.length - 1
  );
  for (let r = DATA_START_ROW; r <= lastForceRow; r++) {
    for (const col of ['F', 'G']) {
      ws.getCell(`${col}${r}`).alignment = {
        horizontal: 'left',
        vertical: 'middle',
      };
    }
  }

  const buffer = await wb.xlsx.writeBuffer();
  const blob = new Blob([buffer], {
    type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
  });
  const filename = `${safe(bom.projectNo)}_${safe(bom.bomNo)}_${safe(
    bom.bomName
  )}_Revision_History.xlsx`;
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  setTimeout(() => URL.revokeObjectURL(url), 1000);
}
