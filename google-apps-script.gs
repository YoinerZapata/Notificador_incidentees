/**
 * Notificador de Incidentes – conector para Google Sheets.
 * Pegar en: Hoja de cálculo > Extensiones > Apps Script.
 * Después de cambiar el código: Implementar > Gestionar implementaciones > ✏️ > Versión: Nueva versión > Implementar.
 */
const SHEET_NAME = 'Incidentes';
// Columna de la hoja -> dato enviado por el notificador
const COLUMNS = [
  ['ID', 'id'],
  ['Fecha', 'fecha'],
  ['Hora', 'hora'],
  ['Aplicativo', 'aplicativo'],
  ['Severidad', 'severidad'],
  ['Problema', 'problema'],
  ['Dificultad', 'dificultad'],
  ['Tiempo de restablecimiento', 'tiempoRestablecer'],
  ['Escalamiento', 'escalamiento'],
  ['Escalado a', 'escaladoA'],
  ['Reportado por', 'reportadoPor'],
  ['Observaciones', 'descripcion'],
  ['Marca de tiempo ISO', 'timestamp'],
  ['Recibido en servidor', '_server'],
];
const TZ = Session.getScriptTimeZone();

// Devuelve la hoja y un mapa encabezado -> número de columna. Agrega columnas que falten.
function getSheet_() {
  const ss = SpreadsheetApp.getActiveSpreadsheet();
  let sh = ss.getSheetByName(SHEET_NAME);
  if (!sh) sh = ss.insertSheet(SHEET_NAME);
  if (sh.getLastRow() === 0) {
    sh.getRange(1, 1, 1, COLUMNS.length).setValues([COLUMNS.map(c => c[0])]);
    sh.setFrozenRows(1);
    sh.getRange('A:C').setNumberFormat('@'); // ID, fecha y hora como texto exacto
  }
  let headers = sh.getRange(1, 1, 1, sh.getLastColumn()).getValues()[0].map(String);
  const missing = COLUMNS.map(c => c[0]).filter(h => headers.indexOf(h) === -1);
  if (missing.length) {
    sh.getRange(1, headers.length + 1, 1, missing.length).setValues([missing]);
    headers = headers.concat(missing);
  }
  sh.getRange(1, 1, 1, headers.length).setFontWeight('bold').setBackground('#2a78d6').setFontColor('#ffffff');
  const idx = {};
  headers.forEach((h, i) => (idx[h] = i));
  return { sh, headers, idx };
}

function json_(obj) {
  return ContentService.createTextOutput(JSON.stringify(obj)).setMimeType(ContentService.MimeType.JSON);
}

function doPost(e) {
  const lock = LockService.getScriptLock();
  lock.waitLock(15000); // evita choques cuando varias personas reportan a la vez
  try {
    const d = JSON.parse(e.postData.contents);
    if (!d.id || !d.fecha || !d.hora || !d.aplicativo) return json_({ ok: false, error: 'Datos incompletos' });
    const { sh, headers, idx } = getSheet_();
    const last = sh.getLastRow();
    if (last > 1) {
      const ids = sh.getRange(2, idx['ID'] + 1, last - 1, 1).getValues().map(r => String(r[0]));
      if (ids.indexOf(String(d.id)) !== -1) return json_({ ok: true, duplicate: true });
    }
    d._server = Utilities.formatDate(new Date(), TZ, 'yyyy-MM-dd HH:mm:ss');
    const row = headers.map(() => '');
    COLUMNS.forEach(([header, key]) => { row[idx[header]] = d[key] == null ? '' : String(d[key]); });
    sh.getRange(last + 1, 1, 1, row.length).setNumberFormat('@').setValues([row]);
    return json_({ ok: true });
  } catch (err) {
    return json_({ ok: false, error: String(err) });
  } finally {
    lock.releaseLock();
  }
}

function doGet(e) {
  if (e && e.parameter && e.parameter.ping) return json_({ ok: true, pong: true });
  const days = Number((e && e.parameter && e.parameter.days) || 60);
  const since = Utilities.formatDate(new Date(Date.now() - days * 86400000), TZ, 'yyyy-MM-dd');
  const { sh, idx } = getSheet_();
  const values = sh.getDataRange().getValues();
  const cell = (v, header, fmt) => {
    const x = idx[header] === undefined ? '' : v[idx[header]];
    return x instanceof Date ? Utilities.formatDate(x, TZ, fmt || 'yyyy-MM-dd HH:mm:ss') : String(x);
  };
  const rows = [];
  for (let i = 1; i < values.length; i++) {
    const v = values[i];
    const fecha = cell(v, 'Fecha', 'yyyy-MM-dd');
    if (!cell(v, 'ID') || fecha < since) continue;
    const r = {};
    COLUMNS.forEach(([header, key]) => {
      if (key !== '_server') r[key] = cell(v, header, header === 'Hora' ? 'HH:mm:ss' : header === 'Fecha' ? 'yyyy-MM-dd' : null);
    });
    // compatibilidad con hojas viejas que tenían la columna "Descripción"
    if (!r.descripcion && idx['Descripción'] !== undefined) r.descripcion = cell(v, 'Descripción');
    rows.push(r);
  }
  return json_({ ok: true, rows: rows });
}
