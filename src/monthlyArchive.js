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
      ? `<div class="scroll"><table><thead><tr>${headers.map((h) => `<th>${escape(h)}</th>`).join('')}</tr></thead><tbody>${rows.map((row) => `<tr>${row.map((v) => `<td>${escape(v)}</td>`).join('')}</tr>`).join('')}</tbody></table></div>`
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
  return `<!doctype html><html lang="es"><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>Dulcería · ${escape(r.month)}</title><style>body{font:16px system-ui;margin:24px;color:#252035;background:#faf8ff}h1,h2{color:#663194}table{border-collapse:collapse;width:100%;background:white}th,td{padding:10px;border:1px solid #ddd;text-align:left;white-space:pre-wrap;overflow-wrap:anywhere}.scroll{overflow-x:auto}small{color:#555}@media print{body{margin:0;font-size:10px}table{font-size:9px}}</style>
  <h1>Dulcería · Informe ${escape(r.month)}</h1><p>Generado: ${escape(date(r.exportedAt))} · Zona del dispositivo: ${escape(r.timezone)}</p>
  <p>Ventas del mes: <strong>${cash(sales)}</strong> · Cobros del mes: <strong>${cash(collected)}</strong></p>
  <p>Ventas incluye contado y fiado. Cobros incluye contado y abonos recibidos en el mes; no equivale a ganancia ni saldo de caja. Este informe no es un respaldo restaurable. Los nombres de cuentas y catálogo son referencias al momento de exportar.</p>
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
