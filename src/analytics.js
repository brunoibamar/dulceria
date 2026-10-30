import { normalize } from './domain.js';
export function inPeriod(at, period, now = new Date()) {
  if (period === 'all') return true;
  const start = new Date(now);
  start.setHours(0, 0, 0, 0);
  if (period === 'week') start.setDate(start.getDate() - 6);
  if (period === 'month') start.setDate(1);
  return new Date(at) >= start && new Date(at) <= now;
}
export function dailySales(sales, now = new Date()) {
  return Array.from({ length: 7 }, (_, index) => {
    const day = new Date(now);
    day.setHours(0, 0, 0, 0);
    day.setDate(day.getDate() - 6 + index);
    const next = new Date(day);
    next.setDate(next.getDate() + 1);
    return {
      label: day.toLocaleDateString('es-MX', { weekday: 'short' }),
      date: day.toLocaleDateString('es-MX'),
      total: sales
        .filter((s) => new Date(s.at) >= day && new Date(s.at) < next)
        .reduce((n, s) => n + s.total, 0),
    };
  });
}
export const matches = (value, query) => normalize(value).includes(normalize(query));
export const low = (p) => p.stock <= (p.lowStock ?? 3);
export function historyOf(data) {
  const names = new Map(data.people.map((p) => [p.id, p.name]));
  return [
    ...data.sales.map((s) => ({
      ...s,
      label: s.person ? names.get(s.person) : 'Venta de contado',
      kind: s.person ? 'Cargo' : 'Venta',
    })),
    ...data.payments.map((p) => ({
      ...p,
      total: p.amount,
      label: names.get(p.person),
      kind: 'Abono',
    })),
  ].sort((a, b) => b.at.localeCompare(a.at));
}
