export function readLocal(key, fallback) {
  try {
    const value = JSON.parse(localStorage.getItem(`dulceria-${key}`));
    return value ?? fallback;
  } catch {
    return fallback;
  }
}
export function writeLocal(key, value) {
  try {
    localStorage.setItem(`dulceria-${key}`, JSON.stringify(value));
    return true;
  } catch {
    return false;
  }
}
export function readDraft() {
  const draft = readLocal('draft', {});
  return {
    expression: typeof draft.expression === 'string' ? draft.expression.slice(0, 2000) : '',
    cart: Array.isArray(draft.cart)
      ? draft.cart.filter(
          (c) => typeof c?.product === 'string' && Number.isSafeInteger(c.qty) && c.qty > 0
        )
      : [],
    catalog: draft.catalog === true,
    target: typeof draft.target === 'string' ? draft.target : '',
    operationId: typeof draft.operationId === 'string' ? draft.operationId : null,
  };
}
