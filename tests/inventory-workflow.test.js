import { test } from 'node:test';
import assert from 'node:assert/strict';
import { empty, saveProduct, sell, validate } from '../src/domain.js';
import { receivePurchase, shoppingList } from '../src/inventory.js';
import { cashFlows } from '../src/cashbox.js';
const setup = () => {
  const d = empty();
  saveProduct(d, {
    name: 'Paleta',
    price: 1000,
    cost: 200,
    costStatus: 'real',
    stock: 4,
    lowStock: 3,
  });
  return d;
};
const purchase = (d, fields = {}) =>
  receivePurchase(d, {
    product: d.products[0].id,
    quantity: 6,
    total: 1800,
    method: 'cash',
    updateCost: true,
    operationId: 'compra-1',
    ...fields,
  });
test('compra suma piezas, registra un único pago y conserva costos históricos', () => {
  const d = setup();
  sell(d, { cart: [{ product: d.products[0].id, qty: 1 }] });
  const next = purchase(d);
  validate(next);
  assert.equal(next.products[0].stock, 9);
  assert.equal(next.products[0].cost, 300);
  assert.equal(next.sales[0].items[0].cost, 200);
  assert.equal(next.finance.movements.length, 1);
  assert.equal(next.finance.movements[0].amount, 1800);
  assert.equal(next.finance.movements[0].kind, 'reinvestment');
  assert.equal(next.finance.movements[0].method, 'cash');
  assert.equal(cashFlows(next).find((f) => f.id === 'movement:compra-1').amount, -1800);
  assert.throws(() => purchase(next), /ya está registrado/);
  assert.equal(next.products[0].stock, 9);
});
test('transferencia y conservación opcional del costo; rechazos sin cambios parciales', () => {
  const d = setup();
  const next = purchase(d, { method: 'transfer', updateCost: false });
  assert.equal(next.products[0].cost, 200);
  assert.equal(next.finance.movements[0].method, 'transfer');
  const before = structuredClone(d);
  for (const fields of [{ quantity: 0 }, { quantity: 1.5 }, { total: 0 }, { method: 'otro' }])
    assert.throws(() => purchase(d, fields));
  assert.deepEqual(d, before);
  d.products[0].archived = true;
  assert.throws(() => purchase(d), /activo/);
});
test('lista incluye agotados y nivel exacto, excluye archivados y cambia al reponer', () => {
  const d = setup();
  const p = d.products[0];
  p.stock = 0;
  d.products.push({ ...p, id: 'archivado', archived: true });
  assert.deepEqual(
    shoppingList(d.products).map((p) => [p.name, p.suggested]),
    [['Paleta', 4]]
  );
  p.stock = 3;
  assert.equal(shoppingList(d.products)[0].suggested, 1);
  const next = purchase(d);
  assert.equal(shoppingList(next.products).length, 0);
});
