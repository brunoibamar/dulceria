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
