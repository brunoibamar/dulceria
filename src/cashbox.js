// Physical cash is reconciled independently from revenue and profit.
export const cashData = (d) => d.cashbox || { version: 1, counts: [], adjustments: [] };
export function cashFlows(d) {
  const flows = [];
  for (const s of d.sales)
    if (!s.person)
      flows.push({
        id: `sale:${s.id}`,
        amount: s.total,
        method: s.method || (s.received !== undefined ? 'cash' : 'unknown'),
      });
  for (const p of d.payments)
    flows.push({ id: `payment:${p.id}`, amount: p.amount, method: p.method || 'unknown' });
  for (const w of d.finance?.withdrawals || [])
    flows.push({
      id: `withdrawal:${w.id}`,
      amount: -w.amount,
      method: w.destination === 'cash' ? 'cash' : 'transfer',
    });
  for (const m of d.finance?.movements || [])
    flows.push({ id: `movement:${m.id}`, amount: -m.amount, method: m.method || 'unknown' });
  for (const a of cashData(d).adjustments)
    flows.push({
      id: `cash:${a.id}`,
      amount: a.direction === 'in' ? a.amount : -a.amount,
      method: 'cash',
    });
  return flows;
}
export function cashSummary(d) {
  const box = cashData(d),
    last = box.counts.at(-1),
    seen = new Set(last?.seenIds || []),
    flows = cashFlows(d),
    since = flows.filter((f) => !seen.has(f.id));
  const expected = last
    ? last.counted + since.filter((f) => f.method === 'cash').reduce((n, f) => n + f.amount, 0)
    : null;
  return {
    last,
    expected,
    unknown: since.filter((f) => f.method === 'unknown').length,
    transferNet: flows.filter((f) => f.method === 'transfer').reduce((n, f) => n + f.amount, 0),
  };
}
export function recordCashCount(d, { id, at, counted, note = '' }) {
  if (!Number.isSafeInteger(counted) || counted < 0 || counted > 1e10)
    throw Error('Indica un total contado válido, de cero o más.');
  const box = cashData(d);
  if (box.counts.some((c) => c.id === id)) throw Error('Este conteo ya está registrado.');
  const s = cashSummary(d),
    expected = s.unknown ? null : s.expected;
  box.counts.push({
    id,
    at,
    counted,
    expected,
    difference: expected === null ? null : counted - expected,
    note: note.trim().slice(0, 500),
    seenIds: cashFlows(d).map((f) => f.id),
    unclassified: s.unknown,
  });
  d.cashbox = box;
  return d;
}
export function recordCashAdjustment(d, { id, at, amount, direction, note }) {
  if (
    !Number.isSafeInteger(amount) ||
    amount <= 0 ||
    amount > 1e10 ||
    !['in', 'out'].includes(direction) ||
    !note.trim()
  )
    throw Error('Revisa el importe, la entrada o salida y el motivo.');
  const box = cashData(d);
  if (box.adjustments.some((a) => a.id === id))
    throw Error('Este movimiento de caja ya está registrado.');
  box.adjustments.push({ id, at, amount, direction, note: note.trim().slice(0, 500) });
  d.cashbox = box;
  return d;
}
export function validateCashbox(d, ids) {
  if (d.cashbox === undefined) return;
  const b = d.cashbox;
  if (!b || b.version !== 1 || !Array.isArray(b.counts) || !Array.isArray(b.adjustments))
    throw Error('Caja incompatible.');
  for (const x of [...b.counts, ...b.adjustments]) {
    if (
      !x ||
      typeof x.id !== 'string' ||
      !x.id ||
      ids.has(x.id) ||
      !Number.isFinite(Date.parse(x.at)) ||
      typeof x.note !== 'string'
    )
      throw Error('Registro de caja inválido.');
    ids.add(x.id);
  }
  for (const c of b.counts)
    if (
      !Number.isSafeInteger(c.counted) ||
      c.counted < 0 ||
      c.counted > 1e10 ||
      !(c.expected === null || Number.isSafeInteger(c.expected)) ||
      c.difference !== (c.expected === null ? null : c.counted - c.expected) ||
      !Array.isArray(c.seenIds) ||
      !c.seenIds.every((id) => typeof id === 'string') ||
      !Number.isSafeInteger(c.unclassified) ||
      c.unclassified < 0
    )
      throw Error('Conteo inválido.');
  for (const a of b.adjustments)
    if (
      !Number.isSafeInteger(a.amount) ||
      a.amount <= 0 ||
      a.amount > 1e10 ||
      !['in', 'out'].includes(a.direction) ||
      !a.note.trim()
    )
      throw Error('Movimiento de caja inválido.');
}
