import ExcelJS from 'exceljs';

const TEMPLATE_PATH = '/samples/phi-bom-template.xlsx';
const DATA_START_ROW = 9;
const DATA_END_ROW = 60;

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

export async function exportPhiBomTemplate(bom, items) {
  const res = await fetch(TEMPLATE_PATH);
  if (!res.ok) {
    throw new Error(`Could not load Excel template (${res.status})`);
  }
  const buf = await res.arrayBuffer();

  const wb = new ExcelJS.Workbook();
  await wb.xlsx.load(buf);

  const ws = wb.getWorksheet('BOM') || wb.worksheets[0];

  // Project info section (B2..B6)
  ws.getCell('B2').value = bom?.projectNo || '';
  ws.getCell('B3').value = bom?.projectName || '';
  ws.getCell('B4').value = `${bom?.bomNo || ''} ${bom?.bomName || ''}`.trim();
  // B5 (Customer), B6 (Revision) — leave as-is so users can fill them.

  // Snapshot styling of the first data row from the template (row 9) so we
  // can re-apply per cell when overwriting.
  const cellTemplates = {};
  for (const col of ['A', 'B', 'C', 'D', 'E', 'F', 'G']) {
    const c = ws.getCell(`${col}${DATA_START_ROW}`);
    cellTemplates[col] = {
      font: c.font,
      fill: c.fill,
      alignment: c.alignment,
      border: c.border,
      numFmt: c.numFmt,
    };
  }

  // Wipe existing data range (keeps the source's row styles, fills, and
  // dropdown validations because exceljs preserves those at the cell level).
  for (let r = DATA_START_ROW; r <= DATA_END_ROW; r++) {
    for (const col of ['A', 'B', 'C', 'D', 'E', 'F', 'G']) {
      ws.getCell(`${col}${r}`).value = null;
    }
  }

  // Write our items
  (items || []).forEach((it, i) => {
    const r = DATA_START_ROW + i;
    if (r > DATA_END_ROW) return;
    const set = (col, value, opts = {}) => {
      const cell = ws.getCell(`${col}${r}`);
      cell.value = value == null ? null : value;
      applyStyle(cell, cellTemplates[col]);
      if (opts.numFmt) cell.numFmt = opts.numFmt;
    };
    set('A', it.partNo || '');
    set('B', it.description || '');
    set('C', it.qty || 1, { numFmt: '0' });
    set('D', 'ชิ้น');
    // E (Classification), F (Route), G (Material) intentionally left blank
    // so the user picks from the source's dropdowns.
    set('E', null);
    set('F', null);
    set('G', null);
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
