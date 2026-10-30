import React, { useState } from 'react';
import { money } from './domain.js';
export default function ConsumptionForm({ data, busy, onConfirm }) {
  const [product, setProduct] = useState(''),
    [quantity, setQuantity] = useState('1');
  const p = data.products.find((p) => p.id === product),
    qty = Number(quantity);
  const valid =
    p &&
    !p.archived &&
    p.cost !== null &&
    (!p.costStatus || p.costStatus === 'real') &&
    p.cost > 0 &&
    Number.isSafeInteger(qty) &&
    qty > 0 &&
    qty <= p.stock;
  return (
    <form
      onSubmit={(e) => {
        e.preventDefault();
        const f = Object.fromEntries(new FormData(e.currentTarget));
        if (valid) onConfirm({ cart: [{ product, qty }], note: f.note });
      }}
    >
      <p>
        Registra mercancía que tomas para ti. Se descuentan las piezas y su costo de compra de tu
        ganancia disponible; no el precio de venta. No sale efectivo de la caja.
      </p>
      <label>
        Producto
        <select required value={product} onChange={(e) => setProduct(e.target.value)}>
          <option value="" disabled>
            Selecciona un producto
          </option>
          {data.products
            .filter((p) => !p.archived && p.stock > 0)
            .map((p) => (
              <option key={p.id} value={p.id}>
                {p.name} · {p.stock} disponibles
              </option>
            ))}
        </select>
      </label>
      <label>
        Piezas que tomaste
        <input
          type="number"
          inputMode="numeric"
          min="1"
          max={p?.stock}
          step="1"
          value={quantity}
          onChange={(e) => setQuantity(e.target.value)}
          required
        />
      </label>
      {p && (
        <div className="change">
          <small>COSTO QUE SE DESCUENTA DE TU GANANCIA</small>
          <strong>{valid ? money(p.cost * qty) : 'Confirma costo y unidades'}</strong>
          <small>
            {p.cost === null || p.costStatus === 'estimated'
              ? 'Primero confirma el costo de compra en Inventario.'
              : `${money(p.cost)} de compra por pieza; no se usa ${money(p.price)} de venta.`}
          </small>
        </div>
      )}
      <label>
        Nota (opcional)
        <input name="note" maxLength={500} placeholder="Ej. Dos papas para mí" />
      </label>
      <p className="hint">
        Puede dejar tu disponible en cero y un importe pendiente por recuperar. La ganancia
        histórica de ventas no se borra.
      </p>
      <button className="primary full" disabled={busy || !valid}>
        Registrar consumo personal
      </button>
    </form>
  );
}
