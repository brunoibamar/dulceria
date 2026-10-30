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
          <h2>Entradas y salidas fuera de ventas</h2>
          <p>
            Si agregas cambio o sacas efectivo para llevarlo al banco, regístralo aquí. No se
            considera venta, gasto ni ganancia. No repitas un retiro, gasto o compra que ya
            registraste en Ganancias.
          </p>
          <button
            className="outline full"
            disabled={busy}
            onClick={() => onOpen({ type: 'cashAdjustment', operationId: uid() })}
          >
            Registrar entrada / salida de efectivo
          </button>
        </section>
        <section className="panel">
          <h2>Transferencias del negocio</h2>
          <h2 className="big">{money(s.transferNet)}</h2>
          <p>
            Neto registrado de cobros por transferencia menos gastos, compras y retiros de esa
            cuenta. No es tu saldo bancario real: no incluye un saldo inicial ni otros movimientos
            del banco.
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
        <h2>Entradas y salidas registradas</h2>
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
                {a.direction === 'in' ? '+' : '−'}
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
        <select name="direction">
          <option value="in">Entrada de efectivo / fondo para cambio</option>
          <option value="out">Salida de efectivo / depósito al banco</option>
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
        Solo ajusta el efectivo esperado. No genera ingreso, gasto ni retiro personal. Los cobros y
        los movimientos de Ganancias ya afectan la caja: no los repitas aquí.
      </p>
      <button className="primary full" disabled={busy}>
        Registrar movimiento de efectivo
      </button>
    </form>
  );
}
