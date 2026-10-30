import React, { useState } from 'react';
import { balance, money } from './domain.js';
import { costKind, profits } from './pricing.js';
import { dailySales, historyOf, inPeriod, matches } from './analytics.js';
import HistoryList from './HistoryList';
export default function Dashboard({ data }) {
  const [period, setPeriod] = useState('today'),
    [query, setQuery] = useState('');
  const now = new Date(),
    sales = data.sales.filter((s) => inPeriod(s.at, period, now)),
    payments = data.payments.filter((p) => inPeriod(p.at, period, now));
  const profit = profits(sales),
    revenue = sales.reduce((n, s) => n + s.total, 0),
    cash = sales.filter((s) => !s.person).reduce((n, s) => n + s.total, 0),
    paid = payments.reduce((n, p) => n + p.amount, 0);
  const debtors = data.people
      .map((p) => ({ ...p, balance: balance(data, p.id) }))
      .filter((p) => p.balance > 0)
      .sort((a, b) => b.balance - a.balance),
    debts = debtors.reduce((n, p) => n + p.balance, 0);
  const entries = historyOf(data).filter(
    (s) => inPeriod(s.at, period, now) && matches(`${s.label} ${s.kind} ${s.note ?? ''}`, query)
  );
  const days = dailySales(data.sales, now),
    max = Math.max(1, ...days.map((d) => d.total));
  return (
    <>
      <div className="toolbar">
        <p className="intro">Tu negocio de un vistazo</p>
        <select
          aria-label="Periodo del resumen"
          value={period}
          onChange={(e) => setPeriod(e.target.value)}
        >
          <option value="today">Hoy</option>
          <option value="week">Últimos 7 días</option>
          <option value="month">Este mes</option>
          <option value="all">Todo el historial</option>
        </select>
      </div>
      <div className="stats">
        {[
          ['Ventas del periodo', revenue],
          ['Cobrado en el periodo', cash + paid],
          ['Por cobrar · saldo actual', debts],
          [
            'Inventario · costo confirmado',
            data.products
              .filter((p) => costKind(p) === 'real')
              .reduce((n, p) => n + p.stock * p.cost, 0),
          ],
        ].map(([label, n]) => (
          <section className="panel" key={label}>
            <small>{label}</small>
            <h2 className="big">{money(n)}</h2>
          </section>
        ))}
      </div>
      <p className="hint">
        Cobrado: {money(cash)} de contado + {money(paid)} en abonos. Los saldos e inventario son
        actuales y no cambian con el periodo.
      </p>
      <div className="cards">
        <section className="panel">
          <h2>Ventas de los últimos 7 días</h2>
          <div
            className="weekly"
            role="img"
            aria-label={days.map((d) => `${d.date}: ${money(d.total)}`).join(', ')}
          >
            {days.map((d) => (
              <div className="daybar" key={d.date}>
                <small>{money(d.total)}</small>
                <div className="daytrack">
                  <div style={{ height: `${(d.total / max) * 100}%` }} />
                </div>
                <span>{d.label}</span>
              </div>
            ))}
          </div>
          <details className="chart-table">
            <summary>Ver cifras por día</summary>
            {days.map((d) => (
              <div className="row line" key={d.date}>
                <span>{d.date}</span>
                <b>{money(d.total)}</b>
              </div>
            ))}
          </details>
        </section>
        <section className="panel">
          <h2>Ganancia bruta del periodo</h2>
          <small>CON COSTOS CONFIRMADOS</small>
          <h2 className="big mint">{money(profit.real)}</h2>
          <p>
            Ganancia estimada, por separado: <b className="pink">{money(profit.estimated)}</b>
          </p>
          <p>{money(profit.unknown)} vendidos sin costo conocido; no se cuentan como ganancia.</p>
          <p className="hint">
            Incluye ventas fiadas. No incluye gastos, compras ni impuestos: no es utilidad neta.
          </p>
        </section>
        <section className="panel">
          <h2>Quién debe más</h2>
          {debtors.slice(0, 7).map((p) => (
            <div className="barrow" key={p.id}>
              <div className="row">
                <span>
                  {p.name}
                  {p.archived ? ' · Archivado' : ''}
                </span>
                <b className="pink">{money(p.balance)}</b>
              </div>
              <div className="track">
                <div style={{ width: `${(p.balance / Math.max(1, debts)) * 100}%` }} />
              </div>
            </div>
          ))}
          {!debts && <p className="empty">Sin cuentas pendientes. ✦</p>}
        </section>
        <section className="panel">
          <h2>Qué vendiste en el periodo</h2>
          <div className="row line">
            <span>Ventas de contado</span>
            <b>{sales.filter((s) => !s.person).length}</b>
          </div>
          <div className="row line">
            <span>Ventas fiadas</span>
            <b>{sales.filter((s) => s.person).length}</b>
          </div>
          <div className="row line">
            <span>Venta promedio</span>
            <b>{money(sales.length ? Math.round(revenue / sales.length) : 0)}</b>
          </div>
          <div className="row line">
            <span>Abonos recibidos</span>
            <b>{payments.length}</b>
          </div>
        </section>
      </div>
      <section className="panel">
        <div className="row">
          <h2>Ventas y abonos</h2>
          <span className="pill">{entries.length} registros</span>
        </div>
        <input
          className="history-search"
          aria-label="Buscar movimientos"
          placeholder="Buscar cliente o movimiento…"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
        />
        <HistoryList key={`${period}-${query}`} entries={entries} products={data.products} />
      </section>
    </>
  );
}
