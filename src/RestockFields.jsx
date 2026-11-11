import React, { useState } from 'react';
import { cents, money } from './domain.js';
export default function RestockFields({ product, suggested }) {
  const [mode, setMode] = useState('purchase');
  const [quantity, setQuantity] = useState('');
  const [total, setTotal] = useState('');
  const [update, setUpdate] = useState(true);
  let cost = null;
  try {
    if (Number.isSafeInteger(Number(quantity)) && Number(quantity) > 0)
      cost = Math.round(cents(total) / Number(quantity));
  } catch {}
  return (
    <>
      <p>
        <strong>{product.name}</strong> · {product.stock} unidades actuales
      </p>
      {suggested > 0 && (
        <p className="hint">Sugerencia de la lista: al menos {suggested} piezas.</p>
      )}
      <label>
        ¿Qué quieres registrar?
        <select name="restockMode" value={mode} onChange={(e) => setMode(e.target.value)}>
          <option value="purchase">Compra nueva: piezas y pago juntos</option>
          <option value="stock">Solo sumar piezas (compra ya registrada)</option>
        </select>
      </label>
      <label>
        Unidades nuevas que recibiste
        <input
          name="quantity"
          type="number"
          inputMode="numeric"
          min="1"
          step="1"
          required
          value={quantity}
          onChange={(e) => setQuantity(e.target.value)}
        />
      </label>
      {mode === 'purchase' && (
        <>
          <label>
            Total pagado por estas piezas ($)
            <input
              name="purchaseTotal"
              type="number"
              inputMode="decimal"
              min="0.01"
              step="0.01"
              required
              value={total}
              onChange={(e) => setTotal(e.target.value)}
            />
          </label>
          <label>
            ¿De dónde salió el dinero?
            <select name="method">
              <option value="cash">Efectivo de la caja</option>
              <option value="transfer">Transferencia / cuenta bancaria</option>
            </select>
          </label>
          <label className="check">
            <input
              name="updateCost"
              type="checkbox"
              checked={update}
              onChange={(e) => setUpdate(e.target.checked)}
            />
            Actualizar el costo por pieza con esta compra
          </label>
          {cost !== null && (
            <p className="hint">
              Costo de esta compra: {money(cost)} por pieza.{' '}
              {update
                ? 'Se usará para ventas futuras; no es un promedio de lotes.'
                : 'Se conserva el costo actual del producto.'}
            </p>
          )}
          <p className="warning">
            Se suman las piezas y se registra el pago como compra de mercancía en Ganancias y Caja,
            según el medio de pago. No vuelvas a registrar esta compra como gasto o reinversión.
          </p>
        </>
      )}
      <label>
        Nota (opcional)
        <input name="note" maxLength={200} placeholder="Ej. Un paquete de 12 piezas" />
      </label>
      {mode === 'stock' && (
        <p className="hint">Solo suma piezas: conserva el costo y no registra ningún pago.</p>
      )}
    </>
  );
}
