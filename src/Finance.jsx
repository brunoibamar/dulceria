import React, { useState } from 'react';
import { cents, money, uid } from './domain.js';
import { businessSummary, financeData } from './finance.js';
import { date } from './HistoryList';

export default function Finance({ data, busy, onOpen }) {
  const summary = businessSummary(data),
    ledger = financeData(data);
  const entries = [
    ...ledger.withdrawals.map((w) => ({
      ...w,
      label: 'Retiro personal',
      detail: w.destination === 'cash' ? 'Efectivo' : 'Tarjeta / cuenta bancaria',
    })),
    ...ledger.movements.map((m) => ({
      ...m,
      label: m.kind === 'expense' ? 'Gasto del negocio' : 'Uso de reinversión',
      detail: '',
    })),
  ].sort((a, b) => b.at.localeCompare(a.at));
  return (
    <>
      <p className="intro">Aparta lo que es del negocio y retira tu ganancia cuando tú decidas.</p>
      <section className="banner finance-balance">
        <div>
          <small>GANANCIA DISPONIBLE PARA RETIRAR</small>
          <h2 className="big mint">{money(summary.available)}</h2>
          <p>
            Ya cobrada, con costos confirmados, descontando los movimientos y retiros registrados.
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
      <p className="hint">
        Si retiras todo, este disponible queda en cero. Las siguientes ventas y cobros lo irán
        aumentando; el historial nunca se borra.
      </p>
      <div className="cards">
        <section className="panel">
          <small>RESERVADO PARA EL NEGOCIO</small>
          <h2 className="big">{money(summary.reserve)}</h2>
          <p>
            Costo recuperado y dinero sin costo confirmado, menos las compras registradas como uso
            de reinversión.
          </p>
          {summary.uncosted > 0 && (
            <p className="warning">
              Hay {money(summary.uncosted)} cobrados sin costo confirmado o con costo estimado. Se
              mantienen dentro del negocio y no se habilitan como ganancia para retirar.
            </p>
          )}
          <button
            className="outline full"
            disabled={busy}
            onClick={() =>
              onOpen({ type: 'businessMovement', kind: 'reinvestment', operationId: uid() })
            }
          >
            Registrar uso de reinversión
          </button>
        </section>
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
          <button
            className="outline full"
            disabled={busy}
            onClick={() =>
              onOpen({ type: 'businessMovement', kind: 'expense', operationId: uid() })
            }
          >
            Registrar gasto del negocio
          </button>
        </section>
      </div>
      {summary.shortfall > 0 && (
        <p className="warning">
          Hay {money(summary.shortfall)} pendientes de recuperar por pérdidas o movimientos del
          negocio. El disponible permanecerá en cero hasta cubrirlos.
        </p>
      )}
      <section className="panel">
        <h2>Tu conexión con Economía</h2>
        <p>
          Por ahora, cada retiro queda guardado aquí como <b>pendiente de vincular</b>, con
          identificador, fecha, importe y destino. Cuando creemos Economía, podrá reconocer esos
          identificadores para no registrar una entrada dos veces.
        </p>
        <p>
          Esto no mueve dinero entre bancos. Registra el dinero que tú realmente separas del negocio
          para uso personal. La aplicación no comprueba cuánto tienes físicamente en caja.
        </p>
      </section>
      <section className="panel finance-method">
        <h2>Cómo se calcula</h2>
        <p>
          Las ventas de contado se consideran cobradas. Los abonos se aplican primero a los cargos
          más antiguos de la persona y liberan la parte proporcional de ganancia con costo
          confirmado, redondeada hacia abajo al centavo. Las pérdidas confirmadas reducen el
          disponible.
        </p>
        <p>
          Las sumas libres y costos estimados no generan ganancia retirable. Las compras para
          resurtir se descuentan de la reserva; si la superan, la diferencia reduce la ganancia
          disponible. Los gastos operativos reducen la ganancia. No registres una misma compra
          también como gasto.
        </p>
        <p>
          Se usa todo tu historial registrado, sin inventar un saldo inicial. Antes del primer
          retiro revisa tus costos y registra los gastos y compras que ya hayas pagado. Las
          reposiciones de inventario no se convierten automáticamente en gastos o compras.
        </p>
      </section>
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
              {entry.detail && <p>{entry.detail} · Pendiente de vincular con Economía</p>}
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
        Disponible: <b className="mint">{money(available)}</b>
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
        <small>DISPONIBLE DESPUÉS DEL RETIRO</small>
        <strong>{money(Math.max(0, available - amount))}</strong>
      </div>
      <p className="hint">
        El retiro se guardará localmente para la futura conexión. Economía todavía no está creada;
        no se enviará a otra aplicación ni se hará una transferencia bancaria.
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
  const purchase = kind === 'reinvestment';
  return (
    <form
      onSubmit={(e) => {
        e.preventDefault();
        const f = Object.fromEntries(new FormData(e.currentTarget));
        onConfirm({ amount: f.amount, note: f.note });
      }}
    >
      <p>
        {purchase
          ? 'Registra dinero que ya usaste para comprar mercancía. Se descontará de la reserva del negocio.'
          : 'Registra un gasto operativo ya pagado, por ejemplo transporte o bolsas. Reducirá tu ganancia disponible.'}
      </p>
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
      <p className="hint">
        Revisa antes de confirmar: el movimiento queda en el historial. No modifica existencias. Las
        compras para resurtir se registran aquí como reinversión y no también como gasto.
      </p>
      <button className="primary full" disabled={busy}>
        Guardar {purchase ? 'uso de reinversión' : 'gasto'}
      </button>
    </form>
  );
}
