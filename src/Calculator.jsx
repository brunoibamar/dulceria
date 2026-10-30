import React, { useState } from 'react';
import { money, sum } from './domain.js';
export default function Calculator({ value, onChange, compact = false }) {
  const [undo, setUndo] = useState('');
  let total = 0,
    error = '';
  try {
    total = sum(value);
  } catch (e) {
    error = e.message;
  }
  function key(k) {
    if (k === 'C') {
      setUndo(value);
      onChange('');
      return;
    }
    if (k === '⌫') {
      onChange(value.slice(0, -1));
      return;
    }
    if (value.length >= 2000) return;
    if (k === '+') {
      if (value.trim() && !/[+.\s]$/.test(value)) onChange(value + '+');
      return;
    }
    const last = value.split('+').at(-1).trim();
    if (k === '.' && (last.includes('.') || last.includes(','))) return;
    if (k === '.' && !last) {
      onChange(value + '0.');
      return;
    }
    if (/\.\d{2}$/.test(last) && /\d/.test(k)) return;
    onChange(value + k);
  }
  return (
    <div className={compact ? 'calc compact' : 'calc'}>
      <label className="sr" htmlFor={compact ? 'charge-expression' : 'expression'}>
        Suma de precios{compact ? ' para el cliente' : ''}
      </label>
      <input
        id={compact ? 'charge-expression' : 'expression'}
        className="expression"
        inputMode="decimal"
        autoComplete="off"
        maxLength={2000}
        placeholder="5 + 5 + 2 + 2"
        value={value}
        onChange={(e) => onChange(e.target.value.replace(/,/g, '.'))}
      />
      <div className="display" aria-live="polite">
        <small>TOTAL DE LA VENTA</small>
        <strong>{error ? 'Revisa la suma' : money(total)}</strong>
        <span>{error || 'Puedes usar punto o coma para los centavos'}</span>
      </div>
      <div className="keypad">
        {['7', '8', '9', '⌫', '4', '5', '6', 'C', '1', '2', '3', '+', '0', '.'].map((k) => (
          <button
            type="button"
            className={k === '+' ? 'plus' : k === '0' ? 'zero' : ''}
            key={k}
            onClick={() => key(k)}
            aria-label={k === '⌫' ? 'Borrar último carácter' : k === 'C' ? 'Limpiar' : k}
          >
            {k}
          </button>
        ))}
      </div>
      {undo && !value && (
        <button
          type="button"
          className="textbutton"
          onClick={() => {
            onChange(undo);
            setUndo('');
          }}
        >
          ↶ Recuperar suma borrada
        </button>
      )}
    </div>
  );
}
