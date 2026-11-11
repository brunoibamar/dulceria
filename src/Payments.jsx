import CustomerPicker from './CustomerPicker.jsx';
import React, { useState } from 'react';
import Calculator from './Calculator';
import { balance, cashChange, cents, money, sum, uid } from './domain.js';
export function CashPayment({ total, busy, onConfirm, people = [] }) {
  const [received, setReceived] = useState((total / 100).toFixed(2));
  const [method, setMethod] = useState('cash');
  const [showAmounts, setShowAmounts] = useState(false);
  const amounts = [10, 20, 50, 100, 200, 500, 1000].filter((n) => n * 100 > total).slice(0, 3);
  const [buyer, setBuyer] = useState({});
  const hasBuyer = buyer.customer || buyer.newCustomerName?.trim();
  let cash = null;
  try {
    cash = cashChange(total, received);
  } catch {}
  return (
    <form
      onSubmit={(e) => {
        e.preventDefault();
        if (hasBuyer && (method === 'transfer' || cash))
          onConfirm(method === 'cash' ? cash.received : null, method, buyer);
      }}
    >
      <p>Total a cobrar</p>
      <h2 className="big mint">{money(total)}</h2>
      <div className="segments" role="group" aria-label="Método de pago">
        <button
          type="button"
          aria-pressed={method === 'cash'}
          className={method === 'cash' ? 'selected' : ''}
          onClick={() => setMethod('cash')}
        >
          Efectivo
        </button>
        <button
          type="button"
          aria-pressed={method === 'transfer'}
          className={method === 'transfer' ? 'selected' : ''}
          onClick={() => setMethod('transfer')}
        >
          Transferencia
        </button>
      </div>
      {method === 'cash' ? (
        <>
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
            {amounts.length > 0 && (
              <button
                type="button"
                aria-expanded={showAmounts}
                aria-controls="cash-suggestions"
                onClick={() => setShowAmounts((v) => !v)}
              >
                Elegir importe
              </button>
            )}
          </div>
          <div className="quick-amounts" id="cash-suggestions" hidden={!showAmounts}>
            {showAmounts &&
              amounts.map((n) => (
                <button type="button" key={n} onClick={() => setReceived(String(n))}>
                  ${n}
                </button>
              ))}
          </div>
          <div className="change" aria-live="polite">
            <small>CAMBIO A ENTREGAR</small>
            <strong>{cash ? money(cash.change) : 'El importe no alcanza'}</strong>
          </div>
        </>
      ) : (
        <p className="warning">
          Confirma que recibiste la transferencia en tu cuenta. No entra dinero a la caja física ni
          hay cambio.
        </p>
      )}
      <CustomerPicker people={people} value={buyer} onChange={setBuyer} busy={busy} />
      <p className="hint">
        Confirma solo cuando recibas el dinero. Es un registro manual, no un cobro con tarjeta.
      </p>
      <button
        type="submit"
        className="green full"
        disabled={busy || !hasBuyer || (method === 'cash' && !cash)}
      >
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
  const [method, setMethod] = useState('cash');
  let parsed = 0;
  try {
    parsed = cents(value);
  } catch {}
  return (
    <form
      onSubmit={(e) => {
        e.preventDefault();
        if (parsed > 0 && parsed <= owed) onConfirm(parsed, method);
      }}
    >
      <p>{person.name}</p>
      <small>SALDO PENDIENTE</small>
      <h2 className="big pink">{money(owed)}</h2>
      <label>
        Método del abono
        <select value={method} onChange={(e) => setMethod(e.target.value)}>
          <option value="cash">Efectivo</option>
          <option value="transfer">Transferencia</option>
        </select>
      </label>
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
