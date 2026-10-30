import { test } from 'node:test';
import assert from 'node:assert/strict';
import { empty, cents, cashChange, sell, saveProduct, restock, validate } from '../src/domain.js';
import { pricing } from '../src/pricing.js';
import { inPeriod, dailySales, matches } from '../src/analytics.js';
test('edición abierta no sobrescribe stock modificado por una venta', () => {
  const d = empty();
  saveProduct(d, { name: 'Paleta', price: 500, cost: 200, costStatus: 'real', stock: 10 });
  const p = d.products[0];
  sell(d, { cart: [{ product: p.id, qty: 2 }] });
  saveProduct(d, { ...p, name: 'Paleta nueva', stock: 10, expectedStock: 10 }, p.id);
  assert.equal(p.stock, 8);
  assert.throws(() => saveProduct(d, { ...p, stock: 12, expectedStock: 10 }, p.id));
  assert.equal(p.stock, 8);
  assert.throws(() => sell(d, { cart: [{ product: p.id, qty: 1 }], expectedTotal: 400 }));
  assert.equal(p.stock, 8);
});

test('centavos exactos, coma decimal y límites de sumas', () => {
  assert.equal(cents('1,29'), 129);
  assert.equal(cents(' 0.29 '), 29);
  assert.throws(() => cents('1.001'));
  assert.throws(() => cents('99999999999'));
  assert.equal(pricing({ mode: 'unit', unit: '14', margin: '30' }).suggested, 2000);
  assert.equal(pricing({ mode: 'unit', unit: '10', margin: '30' }).suggested, 1429);
});
test('cambio exacto, efectivo insuficiente y recibo conservado', () => {
  assert.deepEqual(cashChange(1429, '20'), { received: 2000, change: 571 });
  assert.throws(() => cashChange(1429, '14'));
  const d = empty();
  sell(d, { expression: '10+4.29', received: 2000 });
  assert.equal(d.sales[0].change, 571);
  validate(d);
  const bad = structuredClone(d);
  bad.sales[0].change = 0;
  assert.throws(() => validate(bad));
});
test('identificador de venta evita duplicar un cobro', () => {
  const d = empty();
  sell(d, { expression: '5', operationId: 'first' });
  assert.throws(() => sell(d, { expression: '5', operationId: 'first' }));
  assert.equal(d.sales.length, 1);
});
test('guardar, reponer y archivar productos conserva su historial', () => {
  const d = empty();
  saveProduct(d, {
    name: '  Paleta ',
    price: 500,
    cost: 200,
    costStatus: 'real',
    stock: 2,
    lowStock: 1,
  });
  const p = d.products[0];
  assert.equal(p.name, 'Paleta');
  restock(d, p.id, 12, 'Paquete nuevo');
  assert.equal(p.stock, 14);
  assert.equal(p.cost, 200);
  sell(d, { cart: [{ product: p.id, qty: 2 }] });
  saveProduct(d, { ...p, name: 'Paleta nueva', cost: 300 }, p.id);
  assert.equal(d.sales[0].items[0].name, 'Paleta');
  assert.equal(d.sales[0].items[0].cost, 200);
  p.archived = true;
  assert.throws(() => sell(d, { cart: [{ product: p.id, qty: 1 }] }));
  assert.throws(() => restock(d, p.id, 1));
  validate(d);
});
test('periodos usan días locales y la semana incluye hoy', () => {
  const now = new Date(2026, 9, 30, 15, 0);
  assert(inPeriod(new Date(2026, 9, 30, 0, 0), 'today', now));
  assert(!inPeriod(new Date(2026, 9, 29, 23, 59), 'today', now));
  assert(inPeriod(new Date(2026, 9, 24, 0, 0), 'week', now));
  assert(!inPeriod(new Date(2026, 9, 23, 23, 59), 'week', now));
  assert(!inPeriod(new Date(2026, 9, 30, 16, 0), 'today', now));
  const graph = dailySales([{ at: new Date(2026, 9, 30, 10, 0).toISOString(), total: 500 }], now);
  assert.equal(graph.length, 7);
  assert.equal(graph.at(-1).total, 500);
  assert.equal(graph[0].total, 0);
  assert(matches('María López', 'maria'));
  assert(matches('Limón', 'LIMON'));
});
