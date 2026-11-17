import React, { useState } from 'react';
import { cents, money, uid } from './domain.js';
import { businessSummary, financeData } from './finance.js';
import { cashSummary } from './cashbox.js';
import { date } from './HistoryList';

export default function Finance({ data, busy, onOpen, onGo }) {
  const summary = businessSummary(data),
    ledger = financeData(data),
    cash = cashSummary(data),
    currentFunds =
      cash.expected === null || cash.unknown > 0 || !cash.lastTransferCount
        ? null
        : cash.expected + cash.transferNet,
    investable = currentFunds === null ? null : Math.max(0, currentFunds - summary.available),
    ownerFundsShortfall =
      currentFunds === null ? null : Math.max(0, summary.available - currentFunds);
  const entries = [
    ...ledger.withdrawals.map((w) => ({
      ...w,
      label: 'Retiro personal',
      detail: w.destination === 'cash' ? 'Efectivo' : 'Tarjeta / cuenta bancaria',
    })),
    ...ledger.movements.map((m) => ({
      ...m,
      label: m.kind === 'expense' ? 'Gasto del negocio' : 'Uso de reinversión',
      detail:
        m.method === 'cash'
          ? 'Pagado en efectivo'
          : m.method === 'transfer'
            ? 'Pagado por transferencia'
            : 'Método histórico no registrado',
    })),
    ...(ledger.consumptions || []).map((c) => ({
      ...c,
      label: 'Consumo personal de mercancía',
      detail: 'Descontado al costo; no sale efectivo',
    })),
  ].sort((a, b) => b.at.localeCompare(a.at));
  return (
    <>
      <p className="intro">Aparta lo que es del negocio y retira tu ganancia cuando tú decidas.</p>
      <section className="banner finance-balance">
        <div>
          <small>APARTADO PARA MÍ · GANANCIA ACUMULADA</small>
          <h2 className="big mint">{money(summary.available)}</h2>
          <p>
            Ganancia ya cobrada, con costos confirmados, menos gastos, consumos personales y
            retiros. Aunque uses todo el efectivo en mercancía, este apartado se conserva y sigue
            creciendo; las compras para resurtir no lo reducen.
          </p>
        </div>
        <button
          className="green"
          disabled={busy || !summary.available}
          onClick={() => onOpen({ type: 'withdraw', operationId: uid() })}
        >
          Retirar para mi Economía
        </button>
      </section>
      <section className="panel consumption-shortcut">
        <span className="consumption-icon" aria-hidden="true">
          ◇
        </span>
        <div>
          <h2>Consumo personal</h2>
          <p>Anota la mercancía que tomas para ti.</p>
        </div>
        <button
          className="primary"
          disabled={busy}
          onClick={() => onOpen({ type: 'consumption', operationId: uid() })}
        >
          Registrar consumo
        </button>
      </section>
      <p className="hint">
        Puedes dejar tu ganancia dentro del negocio: las siguientes ventas y cobros la seguirán
        aumentando. Un retiro parcial descuenta solo ese importe; retirar todo deja el apartado en
        cero. El historial nunca se borra.
      </p>
      <div className="cards">
        <section className="panel investment-balance">
          <small>DINERO LÍQUIDO DISPONIBLE PARA INVERTIR</small>
          <h2 className="big mint">
            {investable === null ? 'Cuenta efectivo y tarjeta' : money(investable)}
          </h2>
          <p>
            Se calcula con el efectivo y la tarjeta/transferencia contados, menos tu ganancia
            acumulada para ti. Así el dinero que no has retirado sigue apartado y no se cuenta dos
            veces como fondo para compras. El cálculo aparece después de un conteo conjunto real; la
            transferencia histórica sola no demuestra cuánto hay hoy en el banco.
          </p>
          {currentFunds !== null && (
            <>
              <div className="row line">
                <span>Dinero contado en caja + tarjeta</span>
                <b>{money(currentFunds)}</b>
              </div>
              <div className="row line">
                <span>Apartado para ti, pendiente de retiro</span>
                <b>{money(summary.available)}</b>
              </div>
            </>
          )}
          {ownerFundsShortfall > 0 && (
            <p className="warning">
              El apartado para ti supera el dinero contado por {money(ownerFundsShortfall)}. No hay
              efectivo libre para invertir ahora, pero tu ganancia acumulada se conserva.
            </p>
          )}
          {currentFunds === null && (
            <button className="outline full" disabled={busy} onClick={() => onGo?.('caja')}>
              Contar efectivo y tarjeta
            </button>
          )}
          <div className="row line">
            <span>Compras para resurtir registradas · histórico</span>
            <b>{money(summary.reinvested)}</b>
          </div>
          <button
            className="outline full"
            disabled={busy}
            onClick={() =>
              onOpen({ type: 'businessMovement', kind: 'reinvestment', operationId: uid() })
            }
          >
            Registrar compra o gasto del negocio
          </button>
        </section>
        <details className="panel finance-reserve">
          <summary>Reserva contable pendiente de recuperar · {money(summary.reserve)}</summary>
          <p>
            Este cálculo no es efectivo ni dinero libre para comprar. Muestra costos de mercancía y
            ventas sin costo confirmado que siguen dentro del negocio, después de descontar las
            compras para resurtir registradas. No se suma ni se resta otra vez al disponible para
            invertir.
          </p>
          {summary.uncosted > 0 && (
            <p className="warning">
              Hay {money(summary.uncosted)} cobrados sin costo confirmado o con costo estimado. Se
              mantienen dentro del negocio y no se habilitan como ganancia para retirar. Este total
              es distinto de la reserva contable.
            </p>
          )}
        </details>
        <section className="panel">
          <small>GANANCIA BRUTA HISTÓRICA CONFIRMADA</small>
          <h2 className="big">{money(summary.gross)}</h2>
          <p>Incluye fiados aún no cobrados. Esta cifra no se pone en cero al retirar.</p>
          <div className="row line">
            <span>Ganancia proporcional ya cobrada</span>
            <b>{money(summary.collectedProfit)}</b>
          </div>
          <div className="row line">
            <span>Gastos registrados</span>
            <b>{money(summary.expenses)}</b>
          </div>
          <div className="row line">
            <span>Ya retirado para ti</span>
            <b className="pink">{money(summary.withdrawn)}</b>
          </div>
          <div className="row line">
            <span>Mercancía consumida por ti (costo)</span>
            <b>{money(summary.personalConsumption)}</b>
          </div>
        </section>
      </div>
      {summary.shortfall > 0 && (
        <p className="warning">
          Hay {money(summary.shortfall)} pendientes de recuperar por pérdidas o movimientos del
          negocio. El disponible permanecerá en cero hasta cubrirlos.
        </p>
      )}
      <section className="panel">
        <div className="row">
          <h2>Historial del negocio</h2>
          <span className="pill">{entries.length} movimientos</span>
        </div>
        {!entries.length && (
          <p className="empty">Aquí quedarán tus retiros, gastos y usos de reinversión.</p>
        )}
        {entries.map((entry) => (
          <details className="receipt" key={entry.id}>
            <summary>
              <span className="dot" />
              <span className="receipt-label">
                <b>{entry.label}</b>
                <small>{date(entry.at)}</small>
              </span>
              <strong className="pink">{money(entry.amount)}</strong>
              <span>⌄</span>
            </summary>
            <div className="receipt-body">
              {entry.detail && (
                <p>
                  {entry.detail}
                  {entry.source === 'dulceria' ? ' · Disponible para importar en Economía' : ''}
                </p>
              )}
              {entry.items?.map((i) => (
                <p key={i.product}>
                  {i.name} × {i.qty} · costo {money(i.cost * i.qty)}
                </p>
              ))}
              {entry.note && <p>{entry.note}</p>}
              <small>Identificador: {entry.id}</small>
            </div>
          </details>
        ))}
      </section>
    </>
  );
}

export function WithdrawalForm({ data, busy, onConfirm }) {
  const available = businessSummary(data).available;
  const [value, setValue] = useState((available / 100).toFixed(2)),
    [destination, setDestination] = useState('cash');
  let amount = 0;
  try {
    amount = cents(value);
  } catch {}
  return (
    <form
      onSubmit={(e) => {
        e.preventDefault();
        const f = Object.fromEntries(new FormData(e.currentTarget));
        if (amount > 0 && amount <= available) onConfirm({ amount, destination, note: f.note });
      }}
    >
      <p>
        Apartado para ti: <b className="mint">{money(available)}</b>
      </p>
      <p className="hint">
        Parte de esta ganancia puede estar invertida en mercancía. Registra solo el dinero que
        realmente vas a separar para ti y revisa que esté disponible en caja o en tu cuenta.
      </p>
      <label>
        Importe que retiras ($)
        <input
          name="amount"
          type="number"
          inputMode="decimal"
          min="0.01"
          max={available / 100}
          step="0.01"
          required
          value={value}
          onChange={(e) => setValue(e.target.value)}
        />
      </label>
      <button
        type="button"
        className="outline full"
        onClick={() => setValue((available / 100).toFixed(2))}
      >
        Retirar toda la ganancia disponible
      </button>
      <label>
        ¿Dónde queda tu dinero personal?
        <select value={destination} onChange={(e) => setDestination(e.target.value)}>
          <option value="cash">Efectivo</option>
          <option value="bank">Tarjeta / cuenta bancaria</option>
        </select>
      </label>
      <label>
        Nota (opcional)
        <input name="note" maxLength={500} placeholder="Ej. Retiro de mi ganancia de la semana" />
      </label>
      <div className="change" aria-live="polite">
        <small>APARTADO PARA MÍ DESPUÉS DEL RETIRO</small>
        <strong>{money(Math.max(0, available - amount))}</strong>
      </div>
      <p className="hint">
        El retiro se guardará localmente. Abre Economía en este mismo navegador para que incorpore
        el ingreso una sola vez. Esto no realiza una transferencia bancaria.
      </p>
      <label className="checkline">
        <input type="checkbox" required />
        Confirmo que estoy separando este dinero para uso personal.
      </label>
      <button className="green full" disabled={busy || amount <= 0 || amount > available}>
        Confirmar retiro de {money(amount)}
      </button>
    </form>
  );
}
export function BusinessMovementForm({ kind, busy, onConfirm }) {
  const [movementKind, setMovementKind] = useState(kind || 'reinvestment');
  const purchase = movementKind === 'reinvestment';
  return (
    <form
      onSubmit={(e) => {
        e.preventDefault();
        const f = Object.fromEntries(new FormData(e.currentTarget));
        onConfirm({ amount: f.amount, note: f.note, method: f.method, kind: f.kind });
      }}
    >
      <p>
        {purchase
          ? 'Registra dinero que ya usaste para comprar mercancía. Se descontará del dinero del negocio, sin reducir tu apartado de ganancia acumulada.'
          : 'Registra un gasto operativo ya pagado, por ejemplo transporte o bolsas. Reducirá tu ganancia disponible.'}
      </p>
      <label>
        Tipo de movimiento
        <select name="kind" value={movementKind} onChange={(e) => setMovementKind(e.target.value)}>
          <option value="reinvestment">Compra de mercancía / reinversión</option>
          <option value="expense">Gasto operativo del negocio</option>
        </select>
      </label>
      <label>
        Importe pagado ($)
        <input name="amount" type="number" inputMode="decimal" min="0.01" step="0.01" required />
      </label>
      <label>
        Concepto
        <input
          name="note"
          maxLength={500}
          required
          placeholder={purchase ? 'Ej. Compra de cajas de dulces' : 'Ej. Transporte de mercancía'}
        />
      </label>
      <label>
        ¿De dónde salió el dinero?
        <select name="method">
          <option value="cash">Efectivo de la caja</option>
          <option value="transfer">Transferencia / cuenta bancaria</option>
        </select>
      </label>
      <p className="hint">
        Revisa antes de confirmar: el movimiento queda en el historial. No modifica existencias. Las
        compras para resurtir se registran aquí como reinversión y no también como gasto.
      </p>
      <button className="primary full" disabled={busy}>
        Guardar {purchase ? 'compra' : 'gasto'}
      </button>
    </form>
  );
}
