import { monthKey } from './monthlyArchive.js';
import { useEffect, useRef, useState } from 'react';
import { archiveSetting } from './db.js';
import { runMonthlyArchive } from './autoArchive.js';
import { pendingMonths } from './monthlyClose.js';
export default function useMonthlyClose({ data, busy, clock, onChanged }) {
  const [config, setConfig] = useState(null);
  const [status, setStatus] = useState('');
  const [working, setWorking] = useState(false);
  const [attention, setAttention] = useState(false);
  const running = useRef(false),
    attempted = useRef(0);
  useEffect(() => {
    archiveSetting()
      .then((v) => setConfig(v || { enabled: false }))
      .catch((e) => setStatus(e.message));
  }, []);
  async function run(folder = config?.folder, force = false) {
    if (!folder || running.current || busy || (!force && Date.now() - attempted.current < 60000))
      return;
    running.current = true;
    attempted.current = Date.now();
    setWorking(true);
    try {
      setAttention(false);
      const count = await runMonthlyArchive(folder, {
        startMonth: config?.startMonth || monthKey(new Date()),
      });
      setStatus(
        count
          ? `Cierre terminado: ${count} mes(es) guardados y verificados. Se liberó el detalle archivado.`
          : 'Al día. El próximo cierre se hará al abrir la app después de terminar el mes.'
      );
      if (count) await onChanged();
    } catch (e) {
      setStatus(e.message);
      setAttention(true);
      await onChanged();
    } finally {
      running.current = false;
      setWorking(false);
    }
  }
  useEffect(() => {
    if (
      data &&
      config?.enabled &&
      !busy &&
      pendingMonths(data, new Date(), config.startMonth).length
    )
      run();
  }, [data, config, busy, clock]);
  async function choose() {
    try {
      const folder = await window.showDirectoryPicker({ mode: 'readwrite' });
      const value = {
        enabled: true,
        folder,
        name: folder.name,
        startMonth: config?.startMonth || monthKey(new Date()),
      };
      await archiveSetting(value);
      setConfig(value);
      attempted.current = 0;
      setAttention(false);
      setStatus(
        'Carpeta guardada. El cierre se comprobará automáticamente al terminar los formularios abiertos.'
      );
    } catch (e) {
      if (e.name !== 'AbortError') setStatus(e.message);
    }
  }
  async function resume() {
    try {
      if ((await config.folder.requestPermission({ mode: 'readwrite' })) !== 'granted') {
        setStatus('No se concedió permiso. Tus registros se conservan.');
        return;
      }
      await run(config.folder, true);
    } catch (e) {
      setStatus(e.message);
    }
  }
  async function pause() {
    try {
      const value = { ...config, enabled: false };
      await archiveSetting(value);
      setConfig(value);
      setStatus('Cierre automático desactivado. Se conservan tus archivos.');
    } catch (e) {
      setStatus(e.message);
    }
  }
  return {
    supported: typeof window.showDirectoryPicker === 'function',
    config,
    status,
    working,
    attention,
    choose,
    resume,
    pause,
  };
}
