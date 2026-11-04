import { test } from 'node:test';
import assert from 'node:assert/strict';
import { empty, sell, sellPaid, pay, balance, validate } from '../src/domain.js';
import { businessSummary } from '../src/finance.js';
import { cashFlows, cashSummary } from '../src/cashbox.js';
import { monthlyArchive, customerGroups, monthKey } from '../src/monthlyArchive.js';
import { historyOf } from '../src/analytics.js';
import { closeMonth } from '../src/monthlyClose.js';
const setup = () => ({ ...empty(), people: [{ id: 'm', name: 'Mundín', phone: '', notes: '' }] });
test('cobro identificado no genera deuda ni abona a la deuda previa del cliente', () => {
  let d = setup();
  sell(d, { expression: '100', person: 'm' });
  d = sellPaid(d, { expression: '25', customer: 'm', received: 5000, operationId: 'paid-1' });
  const sale = d.sales.at(-1);
  assert.equal(sale.person, null);
  assert.equal(sale.customer, 'm');
  assert.equal(sale.change, 2500);
  assert.equal(balance(d, 'm'), 10000);
  assert.equal(businessSummary(d).collected, 2500);
  assert.equal(
    cashFlows(d)
      .filter((f) => f.method === 'cash')
      .reduce((n, f) => n + f.amount, 0),
    2500
  );
  assert.equal(historyOf(d).find((s) => s.id === 'paid-1').label, 'Mundín');
  validate(d);
  pay(d, 'm', 10000);
  assert.equal(balance(d, 'm'), 0);
});
test('cliente nuevo y cobro se guardan juntos; duplicados y errores no crean cuentas sueltas', () => {
  const original = setup();
  const d = sellPaid(original, {
    expression: '10',
    newCustomerName: ' Ana ',
    operationId: 'new',
    method: 'transfer',
  });
  assert.equal(d.people.length, 2);
  assert.equal(d.people[1].name, 'Ana');
  assert.equal(d.sales[0].method, 'transfer');
  assert.equal(balance(d, d.people[1].id), 0);
  assert.equal(original.people.length, 1);
  assert.throws(
    () => sellPaid(d, { expression: '10', newCustomerName: 'Otro', operationId: 'new' }),
    /ya está registrada/
  );
  assert.equal(d.people.length, 2);
  assert.throws(
    () => sellPaid(original, { expression: '10', newCustomerName: 'Otra', received: 100 }),
    /no alcanza/
  );
  assert.equal(original.people.length, 1);
  const duplicate = sellPaid(d, { expression: '5', newCustomerName: ' ÁNA ', method: 'cash' });
  assert.equal(duplicate.people.length, 2);
  assert.equal(duplicate.sales.at(-1).customer, d.people[1].id);
});
test('no permite omitir cliente, mezclar fiado con cliente de contado ni restaurar referencias rotas', () => {
  const d = setup();
  assert.throws(() => sellPaid(d, { expression: '5' }), /quién está pagando/);
  assert.throws(() => sellPaid(d, { expression: '5', customer: 'missing' }), /quién está pagando/);
  assert.throws(() => sell(d, { expression: '5', person: 'm', customer: 'm' }), /cliente válido/);
  const valid = sellPaid(d, { expression: '5', customer: 'm' });
  const bad = structuredClone(valid);
  bad.sales[0].customer = 'missing';
  assert.throws(() => validate(bad));
  const names = setup();
  names.people.push({ ...names.people[0], id: 'other' });
  assert.throws(
    () => sellPaid(names, { expression: '5', newCustomerName: 'Mundín' }),
    /varias personas/
  );
});
test('reporte combina compras pagadas y fiadas por identidad y el cierre conserva caja y deuda', () => {
  let d = setup();
  sell(d, { expression: '20', person: 'm' });
  d = sellPaid(d, { expression: '30', customer: 'm', method: 'transfer' });
  d.sales.forEach((s) => (s.at = new Date(2026, 8, 10).toISOString()));
  const r = monthlyArchive(d, '2026-09');
  assert.equal(customerGroups(r)[0].total, 5000);
  assert.equal(customerGroups(r)[0].sales.length, 2);
  const next = closeMonth(d, '2026-09', new Date(2026, 9, 1));
  assert.equal(next.sales.length, 1);
  assert.equal(balance(next, 'm'), 2000);
  assert.deepEqual(businessSummary(next), businessSummary(d));
  assert.equal(cashSummary(next).transferNet, cashSummary(d).transferNet);
  validate(JSON.parse(JSON.stringify(next)));
});
test('cliente archivado puede pagar sin reactivar su cuenta ni crear deuda', () => {
  const d = setup();
  d.people[0].archived = true;
  const next = sellPaid(d, { expression: '10', customer: 'm' });
  assert.equal(next.people[0].archived, true);
  assert.equal(balance(next, 'm'), 0);
  validate(next);
});
