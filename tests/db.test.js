import 'fake-indexeddb/auto';
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { transact, readRecovery } from '../src/db.js';
import { empty, sell, saveProduct } from '../src/domain.js';

test('IndexedDB confirma operaciones completas y revierte errores', async () => {
  await transact(() => empty());
  await transact((d) =>
    saveProduct(d, { name: 'Paleta', price: 500, cost: 200, costStatus: 'real', stock: 2 })
  );
  const before = await transact();
  await assert.rejects(
    transact((d) => {
      d.products[0].stock = 0;
      throw Error('Interrumpido');
    })
  );
  assert.deepEqual(await transact(), before);
  await assert.rejects(
    transact((d) => {
      d.products[0].stock = -1;
      return d;
    })
  );
  assert.deepEqual(await transact(), before);
});
test('dos pestañas simuladas no sobrescriben ventas y no duplican el mismo cobro', async () => {
  await transact(() => empty());
  await Promise.all([
    transact((d) => sell(d, { expression: '5' })),
    transact((d) => sell(d, { expression: '7' })),
  ]);
  assert.equal(
    (await transact()).sales.reduce((n, s) => n + s.total, 0),
    1200
  );
  const outcomes = await Promise.allSettled([
    transact((d) => sell(d, { expression: '2', operationId: 'same' })),
    transact((d) => sell(d, { expression: '2', operationId: 'same' })),
  ]);
  assert.equal(outcomes.filter((x) => x.status === 'fulfilled').length, 1);
  assert.equal((await transact()).sales.length, 3);
});
test('restauración conserva copia anterior y una restauración inválida no la reemplaza', async () => {
  const previous = await transact();
  await transact(() => empty(), { capture: true });
  assert.deepEqual(await readRecovery(), previous);
  await assert.rejects(transact(() => ({ schema: 9 }), { capture: true }));
  assert.deepEqual(await readRecovery(), previous);
  assert.deepEqual(await transact(), empty());
  await transact(() => previous, { capture: true });
  assert.deepEqual(await transact(), previous);
  assert.deepEqual(await readRecovery(), empty());
});
import { closeMonth } from '../src/monthlyClose.js';
import { archiveSetting } from '../src/db.js';
test('cierre compacto se confirma en IndexedDB y el respaldo anterior puede restaurarse', async () => {
  await transact(() => empty());
  await transact((d) =>
    saveProduct(d, { name: 'Paleta cierre', price: 500, cost: 200, stock: 10 })
  );
  await transact((d) => {
    sell(d, { cart: [{ product: d.products[0].id, qty: 2 }], method: 'cash' });
    d.sales[0].at = new Date(2026, 8, 10).toISOString();
    return d;
  });
  const before = await transact();
  await archiveSetting({ enabled: true, name: 'Prueba' });
  const after = await transact((d) => closeMonth(d, '2026-10', new Date(2026, 10, 3)));
  assert.equal(after.schema, 2);
  assert.equal((await transact()).sales.length, 0);
  assert.equal((await transact()).carryover.finance.collected, 1000);
  await assert.rejects(
    transact((d) => {
      delete d.carryover;
      return d;
    })
  );
  assert.deepEqual(await transact(), after);
  await transact(() => before, { capture: true });
  assert.deepEqual(await readRecovery(), after);
  assert.equal((await archiveSetting()).name, 'Prueba');
  assert.deepEqual(await transact(), before);
});
