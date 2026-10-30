import React, { useState } from 'react';
import { money } from './domain.js';
export const date = (value) =>
  new Date(value).toLocaleString('es-MX', { dateStyle: 'short', timeStyle: 'short' });
export default function HistoryList({ entries, products, limit = 20 }) {
  const [count, setCount] = useState(limit);
  return (
    <>
      {!entries.length && <p className="empty">No hay movimientos en esta vista.</p>}
      {entries.slice(0, count).map((s) => (
        <details className="receipt" key={s.id}>
          <summary>
            <span className={s.kind === 'Abono' ? 'dot greenbg' : 'dot'} />
            <span className="receipt-label">
              <b>{s.label || s.kind}</b>
              <small>
                {s.kind} · {date(s.at)}
              </small>
            </span>
            <strong className={s.kind === 'Abono' ? 'mint' : 'pink'}>{money(s.total)}</strong>
            <span aria-hidden="true">⌄</span>
          </summary>
          <div className="receipt-body">
            <p>
              {s.kind === 'Cargo'
                ? 'Venta fiada'
                : s.method === 'transfer'
                  ? 'Pago por transferencia'
                  : s.method === 'cash' || s.received !== undefined
                    ? 'Pago en efectivo'
                    : 'Método no registrado (histórico)'}
            </p>
            {s.items?.length
              ? s.items.map((i) => (
                  <div className="row line" key={i.product}>
                    <span>
                      {i.name || products.find((p) => p.id === i.product)?.name} × {i.qty}
                      <small>{money(i.price)} por pieza</small>
                    </span>
                    <b>{money(i.price * i.qty)}</b>
                  </div>
                ))
              : s.note && <p className="expression-note">{s.note}</p>}
            {s.received !== undefined && (
              <p>
                Recibido: {money(s.received)} · Cambio: {money(s.change)}
              </p>
            )}
            <small>Registro local · {s.id.slice(0, 8)}</small>
          </div>
        </details>
      ))}
      {entries.length > count && (
        <button className="outline full" onClick={() => setCount((n) => n + limit)}>
          Ver más movimientos ({entries.length - count} pendientes)
        </button>
      )}
    </>
  );
}
