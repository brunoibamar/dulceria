import { test } from 'node:test';
import assert from 'node:assert/strict';
import { empty, saveProduct, sell, pay, validate } from '../src/domain.js';
import {
  businessSummary,
  recordWithdrawal,
  recordBusinessMovement,
  economyFeed,
} from '../src/finance.js';
import { cashSummary, recordCashCount } from '../src/cashbox.js';
import { receivePurchase } from '../src/inventory.js';
import { closeMonth } from '../src/monthlyClose.js';
const when = '2026-10-30T12:00:00.000Z';
function fixture() {
  const d = empty();
  saveProduct(d, { name: 'Dulce', price: 1500, cost: 1000, costStatus: 'real', stock: 100 });
  d.people.push({ id: 'person', name: 'Ana', phone: '', notes: '' });
  return d;
}
const withdrawal = (d, amount, id = 'w') =>
  recordWithdrawal(d, { id, at: when, amount, destination: 'cash', note: '' });
test('retiro completo pone disponible en cero y conserva reserva e historial', () => {
  const d = fixture();
  sell(d, { cart: [{ product: d.products[0].id, qty: 1 }] });
  const before = businessSummary(d);
  assert.equal(before.available, 500);
  assert.equal(before.reserve, 1000);
  withdrawal(d, 500);
  assert.equal(businessSummary(d).available, 0);
  assert.equal(businessSummary(d).gross, 500);
  assert.equal(businessSummary(d).reserve, 1000);
  assert.equal(d.sales.length, 1);
  assert.throws(() => withdrawal(d, 500, 'w2'));
  sell(d, { cart: [{ product: d.products[0].id, qty: 1 }] });
  assert.equal(businessSummary(d).available, 500);
  validate(d);
});
test('retiro parcial, duplicados y destinos', () => {
  const d = fixture();
  sell(d, { cart: [{ product: d.products[0].id, qty: 1 }] });
  withdrawal(d, 200);
  assert.equal(businessSummary(d).available, 300);
  assert.throws(() => withdrawal(d, 200));
  assert.throws(() => withdrawal(d, 0, 'z'));
  assert.throws(() =>
    recordWithdrawal(d, { id: 'z', at: when, amount: 100, destination: 'other' })
  );
});
test('fiado libera solo ganancia proporcional cobrada y aplica abonos FIFO', () => {
  const d = fixture();
  sell(d, { person: 'person', cart: [{ product: d.products[0].id, qty: 1 }] });
  assert.equal(businessSummary(d).available, 0);
  pay(d, 'person', 600);
  assert.equal(businessSummary(d).available, 200);
  assert.equal(businessSummary(d).reserve, 400);
  withdrawal(d, 200);
  pay(d, 'person', 900);
  assert.equal(businessSummary(d).available, 300);
  sell(d, { person: 'person', expression: '50' });
  pay(d, 'person', 5000);
  assert.equal(businessSummary(d).available, 300);
  assert.equal(businessSummary(d).uncosted, 5000);
});
test('costos desconocidos y estimados no se habilitan como ganancia', () => {
  const d = fixture();
  sell(d, { expression: '20' });
  d.products[0].costStatus = 'estimated';
  sell(d, { cart: [{ product: d.products[0].id, qty: 1 }] });
  assert.equal(businessSummary(d).available, 0);
  assert.equal(businessSummary(d).reserve, 3500);
});
test('gastos y uso de reinversión se distinguen sin descontar compras dos veces', () => {
  const d = fixture();
  sell(d, { cart: [{ product: d.products[0].id, qty: 2 }] });
  recordBusinessMovement(d, {
    id: 'buy',
    at: when,
    amount: 1500,
    kind: 'reinvestment',
    note: 'Mercancía',
  });
  assert.equal(businessSummary(d).reserve, 500);
  assert.equal(businessSummary(d).available, 1000);
  recordBusinessMovement(d, {
    id: 'expense',
    at: when,
    amount: 200,
    kind: 'expense',
    note: 'Bolsas',
  });
  assert.equal(businessSummary(d).available, 800);
  recordBusinessMovement(d, {
    id: 'buy2',
    at: when,
    amount: 800,
    kind: 'reinvestment',
    note: 'Otra compra',
  });
  assert.equal(businessSummary(d).available, 800);
  assert.equal(businessSummary(d).reserve, 0);
  validate(d);
});
test('pérdidas confirmadas reducen lo disponible', () => {
  const d = fixture();
  sell(d, { cart: [{ product: d.products[0].id, qty: 1 }] });
  d.products[0].cost = 2000;
  sell(d, { cart: [{ product: d.products[0].id, qty: 1 }] });
  assert.equal(businessSummary(d).available, 0);
  assert.equal(businessSummary(d).gross, 0);
});

test('reinvertir $514 conserva el apartado, reduce caja y permite seguir acumulando hasta retirar', () => {
  const d = fixture();
  Object.assign(d.products[0], { price: 68000, cost: 40000 });
  recordCashCount(d, { id: 'initial', at: when, counted: 0 });
  sell(d, { cart: [{ product: d.products[0].id, qty: 1 }], method: 'cash' });
  const before = businessSummary(d);
  assert.equal(cashSummary(d).expected, 68000);
  assert.equal(before.available, 28000);
  const next = receivePurchase(d, {
    product: d.products[0].id,
    quantity: 10,
    total: 51400,
    method: 'cash',
    updateCost: true,
    operationId: 'purchase-514',
  });
  assert.equal(businessSummary(next).available, 28000);
  assert.equal(businessSummary(next).reserve, 0);
  assert.equal(businessSummary(next).reserveShortfall, 11400);
  assert.equal(businessSummary(next).calculatedCash, 16600);
  assert.equal(cashSummary(next).expected, 16600);
  assert.deepEqual(economyFeed(next).entries, []);
  withdrawal(next, 10000);
  assert.equal(businessSummary(next).available, 18000);
  assert.equal(cashSummary(next).expected, 6600);
  sell(next, { cart: [{ product: next.products[0].id, qty: 1 }], method: 'cash' });
  const accumulated = 18000 + 68000 - 5140;
  assert.equal(businessSummary(next).available, accumulated);
  withdrawal(next, accumulated, 'withdraw-all');
  assert.equal(businessSummary(next).available, 0);
  assert.equal(next.finance.movements.length, 1);
  assert.equal(next.sales.length, 2);
  validate(next);
});

test('reinversiones históricas, por transferencia y cierres conservan el apartado al restaurar', () => {
  const d = fixture();
  sell(d, { cart: [{ product: d.products[0].id, qty: 2 }], method: 'transfer' });
  d.sales[0].at = when;
  d.stock.forEach((entry) => (entry.at = when));
  // A saved ledger from before the fix needs no migration or invented compensating entries.
  d.finance = {
    version: 1,
    withdrawals: [],
    movements: [
      {
        id: 'old-buy',
        at: when,
        amount: 3000,
        kind: 'reinvestment',
        method: 'transfer',
        note: 'Compra anterior',
      },
    ],
  };
  assert.equal(businessSummary(d).available, 1000);
  assert.equal(businessSummary(d).calculatedCash, 0);
  assert.equal(cashSummary(d).transferNet, 0);
  const closed = closeMonth(d, '2026-10', new Date('2026-11-10T18:00:00Z'));
  assert.equal(closed.finance.movements.length, 0);
  const restored = JSON.parse(JSON.stringify(closed));
  validate(restored);
  assert.deepEqual(businessSummary(restored), businessSummary(d));
  assert.equal(businessSummary(restored).available, 1000);
  withdrawal(restored, 400);
  assert.equal(businessSummary(restored).available, 600);
});
test('respaldo antiguo compatible y retiros incluidos con identificador estable', () => {
  const d = fixture();
  validate(d);
  sell(d, { cart: [{ product: d.products[0].id, qty: 1 }] });
  withdrawal(d, 500);
  const copy = JSON.parse(JSON.stringify(d));
  validate(copy);
  assert.deepEqual(economyFeed(d), economyFeed(copy));
  assert.equal(economyFeed(copy).entries[0].id, 'dulceria:w');
  assert.equal(economyFeed(copy).entries[0].amount, 500);
  copy.finance.withdrawals[0].amount = -1;
  assert.throws(() => validate(copy));
});
