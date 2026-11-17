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
        Cuenta el efectivo real y compáralo con los movimientos de tu negocio.
      </p>
      <div className="banner">
        <div>
          <small>EFECTIVO ESPERADO DESDE EL ÚLTIMO CONTEO</small>
          <h2 className="big mint">
            {s.expected === null ? 'Sin base inicial' : money(s.expected)}
          </h2>
          <p>
            {s.last
              ? `Base: ${money(s.last.counted)} contados el ${date(s.last.at)}`
              : 'El primer conteo establece tu efectivo inicial; no inventa ventas ni ganancias.'}
          </p>
        </div>
        <button
          className="green"
          disabled={busy}
          onClick={() => onOpen({ type: 'cashCount', operationId: uid() })}
        >
          {s.last ? 'Contar caja física' : 'Registrar primer conteo'}
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
          <h2>Traspaso de transferencia a efectivo</h2>
          <p>
            Si retiraste dinero del banco y ahora lo tienes físicamente en caja, regístralo aquí.
            Baja transferencia y sube efectivo por el mismo importe, sin crear una venta o gasto.
          </p>
          <button
            className="outline full"
            disabled={busy}
            onClick={() => onOpen({ type: 'cashAdjustment', operationId: uid() })}
          >
            Pasar dinero a caja física
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
            <b>{money(s.transferNet)}</b>
          </div>
          <small>TOTAL REGISTRADO</small>
          <h2 className="big">
            {s.expected === null ? 'Conteo pendiente' : money(s.expected + s.transferNet)}
          </h2>
          <p>
            El total incluye ambos apartados. El saldo de transferencia es el neto registrado por la
            app y no incluye saldo inicial ni otros movimientos del banco.
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
          La diferencia se conserva. El efectivo contado es la nueva base para el siguiente conteo;
          no modifica ganancias ni crea gastos automáticamente.
        </p>
        {[...box.counts].reverse().map((c) => (
          <div className="line" key={c.id}>
            <div className="row">
              <b>{date(c.at)}</b>
              <b>{money(c.counted)} contados</b>
            </div>
            <p>
              {c.expected === null
                ? 'Base inicial o comparación sin método completo'
                : `Esperado: ${money(c.expected)} · ${c.difference === 0 ? 'Caja exacta' : c.difference < 0 ? 'Faltan ' + money(-c.difference) : 'Sobran ' + money(c.difference)}`}
            </p>
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
    [counts, setCounts] = useState({});
  const s = cashSummary(data);
  let counted = null;
  try {
    counted =
      mode === 'total' ? cents(value) : bills.reduce((n, b) => n + b * (Number(counts[b]) || 0), 0);
  } catch {}
  const valid =
    counted !== null &&
    Number.isSafeInteger(counted) &&
    counted >= 0 &&
    Object.values(counts).every((n) => Number.isSafeInteger(Number(n)) && Number(n) >= 0);
  const expected = s.unknown ? null : s.expected,
    difference = valid && expected !== null ? counted - expected : null;
  return (
    <form
      onSubmit={(e) => {
        e.preventDefault();
        const f = Object.fromEntries(new FormData(e.currentTarget));
        if (valid) onConfirm({ counted, note: f.note });
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
          Total de efectivo contado ($)
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
      <div className="change">
        <small>TOTAL CONTADO</small>
        <strong>{valid ? money(counted) : 'Revisa el importe'}</strong>
        <p>
          {expected === null
            ? 'Este conteo establecerá una nueva base sin inventar una diferencia.'
            : `Esperado: ${money(expected)} · ${difference === null ? '' : difference === 0 ? 'Caja exacta' : difference < 0 ? 'Faltan ' + money(-difference) : 'Sobran ' + money(difference)}`}
        </p>
      </div>
      <label>
        Nota (opcional)
        <input name="note" maxLength={500} placeholder="Ej. Cierre del día" />
      </label>
      <p className="hint">
        Guarda el conteo y la diferencia. No convierte un faltante en gasto ni altera ventas o
        ganancias.
      </p>
      <button className="green full" disabled={busy || !valid}>
        Guardar conteo físico
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
