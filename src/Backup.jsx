import React, { useEffect, useState } from 'react';
import { readRecovery } from './db.js';
import { validate } from './domain.js';
import { date } from './HistoryList';
import MonthlyBackup from './MonthlyBackup.jsx';
export default function Backup({
  data,
  busy,
  lastExport,
  monthlyClose,
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
        <h2>Cierre mensual automático</h2>
        <p>
          Elige una carpeta para guardar y verificar los meses terminados. Después se retira su
          detalle del navegador conservando inventario, deudas, ganancias y caja. Las cuentas
          fiadas, abonos y retiros se conservan para mantener sus cálculos e identificadores.
        </p>
        <p>
          Funciona al abrir la aplicación o mientras permanece abierta. Si el navegador vuelve a
          pedir permiso, tendrás que autorizarlo aquí. Con la app cerrada no se garantiza la
          ejecución.
        </p>
        {monthlyClose.supported ? (
          <>
            <button
              className="primary full"
              disabled={busy || monthlyClose.working}
              onClick={monthlyClose.choose}
            >
              {monthlyClose.config?.enabled
                ? 'Cambiar carpeta'
                : 'Elegir carpeta y activar cierre automático'}
            </button>
            {monthlyClose.config?.enabled && (
              <>
                <p>Carpeta: {monthlyClose.config.name}</p>
                <button disabled={busy || monthlyClose.working} onClick={monthlyClose.resume}>
                  Autorizar carpeta y comprobar cierre
                </button>
                <button disabled={monthlyClose.working} onClick={monthlyClose.pause}>
                  Desactivar cierre automático
                </button>
              </>
            )}
          </>
        ) : (
          <p className="warning">
            Este navegador no permite elegir una carpeta para el cierre automático. Puedes descargar
            copias manuales; no se retirará ningún detalle automáticamente.
          </p>
        )}
        <p role="status">
          {monthlyClose.working
            ? 'Guardando y verificando archivos… Puedes seguir usando la aplicación.'
            : monthlyClose.status}
        </p>
        {data.carryover && (
          <p>
            Último cierre hasta {new Date(data.carryover.until).toLocaleDateString('es-MX')} (sin
            incluir ese día). Detalle guardado en {data.carryover.archivePath}. Los totales
            archivados siguen incluidos en Resumen.
          </p>
        )}
      </section>
      <MonthlyBackup data={data} busy={busy} onNotice={onNotice} onError={onError} />
      <section className="panel pinkglow">
        <span className="tile">↧</span>
        <h2>Tus datos, contigo</h2>
        <p>
          Conserva una copia completa fuera del navegador para recuperar la aplicación. Incluye
          productos, cuentas, ventas, abonos, inventario, retiros, gastos, reinversiones, consumos
          personales y conteos de caja.
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
        <p>
          Tamaño aproximado de tus registros:{' '}
          {(new Blob([JSON.stringify(data)]).size / 1024 / 1024).toFixed(2)} MB.
        </p>
        {storage && (
          <small>
            Uso aproximado del sitio: {(storage.usage / 1024 / 1024).toFixed(1)} MB. Incluye los
            archivos para funcionar sin conexión.{' '}
            {Number.isFinite(storage.quota)
              ? `Límite estimado: ${(storage.quota / 1024 / 1024).toFixed(0)} MB; uso ${((storage.usage / storage.quota) * 100).toFixed(1)} %. El navegador puede cambiar este límite.`
              : ''}
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
