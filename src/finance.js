// Monetary allocation only; no network, bank transfer or external app is invoked here.
const real = (item) => !item.costStatus || item.costStatus === 'real';
export const financeData = (data) => data.finance || { version: 1, withdrawals: [], movements: [] };
export function businessSummary(data) {
  const collectedBySale = new Map(data.sales.map((s) => [s.id, s.person ? 0 : s.total]));
  const credits = new Map();
  for (const sale of [...data.sales].sort((a, b) => a.at.localeCompare(b.at))) {
    if (sale.person) {
      if (!credits.has(sale.person)) credits.set(sale.person, []);
      credits.get(sale.person).push(sale);
    }
  }
  for (const payment of [...data.payments].sort((a, b) => a.at.localeCompare(b.at))) {
    let left = payment.amount;
    for (const sale of credits.get(payment.person) || []) {
      // Older backups can contain payments whose timestamp precedes an imported charge.
      const allocation = Math.min(left, sale.total - collectedBySale.get(sale.id));
      collectedBySale.set(sale.id, collectedBySale.get(sale.id) + allocation);
      left -= allocation;
      if (!left) break;
    }
  }
  let collected = 0,
    gross = 0,
    collectedProfit = 0,
    uncosted = 0;
  for (const sale of data.sales) {
    const received = collectedBySale.get(sale.id),
      margin = sale.items.reduce((n, i) => n + (real(i) ? (i.price - i.cost) * i.qty : 0), 0);
    gross += margin;
    collected += received;
    // Round down, never releasing a fraction of a cent as spendable profit.
    const numerator = BigInt(margin) * BigInt(received),
      divisor = BigInt(sale.total);
    collectedProfit += Number(
      numerator >= 0n ? numerator / divisor : -((-numerator + divisor - 1n) / divisor)
    );
    const unknown = sale.items.length
      ? sale.items.filter((i) => !real(i)).reduce((n, i) => n + i.price * i.qty, 0)
      : sale.total;
    uncosted += Number((BigInt(unknown) * BigInt(received)) / divisor);
  }
  const ledger = financeData(data),
    expenses = ledger.movements
      .filter((m) => m.kind === 'expense')
      .reduce((n, m) => n + m.amount, 0),
    reinvested = ledger.movements
      .filter((m) => m.kind === 'reinvestment')
      .reduce((n, m) => n + m.amount, 0),
    withdrawn = ledger.withdrawals.reduce((n, w) => n + w.amount, 0);
  const reserve = collected - collectedProfit,
    reserveShortfall = Math.max(0, reinvested - reserve);
  const net = collectedProfit - expenses - withdrawn - reserveShortfall;
  return {
    gross,
    collected,
    collectedProfit,
    uncosted,
    expenses,
    reinvested,
    withdrawn,
    reserve: Math.max(0, reserve - reinvested),
    reserveShortfall,
    available: Math.max(0, net),
    shortfall: Math.max(0, -net),
    calculatedCash: collected - expenses - reinvested - withdrawn,
  };
}
export function recordWithdrawal(data, { id, at, amount, destination, note = '' }) {
  if (!Number.isSafeInteger(amount) || amount <= 0 || amount > 10_000_000_000)
    throw Error('Indica un retiro mayor a cero.');
  if (!['cash', 'bank'].includes(destination))
    throw Error('Elige efectivo o tarjeta para el retiro.');
  const ledger = financeData(data);
  if (ledger.withdrawals.some((w) => w.id === id)) throw Error('Este retiro ya está registrado.');
  if (amount > businessSummary(data).available)
    throw Error('El retiro supera la ganancia disponible. Revisa el saldo actualizado.');
  data.finance = ledger;
  ledger.withdrawals.push({
    id,
    at,
    amount,
    destination,
    note: note.trim().slice(0, 500),
    source: 'dulceria',
    integrationVersion: 1,
    delivery: 'pending',
  });
  return data;
}
export function recordBusinessMovement(data, { id, at, amount, kind, note }) {
  if (!Number.isSafeInteger(amount) || amount <= 0 || amount > 10_000_000_000)
    throw Error('Indica un importe mayor a cero.');
  if (!['expense', 'reinvestment'].includes(kind) || !note.trim())
    throw Error('Elige el tipo de movimiento y escribe su concepto.');
  const ledger = financeData(data);
  if (ledger.movements.some((m) => m.id === id)) throw Error('Este movimiento ya está registrado.');
  data.finance = ledger;
  ledger.movements.push({ id, at, amount, kind, note: note.trim().slice(0, 500) });
  return data;
}
export function validateFinance(data, usedIds) {
  if (data.finance === undefined) return;
  const f = data.finance;
  if (!f || f.version !== 1 || !Array.isArray(f.withdrawals) || !Array.isArray(f.movements))
    throw Error('Registro de ganancias incompatible.');
  for (const entry of [...f.withdrawals, ...f.movements]) {
    if (
      !entry ||
      typeof entry.id !== 'string' ||
      !entry.id ||
      usedIds.has(entry.id) ||
      !Number.isSafeInteger(entry.amount) ||
      entry.amount <= 0 ||
      entry.amount > 10_000_000_000 ||
      typeof entry.at !== 'string' ||
      !Number.isFinite(Date.parse(entry.at)) ||
      typeof entry.note !== 'string'
    )
      throw Error('Movimiento de negocio inválido.');
    usedIds.add(entry.id);
  }
  for (const w of f.withdrawals)
    if (
      !['cash', 'bank'].includes(w.destination) ||
      w.source !== 'dulceria' ||
      w.integrationVersion !== 1 ||
      w.delivery !== 'pending'
    )
      throw Error('Retiro para Economía inválido.');
  for (const m of f.movements)
    if (!['expense', 'reinvestment'].includes(m.kind) || !m.note.trim())
      throw Error('Gasto o reinversión inválidos.');
}
// Future Economy app deduplicates by this stable entry id, including after backup restores.
export function economyFeed(data) {
  return {
    schema: 'dulceria-economia',
    version: 1,
    currency: 'MXN',
    entries: financeData(data).withdrawals.map((w) => ({
      id: `dulceria:${w.id}`,
      sourceId: w.id,
      source: 'dulceria',
      kind: 'business-withdrawal',
      amount: w.amount,
      at: w.at,
      account: w.destination,
      note: w.note,
    })),
  };
}
