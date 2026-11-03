import { transact } from './db.js';
import { uid } from './domain.js';
import { monthlyArchive, monthlyHtml } from './monthlyArchive.js';
import { closeMonth, pendingMonths } from './monthlyClose.js';
export async function verifiedWrite(folder, name, text) {
  const handle = await folder.getFileHandle(name, { create: true });
  const writer = await handle.createWritable();
  try {
    await writer.write(text);
    await writer.close();
  } catch (e) {
    try {
      await writer.abort();
    } catch {}
    throw e;
  }
  if ((await (await handle.getFile()).text()) !== text)
    throw Error(`No se pudo verificar ${name}. Tus registros siguen en el navegador.`);
}
export async function archiveOne(
  folder,
  month,
  { now = new Date(), read = () => transact(), commit = (fn) => transact(fn) } = {}
) {
  const before = await read();
  const next = closeMonth(before, month, now);
  const yearFolder = await folder.getDirectoryHandle(month.slice(0, 4), { create: true });
  const monthFolder = await yearFolder.getDirectoryHandle(month, { create: true });
  const run = `cierre-${uid()}`;
  const target = await monthFolder.getDirectoryHandle(run, { create: true });
  next.carryover.archivePath = `${month.slice(0, 4)}/${month}/${run}`;
  const report = monthlyArchive(before, month, now);
  const snapshot = JSON.stringify(before);
  const files = [
    ['antes-del-cierre.json', snapshot],
    ['informe-mensual.html', monthlyHtml(report)],
    ['detalle-mensual.json', JSON.stringify(report)],
    ['despues-del-cierre.json', JSON.stringify(next)],
  ];
  const hashes = [];
  for (const [name, text] of files) {
    await verifiedWrite(target, name, text);
    const digest = await crypto.subtle.digest('SHA-256', new TextEncoder().encode(text));
    hashes.push({
      name,
      sha256: Array.from(new Uint8Array(digest), (b) => b.toString(16).padStart(2, '0')).join(''),
    });
  }
  await verifiedWrite(
    target,
    'verificacion.json',
    JSON.stringify({
      version: 1,
      month,
      generatedAt: now.toISOString(),
      files: hashes,
      note: 'Archivos verificados. Un cierre solo se aplica si la base no cambió durante la exportación. despues-del-cierre.json es la continuación preparada; puede restaurarse si fuera necesario.',
    })
  );
  return commit((current) => {
    if (JSON.stringify(current) !== snapshot)
      throw Error(
        'Hubo movimientos mientras se guardaba. Tus registros se conservan y el cierre se reintentará.'
      );
    return next;
  });
}
export async function runMonthlyArchive(folder, options = {}) {
  if ((await folder.queryPermission({ mode: 'readwrite' })) !== 'granted')
    throw Error(
      'Falta permiso para la carpeta. En Respaldo pulsa Autorizar carpeta para continuar.'
    );
  const execute = async () => {
    const read = options.read || (() => transact());
    let count = 0;
    while (true) {
      const months = pendingMonths(await read(), options.now || new Date(), options.startMonth);
      if (!months.length) return count;
      await archiveOne(folder, months[0], options);
      count++;
      // Yield between months; newer sales cause a safe compare-and-swap failure.
    }
  };
  if (globalThis.navigator?.locks)
    return navigator.locks.request('dulceria-monthly-close', execute);
  return execute();
}
