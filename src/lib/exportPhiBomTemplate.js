import ExcelJS from 'exceljs';

const TEMPLATE_PATH = '/samples/phi-bom-template.xlsx';
const DATA_START_ROW = 9;
const DATA_END_ROW = 60;

const safe = (s) =>
  String(s || 'BOM').replace(/[\\/:*?"<>|]/g, '_').replace(/\s+/g, '_');

export async function exportPhiBomTemplate(bom, items) {
  const res = await fetch(TEMPLATE_PATH);
  if (!res.ok) throw new Error(`Could not load Excel template (${res.status})`);
  const buf = await res.arrayBuffer();

  const wb = new ExcelJS.Workbook();
  await wb.xlsx.load(buf);
  const ws = wb.getWorksheet('BOM') || wb.worksheets[0];

  // Project info — values only, source styles untouched
  ws.getCell('B2').value = bom?.projectNo || '';
  ws.getCell('B3').value = bom?.projectName || '';
  ws.getCell('B4').value = `${bom?.bomNo || ''} ${bom?.bomName || ''}`.trim();
  // B5 (Customer) and B6 (Revision) left blank for the user to fill.

  // Item rows — the source's rows 9..60 are already empty styled rows with
  // yellow Unit fill and Classification/Route dropdowns. We just write the
  // values we have; nothing else needs touching.
  (items || []).forEach((it, i) => {
    const r = DATA_START_ROW + i;
    if (r > DATA_END_ROW) return;
    ws.getCell(`A${r}`).value = it.partNo || '';
    ws.getCell(`B${r}`).value = it.description || '';
    ws.getCell(`C${r}`).value = it.qty || 1;
    ws.getCell(`D${r}`).value = 'ชิ้น';
    // E (Classification), F (Route), G (Material) left blank so the
    // designer picks via the source's dropdowns.
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
