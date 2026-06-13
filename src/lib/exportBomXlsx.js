import ExcelJS from 'exceljs';

const HEADER_FILL = 'FF1F2937';
const HEADER_TEXT = 'FFFFFFFF';
const HEADER_BORDER = 'FFCBD5E1';
const ROW_BORDER = 'FFE2E8F0';

const HEADERS = [
  'Date',
  'Revision',
  'Detail',
  'Section',
  'Part no',
  'Description',
  'Brand',
  'Qty',
  'Edit By',
  'Remark',
];

const COL_KEYS = ['B', 'C', 'D', 'E', 'F', 'G', 'H', 'I', 'J', 'K'];

const thinBorder = (color) => ({
  top: { style: 'thin', color: { argb: color } },
  bottom: { style: 'thin', color: { argb: color } },
  left: { style: 'thin', color: { argb: color } },
  right: { style: 'thin', color: { argb: color } },
});

const safeName = (s) =>
  String(s || 'BOM').replace(/[\\/:*?"<>|]/g, '_').replace(/\s+/g, '_');

export async function exportBomXlsx(bom, items, user) {
  const wb = new ExcelJS.Workbook();
  wb.creator = 'Yogurt';
  wb.created = new Date();

  const ws = wb.addWorksheet('Revision History', {
    views: [{ showGridLines: false }],
  });

  // Row 5: title
  const titleCell = ws.getCell('B5');
  titleCell.value = 'REVISION HISTORY';
  titleCell.font = { bold: true, size: 14, color: { argb: 'FF1F2937' } };

  // Row 6: Date / Project / Ship date / Mach Approved by
  ws.getCell('B6').value = 'Date :';
  ws.getCell('B6').font = { bold: true };
  ws.getCell('F6').value = `Project : ${bom.projectName || ''}`;
  ws.getCell('F6').font = { bold: true };
  ws.getCell('G6').value = bom.projectNo || '';
  ws.getCell('H6').value = 'Ship date :';
  ws.getCell('H6').font = { bold: true };
  ws.getCell('I6').value = 'Mach Approved by';
  ws.getCell('I6').font = { bold: true };

  // Row 7: Elec Approved by + signer name
  const signerName = user?.displayName || user?.email || '';
  ws.getCell('I7').value = 'Elec Approved by';
  ws.getCell('I7').font = { bold: true };
  ws.getCell('J7').value = signerName;
  ws.getCell('K7').value = signerName;

  // Row 9: description of change
  ws.getCell('B9').value = 'Description of change';
  ws.getCell('B9').font = { bold: true };

  // Row 10: column headers (B–K)
  HEADERS.forEach((header, i) => {
    const cell = ws.getCell(`${COL_KEYS[i]}10`);
    cell.value = header;
    cell.font = { bold: true, color: { argb: HEADER_TEXT } };
    cell.fill = {
      type: 'pattern',
      pattern: 'solid',
      fgColor: { argb: HEADER_FILL },
    };
    cell.alignment = { horizontal: 'center', vertical: 'middle' };
    cell.border = thinBorder(HEADER_BORDER);
  });
  ws.getRow(10).height = 22;

  // Data rows
  const today = new Date().toISOString().slice(0, 10);
  items.forEach((it, i) => {
    const row = 11 + i;
    const values = [
      today,
      '',
      'Add Item',
      'Elec',
      it.partNo || '',
      it.description || '',
      it.brand || '',
      it.qty || 1,
      signerName,
      '',
    ];
    values.forEach((val, j) => {
      const cell = ws.getCell(`${COL_KEYS[j]}${row}`);
      cell.value = val;
      cell.alignment = {
        horizontal: j === 7 ? 'center' : j === 0 || j === 1 || j === 2 || j === 3 ? 'center' : 'left',
        vertical: 'middle',
        wrapText: j === 5,
      };
      cell.border = thinBorder(ROW_BORDER);
      if (j === 7) cell.numFmt = '0';
    });
  });

  // Column widths — compute roughly from content length
  COL_KEYS.forEach((key) => {
    const col = ws.getColumn(key);
    let maxLen = 10;
    col.eachCell({ includeEmpty: false }, (cell) => {
      const v = cell.value == null ? '' : String(cell.value);
      const lines = v.split(/\r?\n/);
      const longest = Math.max(...lines.map((l) => l.length));
      if (longest > maxLen) maxLen = longest;
    });
    col.width = Math.min(Math.max(maxLen + 2, 10), 50);
  });

  const buffer = await wb.xlsx.writeBuffer();
  const blob = new Blob([buffer], {
    type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
  });
  const filename = `${safeName(bom.bomNo)}_${safeName(bom.bomName)}_Revision_History.xlsx`;
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  setTimeout(() => URL.revokeObjectURL(url), 1000);
}
