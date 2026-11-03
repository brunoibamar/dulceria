import { test } from 'node:test';
import assert from 'node:assert/strict';
import { empty, saveProduct } from '../src/domain.js';
const fields = { name: 'Mazapán  grande', price: 500, cost: 200, stock: 5 };
test('evita duplicados por acentos, mayúsculas y espacios, incluso archivados', () => {
  const d = empty();
  saveProduct(d, fields);
  d.products[0].archived = true;
  assert.throws(
    () => saveProduct(d, { ...fields, name: ' MAZAPAN grande ' }),
    /ya está registrado/
  );
  assert.equal(d.products.length, 1);
  saveProduct(d, { ...fields, stock: 8 }, d.products[0].id);
  assert.equal(d.products[0].stock, 8);
});
test('impide renombrar un producto con el nombre de otro', () => {
  const d = empty();
  saveProduct(d, fields);
  saveProduct(d, { ...fields, name: 'Paleta' });
  assert.throws(() => saveProduct(d, fields, d.products[1].id), /ya está registrado/);
  assert.equal(d.products[1].name, 'Paleta');
});
