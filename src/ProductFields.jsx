import React, { useState } from 'react';

import { money } from './domain.js';

import { costKind, pricing } from './pricing.js';

export default function ProductFields({ product }) {
  const [mode, setMode] = useState(product && costKind(product) !== 'real' ? 'sale' : 'unit');

  const [unit, setUnit] = useState(
    !product || product.cost === null ? '' : String(product.cost / 100)
  );

  const [price, setPrice] = useState(product ? String(product.price / 100) : '');

  const [pack, setPack] = useState(''),
    [pieces, setPieces] = useState(''),
    [margin, setMargin] = useState(
      product?.costStatus === 'estimated' && product.price
        ? String(Number(((1 - product.cost / product.price) * 100).toFixed(6)))
        : '30'
    );

  const [estimate, setEstimate] = useState(product?.costStatus === 'estimated'),
    [stock, setStock] = useState(product?.stock ?? 0);

  let result = null,
    problem = '';
  try {
    result = pricing({ mode, unit, pack, pieces, price, margin, estimate });
  } catch (e) {
    problem = e.message;
  }

  return (
    <>
      <label>
        Nombre
        <input name="name" required maxLength={80} defaultValue={product?.name} autoFocus />
      </label>

      <label>
        ¿Cómo conoces el costo?
        <select value={mode} onChange={(e) => setMode(e.target.value)} name="costMode">
          <option value="unit">Conozco el costo por pieza</option>
          <option value="pack">Compré un paquete</option>
          <option value="sale">Solo conozco mi precio de venta</option>
        </select>
      </label>

      {mode === 'unit' && (
        <label>
          Costo por pieza ($)
          <input
            name="unit"
            value={unit}
            onChange={(e) => setUnit(e.target.value)}
            type="number"
            min="0"
            step="0.01"
            required
          />
        </label>
      )}

      {mode === 'pack' && (
        <div className="formgrid">
          <label>
            Costo del paquete ($)
            <input
              name="pack"
              value={pack}
              onChange={(e) => setPack(e.target.value)}
              type="number"
              min="0.01"
              step="0.01"
              required
            />
          </label>
          <label>
            Piezas por paquete
            <input
              name="pieces"
              value={pieces}
              onChange={(e) => setPieces(e.target.value)}
              type="number"
              min="1"
              step="1"
              required
            />
          </label>
        </div>
      )}

      {mode === 'sale' && (
        <>
          <p className="hint">
            Puedes vender sin conocer el costo. No lo contaremos como costo cero.
          </p>
          <label className="checkline">
            <input
              name="estimate"
              type="checkbox"
              checked={estimate}
              onChange={(e) => setEstimate(e.target.checked)}
            />{' '}
            Estimar costo usando un margen supuesto
          </label>
        </>
      )}

      {(mode !== 'sale' || estimate) && (
        <label>
          {mode === 'sale'
            ? 'Margen supuesto sobre la venta (%)'
            : 'Margen deseado sobre la venta (%)'}
          <input
            name="margin"
            value={margin}
            onChange={(e) => setMargin(e.target.value)}
            type="number"
            min="0"
            max="99.99"
            step="any"
            required
          />
          <small>
            30 % significa que de cada $100 vendidos, $30 quedan antes de gastos. No es un recargo
            sobre el costo.
          </small>
        </label>
      )}

      <label>
        Tu precio de venta por pieza ($)
        <input
          name="price"
          value={price}
          onChange={(e) => setPrice(e.target.value)}
          type="number"
          min="0.01"
          step="0.01"
          required
        />
      </label>

      <section className="pricing-preview" aria-live="polite">
        {result ? (
          <>
            <small>
              {result.costStatus === 'estimated'
                ? 'COSTO ESTIMADO · NO CONFIRMADO'
                : result.costStatus === 'unknown'
                  ? 'COSTO DESCONOCIDO'
                  : 'COSTO POR PIEZA · REDONDEADO A CENTAVOS'}
            </small>
            <strong>{result.cost === null ? 'Sin costo registrado' : money(result.cost)}</strong>
            {mode !== 'sale' && result.suggested !== null && (
              <>
                <p>
                  Precio sugerido: <b className="mint">{money(result.suggested)}</b>
                  <br />
                  Con margen de {result.margin} % antes de gastos.
                </p>
                <div className="actions">
                  <button
                    type="button"
                    className="outline"
                    onClick={() => setPrice((result.suggested / 100).toFixed(2))}
                  >
                    Usar sugerido
                  </button>
                  <button
                    type="button"
                    className="outline"
                    onClick={() => setPrice(String(Math.ceil(result.suggested / 100)))}
                  >
                    Redondear a peso
                  </button>
                </div>
              </>
            )}
            {result.costStatus === 'estimated' && (
              <p>
                Es una aproximación basada en tu margen supuesto; no demuestra cuánto pagaste
                realmente.
              </p>
            )}
          </>
        ) : (
          <p>{problem}</p>
        )}
      </section>

      <label>
        Existencias totales (unidades)
        <input
          name="stock"
          type="number"
          min="0"
          step="1"
          required
          value={stock}
          onChange={(e) => setStock(e.target.value)}
        />
      </label>
      {mode === 'pack' && (
        <button
          type="button"
          className="outline"
          disabled={!Number.isSafeInteger(Number(pieces)) || Number(pieces) < 1}
          onClick={() => setStock(pieces)}
        >
          Usar las piezas del paquete como existencias totales
        </button>
      )}

      <label>
        Avisarme cuando queden estas piezas o menos
        <input
          name="lowStock"
          type="number"
          inputMode="numeric"
          min="0"
          step="1"
          required
          defaultValue={product?.lowStock ?? 3}
        />
        <small>Con 0 solo se avisará cuando el producto se agote.</small>
      </label>
      {result?.cost !== null && result?.cost !== undefined && Number(price) * 100 < result.cost && (
        <p className="warning">
          El precio de venta está por debajo del costo. Tendrías una pérdida por pieza.
        </p>
      )}
      <p className="hint">
        El paquete calcula el costo por pieza. Las existencias se guardan como total; no se agrega
        un paquete automáticamente. Los costos de ventas anteriores se conservan.
      </p>
    </>
  );
}
