import { test } from 'node:test';
import assert from 'node:assert/strict';
import { empty, saveProduct, sell, pay, balance, validate } from '../src/domain.js';
import {
  businessSummary,
  recordBusinessMovement,
  recordConsumption,
  recordWithdrawal,
  economyFeed,
} from '../src/finance.js';
import { cashSummary, recordCashCount, recordCashAdjustment } from '../src/cashbox.js';
import { closeMonth, pendingMonths } from '../src/monthlyClose.js';
import { archiveOne, runMonthlyArchive } from '../src/autoArchive.js';
const at = (m, day = 15) => new Date(2026, m - 1, day, 12).toISOString();
const now = new Date(2026, 10, 3, 12);
function setup() {
  const d = empty();
  saveProduct(d, { name: 'Paleta', price: 503, cost: 199, costStatus: 'real', stock: 1000 });
  d.stock[0].at = at(9);
  d.people.push({ id: 'ana', name: 'Ana', phone: '', notes: '' });
  for (let i = 0; i < 80; i++) {
    sell(d, { cart: [{ product: d.products[0].id, qty: 1 }], method: i % 2 ? 'cash' : 'transfer' });
    d.sales.at(-1).at = at(i < 40 ? 9 : 10);
  }
  sell(d, { person: 'ana', cart: [{ product: d.products[0].id, qty: 3 }] });
  d.sales.at(-1).at = at(9);
  pay(d, 'ana', 251, 'cash');
  d.payments.at(-1).at = at(10);
  recordBusinessMovement(d, {
    id: 'purchase',
    at: at(9),
    amount: 500,
    kind: 'reinvestment',
    note: 'Compra',
    method: 'cash',
  });
  recordBusinessMovement(d, {
    id: 'expense',
    at: at(10),
    amount: 200,
    kind: 'expense',
    note: 'Pasaje',
    method: 'transfer',
  });
  recordConsumption(d, {
    id: 'consumption',
    at: at(9),
    cart: [{ product: d.products[0].id, qty: 2 }],
  });
  recordCashAdjustment(d, { id: 'fund', at: at(9), amount: 2000, direction: 'in', note: 'Fondo' });
  recordCashCount(d, { id: 'count', at: at(10), counted: 18000 });
  recordWithdrawal(d, { id: 'withdraw', at: at(10), amount: 200, destination: 'cash' });
  for (const movement of d.stock) movement.at = at(9);
  return d;
}
function same(a, b) {
  assert.deepEqual(businessSummary(b), businessSummary(a));
  const first = cashSummary(a),
    second = cashSummary(b);
  for (const k of ['expected', 'unknown', 'transferNet']) assert.equal(second[k], first[k], k);
  assert.equal(balance(b, 'ana'), balance(a, 'ana'));
  assert.deepEqual(b.products, a.products);
  assert.deepEqual(economyFeed(b), economyFeed(a));
}
test('cierre y restauración conservan todos los saldos, liberan detalle y no mutan el original', () => {
  const d = setup(),
    before = structuredClone(d);
  const next = closeMonth(d, '2026-10', now);
  same(d, next);
  assert.deepEqual(d, before);
  validate(JSON.parse(JSON.stringify(next)));
  assert.equal(next.sales.length, 1);
  assert.equal(next.payments.length, 1);
  assert.equal(next.finance.movements.length, 0);
  assert.equal(next.finance.consumptions.length, 0);
  assert.equal(next.stock.length, 0);
  assert.ok(JSON.stringify(next).length < JSON.stringify(d).length / 2);
  assert.equal(
    next.carryover.daily.reduce((n, r) => n + r.total, 0),
    80 * 503
  );
  assert.throws(() => closeMonth(next, '2026-10', now), /ya está cerrado/);
  assert.throws(() => closeMonth(d, '2026-11', now), /terminados/);
});
test('cierres sucesivos y futuros abonos mantienen FIFO, redondeos y ganancias', () => {
  const d = setup();
  let next = closeMonth(d, '2026-09', now);
  next = closeMonth(next, '2026-10', now);
  same(d, next);
  for (const amount of [1, 249, 1008]) {
    pay(d, 'ana', amount, 'transfer');
    pay(next, 'ana', amount, 'transfer');
    same(d, next);
  }
  sell(d, { expression: '4.50', method: 'cash' });
  sell(next, { expression: '4.50', method: 'cash' });
  same(d, next);
  recordCashCount(d, { id: 'new-count', at: now.toISOString(), counted: 20000 });
  recordCashCount(next, { id: 'new-count', at: now.toISOString(), counted: 20000 });
  same(d, next);
});
test('conserva caja con movimientos antiguos desconocidos antes y después del conteo', () => {
  const d = setup();
  delete d.sales[0].method;
  const next = closeMonth(d, '2026-10', now);
  same(d, next);
  const late = { ...d.sales[1], id: 'late-sale', at: at(9) };
  delete late.method;
  d.sales.push(late);
  const lateClosed = closeMonth(d, '2026-10', now);
  same(d, lateClosed);
  assert.equal(cashSummary(lateClosed).unknown, 1);
  const noCount = setup();
  delete noCount.cashbox;
  same(noCount, closeMonth(noCount, '2026-10', now));
});
test('restauración rechaza cierres incompletos o alterados y detecta meses pendientes', () => {
  const d = setup();
  assert.deepEqual(pendingMonths(d, now), ['2026-09', '2026-10']);
  const closed = closeMonth(d, '2026-10', now);
  assert.deepEqual(pendingMonths(closed, now), []);
  for (const mutate of [
    (d) => delete d.carryover,
    (d) => (d.carryover.finance.collected = NaN),
    (d) => (d.carryover.cash[0].count = -1),
    (d) => (d.carryover.daily[0].total = 'x'),
  ]) {
    const bad = structuredClone(closed);
    mutate(bad);
    assert.throws(() => validate(bad));
  }
});
function folderMock(mode = 'ok') {
  const files = new Map();
  const folder = {
    name: 'Prueba',
    async queryPermission() {
      return mode === 'denied' ? 'denied' : 'granted';
    },
    async getDirectoryHandle(name) {
      return folder;
    },
    async getFileHandle(name) {
      return {
        async createWritable() {
          return {
            async write(text) {
              if (mode === 'full') throw Error('Disco lleno');
              files.set(name, text);
            },
            async close() {},
            async abort() {},
          };
        },
        async getFile() {
          return {
            async text() {
              return mode === 'corrupt' ? 'incorrecto' : files.get(name);
            },
          };
        },
      };
    },
  };
  return { folder, files };
}
test('no retira datos si falla escritura, lectura, permiso o aparece una venta concurrente', async () => {
  for (const mode of ['full', 'corrupt', 'denied']) {
    let d = setup();
    const original = structuredClone(d),
      { folder } = folderMock(mode);
    const options = {
      now,
      read: async () => structuredClone(d),
      commit: async (fn) => {
        d = fn(d);
        return d;
      },
    };
    await assert.rejects(runMonthlyArchive(folder, options));
    assert.deepEqual(d, original);
  }
  let d = setup();
  const { folder } = folderMock();
  await assert.rejects(
    archiveOne(folder, '2026-10', {
      now,
      read: async () => structuredClone(d),
      commit: async (fn) => {
        sell(d, { expression: '2' });
        return fn(d);
      },
    }),
    /movimientos/
  );
  assert.equal(d.schema, 1);
  assert.equal(d.sales.length, 82);
});
test('archivos antes/después son restaurables y el cierre confirmado no se repite', async () => {
  let d = setup();
  const original = structuredClone(d),
    { folder, files } = folderMock();
  const options = {
    now,
    read: async () => structuredClone(d),
    commit: async (fn) => {
      d = validate(fn(d));
      return d;
    },
  };
  await archiveOne(folder, '2026-10', options);
  assert.deepEqual(JSON.parse(files.get('antes-del-cierre.json')), original);
  assert.deepEqual(JSON.parse(files.get('despues-del-cierre.json')), d);
  validate(JSON.parse(files.get('despues-del-cierre.json')));
  assert.equal(JSON.parse(files.get('verificacion.json')).files.length, 4);
  assert.equal(await runMonthlyArchive(folder, options), 0);
  same(original, d);
});

test('automatiza meses sin movimientos desde activación y mantiene el mes actual', async () => {
  let d = empty();
  const { folder } = folderMock();
  const options = {
    now,
    startMonth: '2026-09',
    read: async () => structuredClone(d),
    commit: async (fn) => {
      d = validate(fn(d));
      return d;
    },
  };
  assert.equal(await runMonthlyArchive(folder, options), 2);
  assert.equal(await runMonthlyArchive(folder, options), 0);
  assert.equal(new Date(d.carryover.until).getMonth(), 10);
});
test('pérdidas, costos desconocidos y estimados mantienen totales antes y después', () => {
  const d = setup();
  for (let i = 0; i < 45; i++) {
    const p = d.products[0];
    p.costStatus = ['real', 'estimated', 'unknown'][i % 3];
    p.cost = p.costStatus === 'unknown' ? null : i % 2 ? 700 : 0;
    sell(d, { cart: [{ product: p.id, qty: 1 }], method: i % 2 ? 'cash' : 'transfer' });
    d.sales.at(-1).at = at(10);
  }
  for (const s of d.stock) s.at = at(10);
  const next = closeMonth(d, '2026-10', now);
  same(d, next);
});
