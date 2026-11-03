import React, { useState } from 'react';
import { archiveFiles, monthKey } from './monthlyArchive.js';
export default function MonthlyBackup({ data, busy, onNotice, onError }) {
  const [month, setMonth] = useState(() => {
    const d = new Date();
    d.setDate(1);
    d.setMonth(d.getMonth() - 1);
    return monthKey(d);
  });
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState('');
  function download(index) {
    try {
      const file = archiveFiles(data, month)[index];
      const url = URL.createObjectURL(
        new Blob([file.text], { type: file.type + ';charset=utf-8' })
      );
      const a = document.createElement('a');
      a.href = url;
      a.download = file.name;
      document.body.append(a);
      a.click();
      a.remove();
      setTimeout(() => URL.revokeObjectURL(url), 1000);
      onNotice(
        'Descarga solicitada. Comprueba el archivo en Descargas; no se han borrado registros.'
      );
    } catch (e) {
      onError(e.message);
    }
  }
  async function saveFolder() {
    setSaving(true);
    setSaved('');
    try {
      const folder = await window.showDirectoryPicker({ mode: 'readwrite' });
      const files = archiveFiles(data, month);
      const year = await folder.getDirectoryHandle(month.slice(0, 4), { create: true });
      const target = await year.getDirectoryHandle(month, { create: true });
      for (const file of files) {
        const handle = await target.getFileHandle(file.name, { create: true });
        const writer = await handle.createWritable();
        await writer.write(file.text);
        await writer.close();
        if ((await (await handle.getFile()).text()) !== file.text)
          throw Error('No se pudo verificar un archivo. Revisa la carpeta antes de continuar.');
      }
      setSaved(
        `Tres archivos guardados y verificados en ${folder.name}/${month.slice(0, 4)}/${month}.`
      );
    } catch (e) {
      if (e.name !== 'AbortError') onError(e.message);
    } finally {
      setSaving(false);
    }
  }
  return (
    <section className="panel pinkglow">
      <h2>Archivos mensuales en tu teléfono</h2>
      <p>
        Guarda tus ventas, piezas, abonos, compras, retiros, consumos y movimientos de caja por mes.
        Sin nube ni suscripción.
      </p>
      <label>
        Mes del informe
        <input
          type="month"
          value={month}
          onChange={(e) => {
            setMonth(e.target.value);
            setSaved('');
          }}
          required
        />
      </label>
      <p className="hint">
        El mes actual será parcial. Los meses siguen la fecha y zona horaria del dispositivo. El
        informe muestra movimientos del mes; la copia completa incluye todo el historial para
        recuperar la aplicación.
      </p>
      {typeof window.showDirectoryPicker === 'function' && (
        <button className="primary full" disabled={busy || saving || !month} onClick={saveFolder}>
          {saving ? 'Guardando y verificando…' : 'Elegir carpeta y guardar los tres archivos'}
        </button>
      )}
      <div className="stack">
        <button disabled={busy || saving || !month} onClick={() => download(0)}>
          Descargar informe mensual para leer
        </button>
        <button disabled={busy || saving || !month} onClick={() => download(1)}>
          Descargar detalle mensual JSON
        </button>
        <button disabled={busy || saving || !month} onClick={() => download(2)}>
          Descargar copia completa para recuperar
        </button>
      </div>
      <p className="hint">
        Si no aparece Elegir carpeta, usa Descargas y mueve los archivos a una carpeta como Dulcería
        / 2026 / 2026-10 desde Archivos en tu teléfono. Cada exportación lleva fecha para conservar
        las versiones.
      </p>
      {saved && <p role="status">{saved}</p>}
      <p className="warning">
        Esta prueba guarda archivos fuera del navegador, pero todavía no libera su espacio ni borra
        meses. Caja, deudas y ganancias necesitan el historial completo. No hay guardado programado
        con la aplicación cerrada.
      </p>
    </section>
  );
}
