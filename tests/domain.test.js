import { test } from 'node:test';

import assert from 'node:assert/strict';

import { empty, cents, sum, sell, pay, balance, validate } from '../src/domain.js';

test('sumas exactas sin evaluar código', () => {
  assert.equal(sum('5+5+2+2'), 1400);
  assert.equal(sum('0.10 + 0.20+'), 30);
  assert.throws(() => sum('2*9'));
  assert.throws(() => sum('alert(1)'));
  assert.throws(() => sum('2++3'));
  assert.throws(() => cents('-1'));
});

const setup = () => ({
  ...empty(),
  products: [{ id: 'p', name: 'Paleta', price: 500, cost: 200, stock: 3 }],
  people: [{ id: 'u', name: 'Ana', phone: '', notes: '' }],
});

test('fiado, abono parcial y saldo cero', () => {
  let d = setup();
  sell(d, { expression: '5+2', person: 'u' });
  assert.equal(balance(d, 'u'), 700);
  pay(d, 'u', 200);
  assert.equal(balance(d, 'u'), 500);
  assert.throws(() => pay(d, 'u', 501));
  pay(d, 'u', 500);
  assert.equal(balance(d, 'u'), 0);
  validate(d);
});

test('catálogo descuenta stock y conserva costos', () => {
  let d = setup();
  sell(d, { cart: [{ product: 'p', qty: 2 }] });
  assert.equal(d.products[0].stock, 1);
  assert.equal(d.sales[0].total, 1000);
  d.products[0].cost = 400;
  assert.equal(d.sales[0].items[0].cost, 200);
  assert.throws(() => sell(d, { cart: [{ product: 'p', qty: 2 }] }));
  assert.equal(d.products[0].stock, 1);
  validate(d);
});

test('restauración y referencias inválidas', () => {
  const d = setup();
  sell(d, { expression: '2' });
  assert.deepEqual(validate(JSON.parse(JSON.stringify(d))), d);
  assert.throws(() => validate({ ...d, schema: 2 }));
  assert.throws(() => validate({ ...d, products: [{ ...d.products[0], stock: -1 }] }));
  assert.throws(() =>
    validate({ ...d, people: [], sales: [{ ...d.sales[0], person: 'missing' }] })
  );
});

import { pricing, profits } from '../src/pricing.js';
import { editPerson, archivePerson } from '../src/domain.js';
test('editar y archivar conservan saldo, identidad e historial', () => {
  const d = setup();
  sell(d, { person: 'u', expression: '10' });
  const sale = structuredClone(d.sales[0]);
  editPerson(d, 'u', { name: ' Ana nueva ', phone: '55', notes: 'Viernes' });
  assert.equal(d.people[0].name, 'Ana nueva');
  assert.equal(d.people[0].id, 'u');
  assert.equal(balance(d, 'u'), 1000);
  assert.deepEqual(d.sales[0], sale);
  archivePerson(d, 'u', true);
  assert.throws(() => sell(d, { person: 'u', expression: '1' }));
  pay(d, 'u', 300);
  assert.equal(balance(d, 'u'), 700);
  validate(JSON.parse(JSON.stringify(d)));
  archivePerson(d, 'u', false);
  sell(d, { person: 'u', expression: '1' });
  assert.equal(balance(d, 'u'), 800);
  assert.throws(() => editPerson(d, 'u', { name: '  ' }));
});

test('paquete, sugerencia con margen y redondeo', () => {
  const p = pricing({ mode: 'pack', pack: '120', pieces: '12', margin: '30' });
  assert.equal(p.cost, 1000);
  assert.equal(p.suggested, 1429);
  assert.equal(p.costStatus, 'real');
  assert.equal(pricing({ mode: 'pack', pack: '10', pieces: '3' }).cost, 333);
  for (const pieces of ['0', '-1', '1.5'])
    assert.throws(() => pricing({ mode: 'pack', pack: '120', pieces }));
  for (const margin of ['100', '-1', ''])
    assert.throws(() => pricing({ mode: 'unit', unit: '5', margin }));
});

test('precio conocido: costo nulo o supuesto explícito', () => {
  assert.equal(pricing({ mode: 'sale', price: '15' }).cost, null);
  const p = pricing({ mode: 'sale', price: '15', estimate: true, margin: '30' });
  assert.equal(p.cost, 1050);
  assert.equal(p.costStatus, 'estimated');
});

test('costos desconocidos y estimados se conservan en ventas y respaldo', () => {
  const d = setup();
  d.products[0].cost = null;
  d.products[0].costStatus = 'unknown';
  sell(d, { cart: [{ product: 'p', qty: 1 }] });
  d.products[0].cost = 300;
  d.products[0].costStatus = 'estimated';
  sell(d, { cart: [{ product: 'p', qty: 1 }] });
  d.products[0].cost = 200;
  d.products[0].costStatus = 'real';
  sell(d, { cart: [{ product: 'p', qty: 1 }] });
  assert.deepEqual(profits(d.sales), { real: 300, estimated: 200, unknown: 500 });
  validate(JSON.parse(JSON.stringify(d)));
  const bad = structuredClone(d);
  bad.sales[0].items[0].costStatus = 'real';
  assert.throws(() => validate(bad));
});
