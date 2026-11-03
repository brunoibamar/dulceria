import { restock, MAX_AMOUNT } from './domain.js';
import { recordBusinessMovement } from './finance.js';

export function receivePurchase(
  data,
  { product, quantity, total, method, updateCost, note = '', operationId }
) {
  if (!Number.isSafeInteger(total) || total <= 0 || total > MAX_AMOUNT)
    throw Error('Indica el total pagado por estas piezas.');
  if (!operationId) throw Error('Falta el identificador de la compra.');
  const next = structuredClone(data);
  const p = next.products.find((p) => p.id === product);
  if (!p || p.archived) throw Error('Selecciona un producto activo.');
  recordBusinessMovement(next, {
    id: operationId,
    at: new Date().toISOString(),
    amount: total,
    kind: 'reinvestment',
    method,
    note: `Compra de ${p.name}: ${quantity} piezas. ${note}`,
  });
  restock(next, product, quantity, note || 'Compra de mercancía');
  if (updateCost) {
    p.cost = Math.round(total / quantity);
    p.costStatus = 'real';
  }
  return next;
}

export function shoppingList(products) {
  return products
    .filter((p) => !p.archived && p.stock <= p.lowStock)
    .map((p) => ({ ...p, suggested: Math.max(1, p.lowStock + 1 - p.stock) }))
    .sort((a, b) => a.stock - b.stock || a.name.localeCompare(b.name, 'es'));
}
