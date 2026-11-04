import { test } from 'node:test';
import assert from 'node:assert/strict';
import { empty, sell } from '../src/domain.js';
import { monthlyArchive } from '../src/monthlyArchive.js';
import { loadMonthlyReport, readSavedReport, parseMonthlyReport } from '../src/reportReader.js';
const month = '2026-09';
function directory(name, entries = []) {
  return {
    kind: 'directory',
    name,
    async getDirectoryHandle(n) {
      const e = entries.find((e) => e.kind === 'directory' && e.name === n);
      if (!e) {
        const x = Error('Falta carpeta');
        x.name = 'NotFoundError';
        throw x;
      }
      return e;
    },
    async getFileHandle(n) {
      const e = entries.find((e) => e.kind === 'file' && e.name === n);
      if (!e) {
        const x = Error('Falta archivo');
        x.name = 'NotFoundError';
        throw x;
      }
      return e;
    },
    async *values() {
      yield* entries;
    },
  };
}
const file = (name, text) => ({
  kind: 'file',
  name,
  async getFile() {
    return {
      async text() {
        return text;
      },
    };
  },
});
async function closure(name, report, bad = false) {
  const text = JSON.stringify(report);
  const hash = Array.from(
    new Uint8Array(await crypto.subtle.digest('SHA-256', new TextEncoder().encode(text))),
    (b) => b.toString(16).padStart(2, '0')
  ).join('');
  return directory(name, [
    file('detalle-mensual.json', text),
    file(
      'verificacion.json',
      JSON.stringify({
        month,
        files: [{ name: 'detalle-mensual.json', sha256: bad ? 'incorrecto' : hash }],
      })
    ),
  ]);
}
function report() {
  const d = empty();
  sell(d, { expression: '25' });
  d.sales[0].at = new Date(2026, 8, 5, 12).toISOString();
  return monthlyArchive(d, month, new Date(2026, 9, 1));
}
const root = (entries) => directory('Dulceria', [directory('2026', [directory(month, entries)])]);
test('lee el cierre indicado en la carpeta y no confunde otro intento posterior', async () => {
  const r = report(),
    later = { ...r, exportedAt: new Date(2026, 9, 2).toISOString(), sales: [] };
  const folder = root([
    await closure('cierre-confirmado', r),
    await closure('cierre-intento', later),
  ]);
  const d = empty();
  d.carryover = {
    until: new Date(2026, 9, 1).toISOString(),
    archiveIndex: { [month]: '2026/2026-09/cierre-confirmado' },
  };
  const before = structuredClone(d);
  const result = await loadMonthlyReport(d, month, folder);
  assert.equal(result.report.sales[0].total, 2500);
  assert.match(result.source, /carpeta/);
  assert.deepEqual(d, before);
});
test('compatibilidad con cierres antiguos y exportaciones manuales', async () => {
  const r = report();
  assert.equal(
    (await readSavedReport(root([await closure('cierre-antiguo', r)]), month)).sales.length,
    1
  );
  assert.equal(
    (
      await readSavedReport(
        root([file('dulceria-2026-09-detalle-fecha.json', JSON.stringify(r))]),
        month
      )
    ).sales.length,
    1
  );
});
test('archivo corrupto, sin permiso de lectura o faltante no genera informe vacío', async () => {
  await assert.rejects(
    readSavedReport(root([await closure('cierre-danado', report(), true)]), month),
    /dañados/
  );
  const d = empty();
  d.carryover = { until: new Date(2026, 9, 1).toISOString() };
  await assert.rejects(loadMonthlyReport(d, month), /carpeta/);
  await assert.rejects(loadMonthlyReport(d, month, root([])), /No se encontró/);
  assert.throws(
    () => parseMonthlyReport(JSON.stringify({ ...report(), month: '2026-08' }), month),
    /incompleto/
  );
});
test('mes sin cerrar se consulta desde la app aunque no exista un archivo mensual', async () => {
  const result = await loadMonthlyReport(empty(), month);
  assert.equal(result.report.sales.length, 0);
  assert.match(result.source, /actuales/);
  await assert.rejects(loadMonthlyReport(empty(), '2026-13'), /válido/);
  await assert.rejects(loadMonthlyReport(empty(), '2999-01'), /comenzado/);
});
