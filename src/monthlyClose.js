import { validate } from './domain.js';
import { businessSummary } from './finance.js';
import { cashFlows, cashSummary } from './cashbox.js';
import { profits } from './pricing.js';
import { monthKey } from './monthlyArchive.js';
export const financeKeys = [
  'gross',
  'collected',
  'collectedProfit',
  'uncosted',
  'expenses',
  'reinvested',
  'personalConsumption',
];
export function closeMonth(data, month, now = new Date()) {
  if (!/^\d{4}-(0[1-9]|1[0-2])$/.test(month) || month >= monthKey(now))
    throw Error('Solo se pueden cerrar meses terminados.');
  const [year, m] = month.split('-').map(Number);
  const cutoff = new Date(year, m, 1).toISOString();
  if (data.carryover && cutoff <= data.carryover.until) throw Error('Este mes ya está cerrado.');
  const old = (e) => new Date(e.at) < new Date(cutoff);
  const next = structuredClone(data);
  const removedSales = next.sales.filter((s) => !s.person && old(s));
  const removedMovements = (next.finance?.movements || []).filter(old);
  const removedConsumptions = (next.finance?.consumptions || []).filter(old);
  const totals = businessSummary({
    sales: removedSales,
    payments: [],
    finance: {
      version: 1,
      withdrawals: [],
      movements: removedMovements,
      consumptions: removedConsumptions,
    },
  });
  const finance = Object.fromEntries(
    financeKeys.map((k) => [k, (data.carryover?.finance[k] || 0) + totals[k]])
  );
  next.sales = next.sales.filter((s) => s.person || !old(s));
  next.stock = next.stock.filter((s) => !old(s));
  if (next.finance) {
    next.finance.movements = next.finance.movements.filter((s) => !old(s));
    next.finance.consumptions = (next.finance.consumptions || []).filter((s) => !old(s));
  }
  // Credit sales, payments and withdrawal IDs remain intact for FIFO and Economy deduplication.
  const last = data.cashbox?.counts.at(-1);
  if (next.cashbox) {
    next.cashbox.counts = next.cashbox.counts.filter((c) => c.id === last?.id || !old(c));
    next.cashbox.adjustments = next.cashbox.adjustments.filter((c) => !old(c));
  }
  delete next.carryover;
  const retained = new Set(cashFlows(next).map((f) => f.id));
  const removedFlows = cashFlows(data).filter((f) => !retained.has(f.id));
  const seen = new Set(last?.seenIds || []);
  const cash = [];
  for (const method of ['cash', 'transfer', 'unknown'])
    for (const wasSeen of [true, false]) {
      const rows = removedFlows.filter((f) => f.method === method && seen.has(f.id) === wasSeen);
      if (rows.length)
        cash.push({
          id: `archive:${cutoff}:${method}:${wasSeen}`,
          method,
          amount: rows.reduce((n, f) => n + f.amount, 0),
          count: rows.reduce((n, f) => n + (f.count || 1), 0),
          seen: wasSeen,
        });
    }
  if (next.cashbox)
    for (const c of next.cashbox.counts)
      c.seenIds =
        c.id === last?.id
          ? [
              ...c.seenIds.filter((id) => retained.has(id)),
              ...cash.filter((f) => f.seen).map((f) => f.id),
            ]
          : [];
  const days = new Map((data.carryover?.daily || []).map((d) => [d.day, { ...d }]));
  for (const s of removedSales) {
    const date = new Date(s.at);
    date.setHours(0, 0, 0, 0);
    const day = `${monthKey(date)}-${String(date.getDate()).padStart(2, '0')}`;
    const row = days.get(day) || {
      day,
      at: date.toISOString(),
      total: 0,
      count: 0,
      real: 0,
      estimated: 0,
      unknown: 0,
    };
    const profit = profits([s]);
    row.total += s.total;
    row.count += 1;
    for (const k of ['real', 'estimated', 'unknown']) row[k] += profit[k];
    days.set(day, row);
  }
  next.schema = 2;
  next.carryover = {
    version: 1,
    until: cutoff,
    closedAt: now.toISOString(),
    finance,
    cash,
    daily: [...days.values()],
  };
  validate(next);
  const before = businessSummary(data),
    after = businessSummary(next);
  for (const k of Object.keys(before))
    if (before[k] !== after[k])
      throw Error('El cierre alteraría tus ganancias. No se retiraron registros.');
  const b = cashSummary(data),
    a = cashSummary(next);
  for (const k of ['expected', 'unknown', 'transferNet'])
    if (b[k] !== a[k]) throw Error('El cierre alteraría tu caja. No se retiraron registros.');
  return next;
}
export function pendingMonths(data, now = new Date(), startMonth) {
  const entries = [
    ...data.sales,
    ...data.payments,
    ...data.stock,
    ...(data.finance?.movements || []),
    ...(data.finance?.consumptions || []),
    ...(data.finance?.withdrawals || []),
    ...(data.cashbox?.counts || []),
    ...(data.cashbox?.adjustments || []),
  ];
  const current = monthKey(now);
  let first = data.carryover
    ? monthKey(data.carryover.until)
    : [...entries.map((e) => monthKey(e.at)), ...(startMonth ? [startMonth] : [])]
        .filter((m) => m < current)
        .sort()[0];
  const months = [];
  if (!first || first >= current) return months;
  const [y, m] = first.split('-').map(Number);
  const cursor = new Date(y, m - 1, 1, 12);
  while (monthKey(cursor) < current) {
    months.push(monthKey(cursor));
    cursor.setMonth(cursor.getMonth() + 1);
  }
  return months;
}
