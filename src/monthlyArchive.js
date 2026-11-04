import { money } from './domain.js';
export const monthKey = (value) => {
  const d = new Date(value);
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`;
};
export function monthlyArchive(data, month, now = new Date()) {
  if (!/^\d{4}-(0[1-9]|1[0-2])$/.test(month)) throw Error('Elige un mes válido.');
  const select = (entries = []) => entries.filter((e) => monthKey(e.at) === month);
  return {
    format: 'dulceria-informe-mensual',
    version: 1,
    month,
    exportedAt: now.toISOString(),
    timezone: Intl.DateTimeFormat().resolvedOptions().timeZone,
    note: 'Informe mensual. No restaura la aplicación. Catálogo y cuentas son una referencia actual, no un cierre histórico.',
    products: structuredClone(data.products),
    people: structuredClone(data.people),
    sales: structuredClone(select(data.sales)),
    payments: structuredClone(select(data.payments)),
    stock: structuredClone(select(data.stock)),
    finance: {
      movements: structuredClone(select(data.finance?.movements)),
      withdrawals: structuredClone(select(data.finance?.withdrawals)),
      consumptions: structuredClone(select(data.finance?.consumptions)),
    },
    cashbox: {
      counts: structuredClone(select(data.cashbox?.counts)),
      adjustments: structuredClone(select(data.cashbox?.adjustments)),
    },
  };
}
const escape = (value) =>
  String(value ?? '').replace(
    /[&<>"']/g,
    (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' })[c]
  );
export function monthlyHtml(r) {
  const cash = (v) => (v === null || v === undefined ? 'Sin dato' : money(v));
  const date = (v) => new Date(v).toLocaleString('es-MX');
  const person = (id) => r.people.find((p) => p.id === id)?.name || id || 'Contado';
  const product = (id) => r.products.find((p) => p.id === id)?.name || id;
  const method = (m) =>
    ({ cash: 'Efectivo', transfer: 'Transferencia', bank: 'Tarjeta / cuenta' })[m] ||
    'Sin clasificar';
  const table = (title, headers, rows) =>
    `<h2>${escape(title)} (${rows.length})</h2>` +
    (rows.length
      ? `<div class="scroll"><table><thead><tr>${headers.map((h) => `<th>${escape(h)}</th>`).join('')}</tr></thead><tbody>${rows.map((row) => `<tr>${row.map((v, i) => `<td class="${headers[i].startsWith('Folio') ? 'reference' : ['Total', 'Recibido', 'Cambio', 'Precio unitario', 'Costo unitario', 'Importe', 'Costo total', 'Contado', 'Esperado', 'Diferencia'].includes(headers[i]) ? 'amount' : ''}"><span class="field-label">${escape(headers[i])}</span><span class="field-value">${escape(v === '' || v === undefined ? '—' : v)}</span></td>`).join('')}</tr>`).join('')}</tbody></table></div>`
      : '<p>Sin movimientos en este mes.</p>');
  const sales = r.sales.reduce((n, s) => n + s.total, 0);
  const collected =
    r.sales.filter((s) => !s.person).reduce((n, s) => n + s.total, 0) +
    r.payments.reduce((n, p) => n + p.amount, 0);
  const items = r.sales.flatMap((s) =>
    s.items.map((i) => [
      s.id,
      i.name || product(i.product),
      i.qty,
      cash(i.price),
      cash(i.cost),
      i.costStatus === 'estimated' ? 'Estimado' : i.cost === null ? 'Desconocido' : 'Confirmado',
      cash(i.price * i.qty),
    ])
  );
  return `<!doctype html><html lang="es"><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>Dulcería · ${escape(r.month)}</title><style>
*{box-sizing:border-box}body{font:15px/1.5 system-ui;margin:24px;color:#252035;background:#faf8ff}h1,h2{color:#663194;line-height:1.25}h1{font-size:26px}h2{font-size:21px;margin:28px 0 12px}p{overflow-wrap:break-word}.report-meta{font-size:12px;color:#686174}.report-help{font-size:13px;color:#686174;margin:16px 0}.report-help summary{cursor:pointer}.totals{display:grid;grid-template-columns:repeat(2,minmax(0,1fr));gap:10px}.total-card{padding:14px;border:1px solid #e3d9ef;border-radius:12px;background:#fff}.total-card span{display:block;font-size:12px;color:#686174}.total-card strong{display:block;font-size:22px;color:#54237c;white-space:nowrap}.scroll{overflow-x:auto}table{border-collapse:collapse;width:100%;min-width:700px;background:white}th,td{padding:10px;border:1px solid #e6e0eb;text-align:left;vertical-align:top}th{background:#eee7f5;font-size:12px}.field-value{white-space:pre-wrap;overflow-wrap:break-word}.reference .field-value{font:11px/1.5 ui-monospace,monospace;overflow-wrap:anywhere}.field-label{display:none}.amount .field-value{white-space:nowrap;font-variant-numeric:tabular-nums}
@media screen and (max-width:600px){body{margin:12px;font-size:14px}h1{font-size:22px}h2{font-size:18px}.total-card{padding:10px}.total-card strong{font-size:19px}.scroll{overflow:visible}table,tbody{display:block;width:100%;min-width:0;background:transparent}thead{display:none}tr{display:flex;flex-direction:column;background:#fff;border:1px solid #e3d9ef;border-radius:12px;margin-bottom:12px;padding:4px 12px;box-shadow:0 2px 6px #35204b05}td{display:grid;grid-template-columns:minmax(0,34%) minmax(0,1fr);gap:12px;padding:10px 0;border:0;border-bottom:1px solid #f0ebf4;width:100%}.field-label{display:block;color:#766981;font-size:12px;font-weight:600}.field-value{min-width:0;white-space:normal;word-break:normal;overflow-wrap:break-word;font-weight:500}.reference{order:1;border-bottom:0}.reference .field-value{font-size:10px;color:#85758e}.reference .field-label{font-size:10px}td:not(.reference):last-child{border-bottom:0}}
@media print{body{margin:0;font-size:10px;background:white}table{min-width:0;font-size:9px}.scroll{overflow:visible}.total-card strong{font-size:16px}.report-help{display:none}h2{break-after:avoid}tr{break-inside:avoid}}
</style>
  <h1>Dulcería · Informe ${escape(r.month)}</h1><p class="report-meta">Generado: ${escape(date(r.exportedAt))} · Zona del dispositivo: ${escape(r.timezone)}</p>
  <div class="totals"><div class="total-card"><span>Ventas del mes</span><strong>${cash(sales)}</strong></div><div class="total-card"><span>Cobros del mes</span><strong>${cash(collected)}</strong></div></div>
  <details class="report-help"><summary>Cómo leer estas cifras</summary><p>Ventas incluye contado y fiado. Cobros incluye contado y abonos recibidos en el mes; no equivale a ganancia ni saldo de caja. Este informe no es un respaldo restaurable. Los nombres de cuentas y catálogo son referencias al momento de exportar.</p></details>
  ${table(
    'Ventas',
    ['Folio', 'Fecha', 'Cuenta', 'Método', 'Total', 'Recibido', 'Cambio', 'Detalle'],
    r.sales.map((s) => [
      s.id,
      date(s.at),
      person(s.person),
      s.person ? 'Fiado' : method(s.method || (s.received !== undefined ? 'cash' : null)),
      cash(s.total),
      cash(s.received),
      cash(s.change),
      s.note,
    ])
  )}
  ${table('Piezas vendidas', ['Folio de venta', 'Producto', 'Piezas', 'Precio unitario', 'Costo unitario', 'Tipo de costo', 'Total'], items)}
  ${table(
    'Abonos',
    ['Folio', 'Fecha', 'Cuenta', 'Importe', 'Método'],
    r.payments.map((p) => [p.id, date(p.at), person(p.person), cash(p.amount), method(p.method)])
  )}
  ${table(
    'Movimientos de inventario',
    ['Folio', 'Fecha', 'Producto', 'Piezas (+/-)', 'Motivo'],
    r.stock.map((s) => [s.id, date(s.at), product(s.product), s.delta, s.note])
  )}
  ${table(
    'Gastos y compras',
    ['Folio', 'Fecha', 'Tipo', 'Importe', 'Método', 'Concepto'],
    r.finance.movements.map((m) => [
      m.id,
      date(m.at),
      m.kind === 'expense' ? 'Gasto' : 'Compra / reinversión',
      cash(m.amount),
      method(m.method),
      m.note,
    ])
  )}
  ${table(
    'Retiros personales',
    ['Folio', 'Fecha', 'Importe', 'Destino', 'Nota'],
    r.finance.withdrawals.map((w) => [
      w.id,
      date(w.at),
      cash(w.amount),
      method(w.destination),
      w.note,
    ])
  )}
  ${table(
    'Consumo personal',
    ['Folio', 'Fecha', 'Costo total', 'Productos', 'Nota'],
    r.finance.consumptions.map((c) => [
      c.id,
      date(c.at),
      cash(c.amount),
      c.items.map((i) => `${i.name}: ${i.qty} × ${cash(i.cost)}`).join('; '),
      c.note,
    ])
  )}
  ${table(
    'Conteos de caja',
    ['Folio', 'Fecha', 'Contado', 'Esperado', 'Diferencia', 'Nota'],
    r.cashbox.counts.map((c) => [
      c.id,
      date(c.at),
      cash(c.counted),
      cash(c.expected),
      cash(c.difference),
      c.note,
    ])
  )}
  ${table(
    'Entradas y salidas de caja',
    ['Folio', 'Fecha', 'Tipo', 'Importe', 'Motivo'],
    r.cashbox.adjustments.map((a) => [
      a.id,
      date(a.at),
      a.direction === 'in' ? 'Entrada' : 'Salida',
      cash(a.amount),
      a.note,
    ])
  )}
  </html>`;
}
export function archiveFiles(data, month) {
  const report = monthlyArchive(data, month);
  const stamp = report.exportedAt.replace(/[:.]/g, '-');
  return [
    {
      name: `dulceria-${month}-informe-${stamp}.html`,
      type: 'text/html',
      text: monthlyHtml(report),
    },
    {
      name: `dulceria-${month}-detalle-${stamp}.json`,
      type: 'application/json',
      text: JSON.stringify(report, null, 2),
    },
    {
      name: `dulceria-respaldo-completo-${stamp}.json`,
      type: 'application/json',
      text: JSON.stringify({ ...data, exportedAt: report.exportedAt }, null, 2),
    },
  ];
}
