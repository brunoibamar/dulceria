import React, { useRef, useState } from 'react';
import { monthKey, monthlyHtml } from './monthlyArchive.js';
import { loadMonthlyReport } from './reportReader.js';
export default function ReportViewer({ data, folder, busy }) {
  const [month, setMonth] = useState(() => monthKey(new Date()));
  const [result, setResult] = useState(null),
    [error, setError] = useState(''),
    [loading, setLoading] = useState(false);
  const revision = useRef(0);
  async function view() {
    const request = ++revision.current;
    setLoading(true);
    setError('');
    setResult(null);
    try {
      const archived = data.carryover && month < monthKey(data.carryover.until);
      if (archived && folder) {
        const permission = await folder.queryPermission({ mode: 'read' });
        if (
          permission !== 'granted' &&
          (await folder.requestPermission({ mode: 'read' })) !== 'granted'
        )
          throw Error('Autoriza la lectura de la carpeta para consultar este mes.');
      }
      const value = await loadMonthlyReport(data, month, folder);
      if (request === revision.current) setResult(value);
    } catch (e) {
      if (request === revision.current) setError(e.message);
    } finally {
      if (request === revision.current) setLoading(false);
    }
  }
  function download() {
    const html = monthlyHtml(result.report);
    const url = URL.createObjectURL(new Blob([html], { type: 'text/html;charset=utf-8' }));
    const a = document.createElement('a');
    a.href = url;
    a.download = `dulceria-${result.report.month}-informe.html`;
    document.body.append(a);
    a.click();
    a.remove();
    setTimeout(() => URL.revokeObjectURL(url), 1000);
  }
  return (
    <section className="panel monthly-viewer">
      <h2>Consultar reporte mensual</h2>
      <p>
        Elige el mes y consulta sus ventas aquí. Los meses cerrados se leen de tu carpeta guardada;
        el mes actual muestra lo registrado hasta ahora.
      </p>
      {folder && <p className="hint">Carpeta guardada: {folder.name}</p>}
      <label>
        Mes que quieres consultar
        <input
          type="month"
          value={month}
          max={monthKey(new Date())}
          onChange={(e) => {
            revision.current++;
            setMonth(e.target.value);
            setResult(null);
            setError('');
            setLoading(false);
          }}
        />
      </label>
      <button className="primary full" disabled={busy || loading || !month} onClick={view}>
        {loading ? 'Leyendo reporte…' : 'Ver reporte del mes'}
      </button>
      {error && (
        <p className="warning" role="alert">
          {error}
        </p>
      )}
      {result && (
        <>
          <p role="status">
            {result.source}.{' '}
            {result.report.month === monthKey(new Date()) ? 'Mes en curso: informe parcial.' : ''}
          </p>
          {!result.report.sales.length && !result.report.payments.length && (
            <p>
              Este mes no tiene ventas ni abonos registrados. Puedes consultar los demás movimientos
              en el informe.
            </p>
          )}
          <button className="outline full" onClick={download}>
            Descargar este reporte
          </button>
          <iframe
            title={`Reporte mensual ${result.report.month}`}
            sandbox=""
            srcDoc={monthlyHtml(result.report)}
            style={{
              width: '100%',
              height: '65vh',
              border: '1px solid #ffffff30',
              borderRadius: 12,
              marginTop: 16,
              background: 'white',
            }}
          />
        </>
      )}
    </section>
  );
}
