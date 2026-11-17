import React, { useState } from 'react';
import { cents, money, uid } from './domain.js';
import { cashData, cashSummary } from './cashbox.js';
import { date } from './HistoryList';
export default function Cashbox({ data, busy, onOpen }) {
  const s = cashSummary(data),
    box = cashData(data);
  return (
    <>
      <p className="intro">
        Cuenta por separado el efectivo físico y el saldo de tarjeta/transferencia.
      </p>
      <div className="banner">
        <div>
          <small>EFECTIVO FÍSICO ESPERADO</small>
          <h2 className="big mint">
            {s.expected === null ? 'Sin base inicial' : money(s.expected)}
          </h2>
          <p>
            {s.last
              ? `Base: ${money(s.last.counted)} contados el ${date(s.last.at)}`
              : 'El conteo establece tu efectivo inicial; no inventa ventas ni ganancias.'}
          </p>
        </div>
        <button
          className="green"
          disabled={busy}
          onClick={() => onOpen({ type: 'cashCount', operationId: uid() })}
        >
          {s.last && s.lastTransferCount
            ? 'Contar efectivo y tarjeta'
            : 'Registrar efectivo y tarjeta'}
        </button>
      </div>
      {s.unknown > 0 && (
        <p className="warning">
          Hay {s.unknown} cobros o gastos sin método registrado desde tu base. La comparación está
          incompleta y el nuevo conteo no marcará un faltante o sobrante como comprobado. Los
          registros anteriores no se adivinan como efectivo.
        </p>
      )}
      <div className="cards">
        <section className="panel">
          <h2>Movimiento entre banco y efectivo</h2>
          <p>
            Para conciliar ambos saldos reales, usa Contar caja física arriba. Después del primer
            conteo puedes registrar un traspaso entre conteos; no crea una venta o gasto.
          </p>
          <button
            className="outline full"
            disabled={busy || !s.lastTransferCount}
            onClick={() => onOpen({ type: 'cashAdjustment', operationId: uid() })}
          >
            Registrar traspaso manual
          </button>
        </section>
        <section className="panel">
          <h2>Dinero del negocio</h2>
          <div className="row line">
            <span>Efectivo en caja</span>
            <b>{s.expected === null ? 'Sin conteo inicial' : money(s.expected)}</b>
          </div>
          <div className="row line">
            <span>En cuenta por transferencia</span>
            <b>{s.lastTransferCount ? money(s.transferNet) : 'Pendiente de conteo'}</b>
          </div>
          <small>TOTAL REGISTRADO</small>
          <h2 className="big">
            {s.expected === null || !s.lastTransferCount
              ? 'Haz un conteo conjunto'
              : money(s.expected + s.transferNet)}
          </h2>
          <p>
            {s.lastTransferCount
              ? 'El total suma los últimos importes registrados para efectivo y tarjeta/transferencia.'
              : 'Las transferencias antiguas no muestran el saldo real de tu banco. Anota el efectivo y el saldo actual de tarjeta para establecer ambas bases sin duplicar dinero.'}
          </p>
          <p>
            Cobrar por transferencia no convierte toda la venta en ganancia personal. Para apartar
            tu ganancia usa Retirar para mi Economía y elige tarjeta.
          </p>
        </section>
      </div>
      <section className="panel">
        <h2>Historial de conteos</h2>
        <p className="hint">
          Cada conteo guarda el efectivo físico y el saldo de tarjeta/transferencia. Sus importes se
          convierten en las nuevas bases; no modifican ganancias ni crean gastos.
        </p>
        {[...box.counts].reverse().map((c) => (
          <div className="line" key={c.id}>
            <div className="row">
              <b>{date(c.at)}</b>
              <b>{money(c.counted)} efectivo</b>
            </div>
            <p>
              {c.expected === null
                ? 'Base inicial o comparación sin método completo'
                : `Esperado: ${money(c.expected)} · ${c.difference === 0 ? 'Caja exacta' : c.difference < 0 ? 'Faltan ' + money(-c.difference) : 'Sobran ' + money(c.difference)}`}
            </p>
            {Number.isSafeInteger(c.countedTransfer) && (
              <p>
                {money(c.countedTransfer)} en tarjeta/transferencia
                {c.expectedTransfer === null
                  ? ' · primera base registrada'
                  : ` · ${c.transferDifference === 0 ? 'coincide' : c.transferDifference < 0 ? 'faltan ' + money(-c.transferDifference) : 'sobran ' + money(c.transferDifference)} ${money(c.expectedTransfer)} esperados`}
              </p>
            )}
            {c.note && <small>{c.note}</small>}
          </div>
        ))}
        {!box.counts.length && <p>No hay conteos todavía.</p>}
      </section>
      <section className="panel">
        <h2>Movimientos de caja</h2>
        {[...box.adjustments]
          .reverse()
          .slice(0, 30)
          .map((a) => (
            <div className="row line" key={a.id}>
              <span>
                {a.note}
                <small>{date(a.at)}</small>
              </span>
              <b>
                {a.direction === 'transferToCash'
                  ? 'Traspaso a efectivo · '
                  : a.direction === 'in'
                    ? '+'
                    : '−'}
                {money(a.amount)}
              </b>
            </div>
          ))}
        {!box.adjustments.length && <p>No hay movimientos manuales de caja.</p>}
      </section>
    </>
  );
}
const bills = [100000, 50000, 20000, 10000, 5000, 2000, 1000, 500, 200, 100, 50];
export function CashCountForm({ data, busy, onConfirm }) {
  const [mode, setMode] = useState('total'),
    [value, setValue] = useState(''),
    [counts, setCounts] = useState({}),
    [transferValue, setTransferValue] = useState('');
  const s = cashSummary(data);
  let counted = null;
  try {
    counted =
      mode === 'total' ? cents(value) : bills.reduce((n, b) => n + b * (Number(counts[b]) || 0), 0);
  } catch {}
  let countedTransfer = null;
  try {
    countedTransfer = cents(transferValue);
  } catch {}
  const valid =
    counted !== null &&
    Number.isSafeInteger(counted) &&
    counted >= 0 &&
    countedTransfer !== null &&
    Number.isSafeInteger(countedTransfer) &&
    countedTransfer >= 0 &&
    Object.values(counts).every((n) => Number.isSafeInteger(Number(n)) && Number(n) >= 0);
  const expected = s.unknown ? null : s.expected,
    difference = valid && expected !== null ? counted - expected : null,
    expectedTransfer = s.lastTransferCount ? s.transferNet : null,
    transferDifference =
      valid && expectedTransfer !== null ? countedTransfer - expectedTransfer : null;
  return (
    <form
      onSubmit={(e) => {
        e.preventDefault();
        const f = Object.fromEntries(new FormData(e.currentTarget));
        if (valid) onConfirm({ counted, countedTransfer, note: f.note });
      }}
    >
      <label>
        Forma de contar
        <select value={mode} onChange={(e) => setMode(e.target.value)}>
          <option value="total">Escribir total contado</option>
          <option value="bills">Billetes y monedas</option>
        </select>
      </label>
      {mode === 'total' ? (
        <label>
          Efectivo físico contado ($)
          <input
            type="number"
            inputMode="decimal"
            min="0"
            step="0.01"
            value={value}
            onChange={(e) => setValue(e.target.value)}
            required
          />
        </label>
      ) : (
        <div className="denominations">
          {bills.map((b) => (
            <label key={b}>
              {money(b)}
              <input
                aria-label={`Cantidad de ${money(b)}`}
                type="number"
                inputMode="numeric"
                min="0"
                step="1"
                value={counts[b] ?? ''}
                onChange={(e) => setCounts((v) => ({ ...v, [b]: e.target.value }))}
                placeholder="0"
              />
            </label>
          ))}
        </div>
      )}
      <label>
        Saldo actual de tarjeta / transferencia ($)
        <input
          type="number"
          inputMode="decimal"
          min="0"
          step="0.01"
          value={transferValue}
          onChange={(e) => setTransferValue(e.target.value)}
          required
        />
      </label>
      <div className="change">
        <small>TOTAL DE EFECTIVO + TARJETA</small>
        <strong>{valid ? money(counted + countedTransfer) : 'Revisa ambos importes'}</strong>
        <p>
          Efectivo: {valid ? money(counted) : '—'} · Tarjeta/transferencia:{' '}
          {valid ? money(countedTransfer) : '—'}
          <br />
          {expected === null
            ? 'El conteo establece la base física de efectivo.'
            : `Efectivo esperado: ${money(expected)}${difference === null ? '' : ` · ${difference === 0 ? 'coincide' : difference < 0 ? 'faltan ' + money(-difference) : 'sobran ' + money(difference)}`}`}
          <br />
          {expectedTransfer === null
            ? `Primera base de tarjeta; el saldo registrado anterior era ${money(s.transferNet)}.`
            : `Tarjeta esperada: ${money(expectedTransfer)}${transferDifference === null ? '' : ` · ${transferDifference === 0 ? 'coincide' : transferDifference < 0 ? 'faltan ' + money(-transferDifference) : 'sobran ' + money(transferDifference)}`}`}
        </p>
      </div>
      <label>
        Nota (opcional)
        <input name="note" maxLength={500} placeholder="Ej. Cierre del día" />
      </label>
      <p className="hint">
        Cuenta el efectivo físico y revisa el saldo real en tu banco. El primer saldo de
        transferencia se usa como base; después la app calcula los movimientos nuevos. No altera
        ventas ni ganancias.
      </p>
      <button className="green full" disabled={busy || !valid}>
        Guardar conteo de efectivo y tarjeta
      </button>
    </form>
  );
}
export function CashAdjustmentForm({ busy, onConfirm }) {
  return (
    <form
      onSubmit={(e) => {
        e.preventDefault();
        onConfirm(Object.fromEntries(new FormData(e.currentTarget)));
      }}
    >
      <label>
        Movimiento
        <select name="direction" defaultValue="transferToCash">
          <option value="transferToCash">Pasé dinero del banco a caja física</option>
          <option value="in">Agregar efectivo inicial / fondo para cambio</option>
          <option value="out">Sacar efectivo de caja / depositar al banco</option>
        </select>
      </label>
      <label>
        Importe ($)
        <input name="amount" type="number" inputMode="decimal" min="0.01" step="0.01" required />
      </label>
      <label>
        Motivo
        <input name="note" maxLength={500} required />
      </label>
      <p className="hint">
        El traspaso resta el importe de transferencia y lo suma al efectivo. No crea una venta,
        gasto ni ganancia. Registra aquí solo movimientos físicos que aún no estén anotados.
      </p>
      <button className="primary full" disabled={busy}>
        Guardar movimiento
      </button>
    </form>
  );
}
