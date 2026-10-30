import { empty, validate } from './domain.js';
let opening;
function open() {
  if (!opening)
    opening = new Promise((resolve, reject) => {
      if (!globalThis.indexedDB) {
        reject(
          Error(
            'Este navegador no permite guardar datos locales. Usa Chrome fuera del modo incógnito.'
          )
        );
        return;
      }
      const request = indexedDB.open('dulceria-local-v1', 1);
      request.onupgradeneeded = () => request.result.createObjectStore('data');
      request.onerror = () => {
        opening = null;
        reject(request.error);
      };
      request.onblocked = () => {
        opening = null;
        reject(Error('Cierra otras pestañas de Dulcería y vuelve a intentar.'));
      };
      request.onsuccess = () => {
        request.result.onversionchange = () => {
          request.result.close();
          opening = null;
        };
        resolve(request.result);
      };
    });
  return opening;
}
export async function transact(change, { capture = false } = {}) {
  const db = await open();
  return new Promise((resolve, reject) => {
    const tx = db.transaction('data', change ? 'readwrite' : 'readonly'),
      store = tx.objectStore('data'),
      request = store.get('main');
    let next, cause;
    request.onsuccess = () => {
      try {
        next = request.result || empty();
        if (change) {
          const before = next;
          next = validate(change(structuredClone(next)));
          if (capture) store.put(before, 'beforeRestore');
          store.put(next, 'main');
        }
      } catch (e) {
        cause = e;
        tx.abort();
      }
    };
    tx.oncomplete = () => resolve(next);
    tx.onabort = () =>
      reject(cause || tx.error || Error('No se pudo guardar. Revisa el espacio disponible.'));
    tx.onerror = () => {};
  });
}
export async function readRecovery() {
  const db = await open();
  return new Promise((resolve, reject) => {
    const tx = db.transaction('data', 'readonly'),
      r = tx.objectStore('data').get('beforeRestore');
    r.onsuccess = () => resolve(r.result || null);
    r.onerror = () => reject(r.error);
  });
}
