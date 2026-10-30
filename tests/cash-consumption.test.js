import { test } from 'node:test';
import assert from 'node:assert/strict';
import { empty, saveProduct, sell, pay, validate } from '../src/domain.js';
import {
  businessSummary,
  recordConsumption,
  economyFeed,
  recordBusinessMovement,
  recordWithdrawal,
} from '../src/finance.js';
import { cashSummary, recordCashCount, recordCashAdjustment } from '../src/cashbox.js';
const at = '2026-10-30T18:00:00.000Z';
function fixture() {
  const d = empty();
  saveProduct(d, { name: 'Papas', price: 1500, cost: 1000, costStatus: 'real', stock: 30 });
  d.people.push({ id: 'u', name: 'Ana', phone: '', notes: '' });
  return d;
}
test('consumir dos piezas descuenta stock y costo, no precio ni efectivo', () => {
  const d = fixture(),
    product = d.products[0].id;
  sell(d, { cart: [{ product, qty: 10 }] });
  const before = businessSummary(d);
  recordConsumption(d, { id: 'eat', at, cart: [{ product, qty: 2 }] });
  assert.equal(d.products[0].stock, 18);
  assert.equal(businessSummary(d).available, before.available - 2000);
  assert.equal(businessSummary(d).personalConsumption, 2000);
  assert.equal(businessSummary(d).calculatedCash, before.calculatedCash);
  assert.equal(d.sales.length, 1);
  assert.equal(economyFeed(d).entries.length, 0);
  assert.throws(() => recordConsumption(d, { id: 'eat', at, cart: [{ product, qty: 1 }] }));
  validate(JSON.parse(JSON.stringify(d)));
});
test('consumo rechaza costos desconocidos, estimados y stock insuficiente', () => {
  const d = fixture(),
    product = d.products[0].id;
  d.products[0].costStatus = 'estimated';
  assert.throws(() => recordConsumption(d, { id: 'c', at, cart: [{ product, qty: 1 }] }));
  d.products[0].costStatus = 'real';
  assert.throws(() => recordConsumption(d, { id: 'c', at, cart: [{ product, qty: 31 }] }));
  assert.equal(d.products[0].stock, 30);
});
test('caja separa efectivo, transferencia y fiado; conteo no altera ganancia', () => {
  const d = fixture();
  recordCashCount(d, { id: 'base', at, counted: 10000 });
  sell(d, { expression: '15', method: 'cash', received: 2000 });
  sell(d, { expression: '20', method: 'transfer' });
  sell(d, { expression: '10', person: 'u' });
  assert.equal(cashSummary(d).expected, 11500);
  pay(d, 'u', 400, 'transfer');
  assert.equal(cashSummary(d).expected, 11500);
  pay(d, 'u', 600, 'cash');
  assert.equal(cashSummary(d).expected, 12100);
  assert.equal(cashSummary(d).transferNet, 2400);
  const gain = businessSummary(d);
  recordCashCount(d, { id: 'close', at, counted: 12000 });
  assert.equal(d.cashbox.counts.at(-1).difference, -100);
  assert.equal(cashSummary(d).expected, 12000);
  assert.deepEqual(businessSummary(d), gain);
  validate(d);
});
test('movimientos de efectivo y gastos por método se aplican una sola vez', () => {
  const d = fixture(),
    product = d.products[0].id;
  recordCashCount(d, { id: 'base', at, counted: 10000 });
  sell(d, { cart: [{ product, qty: 10 }], method: 'transfer' });
  recordBusinessMovement(d, {
    id: 'expense',
    at,
    amount: 500,
    kind: 'expense',
    method: 'cash',
    note: 'Bolsas',
  });
  recordBusinessMovement(d, {
    id: 'buy',
    at,
    amount: 1000,
    kind: 'reinvestment',
    method: 'transfer',
    note: 'Compra',
  });
  recordWithdrawal(d, { id: 'w', at, amount: 1000, destination: 'cash' });
  assert.equal(cashSummary(d).expected, 8500);
  assert.equal(cashSummary(d).transferNet, 14000);
  const gain = businessSummary(d).available;
  recordCashAdjustment(d, { id: 'float', at, amount: 200, direction: 'in', note: 'Cambio' });
  assert.equal(cashSummary(d).expected, 8700);
  assert.equal(businessSummary(d).available, gain);
  validate(d);
});
test('registros antiguos no se inventan como efectivo y la base resuelve el inicio', () => {
  const d = fixture();
  sell(d, { expression: '5' });
  delete d.sales[0].method;
  assert.equal(cashSummary(d).unknown, 1);
  assert.equal(cashSummary(d).expected, null);
  recordCashCount(d, { id: 'base', at, counted: 500 });
  assert.equal(d.cashbox.counts[0].difference, null);
  assert.equal(cashSummary(d).unknown, 0);
  assert.equal(cashSummary(d).expected, 500);
  sell(d, { expression: '2', method: 'transfer' });
  assert.equal(cashSummary(d).expected, 500);
  const copy = JSON.parse(JSON.stringify(d));
  validate(copy);
  assert.deepEqual(cashSummary(copy), cashSummary(d));
  copy.cashbox.counts[0].difference = 50;
  assert.throws(() => validate(copy));
});
