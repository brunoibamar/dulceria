const financeKeys = [
  'gross',
  'collected',
  'collectedProfit',
  'uncosted',
  'expenses',
  'reinvested',
  'personalConsumption',
];
export function validateCarryover(d) {
  const c = d.carryover;
  if (!c) {
    if (d.schema === 2) throw Error('Falta el saldo del cierre.');
    return;
  }
  const integer = (n) => Number.isSafeInteger(n);
  if (
    d.schema !== 2 ||
    c.version !== 1 ||
    !Number.isFinite(Date.parse(c.until)) ||
    !Number.isFinite(Date.parse(c.closedAt)) ||
    !c.finance ||
    !financeKeys.every((k) => integer(c.finance[k])) ||
    ['collected', 'uncosted', 'expenses', 'reinvested', 'personalConsumption'].some(
      (k) => c.finance[k] < 0
    ) ||
    !Array.isArray(c.cash) ||
    !Array.isArray(c.daily)
  )
    throw Error('Cierre mensual incompatible.');
  if (
    c.cash.length > 6 ||
    new Set(c.cash.map((f) => f.id)).size !== c.cash.length ||
    c.cash.some(
      (f) =>
        typeof f.id !== 'string' ||
        !f.id.startsWith('archive:') ||
        !['cash', 'transfer', 'unknown'].includes(f.method) ||
        !integer(f.amount) ||
        !integer(f.count) ||
        f.count < 1 ||
        typeof f.seen !== 'boolean'
    )
  )
    throw Error('Saldo de caja archivada inválido.');
  if (
    new Set(c.daily.map((r) => r.day)).size !== c.daily.length ||
    c.daily.some(
      (r) =>
        !/^\d{4}-\d{2}-\d{2}$/.test(r.day) ||
        !Number.isFinite(Date.parse(r.at)) ||
        new Date(r.at) >= new Date(c.until) ||
        !integer(r.count) ||
        r.count < 1 ||
        !['total', 'real', 'estimated', 'unknown'].every((k) => integer(r[k])) ||
        r.total < 0 ||
        r.unknown < 0
    )
  )
    throw Error('Resumen archivado inválido.');
  if (
    c.daily.reduce((n, r) => n + r.total, 0) !== c.finance.collected ||
    c.daily.reduce((n, r) => n + r.real, 0) !== c.finance.gross ||
    c.finance.gross !== c.finance.collectedProfit
  )
    throw Error('Totales del cierre inconsistentes.');
}
