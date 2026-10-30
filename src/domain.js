import { validateFinance } from './finance.js';
import { validateCashbox } from './cashbox.js';
// Amounts are integer centavos. Existing schema-1 data remains compatible.
export const MAX_AMOUNT = 10_000_000_000;
const integer = (n) => Number.isSafeInteger(n) && n >= 0;
const amount = (n) => integer(n) && n <= MAX_AMOUNT;
export const uid = () =>
  Array.from(crypto.getRandomValues(new Uint8Array(16)), (b) =>
    b.toString(16).padStart(2, '0')
  ).join('');
export const money = (n) =>
  new Intl.NumberFormat('es-MX', { style: 'currency', currency: 'MXN' }).format(n / 100);
export const empty = () => ({
  schema: 1,
  products: [],
  people: [],
  sales: [],
  payments: [],
  stock: [],
});
export function cents(value) {
  const s = String(value).trim().replace(',', '.');
  if (!/^\d+(\.\d{1,2})?$/.test(s)) throw Error('Usa un importe positivo con hasta dos decimales.');
  const [whole, decimals = ''] = s.split('.');
  const n = Number(whole) * 100 + Number(decimals.padEnd(2, '0'));
  if (!amount(n)) throw Error('Importe demasiado grande.');
  return n;
}
export function sum(expression) {
  if (!expression.trim()) return 0;
  const result = expression
    .trim()
    .replace(/\+\s*$/, '')
    .split('+')
    .reduce((n, t) => n + cents(t), 0);
  if (!amount(result)) throw Error('La suma es demasiado grande.');
  return result;
}
export const normalize = (value) =>
  String(value ?? '')
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLocaleLowerCase('es')
    .trim();
export const balance = (d, id) =>
  d.sales.filter((s) => s.person === id).reduce((n, s) => n + s.total, 0) -
  d.payments.filter((p) => p.person === id).reduce((n, p) => n + p.amount, 0);
const validCost = (p) =>
  p.costStatus === 'unknown'
    ? p.cost === null
    : (p.costStatus === undefined || p.costStatus === 'real' || p.costStatus === 'estimated') &&
      amount(p.cost);
function person(d, id) {
  const p = d.people.find((p) => p.id === id);
  if (!p) throw Error('La cuenta ya no existe.');
  return p;
}
function name(value) {
  if (typeof value !== 'string' || !value.trim() || value.trim().length > 80)
    throw Error('Escribe un nombre de hasta 80 caracteres.');
  return value.trim();
}
export function editPerson(d, id, fields) {
  Object.assign(person(d, id), {
    name: name(fields.name),
    phone: String(fields.phone ?? '')
      .trim()
      .slice(0, 30),
    notes: String(fields.notes ?? '')
      .trim()
      .slice(0, 500),
  });
  return d;
}
export function archivePerson(d, id, archived) {
  if (typeof archived !== 'boolean') throw Error('Estado de cuenta inválido.');
  person(d, id).archived = archived;
  return d;
}
export function saveProduct(d, fields, id = null) {
  const product = {
    name: name(fields.name),
    price: fields.price,
    cost: fields.cost,
    costStatus: fields.costStatus,
    stock: fields.stock,
    lowStock: fields.lowStock ?? 3,
  };
  if (
    !amount(product.price) ||
    !product.price ||
    !validCost(product) ||
    !integer(product.stock) ||
    !integer(product.lowStock)
  )
    throw Error('Revisa el precio, costo y existencias del producto.');
  const previous = id && d.products.find((p) => p.id === id);
  if (id && !previous) throw Error('El producto ya no existe.');
  if (previous && fields.expectedStock !== undefined) {
    if (fields.stock === fields.expectedStock) product.stock = previous.stock;
    else if (previous.stock !== fields.expectedStock)
      throw Error(
        'Las existencias cambiaron mientras editabas. Cierra y vuelve a abrir el producto para revisar el ajuste.'
      );
  }
  const delta = product.stock - (previous?.stock ?? 0);
  if (previous) Object.assign(previous, product);
  else d.products.push({ id: (id = uid()), ...product });
  if (delta)
    d.stock.push({
      id: uid(),
      product: id,
      delta,
      note: previous ? 'Ajuste de inventario' : 'Existencia inicial',
      at: new Date().toISOString(),
    });
  return d;
}
export function restock(d, id, quantity, note = '') {
  const p = d.products.find((p) => p.id === id);
  if (
    !p ||
    p.archived ||
    !integer(quantity) ||
    !quantity ||
    !Number.isSafeInteger(p.stock + quantity)
  )
    throw Error('Indica una cantidad entera positiva para un producto activo.');
  p.stock += quantity;
  d.stock.push({
    id: uid(),
    product: id,
    delta: quantity,
    note: note.trim().slice(0, 200) || 'Reposición de mercancía',
    at: new Date().toISOString(),
  });
  return d;
}
export function cashChange(total, received) {
  const paid = cents(received);
  if (!amount(total) || total <= 0 || paid < total)
    throw Error('El efectivo recibido no alcanza para cubrir la venta.');
  return { received: paid, change: paid - total };
}
export function sell(
  d,
  {
    expression = '',
    cart = [],
    person = null,
    received = null,
    operationId = null,
    expectedTotal = null,
    method = 'cash',
  }
) {
  if (operationId && d.sales.some((s) => s.id === operationId))
    throw Error('Esta venta ya está registrada. Revisa el historial antes de repetirla.');
  if (person && !d.people.some((p) => p.id === person && !p.archived))
    throw Error('Elige una persona activa válida.');
  const items = cart.map((c) => {
    const p = d.products.find((p) => p.id === c.product);
    if (!p || p.archived || !integer(c.qty) || !c.qty || c.qty > p.stock)
      throw Error('No hay existencias suficientes o el producto está archivado.');
    return {
      product: p.id,
      name: p.name,
      qty: c.qty,
      price: p.price,
      cost: p.cost,
      costStatus: p.costStatus ?? 'real',
    };
  });
  if (new Set(items.map((i) => i.product)).size !== items.length)
    throw Error('Producto duplicado.');
  const total = items.length ? items.reduce((n, i) => n + i.price * i.qty, 0) : sum(expression);
  if (!amount(total) || total <= 0) throw Error('Agrega un importe mayor a cero.');
  if (expectedTotal !== null && total !== expectedTotal)
    throw Error(
      'Cambió un precio durante la venta. Revisa el total actualizado antes de confirmar.'
    );
  let cash = {};
  if (!['cash', 'transfer'].includes(method)) throw Error('Elige efectivo o transferencia.');
  if (received !== null && !person && method === 'cash')
    cash = cashChange(total, String(received / 100));
  const at = new Date().toISOString();
  for (const i of items) {
    d.products.find((p) => p.id === i.product).stock -= i.qty;
    d.stock.push({ id: uid(), product: i.product, delta: -i.qty, at, note: 'Venta' });
  }
  d.sales.push({
    id: operationId || uid(),
    at,
    total,
    person,
    method: person ? null : method,
    items,
    note: items.length ? 'Catálogo' : expression,
    ...cash,
  });
  return d;
}
export function pay(d, id, value, method = 'cash') {
  person(d, id);
  if (!amount(value) || value <= 0 || value > balance(d, id))
    throw Error('El abono debe ser mayor a cero y no superar el saldo.');
  if (!['cash', 'transfer'].includes(method)) throw Error('Elige efectivo o transferencia.');
  d.payments.push({ id: uid(), person: id, amount: value, method, at: new Date().toISOString() });
  return d;
}
export function validate(d) {
  const keys = ['products', 'people', 'sales', 'payments', 'stock'];
  if (!d || d.schema !== 1 || !keys.every((k) => Array.isArray(d[k])))
    throw Error('Respaldo incompatible.');
  const ids = new Set(),
    products = new Set(d.products.map((p) => p?.id)),
    people = new Set(d.people.map((p) => p?.id));
  for (const key of keys)
    for (const x of d[key]) {
      if (!x || typeof x.id !== 'string' || !x.id || ids.has(x.id))
        throw Error('Identificadores inválidos.');
      ids.add(x.id);
    }
  const archived = (p) => p.archived === undefined || typeof p.archived === 'boolean';
  const dated = (p) => typeof p.at === 'string' && Number.isFinite(Date.parse(p.at));
  for (const p of d.products) {
    name(p.name);
    if (
      !amount(p.price) ||
      !integer(p.stock) ||
      !validCost(p) ||
      !archived(p) ||
      (p.lowStock !== undefined && !integer(p.lowStock))
    )
      throw Error('Producto inválido.');
  }
  for (const p of d.people) {
    name(p.name);
    if (typeof p.phone !== 'string' || typeof p.notes !== 'string' || !archived(p))
      throw Error('Persona inválida.');
  }
  const balances = new Map(d.people.map((p) => [p.id, 0]));
  for (const s of d.sales) {
    if (
      s.method !== undefined &&
      !(s.person ? s.method === null : ['cash', 'transfer'].includes(s.method))
    )
      throw Error('Método de cobro inválido.');
    if (s.method === 'transfer' && s.received !== undefined)
      throw Error('Una transferencia no tiene efectivo recibido.');
    if (
      !amount(s.total) ||
      !s.total ||
      !dated(s) ||
      !(s.person === null || people.has(s.person)) ||
      !Array.isArray(s.items) ||
      typeof s.note !== 'string'
    )
      throw Error('Venta inválida.');
    for (const i of s.items)
      if (
        !products.has(i.product) ||
        !integer(i.qty) ||
        !i.qty ||
        !amount(i.price) ||
        !validCost(i) ||
        (i.name !== undefined && typeof i.name !== 'string')
      )
        throw Error('Detalle inválido.');
    if (s.items.length && s.items.reduce((n, i) => n + i.qty * i.price, 0) !== s.total)
      throw Error('Total inconsistente.');
    if (
      s.received !== undefined &&
      (!amount(s.received) || s.received < s.total || s.change !== s.received - s.total || s.person)
    )
      throw Error('Efectivo inválido.');
    if (s.person) balances.set(s.person, balances.get(s.person) + s.total);
  }
  for (const p of d.payments) {
    if (p.method !== undefined && !['cash', 'transfer'].includes(p.method))
      throw Error('Método de abono inválido.');
    if (!amount(p.amount) || !p.amount || !people.has(p.person) || !dated(p))
      throw Error('Abono inválido.');
    balances.set(p.person, balances.get(p.person) - p.amount);
  }
  if ([...balances.values()].some((n) => n < 0 || !Number.isSafeInteger(n)))
    throw Error('Un abono supera la deuda o el saldo es inválido.');
  for (const x of d.stock)
    if (
      !products.has(x.product) ||
      !Number.isSafeInteger(x.delta) ||
      !dated(x) ||
      typeof x.note !== 'string'
    )
      throw Error('Movimiento inválido.');
  validateFinance(d, ids);
  validateCashbox(d, ids);
  return d;
}
