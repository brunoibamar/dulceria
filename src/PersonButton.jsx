import React, { useEffect, useRef } from 'react';
export default function PersonButton({ person, onHistory, onOptions }) {
  const timer = useRef(null),
    start = useRef(null),
    held = useRef(false);
  function cancel() {
    clearTimeout(timer.current);
    timer.current = null;
  }
  useEffect(() => {
    window.addEventListener('scroll', cancel, true);
    return () => {
      cancel();
      window.removeEventListener('scroll', cancel, true);
    };
  }, []);
  return (
    <>
      <button
        className="personname hold-person"
        aria-label={`Ver cuenta de ${person.name}`}
        title="Mantén presionado 2 segundos para editar"
        onPointerDown={(e) => {
          if (!e.isPrimary || e.button !== 0) return;
          cancel();
          held.current = false;
          start.current = { x: e.clientX, y: e.clientY };
          timer.current = setTimeout(() => {
            held.current = true;
            onOptions();
          }, 2000);
        }}
        onPointerMove={(e) => {
          if (
            start.current &&
            Math.hypot(e.clientX - start.current.x, e.clientY - start.current.y) > 12
          )
            cancel();
        }}
        onPointerUp={cancel}
        onPointerCancel={cancel}
        onPointerLeave={cancel}
        onBlur={cancel}
        onContextMenu={(e) => e.preventDefault()}
        onClick={(e) => {
          if (held.current) {
            e.preventDefault();
            held.current = false;
            return;
          }
          onHistory();
        }}
      >
        {person.name}
        <small>
          {person.archived ? 'Archivado · Ver movimientos' : person.phone || 'Ver movimientos →'}
        </small>
      </button>
      <button
        type="button"
        className="person-options"
        aria-label={`Opciones de ${person.name}`}
        onClick={onOptions}
      >
        ⋮
      </button>
    </>
  );
}
