// Physical cash is reconciled independently from revenue and profit.
export const cashData = (d) => d.cashbox || { version: 1, counts: [], adjustments: [] };
export function cashFlows(d) {
  const flows = (d.carryover?.cash || []).map((f) => ({ ...f }));
  for (const s of d.sales)
    if (!s.person) {
      const method = s.method || (s.received !== undefined ? 'cash' : 'unknown');
      flows.push({ id: `sale:${s.id}`, amount: s.total, method });
      if (s.voided) flows.push({ id: `void:${s.id}`, amount: -s.total, method });
    }
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
  for (const a of cashData(d).adjustments) {
    flows.push({
      id: `cash:${a.id}`,
      amount: a.direction === 'out' ? -a.amount : a.amount,
      method: 'cash',
    });
    if (a.direction === 'transferToCash')
      flows.push({ id: `transfer:${a.id}`, amount: -a.amount, method: 'transfer' });
  }
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
  const lastTransferCount = [...box.counts]
    .reverse()
    .find((c) => Number.isSafeInteger(c.countedTransfer));
  const transferFlows = flows.filter((f) => f.method === 'transfer');
  const transferSince = lastTransferCount
    ? transferFlows.filter((f) => !(lastTransferCount.seenTransferIds || []).includes(f.id))
    : transferFlows;
  const transferNet = lastTransferCount
    ? lastTransferCount.countedTransfer + transferSince.reduce((n, f) => n + f.amount, 0)
    : transferFlows.reduce((n, f) => n + f.amount, 0);
  return {
    last,
    expected,
    unknown: since.filter((f) => f.method === 'unknown').reduce((n, f) => n + (f.count || 1), 0),
    transferNet,
    lastTransferCount,
  };
}
export function recordCashCount(d, { id, at, counted, countedTransfer, note = '' }) {
  const includeTransfer = countedTransfer !== undefined;
  if (
    !Number.isSafeInteger(counted) ||
    counted < 0 ||
    counted > 1e10 ||
    (includeTransfer &&
      (!Number.isSafeInteger(countedTransfer) || countedTransfer < 0 || countedTransfer > 1e10))
  )
    throw Error('Indica cantidades válidas para el efectivo y la transferencia.');
  const box = cashData(d);
  if (box.counts.some((c) => c.id === id)) throw Error('Este conteo ya está registrado.');
  const s = cashSummary(d),
    expected = s.unknown ? null : s.expected,
    expectedTransfer = s.lastTransferCount ? s.transferNet : null;
  const count = {
    id,
    at,
    counted,
    expected,
    difference: expected === null ? null : counted - expected,
    note: note.trim().slice(0, 500),
    seenIds: cashFlows(d).map((f) => f.id),
    unclassified: s.unknown,
  };
  if (includeTransfer)
    Object.assign(count, {
      countedTransfer,
      expectedTransfer,
      transferDifference: expectedTransfer === null ? null : countedTransfer - expectedTransfer,
      seenTransferIds: cashFlows(d)
        .filter((f) => f.method === 'transfer')
        .map((f) => f.id),
    });
  box.counts.push(count);
  d.cashbox = box;
  return d;
}
export function recordCashAdjustment(d, { id, at, amount, direction, note }) {
  if (
    !Number.isSafeInteger(amount) ||
    amount <= 0 ||
    amount > 1e10 ||
    !['in', 'out', 'transferToCash'].includes(direction) ||
    !note.trim()
  )
    throw Error('Revisa el importe, la entrada o salida y el motivo.');
  const box = cashData(d);
  if (direction === 'transferToCash') {
    const summary = cashSummary(d);
    if (!summary.lastTransferCount)
      throw Error('Primero cuenta el efectivo y el saldo actual de tarjeta en Caja.');
    if (amount > summary.transferNet)
      throw Error('El importe supera la transferencia registrada disponible.');
  }
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
    else if (
      c.countedTransfer !== undefined &&
      (!Number.isSafeInteger(c.countedTransfer) ||
        c.countedTransfer < 0 ||
        c.countedTransfer > 1e10 ||
        !(c.expectedTransfer === null || Number.isSafeInteger(c.expectedTransfer)) ||
        c.transferDifference !==
          (c.expectedTransfer === null ? null : c.countedTransfer - c.expectedTransfer) ||
        !Array.isArray(c.seenTransferIds) ||
        !c.seenTransferIds.every((id) => typeof id === 'string'))
    )
      throw Error('Conteo de transferencia inválido.');
  for (const a of b.adjustments)
    if (
      !Number.isSafeInteger(a.amount) ||
      a.amount <= 0 ||
      a.amount > 1e10 ||
      !['in', 'out', 'transferToCash'].includes(a.direction) ||
      !a.note.trim()
    )
      throw Error('Movimiento de caja inválido.');
}
