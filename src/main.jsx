import React, { useEffect, useMemo, useRef, useState } from 'react';
import { createRoot } from 'react-dom/client';
import { useRegisterSW } from 'virtual:pwa-register/react';
import { transact } from './db.js';
import {
  archivePerson,
  cents,
  editPerson,
  money,
  pay,
  saveProduct,
  sell,
  sum,
  uid,
  restock,
} from './domain.js';
import { costKind, pricing } from './pricing.js';
import { historyOf, inPeriod, low, matches } from './analytics.js';
import { readDraft, readLocal, writeLocal } from './local.js';
import ProductFields from './ProductFields';
import PersonButton from './PersonButton';
import Calculator from './Calculator';
import Modal from './Modal';
import { CashPayment, DirectCharge, PaymentForm } from './Payments';
import HistoryList from './HistoryList';
import Dashboard from './Dashboard';
import Finance, { WithdrawalForm, BusinessMovementForm } from './Finance.jsx';
import { recordWithdrawal, recordBusinessMovement, recordConsumption } from './finance.js';
import Cashbox, { CashCountForm, CashAdjustmentForm } from './Cashbox.jsx';
import { recordCashCount, recordCashAdjustment } from './cashbox.js';
import ConsumptionForm from './ConsumptionForm';
import Backup from './Backup';
import ErrorBoundary from './ErrorBoundary';
import './style.css';

const tabs = [
  ['venta', '＋', 'Nueva venta'],
  ['deudores', '♧', 'Deudores'],
  ['inventario', '▦', 'Inventario'],
  ['dashboard', '▥', 'Resumen'],
  ['ganancias', '↗', 'Ganancias'],
  ['caja', '▣', 'Caja'],
  ['respaldo', '↧', 'Respaldo'],
];
const titleFor = (m) =>
  ({
    person: 'Nueva persona',
    editPerson: 'Editar persona',
    personOptions: m.person?.name,
    product: m.product ? 'Editar producto' : 'Nuevo producto',
    pay: 'Registrar abono',
    charge: 'Agregar a una cuenta',
    directCharge: `Nuevo cargo · ${m.person?.name}`,
    cash: 'Cobrar venta',
    history: m.person?.name,
    restock: 'Reponer mercancía',
    import: 'Restaurar respaldo',
    withdraw: 'Retirar para mi Economía',
    consumption: 'Consumo personal de mercancía',
    cashCount: 'Conteo de caja física',
    cashAdjustment: 'Entrada o salida de efectivo',
    businessMovement:
      m.kind === 'reinvestment' ? 'Registrar uso de reinversión' : 'Registrar gasto del negocio',
  })[m.type];

function App() {
  const [initial] = useState(readDraft);
  const [data, setData] = useState(null),
    [error, setError] = useState(''),
    [notice, setNotice] = useState('');
  const [tab, setTab] = useState(() => {
    const v = readLocal('tab', 'venta');
    return tabs.some((t) => t[0] === v) ? v : 'venta';
  });
  const [expr, setExpr] = useState(initial.expression),
    [cart, setCart] = useState(initial.cart),
    [catalog, setCatalog] = useState(initial.catalog),
    [target, setTarget] = useState(initial.target),
    [operationId, setOperationId] = useState(initial.operationId || uid());
  const [modal, setModal] = useState(null),
    [busy, setBusy] = useState(false),
    [search, setSearch] = useState(''),
    [filter, setFilter] = useState('todos'),
    [inventoryFilter, setInventoryFilter] = useState('all'),
    [sort, setSort] = useState('name'),
    [catalogSearch, setCatalogSearch] = useState('');
  const [install, setInstall] = useState(null),
    [online, setOnline] = useState(navigator.onLine),
    [lastExport, setLastExport] = useState(() => readLocal('lastExport', null)),
    [clock, setClock] = useState(Date.now());
  const saving = useRef(false),
    channel = useRef(null),
    draftWarning = useRef(false);
  const {
    needRefresh: [refresh],
    updateServiceWorker,
  } = useRegisterSW({
    onRegisterError: () =>
      setNotice(
        'El modo sin conexión no se pudo preparar. La app sigue disponible mientras tengas conexión.'
      ),
  });

  async function reload() {
    try {
      setData(await transact());
    } catch (e) {
      setError(e.message);
    }
  }
  useEffect(() => {
    reload();
    try {
      channel.current = new BroadcastChannel('dulceria-changes');
      channel.current.onmessage = reload;
    } catch {}
    const focus = () => {
        reload();
        setClock(Date.now());
      },
      network = () => setOnline(navigator.onLine),
      before = (e) => {
        e.preventDefault();
        setInstall(e);
      };
    window.addEventListener('focus', focus);
    window.addEventListener('online', network);
    window.addEventListener('offline', network);
    window.addEventListener('beforeinstallprompt', before);
    const ticker = setInterval(() => setClock(Date.now()), 60000);
    return () => {
      channel.current?.close();
      clearInterval(ticker);
      window.removeEventListener('focus', focus);
      window.removeEventListener('online', network);
      window.removeEventListener('offline', network);
      window.removeEventListener('beforeinstallprompt', before);
    };
  }, []);
  useEffect(() => {
    if (
      !writeLocal('draft', { expression: expr, cart, catalog, target, operationId }) &&
      !draftWarning.current
    ) {
      draftWarning.current = true;
      setNotice('No se pudo guardar el borrador de venta. Evita recargar antes de terminarla.');
    }
  }, [expr, cart, catalog, target, operationId]);
  useEffect(() => {
    writeLocal('tab', tab);
  }, [tab]);
  useEffect(() => {
    if (!notice) return;
    const timer = setTimeout(() => setNotice(''), 7000);
    return () => clearTimeout(timer);
  }, [notice]);
  useEffect(() => {
    setError('');
  }, [modal?.type, modal?.person?.id, modal?.product?.id]);
  const balances = useMemo(() => {
    const map = new Map(data?.people.map((p) => [p.id, 0]));
    for (const s of data?.sales || [])
      if (s.person) map.set(s.person, (map.get(s.person) || 0) + s.total);
    for (const p of data?.payments || []) map.set(p.person, (map.get(p.person) || 0) - p.amount);
    return map;
  }, [data]);
  const history = useMemo(() => (data ? historyOf(data) : []), [data]);
  useEffect(() => {
    if (data?.sales.some((s) => s.id === operationId)) resetDraft();
  }, [data, operationId]);
  const debt = (id) => balances.get(id) || 0;

  async function commit(change, message, options) {
    if (saving.current) return false;
    saving.current = true;
    setBusy(true);
    setError('');
    try {
      const next = await transact(change, options);
      setData(next);
      setClock(Date.now());
      try {
        channel.current?.postMessage('changed');
      } catch {}
      setNotice(message);
      return true;
    } catch (e) {
      setError(e.message);
      return false;
    } finally {
      saving.current = false;
      setBusy(false);
    }
  }
  function resetDraft() {
    setExpr('');
    setCart([]);
    setTarget('');
    setOperationId(uid());
  }
  async function checkout(person = null, received = null, method = 'cash') {
    if (
      await commit(
        (d) =>
          sell(d, {
            expression: expr,
            cart: catalog ? cart : [],
            person,
            received,
            method,
            operationId,
            expectedTotal: total,
          }),
        person ? 'Cargo agregado a la cuenta' : 'Venta cobrada y guardada'
      )
    ) {
      resetDraft();
      setModal(null);
    }
  }
  function openModal(value) {
    setError('');
    setModal(value);
  }
  function go(id) {
    setTab(id);
    setSearch('');
    setError('');
    window.scrollTo({ top: 0, behavior: 'instant' });
  }
  function adjust(product, delta) {
    setCart((previous) => {
      const item = previous.find((c) => c.product === product.id),
        qty = (item?.qty || 0) + delta;
      if (qty > product.stock) {
        setNotice('No quedan más unidades disponibles.');
        return previous;
      }
      if (qty <= 0) return previous.filter((c) => c.product !== product.id);
      return item
        ? previous.map((c) => (c.product === product.id ? { ...c, qty } : c))
        : [...previous, { product: product.id, qty }];
    });
  }
  function exportBackup(backup = data) {
    const url = URL.createObjectURL(
      new Blob([JSON.stringify({ ...backup, exportedAt: new Date().toISOString() }, null, 2)], {
        type: 'application/json',
      })
    );
    const link = document.createElement('a');
    link.href = url;
    link.download = `dulceria-${new Date().toISOString().replace(/[:.]/g, '-')}.json`;
    document.body.append(link);
    link.click();
    link.remove();
    setTimeout(() => URL.revokeObjectURL(url), 10000);
    const at = new Date().toISOString();
    setLastExport(at);
    writeLocal('lastExport', at);
    setNotice('Archivo generado. Comprueba que se guardó en Descargas.');
  }
  async function submit(e) {
    e.preventDefault();
    if (saving.current) return;
    const f = Object.fromEntries(new FormData(e.currentTarget));
    try {
      if (modal.type === 'person') {
        if (
          await commit((d) => {
            d.people.push({
              id: uid(),
              name: f.name.trim(),
              phone: f.phone.trim(),
              notes: f.notes.trim(),
            });
            return d;
          }, 'Persona agregada')
        )
          setModal(null);
      }
      if (
        modal.type === 'editPerson' &&
        (await commit((d) => editPerson(d, modal.person.id, f), 'Datos de la cuenta actualizados'))
      )
        setModal(null);
      if (modal.type === 'product') {
        const { cost, costStatus } = pricing({
          mode: f.costMode,
          unit: f.unit,
          pack: f.pack,
          pieces: f.pieces,
          price: f.price,
          margin: f.margin ?? '30',
          estimate: f.estimate === 'on',
        });
        if (
          await commit(
            (d) =>
              saveProduct(
                d,
                {
                  name: f.name,
                  price: cents(f.price),
                  cost,
                  costStatus,
                  stock: Number(f.stock),
                  lowStock: Number(f.lowStock),
                  expectedStock: modal.product?.stock,
                },
                modal.product?.id
              ),
            'Producto guardado'
          )
        )
          setModal(null);
      }
      if (
        modal.type === 'restock' &&
        (await commit(
          (d) => restock(d, modal.product.id, Number(f.quantity), f.note),
          'Mercancía repuesta'
        ))
      )
        setModal(null);
      if (modal.type === 'charge') await checkout(f.person);
    } catch (e) {
      setError(e.message);
    }
  }

  if (!data)
    return (
      <main className="startup">
        <span className="logo">◈</span>
        <h1>Dulcería</h1>
        {error ? (
          <>
            <p role="alert">{error}</p>
            <button className="primary" onClick={reload}>
              Volver a intentar
            </button>
            <p className="hint">
              No borres los datos del navegador para intentar resolverlo: ahí están tus registros.
            </p>
          </>
        ) : (
          <p>Abriendo tus cuentas…</p>
        )}
      </main>
    );
  const activeProducts = data.products.filter((p) => !p.archived),
    activePeople = data.people.filter((p) => !p.archived),
    shortages = activeProducts.filter(low);
  const debts = [...balances.values()].reduce((n, v) => n + v, 0),
    now = new Date(clock),
    todays = data.sales.filter((s) => inPeriod(s.at, 'today', now));
  const people = data.people
    .filter(
      (p) =>
        matches(`${p.name} ${p.phone}`, search) &&
        (filter === 'archivados' ? p.archived : !p.archived) &&
        (filter === 'deben' ? debt(p.id) > 0 : filter === 'corriente' ? debt(p.id) === 0 : true)
    )
    .sort((a, b) => debt(b.id) - debt(a.id) || a.name.localeCompare(b.name, 'es'));
  const products = data.products
    .filter(
      (p) =>
        matches(p.name, search) &&
        (inventoryFilter === 'archived' ? p.archived : !p.archived) &&
        (inventoryFilter === 'low' ? low(p) : inventoryFilter === 'empty' ? p.stock === 0 : true)
    )
    .sort((a, b) => (sort === 'stock' ? a.stock - b.stock : a.name.localeCompare(b.name, 'es')));
  let total = 0,
    invalid = false;
  try {
    total = catalog
      ? cart.reduce(
          (n, c) => n + (data.products.find((p) => p.id === c.product)?.price || 0) * c.qty,
          0
        )
      : sum(expr);
  } catch {
    invalid = true;
  }
  const staleCart =
    catalog &&
    cart.some((c) => {
      const p = data.products.find((p) => p.id === c.product);
      return !p || p.archived || c.qty > p.stock;
    });
  const backupDue =
    Boolean(data.sales.length || data.products.length || data.people.length) &&
    (!lastExport || Date.now() - new Date(lastExport).getTime() > 86400000);
  const currentPerson = modal?.person
    ? data.people.find((p) => p.id === modal.person.id) || modal.person
    : null;

  return (
    <div className="app">
      <aside>
        <a
          className="brand"
          href="#"
          onClick={(e) => {
            e.preventDefault();
            go('venta');
          }}
        >
          <span className="logo">◈</span>
          <span>
            Dulcería<small>UN POQUITO DE DULZURA</small>
          </span>
        </a>
        <p className="navlabel">TU NEGOCIO</p>
        <nav aria-label="Secciones de Dulcería">
          {tabs.map(([id, icon, label]) => (
            <button
              key={id}
              aria-current={tab === id ? 'page' : undefined}
              className={tab === id ? 'active' : ''}
              onClick={() => go(id)}
            >
              <span aria-hidden="true">{icon}</span>
              {label}
              {id === 'inventario' && shortages.length > 0 && (
                <i className="nav-count">{shortages.length}</i>
              )}
            </button>
          ))}
        </nav>
        <div className="local">
          <i /> Guardado en este dispositivo<small>Sin nube · Sin suscripciones</small>
        </div>
      </aside>
      <main>
        <header>
          <div>
            <p className="eyebrow">TU PEQUEÑO NEGOCIO, EN ORDEN</p>
            <h1>{tabs.find((t) => t[0] === tab)[2]}</h1>
          </div>
          <span className="badge">● {online ? 'Local' : 'Sin conexión'}</span>
        </header>
        {error && !modal && (
          <div className="alert" role="alert">
            {error}
            <button onClick={() => setError('')}>Cerrar</button>
          </div>
        )}
        {notice && (
          <div className="toast" role="status">
            {notice}
            <button aria-label="Cerrar aviso" onClick={() => setNotice('')}>
              ×
            </button>
          </div>
        )}
        {refresh && (
          <div className="alert">
            <span>
              Hay una nueva versión. El borrador de venta se conserva; termina los formularios
              abiertos antes de actualizar.
            </span>
            <button disabled={busy || !!modal} onClick={() => updateServiceWorker(true)}>
              Actualizar aplicación
            </button>
          </div>
        )}
        {backupDue && tab !== 'respaldo' && (
          <div className="backup-reminder">
            <span>↧ Cuida tus cuentas: genera un respaldo de tu jornada.</span>
            <button onClick={() => go('respaldo')}>Ir a respaldos</button>
          </div>
        )}

        {tab === 'venta' && (
          <>
            <p className="intro">Suma, cobra y sigue endulzando el día.</p>
            <div className="salegrid">
              <section className="panel calculator">
                <div className="row">
                  <h2>Calculadora rápida</h2>
                  <span className="pill">MXN</span>
                </div>
                <div className="segments">
                  <button className={!catalog ? 'selected' : ''} onClick={() => setCatalog(false)}>
                    Sumar precios
                  </button>
                  <button className={catalog ? 'selected' : ''} onClick={() => setCatalog(true)}>
                    Catálogo opcional
                  </button>
                </div>
                {!catalog ? (
                  <Calculator value={expr} onChange={setExpr} />
                ) : (
                  <>
                    <div className="display">
                      <small>TOTAL DEL CATÁLOGO</small>
                      <strong>{money(total)}</strong>
                    </div>
                    <input
                      aria-label="Buscar en catálogo"
                      placeholder="Buscar un dulce…"
                      value={catalogSearch}
                      onChange={(e) => setCatalogSearch(e.target.value)}
                    />
                    <div className="catalog">
                      {activeProducts
                        .filter((p) => matches(p.name, catalogSearch))
                        .map((p) => {
                          const quantity = cart.find((c) => c.product === p.id)?.qty || 0;
                          return (
                            <button
                              disabled={p.stock <= quantity || !p.price}
                              key={p.id}
                              onClick={() => adjust(p, 1)}
                            >
                              {p.name}
                              <small>
                                {money(p.price)} · {p.stock - quantity} disponibles
                              </small>
                              {quantity > 0 && <span className="pill">{quantity} en venta</span>}
                            </button>
                          );
                        })}
                    </div>
                    {!activeProducts.length && (
                      <p>Agrega tus productos en Inventario para empezar.</p>
                    )}
                    {cart.map((c) => {
                      const p = data.products.find((p) => p.id === c.product);
                      return (
                        <div className="cart-line" key={c.product}>
                          <div>
                            <b>{p?.name || 'Producto no disponible'}</b>
                            <small>{money((p?.price || 0) * c.qty)}</small>
                          </div>
                          <div className="quantity">
                            <button
                              aria-label={`Quitar una unidad de ${p?.name}`}
                              onClick={() =>
                                p
                                  ? adjust(p, -1)
                                  : setCart((v) => v.filter((x) => x.product !== c.product))
                              }
                            >
                              −
                            </button>
                            <span>{c.qty}</span>
                            <button
                              aria-label={`Añadir una unidad de ${p?.name}`}
                              disabled={!p || p.archived || c.qty >= p.stock}
                              onClick={() => adjust(p, 1)}
                            >
                              ＋
                            </button>
                          </div>
                          <button
                            className="remove"
                            aria-label={`Quitar ${p?.name || 'producto'} de la venta`}
                            onClick={() => setCart((v) => v.filter((x) => x.product !== c.product))}
                          >
                            ×
                          </button>
                        </div>
                      );
                    })}
                  </>
                )}
                {staleCart && (
                  <p className="warning" role="alert">
                    Revisa las cantidades: cambió el inventario de algún producto.
                  </p>
                )}
                <div className="actions">
                  <button
                    disabled={busy || invalid || !total || staleCart}
                    className="green"
                    onClick={() => openModal({ type: 'cash' })}
                  >
                    ✓ Cobrar {money(total)}
                  </button>
                  <button
                    disabled={busy || invalid || !total || staleCart}
                    className="outline"
                    onClick={() => openModal({ type: 'charge' })}
                  >
                    ＋ Agregar a deudor
                  </button>
                </div>
                <p className="hint">
                  {catalog
                    ? 'Al registrar la venta se descuenta el inventario.'
                    : 'La suma libre registra dinero; no descuenta productos ni estima costos.'}
                  <br />
                  Tu venta abierta se conserva si recargas en este navegador.
                </p>
              </section>
              <div className="stack">
                <section className="panel pinkglow">
                  <span className="tile">↗</span>
                  <p className="eyebrow">VENDIDO HOY</p>
                  <h2 className="big">{money(todays.reduce((n, s) => n + s.total, 0))}</h2>
                  <p>{todays.length} ventas · contado y fiado</p>
                </section>
                <section className="panel">
                  <div className="row">
                    <h2>Por cobrar</h2>
                    <span className="pink">♧</span>
                  </div>
                  <h2 className="big pink">{money(debts)}</h2>
                  <p>
                    {data.people.filter((p) => debt(p.id) > 0).length} personas con saldo pendiente
                  </p>
                  <button className="textbutton" onClick={() => go('deudores')}>
                    Ver las cuentas →
                  </button>
                </section>
                {shortages.length > 0 && (
                  <section className="panel stock-alert">
                    <h2>Hora de reponer</h2>
                    <p>{shortages.length} productos con pocas existencias o agotados.</p>
                    <button
                      className="outline full"
                      onClick={() => {
                        setInventoryFilter('low');
                        go('inventario');
                      }}
                    >
                      Revisar mercancía
                    </button>
                  </section>
                )}
                <section className="panel recent">
                  <h2>Últimos movimientos</h2>
                  <HistoryList entries={history.slice(0, 4)} products={data.products} limit={4} />
                </section>
              </div>
            </div>
          </>
        )}

        {tab === 'deudores' && (
          <>
            <div className="banner">
              <div>
                <small>TOTAL POR COBRAR</small>
                <h2 className="big pink">{money(debts)}</h2>
                <p>
                  {activePeople.length} cuentas activas ·{' '}
                  {data.people.filter((p) => p.archived).length} archivadas
                </p>
              </div>
              <button className="primary" onClick={() => openModal({ type: 'person' })}>
                ＋ Nueva persona
              </button>
            </div>
            <div className="toolbar">
              <input
                aria-label="Buscar persona"
                placeholder="Buscar por nombre o teléfono…"
                value={search}
                onChange={(e) => setSearch(e.target.value)}
              />
              <select
                aria-label="Filtrar cuentas"
                value={filter}
                onChange={(e) => setFilter(e.target.value)}
              >
                <option value="todos">Cuentas activas</option>
                <option value="deben">Deben</option>
                <option value="corriente">Al corriente</option>
                <option value="archivados">Archivados</option>
              </select>
            </div>
            <p className="hint">
              Mantén presionado el nombre 2 segundos o toca ⋮ para editar o archivar. El total
              incluye cuentas archivadas.
            </p>
            <div className="cards">
              {people.map((p) => (
                <section className="panel person" key={p.id}>
                  <div className="row">
                    <span className="avatar">{p.name.slice(0, 2).toUpperCase()}</span>
                    <PersonButton
                      person={p}
                      onHistory={() => openModal({ type: 'history', person: p })}
                      onOptions={() => openModal({ type: 'personOptions', person: p })}
                    />
                    <strong className={debt(p.id) > 0 ? 'pink' : 'mint'}>
                      {money(debt(p.id))}
                    </strong>
                  </div>
                  <div className="actions">
                    <button
                      disabled={p.archived}
                      className="primary"
                      onClick={() => openModal({ type: 'directCharge', person: p })}
                    >
                      ＋ Agregar cargo
                    </button>
                    <button
                      className="green"
                      disabled={!debt(p.id)}
                      onClick={() => openModal({ type: 'pay', person: p })}
                    >
                      − Abonar
                    </button>
                  </div>
                </section>
              ))}
            </div>
            {!people.length && (
              <div className="empty panel">
                {search
                  ? 'No encontramos ese nombre o teléfono. Prueba otra búsqueda.'
                  : filter === 'archivados'
                    ? 'No hay cuentas archivadas.'
                    : 'No hay cuentas en esta vista. Agrega una persona o cambia el filtro.'}
              </div>
            )}
          </>
        )}

        {tab === 'inventario' && (
          <>
            <div className="banner">
              <div>
                <h2>Tus dulces y algo más</h2>
                <p>
                  {activeProducts.length} productos activos · {shortages.length} por reponer
                </p>
              </div>
              <button className="primary" onClick={() => openModal({ type: 'product' })}>
                ＋ Nuevo producto
              </button>
            </div>
            <div className="toolbar inventory-toolbar">
              <input
                aria-label="Buscar producto"
                placeholder="Buscar producto…"
                value={search}
                onChange={(e) => setSearch(e.target.value)}
              />
              <select
                aria-label="Filtrar inventario"
                value={inventoryFilter}
                onChange={(e) => setInventoryFilter(e.target.value)}
              >
                <option value="all">Productos activos</option>
                <option value="low">Por reponer</option>
                <option value="empty">Agotados</option>
                <option value="archived">Archivados</option>
              </select>
              <select
                aria-label="Ordenar inventario"
                value={sort}
                onChange={(e) => setSort(e.target.value)}
              >
                <option value="name">Nombre A–Z</option>
                <option value="stock">Menos existencias</option>
              </select>
            </div>
            <div className="cards">
              {products.map((p) => (
                <section className="panel" key={p.id}>
                  <div className="row">
                    <span className="tile">◈</span>
                    <h2>{p.name}</h2>
                    <span
                      className={`pill ${!p.stock ? 'empty-stock' : low(p) ? 'low-stock' : ''}`}
                    >
                      {p.archived ? 'Archivado' : p.stock ? `${p.stock} uds.` : 'Agotado'}
                    </span>
                  </div>
                  <div className="productstats">
                    <div>
                      <small>PRECIO</small>
                      <b>{money(p.price)}</b>
                    </div>
                    <div>
                      <small>COSTO UNITARIO</small>
                      <b>{p.cost === null ? 'Desconocido' : money(p.cost)}</b>
                      <small>
                        {costKind(p) === 'estimated'
                          ? 'Estimado'
                          : costKind(p) === 'real'
                            ? 'Confirmado'
                            : 'Sin registrar'}
                      </small>
                    </div>
                    <div>
                      <small>{costKind(p) === 'estimated' ? 'MARGEN ESTIMADO' : 'MARGEN'}</small>
                      <b className={p.cost !== null && p.price < p.cost ? 'pink' : 'mint'}>
                        {p.price && p.cost !== null
                          ? (((p.price - p.cost) / p.price) * 100).toFixed(1) + '%'
                          : '—'}
                      </b>
                    </div>
                  </div>
                  <p>
                    {p.cost === null
                      ? 'Ganancia pendiente de conocer el costo'
                      : `${costKind(p) === 'estimated' ? 'Ganancia estimada' : 'Ganancia bruta'} por unidad: ${money(p.price - p.cost)}`}
                  </p>
                  <div className="actions">
                    <button
                      className="outline"
                      onClick={() => openModal({ type: 'product', product: p })}
                    >
                      Editar producto
                    </button>
                    {!p.archived && (
                      <button
                        className="green"
                        onClick={() => openModal({ type: 'restock', product: p })}
                      >
                        ＋ Reponer
                      </button>
                    )}
                  </div>
                  <button
                    className="textbutton full"
                    disabled={busy}
                    onClick={() =>
                      commit(
                        (d) => {
                          const product = d.products.find((x) => x.id === p.id);
                          if (!product) throw Error('El producto ya no existe.');
                          product.archived = !product.archived;
                          return d;
                        },
                        p.archived
                          ? 'Producto reactivado'
                          : 'Producto archivado; sus ventas se conservan'
                      )
                    }
                  >
                    {p.archived ? 'Reactivar producto' : 'Archivar producto'}
                  </button>
                </section>
              ))}
            </div>
            {!products.length && (
              <div className="empty panel">
                {data.products.length
                  ? 'No hay productos con estos filtros.'
                  : 'Tu inventario empieza aquí. Agrega tu primer producto.'}
              </div>
            )}
            <section className="panel">
              <h2>Movimientos de inventario</h2>
              {[...data.stock]
                .reverse()
                .slice(0, 30)
                .map((s) => (
                  <div className="line row" key={s.id}>
                    <span>
                      {data.products.find((p) => p.id === s.product)?.name}
                      <small>
                        {s.note} · {new Date(s.at).toLocaleString('es-MX')}
                      </small>
                    </span>
                    <b>
                      {s.delta > 0 ? '+' : ''}
                      {s.delta} uds.
                    </b>
                  </div>
                ))}
              {!data.stock.length && <p>Sin movimientos todavía.</p>}
              <p className="hint">
                Se muestran los últimos 30 movimientos. El respaldo JSON incluye el historial
                completo.
              </p>
            </section>
          </>
        )}

        {tab === 'dashboard' && <Dashboard data={data} />}
        {tab === 'ganancias' && <Finance data={data} busy={busy} onOpen={openModal} />}
        {tab === 'caja' && <Cashbox data={data} busy={busy} onOpen={openModal} />}
        {tab === 'respaldo' && (
          <Backup
            data={data}
            busy={busy}
            lastExport={lastExport}
            onExport={exportBackup}
            onImport={(backup) => openModal({ type: 'import', backup })}
            install={install}
            onInstall={async () => {
              try {
                await install.prompt();
                setInstall(null);
              } catch (e) {
                setError(e.message);
              }
            }}
            onNotice={setNotice}
            onError={setError}
          />
        )}
        <footer>
          Dulcería · v1.3<span>Hecho para tu día a día. ✦</span>
        </footer>
      </main>

      {modal && (
        <Modal title={titleFor(modal)} busy={busy} onClose={() => setModal(null)}>
          {error && (
            <p className="warning" role="alert">
              {error}
            </p>
          )}
          {modal.type === 'personOptions' ? (
            <>
              <p>Opciones de esta cuenta</p>
              <div className="stack">
                <button
                  className="primary"
                  onClick={() => openModal({ type: 'editPerson', person: currentPerson })}
                >
                  Editar nombre, teléfono y notas
                </button>
                <button
                  className="outline"
                  disabled={busy}
                  onClick={async () => {
                    if (
                      await commit(
                        (d) => archivePerson(d, currentPerson.id, !currentPerson.archived),
                        currentPerson.archived
                          ? 'Cuenta reactivada'
                          : 'Cuenta archivada; su saldo e historial se conservan'
                      )
                    )
                      setModal(null);
                  }}
                >
                  {currentPerson.archived ? 'Reactivar cliente' : 'Archivar cliente'}
                </button>
              </div>
              <p className="hint">
                Archivar lo oculta de las cuentas activas. Su saldo sigue en el total y puedes
                abonar desde Archivados.
              </p>
            </>
          ) : modal.type === 'consumption' ? (
            <ConsumptionForm
              data={data}
              busy={busy}
              onConfirm={async (fields) => {
                if (
                  await commit(
                    (d) =>
                      recordConsumption(d, {
                        ...fields,
                        id: modal.operationId,
                        at: new Date().toISOString(),
                      }),
                    'Consumo registrado al costo de compra; piezas descontadas'
                  )
                )
                  setModal(null);
              }}
            />
          ) : modal.type === 'cashCount' ? (
            <CashCountForm
              data={data}
              busy={busy}
              onConfirm={async (fields) => {
                if (
                  await commit(
                    (d) =>
                      recordCashCount(d, {
                        ...fields,
                        id: modal.operationId,
                        at: new Date().toISOString(),
                      }),
                    'Conteo físico guardado; ventas y ganancias sin cambios'
                  )
                )
                  setModal(null);
              }}
            />
          ) : modal.type === 'cashAdjustment' ? (
            <CashAdjustmentForm
              busy={busy}
              onConfirm={async (fields) => {
                try {
                  const amount = cents(fields.amount);
                  if (
                    await commit(
                      (d) =>
                        recordCashAdjustment(d, {
                          ...fields,
                          amount,
                          id: modal.operationId,
                          at: new Date().toISOString(),
                        }),
                      'Movimiento de efectivo registrado'
                    )
                  )
                    setModal(null);
                } catch (e) {
                  setError(e.message);
                }
              }}
            />
          ) : modal.type === 'withdraw' ? (
            <WithdrawalForm
              data={data}
              busy={busy}
              onConfirm={async (fields) => {
                if (
                  await commit(
                    (d) =>
                      recordWithdrawal(d, {
                        ...fields,
                        id: modal.operationId,
                        at: new Date().toISOString(),
                      }),
                    'Retiro guardado. Queda pendiente de vincular con Economía.'
                  )
                )
                  setModal(null);
              }}
            />
          ) : modal.type === 'businessMovement' ? (
            <BusinessMovementForm
              kind={modal.kind}
              busy={busy}
              onConfirm={async (fields) => {
                try {
                  const amount = cents(fields.amount);
                  if (
                    await commit(
                      (d) =>
                        recordBusinessMovement(d, {
                          ...fields,
                          amount,
                          kind: modal.kind,
                          id: modal.operationId,
                          at: new Date().toISOString(),
                        }),
                      'Movimiento del negocio guardado'
                    )
                  )
                    setModal(null);
                } catch (e) {
                  setError(e.message);
                }
              }}
            />
          ) : modal.type === 'cash' ? (
            <CashPayment
              total={total}
              busy={busy}
              onConfirm={(received, method) => checkout(null, received, method)}
            />
          ) : modal.type === 'directCharge' ? (
            <DirectCharge
              person={currentPerson}
              busy={busy}
              onConfirm={async (expression, id) => {
                if (
                  await commit(
                    (d) => sell(d, { expression, person: currentPerson.id, operationId: id }),
                    'Cargo agregado a ' + currentPerson.name
                  )
                )
                  setModal(null);
              }}
            />
          ) : modal.type === 'pay' ? (
            <PaymentForm
              person={currentPerson}
              data={data}
              busy={busy}
              onConfirm={async (amount, method) => {
                if (
                  await commit((d) => pay(d, currentPerson.id, amount, method), 'Abono registrado')
                )
                  setModal(null);
              }}
            />
          ) : modal.type === 'import' ? (
            <>
              <p>
                Vas a reemplazar{' '}
                <b>
                  {data.sales.length} ventas y {data.people.length} cuentas
                </b>{' '}
                por{' '}
                <b>
                  {modal.backup.sales.length} ventas y {modal.backup.people.length} cuentas
                </b>{' '}
                del respaldo.
              </p>
              <p>
                Se guardará una copia anterior en este dispositivo. Esa copia tampoco sustituye un
                respaldo descargado.
              </p>
              <button disabled={busy} className="outline full" onClick={() => exportBackup(data)}>
                Descargar primero mis datos actuales
              </button>
              <button
                disabled={busy}
                className="primary full"
                onClick={async () => {
                  if (
                    await commit(
                      () => modal.backup,
                      'Respaldo restaurado. Puedes recuperar la copia anterior desde Respaldo.',
                      { capture: true }
                    )
                  ) {
                    resetDraft();
                    setModal(null);
                  }
                }}
              >
                Confirmar reemplazo de mis datos
              </button>
            </>
          ) : modal.type === 'history' ? (
            <>
              <p>{currentPerson.phone}</p>
              <p>{currentPerson.notes}</p>
              <small>SALDO ACTUAL</small>
              <h2 className="big pink">{money(debt(currentPerson.id))}</h2>
              <div className="actions">
                <button
                  className="primary"
                  disabled={currentPerson.archived}
                  onClick={() => openModal({ type: 'directCharge', person: currentPerson })}
                >
                  ＋ Agregar cargo
                </button>
                <button
                  className="green"
                  disabled={!debt(currentPerson.id)}
                  onClick={() => openModal({ type: 'pay', person: currentPerson })}
                >
                  Abonar
                </button>
              </div>
              <HistoryList
                entries={history.filter((s) => s.person === currentPerson.id)}
                products={data.products}
              />
            </>
          ) : (
            <form onSubmit={submit}>
              {(modal.type === 'person' || modal.type === 'editPerson') && (
                <>
                  <label>
                    Nombre
                    <input
                      name="name"
                      required
                      maxLength={80}
                      defaultValue={modal.person?.name}
                      autoFocus
                    />
                  </label>
                  <label>
                    Teléfono (opcional)
                    <input
                      name="phone"
                      type="tel"
                      maxLength={30}
                      defaultValue={modal.person?.phone}
                    />
                  </label>
                  <label>
                    Notas (opcional)
                    <textarea name="notes" maxLength={500} defaultValue={modal.person?.notes} />
                  </label>
                  <p className="hint">
                    {modal.type === 'editPerson'
                      ? 'Se conservan el saldo y todos los movimientos.'
                      : 'La cuenta empieza en cero. Después puedes añadir cargos con su calculadora.'}
                  </p>
                </>
              )}
              {modal.type === 'product' && <ProductFields product={modal.product} />}
              {modal.type === 'restock' && (
                <>
                  <p>
                    {modal.product.name} ·{' '}
                    {data.products.find((p) => p.id === modal.product.id)?.stock} unidades actuales
                  </p>
                  <label>
                    Unidades nuevas que recibiste
                    <input
                      name="quantity"
                      type="number"
                      inputMode="numeric"
                      min="1"
                      step="1"
                      required
                    />
                  </label>
                  <label>
                    Nota (opcional)
                    <input name="note" maxLength={200} placeholder="Ej. Un paquete de 12 piezas" />
                  </label>
                  <p className="hint">
                    Estas unidades se suman a las actuales. El costo se conserva: si cambió,
                    actualízalo en Editar producto. Este movimiento no registra un gasto de compra.
                  </p>
                </>
              )}
              {modal.type === 'charge' && (
                <>
                  <h2 className="big pink">{money(total)}</h2>
                  <label>
                    Persona
                    <select
                      name="person"
                      required
                      defaultValue={activePeople.some((p) => p.id === target) ? target : ''}
                    >
                      <option value="" disabled>
                        Elige una cuenta
                      </option>
                      {activePeople.map((p) => (
                        <option value={p.id} key={p.id}>
                          {p.name} · {money(debt(p.id))}
                        </option>
                      ))}
                    </select>
                  </label>
                  {!activePeople.length && (
                    <p>Crea una persona en Deudores. Tu venta abierta se conservará.</p>
                  )}
                </>
              )}
              <div className="actions">
                <button type="button" disabled={busy} onClick={() => setModal(null)}>
                  Cancelar
                </button>
                <button
                  disabled={busy || (modal.type === 'charge' && !activePeople.length)}
                  className="primary"
                  type="submit"
                >
                  {busy ? 'Guardando…' : 'Guardar'}
                </button>
              </div>
            </form>
          )}
        </Modal>
      )}
    </div>
  );
}
createRoot(document.getElementById('root')).render(
  <ErrorBoundary>
    <App />
  </ErrorBoundary>
);
