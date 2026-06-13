import ExcelJS from 'exceljs';

const COL_WIDTHS = {
  A: 8.71, B: 8.57, C: 10.43, D: 13.86, E: 10.71,
  F: 41.71, G: 69, H: 13.71, I: 15.43, J: 14, K: 33.14,
};

const COL_LETTERS = ['B', 'C', 'D', 'E', 'F', 'G', 'H', 'I', 'J', 'K'];

const HEADERS = {
  B: 'Date',
  C: 'Revision',
  D: 'Detail',
  E: 'Section',
  F: 'Part no',
  G: 'Description',
  H: 'Brand',
  I: 'Qty',
  J: 'Edit By',
  K: 'Remark',
};

const ORANGE_FILL = 'FFD46112';
const PEACH_FILL = 'FFFBE4D5';
const GRAY_BAND = 'FFD0CECE';
const HEADER_G_FILL = 'FFD8D8D8';
const BORDER_BLACK = 'FF000000';

const fill = (argb) => ({ type: 'pattern', pattern: 'solid', fgColor: { argb } });
const thin = (argb) => ({ style: 'thin', color: { argb } });
const box = (argb) => ({ top: thin(argb), bottom: thin(argb), left: thin(argb), right: thin(argb) });

const safe = (s) =>
  String(s || 'BOM').replace(/[\\/:*?"<>|]/g, '_').replace(/\s+/g, '_');

export async function exportBomXlsx(bom, items, user) {
  const wb = new ExcelJS.Workbook();
  wb.creator = 'Yogurt';
  wb.created = new Date();

  const ws = wb.addWorksheet('Sheet1', { views: [{ showGridLines: false }] });

  Object.entries(COL_WIDTHS).forEach(([k, w]) => {
    ws.getColumn(k).width = w;
  });

  const signer = user?.displayName || (user?.email?.split('@')[0]) || '';
  const today = new Date();

  ws.getRow(4).height = 23.25;

  // Row 5: orange title band
  ws.getRow(5).height = 25.5;
  ws.mergeCells('B5:K5');
  const title = ws.getCell('B5');
  title.value = 'REVISION HISTORY';
  title.font = { bold: true, size: 12 };
  title.fill = fill(ORANGE_FILL);
  title.alignment = { horizontal: 'center', vertical: 'middle' };

  // Row 6
  ws.getRow(6).height = 25.5;
  const b6 = ws.getCell('B6');
  b6.value = today;
  b6.numFmt = 'yyyy-mm-dd';
  b6.font = { bold: true, size: 11 };
  b6.fill = fill(PEACH_FILL);
  b6.alignment = { horizontal: 'center', vertical: 'middle' };

  const f6 = ws.getCell('F6');
  f6.value = `Project : ${bom.projectName || ''}`;
  f6.font = { bold: true, size: 11 };
  f6.alignment = { horizontal: 'center', vertical: 'middle' };

  const g6 = ws.getCell('G6');
  g6.value = [bom.projectNo, bom.bomNo, bom.bomName].filter(Boolean).join(' ');
  g6.font = { bold: true, size: 11 };
  g6.alignment = { horizontal: 'center', vertical: 'middle' };

  const h6 = ws.getCell('H6');
  h6.value = 'Ship date : ';
  h6.font = { size: 11 };
  h6.alignment = { horizontal: 'center', vertical: 'middle' };

  const i6 = ws.getCell('I6');
  i6.value = 'Mach Approved by';
  i6.font = { size: 8 };
  i6.alignment = { horizontal: 'center', vertical: 'middle' };

  // Row 7
  ws.getRow(7).height = 25.5;
  const i7 = ws.getCell('I7');
  i7.value = 'Elec Approved by';
  i7.font = { bold: true, size: 11 };
  i7.alignment = { horizontal: 'center', vertical: 'middle' };

  const j7 = ws.getCell('J7');
  j7.value = signer;
  j7.font = { bold: true, size: 11 };
  j7.alignment = { horizontal: 'center', vertical: 'middle' };

  const k7 = ws.getCell('K7');
  k7.value = signer;
  k7.font = { size: 9 };
  k7.alignment = { horizontal: 'center', vertical: 'middle' };

  // Row 8 spacer
  ws.getRow(8).height = 6.75;

  // Row 9: gray band "Description of change"
  ws.getRow(9).height = 19.5;
  ws.mergeCells('B9:K9');
  const r9 = ws.getCell('B9');
  r9.value = 'Description of change';
  r9.font = { bold: true, size: 12 };
  r9.fill = fill(GRAY_BAND);
  r9.alignment = { horizontal: 'center', vertical: 'middle' };

  // Row 10: column headers
  ws.getRow(10).height = 35.25;
  COL_LETTERS.forEach((col) => {
    const c = ws.getCell(`${col}10`);
    c.value = HEADERS[col];
    c.font = { bold: true, size: 11 };
    c.alignment = { horizontal: 'center', vertical: 'middle', wrapText: true };
    c.border = box(BORDER_BLACK);
    if (col === 'G') c.fill = fill(HEADER_G_FILL);
  });

  // Data rows
  items.forEach((it, i) => {
    const r = 11 + i;
    ws.getRow(r).height = 15;

    const setCell = (col, value, opts = {}) => {
      const c = ws.getCell(`${col}${r}`);
      if (value !== undefined && value !== null) c.value = value;
      c.font = { bold: true, size: 11, ...(opts.font || {}) };
      c.alignment = { vertical: 'middle', ...(opts.alignment || {}) };
      c.border = box(BORDER_BLACK);
      if (opts.numFmt) c.numFmt = opts.numFmt;
    };

    setCell('B', today, {
      numFmt: 'yyyy-mm-dd',
      alignment: { horizontal: 'center', vertical: 'middle' },
    });
    setCell('C', null, { alignment: { horizontal: 'center', vertical: 'middle' } });
    setCell('D', 'Add Item', { alignment: { horizontal: 'center', vertical: 'middle' } });
    setCell('E', 'Elec ', { alignment: { horizontal: 'center', vertical: 'middle' } });
    setCell('F', it.partNo || '', { alignment: { horizontal: 'left', vertical: 'middle' } });
    setCell('G', it.description || '', {
      alignment: { horizontal: 'left', vertical: 'middle', wrapText: true },
    });
    setCell('H', it.brand || '', { alignment: { horizontal: 'center', vertical: 'middle' } });
    setCell('I', it.qty || 1, {
      numFmt: '0',
      alignment: { horizontal: 'center', vertical: 'middle' },
    });
    setCell('J', signer, { alignment: { horizontal: 'center', vertical: 'middle' } });
    setCell('K', null, { alignment: { horizontal: 'left', vertical: 'middle' } });
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
