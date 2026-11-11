import { test } from 'node:test';
import assert from 'node:assert/strict';
import { balance, empty, pay, saveProduct, sell, validate, voidSale } from '../src/domain.js';
import { businessSummary } from '../src/finance.js';
import { cashSummary, recordCashCount } from '../src/cashbox.js';
import { closeMonth } from '../src/monthlyClose.js';
import { customerGroups, monthlyArchive, monthKey } from '../src/monthlyArchive.js';

function setup() {
  const data = empty();
  saveProduct(data, { name: 'Paleta', price: 3800, cost: 2000, stock: 10 });
  data.people.push({ id: 'ana', name: 'Ana', phone: '', notes: '' });
  const cart = [{ product: data.products[0].id, qty: 1 }];
  return { data, cart };
}

test('anular después de un conteo resta el cobro una sola vez y conserva el registro', () => {
  const { data, cart } = setup();
  sell(data, { cart, received: 5000, operationId: 'sale' });
  recordCashCount(data, { id: 'count', at: new Date().toISOString(), counted: 68000 });
  assert.equal(businessSummary(data).available, 1800);
  voidSale(data, 'sale', 'Importe incorrecto');
  assert.equal(cashSummary(data).expected, 64200);
  assert.equal(businessSummary(data).available, 0);
  assert.equal(data.products[0].stock, 10);
  assert.equal(data.sales[0].voided.note, 'Importe incorrecto');
  assert.equal(data.stock.at(-1).delta, 1);
  assert.throws(() => voidSale(data, 'sale', 'Duplicada'));
  assert.throws(() => sell(data, { cart, operationId: 'sale' }), /ya está registrada/);
  const restored = validate(JSON.parse(JSON.stringify(data)));
  const month = monthKey(restored.sales[0].at);
  const report = monthlyArchive(restored, month);
  assert.equal(customerGroups(report)[0].total, 0);
  assert.equal(report.sales[0].voided.note, 'Importe incorrecto');
  const now = new Date(restored.sales[0].at);
  now.setDate(1);
  now.setMonth(now.getMonth() + 1);
  const closed = closeMonth(restored, month, now);
  assert.equal(cashSummary(closed).expected, 64200);
  assert.equal(closed.carryover.finance.collected, 0);
  assert.equal(closed.carryover.daily.length, 0);
});

test('anular por transferencia ajusta transferencias sin tocar caja', () => {
  const { data, cart } = setup();
  recordCashCount(data, { id: 'count', at: new Date().toISOString(), counted: 2500 });
  sell(data, { cart, method: 'transfer', operationId: 'transfer' });
  assert.equal(cashSummary(data).transferNet, 3800);
  voidSale(data, 'transfer', 'Venta duplicada');
  assert.equal(cashSummary(data).expected, 2500);
  assert.equal(cashSummary(data).transferNet, 0);
  validate(data);
});

test('anular fiado solo procede si los abonos no llegaron a esa venta', () => {
  const { data, cart } = setup();
  sell(data, { cart, person: 'ana', operationId: 'first' });
  sell(data, { cart, person: 'ana', operationId: 'second' });
  pay(data, 'ana', 1000);
  const before = structuredClone(data);
  assert.throws(() => voidSale(data, 'first', 'Duplicada'), /abono aplicado/);
  assert.deepEqual(data, before);
  voidSale(data, 'second', 'Duplicada');
  assert.equal(balance(data, 'ana'), 2800);
  assert.equal(data.products[0].stock, 9);
  validate(data);
});
