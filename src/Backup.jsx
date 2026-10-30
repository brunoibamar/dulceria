import React, { useEffect, useState } from 'react';
import { readRecovery } from './db.js';
import { validate } from './domain.js';
import { date } from './HistoryList';
export default function Backup({
  data,
  busy,
  lastExport,
  onExport,
  onImport,
  install,
  onInstall,
  onNotice,
  onError,
}) {
  const [recovery, setRecovery] = useState(null),
    [storage, setStorage] = useState(null);
  useEffect(() => {
    readRecovery()
      .then(setRecovery)
      .catch(() => {});
    navigator.storage
      ?.estimate?.()
      .then(setStorage)
      .catch(() => {});
  }, [data]);
  return (
    <div className="stack narrow">
      <section className="panel pinkglow">
        <span className="tile">↧</span>
        <h2>Tus datos, contigo</h2>
        <p>
          Genera una copia fuera del navegador al cerrar cada jornada. Incluye productos, cuentas,
          ventas, abonos, inventario, retiros, gastos, reinversiones, consumos personales y conteos
          de caja.
        </p>
        <button className="primary full" disabled={busy} onClick={() => onExport(data)}>
          Descargar respaldo JSON
        </button>
        <p className="hint">
          {lastExport
            ? `Último archivo generado: ${date(lastExport)}`
            : 'Aún no has generado un respaldo en este navegador.'}{' '}
          Comprueba que el archivo quedó guardado en Descargas.
        </p>
      </section>
      <section className="panel">
        <h2>Restaurar una copia</h2>
        <p>
          Reemplaza tus datos actuales; no mezcla registros. Se conservará una copia local anterior
          a la restauración para recuperarla desde aquí.
        </p>
        <label className="filelabel">
          Elegir respaldo JSON
          <input
            disabled={busy}
            type="file"
            accept=".json,application/json"
            onChange={async (e) => {
              try {
                const file = e.target.files[0];
                if (!file) return;
                if (file.size > 20e6) throw Error('El archivo excede 20 MB.');
                onImport(validate(JSON.parse(await file.text())));
              } catch (error) {
                onError(error.message);
              } finally {
                e.target.value = '';
              }
            }}
          />
        </label>
        {recovery && (
          <button className="outline full" onClick={() => onImport(recovery)}>
            Revisar copia anterior a la última restauración
          </button>
        )}
      </section>
      <section className="panel">
        <h2>Almacenamiento del dispositivo</h2>
        <p>
          {data.products.length} productos · {data.people.length} cuentas · {data.sales.length}{' '}
          ventas · {data.payments.length} abonos.
        </p>
        {storage && (
          <small>
            Uso aproximado del sitio: {(storage.usage / 1024 / 1024).toFixed(1)} MB. Incluye los
            archivos para funcionar sin conexión.
          </small>
        )}
        <p>
          No hay sincronización entre dispositivos. Borrar los datos del sitio o perder el teléfono
          puede borrar tus registros. Los respaldos no están cifrados.
        </p>
        <button
          className="outline full"
          onClick={async () => {
            try {
              const result = await navigator.storage?.persist?.();
              onNotice(
                result
                  ? 'El navegador concedió almacenamiento persistente. Sigue haciendo respaldos.'
                  : 'El navegador no concedió persistencia. Sigue haciendo respaldos.'
              );
            } catch (e) {
              onError(e.message);
            }
          }}
        >
          Solicitar almacenamiento persistente
        </button>
      </section>
      <section className="panel">
        <h2>Instalar en Android</h2>
        <p>
          Abre el enlace HTTPS en Chrome, espera la primera carga completa y elige «Instalar
          aplicación» o «Agregar a pantalla principal». Ábrela desde el icono con internet y después
          compruébala en modo avión.
        </p>
        {install && (
          <button className="primary full" onClick={onInstall}>
            Instalar Dulcería
          </button>
        )}
        <p>
          En HTTP local puedes probar la app; la instalación y el modo sin conexión requieren HTTPS
          o localhost.
        </p>
      </section>
    </div>
  );
}
