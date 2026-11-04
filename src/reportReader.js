import { monthKey, monthlyArchive, monthlyHtml } from './monthlyArchive.js';
const validMonth = (m) => /^\d{4}-(0[1-9]|1[0-2])$/.test(m);
export function parseMonthlyReport(text, month) {
  const r = JSON.parse(text);
  if (
    r?.format !== 'dulceria-informe-mensual' ||
    r.version !== 1 ||
    r.month !== month ||
    !Number.isFinite(Date.parse(r.exportedAt)) ||
    !['products', 'people', 'sales', 'payments', 'stock'].every((k) => Array.isArray(r[k])) ||
    !r.finance ||
    !r.cashbox ||
    !['movements', 'withdrawals', 'consumptions'].every((k) => Array.isArray(r.finance[k])) ||
    !['counts', 'adjustments'].every((k) => Array.isArray(r.cashbox[k]))
  )
    throw Error('El archivo mensual está incompleto o no corresponde al mes elegido.');
  // Regenerate escaped HTML instead of executing HTML read from disk.
  monthlyHtml(r);
  return r;
}
async function readText(folder, name) {
  return (await (await folder.getFileHandle(name)).getFile()).text();
}
async function readClosed(folder, month) {
  const text = await readText(folder, 'detalle-mensual.json');
  const manifest = JSON.parse(await readText(folder, 'verificacion.json'));
  const expected = manifest.files?.find((f) => f.name === 'detalle-mensual.json')?.sha256;
  const hash = Array.from(
    new Uint8Array(await crypto.subtle.digest('SHA-256', new TextEncoder().encode(text))),
    (b) => b.toString(16).padStart(2, '0')
  ).join('');
  if (manifest.month !== month || expected !== hash)
    throw Error('El detalle del mes no coincide con su verificación.');
  return parseMonthlyReport(text, month);
}
export async function readSavedReport(folder, month, path) {
  const year = await folder.getDirectoryHandle(month.slice(0, 4));
  const dir = await year.getDirectoryHandle(month);
  if (path) return readClosed(await dir.getDirectoryHandle(path.split('/').at(-1)), month);
  const candidates = [];
  let invalid = false;
  for await (const entry of dir.values()) {
    try {
      if (entry.kind === 'directory' && entry.name.startsWith('cierre-'))
        candidates.push(await readClosed(entry, month));
      if (
        entry.kind === 'file' &&
        entry.name.startsWith(`dulceria-${month}-detalle-`) &&
        entry.name.endsWith('.json')
      )
        candidates.push(parseMonthlyReport(await (await entry.getFile()).text(), month));
    } catch {
      invalid = true;
    }
  }
  if (!candidates.length) {
    if (invalid)
      throw Error(
        'Se encontraron archivos dañados o sin verificar. Tus datos no se han modificado.'
      );
    const e = Error('No hay un informe guardado para ese mes.');
    e.name = 'NotFoundError';
    throw e;
  }
  return candidates.sort((a, b) => b.exportedAt.localeCompare(a.exportedAt))[0];
}
export async function loadMonthlyReport(data, month, folder) {
  if (!validMonth(month)) throw Error('Selecciona un mes válido.');
  if (month > monthKey(new Date())) throw Error('Ese mes todavía no ha comenzado.');
  const archived = data.carryover && month < monthKey(data.carryover.until);
  if (!archived)
    return { report: monthlyArchive(data, month), source: 'Registros actuales de la aplicación' };
  if (!folder)
    throw Error('Este mes está archivado. Selecciona la carpeta donde guardaste sus reportes.');
  const path =
    data.carryover.archiveIndex?.[month] ||
    (data.carryover.archivePath?.startsWith(`${month.slice(0, 4)}/${month}/`)
      ? data.carryover.archivePath
      : null);
  try {
    return {
      report: await readSavedReport(folder, month, path),
      source: 'Informe leído de tu carpeta guardada',
    };
  } catch (e) {
    if (e.name === 'NotFoundError')
      throw Error(
        'No se encontró el reporte de ese mes en esta carpeta. Revisa si moviste los archivos o seleccionaste otra carpeta.'
      );
    throw e;
  }
}
