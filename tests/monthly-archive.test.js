import { test } from 'node:test';
import assert from 'node:assert/strict';
import { empty, saveProduct, sell, pay, validate, balance } from '../src/domain.js';
import {
  monthlyArchive,
  monthlyHtml,
  archiveFiles,
  monthKey,
  customerGroups,
} from '../src/monthlyArchive.js';
test('separa meses por fecha local e incluye detalles y cobros de fiados anteriores', () => {
  const d = empty();
  saveProduct(d, { name: '<script>alert(1)</script>', price: 500, cost: 200, stock: 5 });
  d.people.push({ id: 'ana', name: 'Ana', phone: '', notes: '' });
  sell(d, { person: 'ana', cart: [{ product: d.products[0].id, qty: 2 }] });
  d.sales[0].at = new Date(2026, 8, 30, 23, 59).toISOString();
  pay(d, 'ana', 500);
  d.payments[0].at = new Date(2026, 9, 1, 0, 0).toISOString();
  const before = structuredClone(d);
  const report = monthlyArchive(d, '2026-10');
  assert.equal(report.sales.length, 0);
  assert.equal(report.payments.length, 1);
  assert.equal(monthlyArchive(d, '2026-09').sales[0].items[0].qty, 2);
  assert.equal(balance(d, 'ana'), 500);
  assert.deepEqual(d, before);
  assert.throws(() => monthlyArchive(d, '2026-13'));
  assert.throws(() => validate(report));
  const files = archiveFiles(d, '2026-09');
  validate(JSON.parse(files[2].text));
  assert.equal(files.length, 3);
  assert.equal(JSON.parse(files[2].text).sales.length, 1);
  assert.match(files[0].text, /&lt;script&gt;/);
  assert.doesNotMatch(files[0].text, /<script>/);
  assert.match(files[0].text, /Piezas vendidas/);
});
test('mes sin operaciones y archivos antiguos sin finanzas son compatibles', () => {
  const report = monthlyArchive(empty(), '2026-01');
  assert.deepEqual(report.finance.movements, []);
  assert.match(monthlyHtml(report), /Sin movimientos/);
  assert.equal(monthKey(new Date(2026, 0, 1)), '2026-01');
});

test('apartados por cliente ordenan el total comprado, no los abonos, y contado queda separado', () => {
  const r = monthlyArchive(empty(), '2026-10');
  r.people = [
    { id: 'm', name: 'Mundín' },
    { id: 'a', name: 'Ana' },
    { id: 'b', name: 'Ana' },
    { id: 'p', name: 'Solo abonos' },
  ];
  const sale = (id, person, total) => ({
    id,
    person,
    total,
    at: '2026-10-05T12:00:00Z',
    items: [],
    note: 'Suma libre',
  });
  r.sales = [
    sale('s1', 'a', 500),
    sale('s2', 'm', 1000),
    sale('s3', 'm', 300),
    sale('s4', 'b', 200),
    sale('s5', null, 9000),
  ];
  r.payments = [
    { id: 'p1', person: 'a', amount: 4000, at: '2026-10-06T12:00:00Z', method: 'cash' },
    { id: 'p2', person: 'p', amount: 100, at: '2026-10-06T12:00:00Z', method: 'cash' },
  ];
  const before = structuredClone(r);
  const groups = customerGroups(r);
  assert.deepEqual(
    groups.map((g) => g.id),
    ['m', 'a', 'b', 'p', null]
  );
  assert.equal(groups[0].total, 1300);
  assert.equal(groups[0].sales.length, 2);
  assert.equal(groups[1].paid, 4000);
  assert.equal(groups[3].total, 0);
  assert.deepEqual(r, before);
  const html = monthlyHtml(r);
  assert.ok(html.indexOf('1. Mundín') < html.indexOf('2. Ana'));
  assert.match(html, /El total comprado no es su deuda actual/);
});
test('cliente archivado conserva su apartado y nombre sin permitir contenido HTML', () => {
  const r = monthlyArchive(empty(), '2026-10');
  r.people = [{ id: 'a', name: '<script>cliente</script>', archived: true }];
  r.sales = [
    { id: 's', person: 'a', total: 500, at: '2026-10-05T12:00:00Z', note: '5', items: [] },
  ];
  const html = monthlyHtml(r);
  assert.match(html, /1. &lt;script&gt;cliente&lt;\/script&gt;/);
  assert.doesNotMatch(html, /<script>/);
});
