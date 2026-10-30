import React, { useState } from 'react';
import Calculator from './Calculator';
import { balance, cashChange, cents, money, sum, uid } from './domain.js';
export function CashPayment({ total, busy, onConfirm }) {
  const [received, setReceived] = useState((total / 100).toFixed(2));
  let cash = null;
  try {
    cash = cashChange(total, received);
  } catch {}
  return (
    <form
      onSubmit={(e) => {
        e.preventDefault();
        if (cash) onConfirm(cash.received);
      }}
    >
      <p>Total a cobrar</p>
      <h2 className="big mint">{money(total)}</h2>
      <label>
        Efectivo recibido ($)
        <input
          type="number"
          inputMode="decimal"
          min={total / 100}
          step="0.01"
          required
          value={received}
          onChange={(e) => setReceived(e.target.value)}
        />
      </label>
      <div className="quick-amounts">
        <button type="button" onClick={() => setReceived((total / 100).toFixed(2))}>
          Exacto
        </button>
        {[20, 50, 100, 200, 500, 1000]
          .filter((n) => n * 100 >= total)
          .slice(0, 4)
          .map((n) => (
            <button type="button" key={n} onClick={() => setReceived(String(n))}>
              ${n}
            </button>
          ))}
      </div>
      <div className="change" aria-live="polite">
        <small>CAMBIO A ENTREGAR</small>
        <strong>{cash ? money(cash.change) : 'El importe no alcanza'}</strong>
      </div>
      <p className="hint">
        Confirma solo cuando recibas el dinero. Es un registro manual, no un cobro con tarjeta.
      </p>
      <button type="submit" className="green full" disabled={busy || !cash}>
        {busy ? 'Guardando…' : 'Confirmar cobro'}
      </button>
    </form>
  );
}
export function DirectCharge({ person, busy, onConfirm }) {
  const [expression, setExpression] = useState(''),
    [operationId] = useState(uid);
  let total = 0;
  try {
    total = sum(expression);
  } catch {}
  return (
    <>
      <p>
        Nuevo cargo a <b>{person.name}</b>. Esta suma es independiente de tu venta abierta.
      </p>
      <Calculator value={expression} onChange={setExpression} compact />
      <button
        type="button"
        className="primary full"
        disabled={busy || !total}
        onClick={() => onConfirm(expression, operationId)}
      >
        Agregar {money(total)} a {person.name}
      </button>
    </>
  );
}
export function PaymentForm({ person, data, busy, onConfirm }) {
  const owed = balance(data, person.id),
    [value, setValue] = useState('');
  let parsed = 0;
  try {
    parsed = cents(value);
  } catch {}
  return (
    <form
      onSubmit={(e) => {
        e.preventDefault();
        if (parsed > 0 && parsed <= owed) onConfirm(parsed);
      }}
    >
      <p>{person.name}</p>
      <small>SALDO PENDIENTE</small>
      <h2 className="big pink">{money(owed)}</h2>
      <label>
        Importe del abono ($)
        <input
          type="number"
          inputMode="decimal"
          value={value}
          onChange={(e) => setValue(e.target.value)}
          min="0.01"
          max={owed / 100}
          step="0.01"
          required
        />
      </label>
      <button
        type="button"
        className="outline full"
        onClick={() => setValue((owed / 100).toFixed(2))}
      >
        Liquidar saldo completo
      </button>
      <p className="hint" aria-live="polite">
        Saldo después del abono: {money(Math.max(0, owed - parsed))}
      </p>
      <button className="green full" disabled={busy || parsed <= 0 || parsed > owed}>
        Confirmar abono
      </button>
    </form>
  );
}
