import React, { useState } from 'react';
import { money } from './domain.js';

export default function VoidSaleForm({ sale, problem, busy, onConfirm }) {
  const [reason, setReason] = useState('');
  if (problem) return <p className="warning">{problem}</p>;
  const quantity = sale.items.reduce((total, item) => total + item.qty, 0);
  const balance = sale.person
    ? 'la deuda del cliente'
    : sale.method === 'transfer'
      ? 'el neto de transferencias'
      : sale.method === 'cash' || sale.received !== undefined
        ? 'la caja'
        : 'el total de cobros (el medio de pago histórico está sin clasificar)';
  return (
    <form
      onSubmit={(event) => {
        event.preventDefault();
        if (reason.trim()) onConfirm(reason);
      }}
    >
      <p>
        <b>{money(sale.total)}</b> se descontarán de {balance}.
      </p>
      {quantity > 0 && <p>Volverán {quantity} piezas al inventario.</p>}
      <p>Se actualizarán las ganancias y quedará el motivo en el historial.</p>
      {!sale.person && (
        <label className="checkline">
          <input type="checkbox" required />
          Confirmo que ya devolví el importe si había recibido el pago.
        </label>
      )}
      <label>
        Motivo
        <input
          maxLength={200}
          required
          value={reason}
          onChange={(event) => setReason(event.target.value)}
        />
      </label>
      <button className="primary full" disabled={busy || !reason.trim()}>
        Confirmar anulación
      </button>
    </form>
  );
}
