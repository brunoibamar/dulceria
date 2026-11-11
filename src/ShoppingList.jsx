import React from 'react';
import { shoppingList } from './inventory.js';
export default function ShoppingList({ products, expanded, onRestock }) {
  const items = shoppingList(products);
  function download() {
    const text = [
      'Lista de compras · Dulcería',
      new Date().toLocaleDateString('es-MX'),
      '',
      ...items.map((p) => `${p.name}: quedan ${p.stock}; comprar al menos ${p.suggested} piezas`),
    ].join('\n');
    const url = URL.createObjectURL(new Blob([text], { type: 'text/plain;charset=utf-8' }));
    const a = document.createElement('a');
    a.href = url;
    a.download = 'lista-de-compras.txt';
    a.click();
    setTimeout(() => URL.revokeObjectURL(url), 1000);
  }
  return (
    <details className="panel shopping-list" open={expanded || undefined}>
      <summary>Lista de compras · {items.length} productos por reponer</summary>
      <p className="hint">
        Se actualiza con tus existencias. La cantidad mínima sugerida permite superar el nivel de
        aviso; ajústala a los paquetes que compres.
      </p>
      {!items.length ? (
        <p>Todo listo: no hay productos por reponer.</p>
      ) : (
        <>
          {items.map((p) => (
            <div className="line row" key={p.id}>
              <div>
                <strong>{p.name}</strong>
                <p>
                  Quedan {p.stock} · Comprar al menos {p.suggested} piezas
                </p>
              </div>
              <button
                className="primary"
                aria-label={`Reponer ${p.name}`}
                onClick={() => onRestock(p)}
              >
                Reponer
              </button>
            </div>
          ))}
          <button className="outline full" onClick={download}>
            Descargar lista de compras
          </button>
        </>
      )}
    </details>
  );
}
