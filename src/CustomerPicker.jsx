import React, { useState } from 'react';
import { normalize } from './domain.js';
export default function CustomerPicker({ people, value, onChange, busy }) {
  const [search, setSearch] = useState('');
  const [creating, setCreating] = useState(false);
  const [name, setName] = useState('');
  const selected = people.find((p) => p.id === value.customer);
  const query = normalize(search);
  const matches = people
    .filter((p) => normalize(`${p.name} ${p.phone}`).includes(query))
    .sort(
      (a, b) =>
        Number(normalize(b.name) === query) - Number(normalize(a.name) === query) ||
        a.name.localeCompare(b.name, 'es')
    );
  return (
    <fieldset className="customer-picker" disabled={busy}>
      <legend>¿Quién está pagando?</legend>
      {creating ? (
        <>
          <label>
            Nombre del nuevo cliente
            <input
              required
              maxLength={80}
              value={name}
              onChange={(e) => {
                setName(e.target.value);
                onChange({ newCustomerName: e.target.value });
              }}
              placeholder="Ej. Mundín"
            />
          </label>
          <p className="hint">
            Se registra junto con el cobro. Si ya existe el mismo nombre, se usará esa cuenta.
          </p>
          <button
            type="button"
            className="outline"
            onClick={() => {
              setCreating(false);
              onChange({});
            }}
          >
            Buscar cliente registrado
          </button>
        </>
      ) : selected ? (
        <>
          <p>
            <strong>{selected.name}</strong>
            {selected.phone ? ` · ${selected.phone}` : ''}
          </p>
          <button type="button" className="outline" onClick={() => onChange({})}>
            Cambiar cliente
          </button>
        </>
      ) : (
        <>
          <label>
            Buscar cliente por nombre o teléfono
            <input
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Escribe el nombre de quien paga"
            />
          </label>
          <div className="customer-results" aria-label="Clientes encontrados">
            {matches.slice(0, 8).map((p) => (
              <button
                key={p.id}
                type="button"
                className="outline full"
                onClick={() => onChange({ customer: p.id })}
              >
                {p.name}
                {p.phone ? ` · ${p.phone}` : ''}
                {p.archived ? ' · Archivado' : ''}
              </button>
            ))}
          </div>
          {!matches.length && <p>No encontramos ese cliente. Puedes registrarlo aquí.</p>}
          {matches.length > 8 && (
            <p className="hint">Escribe más letras para encontrar la cuenta correcta.</p>
          )}
          <button
            type="button"
            className="outline full"
            onClick={() => {
              setCreating(true);
              setName(search);
              onChange({ newCustomerName: search });
            }}
          >
            ＋ Registrar cliente aquí
          </button>
        </>
      )}
      <p className="hint">
        Esta compra queda pagada; no genera deuda ni abona a deudas anteriores.
      </p>
    </fieldset>
  );
}
