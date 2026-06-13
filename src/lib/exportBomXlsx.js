import ExcelJS from 'exceljs';

const TEMPLATE_PATH = '/samples/revision-history-template.xlsx';
const DATA_START_ROW = 11;
const DATA_COLS = ['B', 'C', 'D', 'E', 'F', 'G', 'H', 'I', 'J', 'K'];

function clone(o) {
  return o == null ? o : JSON.parse(JSON.stringify(o));
}

function applyStyle(target, template) {
  if (template.font) target.font = clone(template.font);
  if (template.fill) target.fill = clone(template.fill);
  if (template.alignment) target.alignment = clone(template.alignment);
  if (template.border) target.border = clone(template.border);
  if (template.numFmt) target.numFmt = template.numFmt;
}

const safe = (s) =>
  String(s || 'BOM').replace(/[\\/:*?"<>|]/g, '_').replace(/\s+/g, '_');

export async function exportBomXlsx(bom, items, user) {
  const res = await fetch(TEMPLATE_PATH);
  if (!res.ok) {
    throw new Error(`Could not load Excel template (${res.status})`);
  }
  const buf = await res.arrayBuffer();

  const wb = new ExcelJS.Workbook();
  await wb.xlsx.load(buf);

  const ws = wb.worksheets[0];
  const signer = user?.displayName || user?.email?.split('@')[0] || '';
  const today = new Date();

  // --- Header section: keep the source's styles, just rewrite values ---
  ws.getCell('B6').value = today;
  ws.getCell('B6').numFmt = 'yyyy-mm-dd';
  ws.getCell('F6').value = `Project : ${[bom.projectNo, bom.projectName]
    .filter(Boolean)
    .join(' ')}`;
  ws.getCell('G6').value = [bom.projectNo, bom.projectName, bom.bomName]
    .filter(Boolean)
    .join(' ');
  ws.getCell('J7').value = signer;
  ws.getCell('K7').value = signer;

  // --- Data section ---
  // Snapshot the styles of the source's first data row (11) so we can
  // re-apply them to every output row, including ones beyond the source's
  // pre-styled range.
  const rowTemplate = {};
  for (const col of DATA_COLS) {
    const c = ws.getCell(`${col}${DATA_START_ROW}`);
    rowTemplate[col] = {
      font: c.font,
      fill: c.fill,
      alignment: c.alignment,
      border: c.border,
      numFmt: c.numFmt,
    };
  }

  // Wipe values in the data range (keep styles intact on existing rows).
  // Look up to the source's last styled row but cap so the export stays small.
  const lastRow = Math.min(ws.actualRowCount || ws.rowCount || 100, 200);
  for (let r = DATA_START_ROW; r <= lastRow; r++) {
    for (const col of DATA_COLS) {
      ws.getCell(`${col}${r}`).value = null;
    }
  }

  // Write items
  items.forEach((it, i) => {
    const r = DATA_START_ROW + i;
    const set = (col, value, opts = {}) => {
      const cell = ws.getCell(`${col}${r}`);
      cell.value = value == null ? null : value;
      applyStyle(cell, rowTemplate[col]);
      if (opts.numFmt) cell.numFmt = opts.numFmt;
    };
    set('B', today, { numFmt: 'yyyy-mm-dd' });
    set('C', null);
    set('D', 'Add Item');
    set('E', 'Elec ');
    set('F', it.partNo || '');
    set('G', it.description || '');
    set('H', it.brand || '');
    set('I', it.qty || 1, { numFmt: '0' });
    set('J', signer);
    set('K', null);
    ws.getRow(r).height = 15;
  });

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
