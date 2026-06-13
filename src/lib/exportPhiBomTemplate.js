import ExcelJS from 'exceljs';

const PHI_ORANGE = 'FFE74504';
const YELLOW_FILL = 'FFFFF8E1';
const BORDER_GRAY = 'FFCCCCCC';

const BOM_HEADERS = [
  'Part No.',
  'Description',
  'Qty',
  'Unit',
  'Classification',
  'Route',
  'Material',
];

const BOM_COL_WIDTHS = [24, 38, 8, 10, 18, 14, 24];

const PROJECT_LABELS = ['Job No:', 'Project:', 'Module:', 'Customer:', 'Revision:'];

const CLASSIFICATION_LIST = '"PHI_PART,PHI_PART_WITH_MATERIAL,STD_PART,STD_FASTENER"';
const ROUTE_LIST = '"PRODUCTION,PURCHASING"';

const fill = (argb) => ({ type: 'pattern', pattern: 'solid', fgColor: { argb } });
const thin = (argb) => ({ style: 'thin', color: { argb } });
const box = (argb) => ({ top: thin(argb), bottom: thin(argb), left: thin(argb), right: thin(argb) });

const safe = (s) =>
  String(s || 'BOM').replace(/[\\/:*?"<>|]/g, '_').replace(/\s+/g, '_');

export async function exportPhiBomTemplate(bom, items) {
  const wb = new ExcelJS.Workbook();
  wb.creator = 'Yogurt';
  wb.created = new Date();

  // === Sheet 1: BOM ===
  const ws = wb.addWorksheet('BOM', { views: [{ showGridLines: false }] });

  BOM_COL_WIDTHS.forEach((w, i) => {
    ws.getColumn(i + 1).width = w;
  });

  // Row 1: title
  ws.getRow(1).height = 28;
  ws.mergeCells('A1:G1');
  const title = ws.getCell('A1');
  title.value = 'PHI BOM TEMPLATE — Mode 2 (Design กรอกเอง)';
  title.font = { bold: true, size: 14, color: { argb: PHI_ORANGE } };
  title.alignment = { horizontal: 'center', vertical: 'middle' };

  // Rows 2-6: project info (yellow inputs in col B)
  const projectValues = {
    'Job No:': bom?.projectNo || '',
    'Project:': bom?.projectName || '',
    'Module:': `${bom?.bomNo || ''} ${bom?.bomName || ''}`.trim(),
    'Customer:': '',
    'Revision:': '',
  };
  PROJECT_LABELS.forEach((label, i) => {
    const r = i + 2;
    const a = ws.getCell(`A${r}`);
    a.value = label;
    a.font = { bold: true, size: 11 };
    a.alignment = { horizontal: 'right', vertical: 'middle' };

    const b = ws.getCell(`B${r}`);
    b.value = projectValues[label];
    b.font = { size: 11 };
    b.fill = fill(YELLOW_FILL);
    b.alignment = { vertical: 'middle' };

    const c = ws.getCell(`C${r}`);
    c.fill = fill(YELLOW_FILL);
  });

  // Row 8: table header
  ws.getRow(8).height = 24;
  BOM_HEADERS.forEach((h, i) => {
    const cell = ws.getRow(8).getCell(i + 1);
    cell.value = h;
    cell.font = { bold: true, size: 11, color: { argb: 'FFFFFFFF' } };
    cell.fill = fill(PHI_ORANGE);
    cell.alignment = { horizontal: 'center', vertical: 'middle' };
    cell.border = box(BORDER_GRAY);
  });

  // Data rows 9..60 (52 rows)
  const data = items || [];
  const totalRows = 52;
  for (let i = 0; i < totalRows; i++) {
    const r = 9 + i;
    const it = data[i];

    const partNo = ws.getCell(`A${r}`);
    partNo.value = it?.partNo || '';
    partNo.font = { size: 11 };
    partNo.border = box(BORDER_GRAY);
    partNo.alignment = { vertical: 'middle' };

    const desc = ws.getCell(`B${r}`);
    desc.value = it?.description || '';
    desc.font = { size: 11 };
    desc.border = box(BORDER_GRAY);
    desc.alignment = { vertical: 'middle', wrapText: true };

    const qty = ws.getCell(`C${r}`);
    qty.value = it ? it.qty || 1 : null;
    qty.font = { size: 11 };
    qty.border = box(BORDER_GRAY);
    qty.alignment = { horizontal: 'center', vertical: 'middle' };
    if (it) qty.numFmt = '0';

    const unit = ws.getCell(`D${r}`);
    unit.value = it ? 'ชิ้น' : null;
    unit.font = { size: 11 };
    unit.fill = fill(YELLOW_FILL);
    unit.border = box(BORDER_GRAY);
    unit.alignment = { horizontal: 'center', vertical: 'middle' };

    const cls = ws.getCell(`E${r}`);
    cls.font = { size: 11 };
    cls.border = box(BORDER_GRAY);
    cls.alignment = { vertical: 'middle' };

    const route = ws.getCell(`F${r}`);
    route.font = { size: 11 };
    route.border = box(BORDER_GRAY);
    route.alignment = { vertical: 'middle' };

    const mat = ws.getCell(`G${r}`);
    mat.font = { size: 11 };
    mat.border = box(BORDER_GRAY);
    mat.alignment = { vertical: 'middle' };
  }

  // Data validations (dropdowns)
  for (let r = 9; r <= 60; r++) {
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

  // === Sheet 2: คำแนะนำ ===
  const guide = wb.addWorksheet('คำแนะนำ', { views: [{ showGridLines: false }] });
  guide.getColumn(1).width = 28;
  guide.getColumn(2).width = 70;

  const titleG = guide.getCell('A1');
  titleG.value = '📋 PHI BOM Template — คำแนะนำ';
  titleG.font = { bold: true, size: 14, color: { argb: PHI_ORANGE } };

  const lines = [
    [3, '1. Project Info (Row 2-6)', 'กรอก Job No, Project, Module, Customer, Revision ในช่องสีเหลือง', true],
    [5, '2. Items (Row 9 ลงไป)', '', true],
    [6, '  Part No.', 'PHI-xxxx (ทำเอง) / STD-xxxx (น็อต) / vendor PN (เช่น MHL2-16D-M9B)', false],
    [7, '  Description', 'รายละเอียดสั้น — สำหรับ PHI Part ถ้าเว้นว่าง = ไม่มีต้นแบบวัสดุ', false],
    [8, '  Qty', 'จำนวน (>0)', false],
    [9, '  Unit', 'ชิ้น (default), m, kg, ... ตามที่เหมาะสม', false],
    [10, '  Classification', 'เลือกจาก dropdown:', false],
    [11, '    PHI_PART', '= ชิ้นที่ผลิตเอง ไม่ต้องสั่งวัสดุเพิ่ม', false],
    [12, '    PHI_PART_WITH_MATERIAL', '= ผลิตเอง + ต้องสั่งวัสดุ (กรอก Material col H)', false],
    [13, '    STD_PART', '= ของมาตรฐานที่ต้องซื้อ (sensor, motor, bearing)', false],
    [14, '    STD_FASTENER', '= น็อต/สกรู/แหวน (สั่งซื้อ)', false],
    [15, '  Route', 'PRODUCTION (ส่งฝ่ายผลิต) / PURCHASING (ส่งจัดซื้อ)', false],
    [16, '  Material (col G)', 'กรอกเฉพาะ PHI_PART_WITH_MATERIAL — เช่น "SS400 50×100×500"', false],
    [18, '3. หลัง upload', 'ระบบจะแสดงข้อมูลเพื่อให้ตรวจสอบ + edit ก่อนบันทึกจริง', true],
    [20, '📁 Mode อื่น', '', true],
    [21, '  Mode 1: SolidWorks export', 'ใช้ไฟล์ .xls ที่ SolidWorks generate ตรงๆ — ไม่ต้องใช้ template นี้', false],
    [22, '  Mode 3: Electrical & Software', 'รอ — จะให้ template เฉพาะภายหลัง', false],
  ];
  lines.forEach(([row, a, b, bold]) => {
    const ac = guide.getCell(`A${row}`);
    ac.value = a;
    if (bold) ac.font = { bold: true };
    ac.alignment = { vertical: 'top', wrapText: true };
    const bc = guide.getCell(`B${row}`);
    bc.value = b;
    bc.alignment = { vertical: 'top', wrapText: true };
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
