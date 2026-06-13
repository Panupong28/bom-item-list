import ExcelJS from 'exceljs';

const TEMPLATE_PATH = '/samples/phi-bom-template.xlsx';
const DATA_START_ROW = 9;
const SOURCE_LAST_STYLED_ROW = 60;
const COLS = ['A', 'B', 'C', 'D', 'E', 'F', 'G'];
const CLASSIFICATION_LIST = '"PHI_PART,PHI_PART_WITH_MATERIAL,STD_PART,STD_FASTENER"';
const ROUTE_LIST = '"PRODUCTION,PURCHASING"';

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

export async function exportPhiBomTemplate(bom, items) {
  const res = await fetch(TEMPLATE_PATH);
  if (!res.ok) throw new Error(`Could not load Excel template (${res.status})`);
  const buf = await res.arrayBuffer();

  const wb = new ExcelJS.Workbook();
  await wb.xlsx.load(buf);
  const ws = wb.getWorksheet('BOM') || wb.worksheets[0];

  // Project info
  ws.getCell('B2').value = bom?.projectNo || '';
  ws.getCell('B3').value = bom?.projectName || '';
  ws.getCell('B4').value = `${bom?.bomNo || ''} ${bom?.bomName || ''}`.trim();

  // Snapshot row 9 so we can paint the same styles + dropdowns on rows
  // beyond the source's pre-styled range (anything past row 60).
  const rowSnap = snapshotRow(ws, DATA_START_ROW, COLS);
  const sourceRow9Height = ws.getRow(DATA_START_ROW).height;

  const list = items || [];
  list.forEach((it, i) => {
    const r = DATA_START_ROW + i;

    // For overflow rows, paint the snapshot first so the cells have the
    // same styling as rows 9-60 (yellow on D, borders, etc.).
    if (r > SOURCE_LAST_STYLED_ROW) {
      for (const col of COLS) applySnapshot(ws.getCell(`${col}${r}`), rowSnap[col]);
      if (sourceRow9Height) ws.getRow(r).height = sourceRow9Height;
      ws.dataValidations.add(`E${r}`, {
        type: 'list',
        allowBlank: true,
        formulae: [CLASSIFICATION_LIST],
      });
      ws.dataValidations.add(`F${r}`, {
        type: 'list',
        allowBlank: true,
        formulae: [ROUTE_LIST],
      });
    }

    ws.getCell(`A${r}`).value = it.partNo || '';
    ws.getCell(`B${r}`).value = it.description || '';
    ws.getCell(`C${r}`).value = it.qty || 1;
    ws.getCell(`D${r}`).value = 'ชิ้น';
    // E (Classification), F (Route), G (Material) left blank — the designer
    // picks via the dropdowns.
  });

  const buffer = await wb.xlsx.writeBuffer();
  const blob = new Blob([buffer], {
    type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
  });
  const filename = `${safe(bom?.projectNo)}_${safe(bom?.bomNo)}_PHI_BOM_Template.xlsx`;
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  setTimeout(() => URL.revokeObjectURL(url), 1000);
}
