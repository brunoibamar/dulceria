# Dulcería 🍬 · v1.3

## Consumo personal, medios de pago y caja física

En **Ganancias → Registrar consumo personal de mercancía**, elige producto y piezas. Se descuentan del inventario y se registra el costo de compra conservado en ese momento, no el precio de venta. Ese costo reduce el disponible para retirar; si no alcanza, queda un importe por recuperar con ganancias posteriores. No se registra como venta, no sale efectivo de la caja y no se envía como ingreso a Economía. Se requiere un costo de compra confirmado mayor a cero y stock suficiente. No registres el mismo consumo también como gasto o salida de caja.

Ventas de contado y abonos permiten elegir **Efectivo** o **Transferencia**. El efectivo usa el cálculo de cambio; la transferencia requiere que tú confirmes su recepción y no genera cambio ni efectivo en caja. Los gastos y compras también indican si se pagaron con efectivo o desde la cuenta. Un retiro para ti en efectivo se descuenta de caja; uno destinado a tarjeta afecta el neto de transferencias registrado. Recibir una transferencia no convierte toda esa venta en ganancia personal: su costo sigue reservado para el negocio.

En **Caja**, el primer conteo guarda el efectivo real como base inicial. Después se calcula: último efectivo contado + ventas y abonos en efectivo − gastos/compras/retiros en efectivo + entradas manuales − salidas manuales. No se usa el efectivo recibido antes del cambio: se registra solo el importe neto de la venta.

Puedes escribir el total o contar billetes y monedas (MXN, desde $0.50 hasta $1,000). Se conserva cuánto se esperaba, cuánto contaste y el faltante o sobrante. **Un conteo no modifica ventas, ganancias ni genera gastos automáticamente.** El efectivo que contaste pasa a ser la base del siguiente conteo, manteniendo la diferencia anterior visible en el historial.

Los cobros antiguos sin método no se adivinan como efectivo. Si hay movimientos sin clasificar desde la base, la comparación se marca incompleta y no se presenta una diferencia como comprobada. El primer conteo permite empezar con tus cantidades actuales sin rehacer todo el historial. Los cobros anteriores que incluyen efectivo recibido y cambio sí se reconocen como efectivo.

Las entradas y salidas manuales de Caja son para fondo de cambio, depósitos u otros movimientos que no sean ventas ni gastos. No repitas allí los movimientos ya registrados en Ganancias. El neto de transferencias mostrado no es un saldo bancario real: no tiene saldo inicial ni los demás movimientos de tu banco.

Respaldo JSON incluye `finance.consumptions` y el campo opcional `cashbox` con sus conteos y movimientos. Se mantiene el esquema 1 y compatibilidad con copias anteriores. La futura conexión con Economía sigue exportando únicamente retiros personales, no ventas, consumos, conteos o diferencias.

## Ganancias, reinversión y retiros para Economía

El apartado **Ganancias** separa la ganancia bruta histórica, la ganancia disponible para retirar y lo reservado para el negocio. **Retirar para mi Economía** registra cuánto separaste para uso personal y su destino (efectivo o tarjeta). Puedes retirar todo o una parte. Retirar todo deja el disponible en cero; no borra ventas ni reinversión, y nuevas ventas/cobros vuelven a generar disponible.

**Economía todavía no está creada ni conectada.** Cada retiro queda localmente pendiente de vincular con ID único, fecha, importe, destino y nota. No se realiza una transferencia bancaria, no se envían datos a otra app y no se marca una entrega como completada. Solo registra dinero que realmente apartaste. El respaldo JSON incluye estos retiros y los gastos/reinversiones.

El disponible se calcula sobre todo el historial registrado:

- Contado: se reconoce la ganancia con costo confirmado al cobrar.
- Fiado: los abonos se aplican a las ventas más antiguas del cliente. Se libera ganancia proporcional al importe cobrado, redondeada hacia abajo al centavo. No se libera toda la ganancia al recibir un abono pequeño.
- Sin costo o con costo estimado: el importe cobrado se reserva dentro del negocio; no habilita ganancia retirable.
- Los gastos operativos registrados y pérdidas confirmadas reducen el disponible. Los retiros anteriores se descuentan, conservando la ganancia histórica.
- **Registrar uso de reinversión** descuenta compras para resurtir de la reserva. Si la compra supera esa reserva, la diferencia reduce el disponible. No registres la misma compra también como gasto. El stock y el costo por pieza se actualizan aparte, desde Inventario.

Ejemplo: cobras $900 por mercancía que costó $600 → $300 disponibles y $600 reservados. Retiras $300 → $0 disponibles, $600 reservados y un retiro de $300 conservado en el historial. La cifra histórica de ganancia permanece en $300.

Son saldos calculados, no un arqueo real de caja ni una utilidad fiscal. No se conoce el dinero que ya gastaste antes de registrar movimientos: revisa costos, gastos y compras antes del primer retiro. No se inventa un saldo inicial ni se recalculan costos desconocidos de ventas antiguas al editar un producto actual. Un costo histórico incorrecto seguirá afectando el cálculo.

La conexión futura tiene su contrato en `src/finance.js`: `economyFeed(data)` devuelve `schema: dulceria-economia`, versión 1, moneda MXN y entradas con ID estable `dulceria:<id-del-retiro>`. Economía deberá deduplicar por ese ID; solo se exportan retiros personales, no la reserva de reinversión. El identificador sobrevive en los respaldos. Este contrato no es un servicio HTTP ni un envío automático.

El campo opcional `finance` (versión 1, `withdrawals` y `movements`) mantiene compatibilidad de lectura con datos antiguos. Una copia anterior a esta función no contiene retiros: restaurarla reemplazaría también ese historial, por lo que debes respaldar antes. Usa esta versión o una posterior para restaurar copias con movimientos de negocio.

Punto de venta personal para una dulcería pequeña. React + Vite + JavaScript + CSS, IndexedDB y Android PWA. Sin servidor de datos, cuentas de acceso, analítica, fuentes externas ni sincronización en la nube.

**Abrir aplicación:** https://brunoibamar.github.io/dulceria/

**Código:** https://github.com/brunoibamar/dulceria

Ramas: `main` (publicación) y `movil-refactor` (trabajo). El sitio y el código son públicos; tus registros se guardan en el navegador, no en GitHub.

## Usar en Android

Abre el enlace HTTPS con Chrome. Espera la carga completa, elige Instalar aplicación / Agregar a pantalla principal y ábrela una vez desde el icono con internet. Después comprueba el funcionamiento en modo avión. Cuando haya una actualización, termina o cierra los formularios abiertos y pulsa **Actualizar aplicación**. El borrador de la venta principal se conserva en este navegador. No borres los datos del sitio para actualizar.

## Ventas

- **Sumar precios:** escribe `5+5+2+2` o usa el teclado. Acepta punto o coma decimal y hasta dos decimales por importe; únicamente sumas. `C` borra la suma y ofrece recuperarla mientras no captures otra. No se descuenta inventario ni se inventa el costo de una venta libre.
- **Cobrar:** introduce el efectivo recibido o pulsa Exacto / uno de los importes rápidos. La app calcula el cambio y no permite confirmar si el dinero es insuficiente. Confirma solo cuando hayas recibido el efectivo. Es un registro manual, no una integración con tarjetas.
- **Catálogo:** busca un producto, agrega unidades y usa los botones − / ＋ para ajustar cantidades. Se impide añadir más unidades de las disponibles; al registrar se revisa otra vez el inventario. El nombre, precio, costo y clasificación de costo quedan conservados en la venta.
- **Agregar a deudor:** registra la venta en la cuenta seleccionada. También puedes abrir la calculadora individual desde la tarjeta del cliente sin alterar la venta principal abierta.
- El borrador principal (suma, catálogo y cantidades) se guarda en localStorage; los registros confirmados se guardan en IndexedDB. Los formularios abiertos y las sumas de la calculadora individual no se recuperan si los cierras o recargas.
- Un identificador por borrador y el bloqueo mientras se guarda evitan repetir el mismo cobro por doble toque o por dos pestañas con el mismo borrador.

## Deudores

Crea la persona con nombre, teléfono y notas. Su cuenta empieza en cero. **Agregar cargo** abre una calculadora para esa persona; **Abonar** muestra el saldo que quedará y permite liquidarlo completo. Los abonos no pueden superar la deuda.

Toca el nombre para ver su historial o mantenlo presionado **dos segundos** para abrir opciones. El botón **⋮** hace lo mismo y permite usar teclado. Mover el dedo o desplazar la pantalla cancela la pulsación prolongada.

Puedes editar nombre, teléfono y notas sin cambiar el saldo ni los movimientos. **Archivar cliente** lo oculta de las cuentas activas y de nuevos cargos; conserva el historial y la deuda. Desde el filtro Archivados puedes abonar, editar y reactivar. El saldo total por cobrar incluye cuentas archivadas.

Las búsquedas de nombres y productos ignoran mayúsculas y acentos.

## Productos e inventario

Al crear o editar un producto puedes elegir:

1. **Conozco el costo por pieza.** Registra costo unitario y precio de venta.
2. **Compré un paquete.** Captura costo del paquete y piezas. Costo unitario = importe / piezas, redondeado al centavo. Precio sugerido = costo / (1 − margen / 100), redondeado hacia arriba al centavo. Puedes usarlo o redondearlo al peso siguiente. Siempre eliges el precio final.
3. **Solo conozco mi precio de venta.** Deja el costo desconocido o activa una estimación con margen supuesto. Esa estimación no demuestra cuánto pagaste realmente.

Ejemplo: $120 por 12 piezas → $10 por pieza. Con margen de 30 % sobre venta, sugerido $14.29 o $15 al redondear al peso. A $15, el margen efectivo es 33.3 % antes de gastos. Los cálculos de sugerencias evitan errores de redondeo de punto flotante.

Las existencias al editar son el **total**. El botón de piezas del paquete copia esa cantidad como total; no agrega un lote. **Reponer** suma unidades a las existentes sin sobrescribirlas y guarda una nota. Conserva el costo actual: si cambió la compra, actualízalo en Editar producto. No registra un gasto ni calcula costo promedio por lotes.

Define cuándo avisar por pocas piezas (por defecto 3). Hay filtros de agotados, por reponer y archivados, y orden por nombre o existencias. Archivar un producto lo quita del catálogo pero conserva stock e historial; puede reactivarse. El valor total del inventario con costo confirmado incluye también esas existencias archivadas.

Si una venta cambia el stock mientras estás editando solo el precio o nombre, se conserva el stock más reciente. Si intentas un ajuste absoluto basado en una cantidad que cambió mientras editabas, se pide volver a revisar. Los cambios de precios y costos no alteran ventas anteriores.

## Resumen e historial

Elige Hoy, últimos 7 días (incluye hoy), mes actual o todo el historial. Se usa el día local del dispositivo.

- **Ventas:** contado + fiado del periodo.
- **Cobrado:** contado del periodo + abonos recibidos en el periodo. No vuelve a contar un abono como venta.
- **Por cobrar e inventario:** son saldos actuales, independientes del periodo elegido.
- **Ganancia bruta confirmada:** solo unidades vendidas con costo confirmado. La ganancia estimada aparece separada y los importes vendidos sin costo no se consideran ganancia. Incluye fiados; no resta gastos, compras ni impuestos y no equivale a utilidad neta.
- Gráfica semanal con alternativa en cifras; promedio por venta, cuentas con mayor saldo, búsquedas e historial con carga progresiva. Toca una operación para ver su detalle, suma capturada o piezas y, cuando corresponda, efectivo y cambio.

## Respaldo y recuperación

Genera un JSON al cerrar la jornada, comprueba que está en Descargas y guárdalo fuera del navegador. La app recuerda cuándo generó el último archivo y muestra un aviso si no has generado uno o pasó un día; **no puede garantizar que conservaste el archivo descargado**.

Para restaurar, elige un JSON de Dulcería (máximo 20 MB), revisa sus cantidades y confirma el reemplazo. No mezcla registros. Se valida antes de escribir. La restauración guarda atómicamente una copia del estado anterior dentro de IndexedDB; en Respaldo aparecerá **Revisar copia anterior a la última restauración**. Puedes recuperarla confirmando ese reemplazo; se conserva entonces la versión que acabas de reemplazar. Solo hay una copia anterior, no un historial ilimitado. Si se borran los datos del navegador, esa copia local también se pierde.

Los respaldos contienen nombres, teléfonos y cuentas sin cifrar. No los subas al repositorio. El esquema sigue siendo 1 con nuevos campos opcionales; se aceptan respaldos antiguos. Los costos anteriores sin clasificación siguen considerándose confirmados, incluido un cero histórico. Para restaurar copias nuevas usa esta versión o una posterior.

## Límites del almacenamiento local

Cada dispositivo, navegador y perfil mantiene registros separados. Modo incógnito, limpieza del navegador, falta de espacio, pérdida del equipo o cambios de dominio pueden causar pérdida o inaccesibilidad. La solicitud de almacenamiento persistente depende del navegador y no sustituye respaldos.

Las carpetas de GitHub Pages bajo un mismo dominio comparten origen. Dos copias de Dulcería bajo el mismo origen usan `dulceria-local-v1` y compartirán datos; para negocios separados usa orígenes distintos. Otras pestañas se actualizan al guardar y al recuperar el foco; las transacciones evitan escrituras perdidas. El borrador principal es compartido por origen en localStorage: evita atender ventas distintas simultáneamente en varias pestañas.

Sin usuarios remotos ni contraseña ficticia. Quien tenga acceso al teléfono desbloqueado puede abrir sus registros. El sitio público no sube tu información a GitHub. No hay devoluciones, cancelaciones, gastos, impresión ni borrado de operaciones: revisa antes de confirmar. Para una corrección histórica conserva una copia y restaura una anterior si corresponde.

## Desarrollo y GitHub Pages

Requiere Node.js 22.12 o posterior, LTS. Extrae el ZIP o clona el repositorio y ejecuta:

```sh
npm install
npm run dev
```

Abre la URL que muestra Vite; no abras `index.html` con doble clic. Para comprobar:

```sh
npm test
npm run build
npm run preview
```

El ZIP incluye fuente y `dist` compilado; GitHub genera `dist` durante el despliegue. No subas node_modules ni respaldos. Para reproducir exactamente las dependencias del servidor usa pnpm 11.25.0 y `pnpm install --frozen-lockfile` (la versión está fijada en el workflow). `npm run format` ordena el código y `npm run format:check` comprueba el formato.

En Settings → Pages selecciona GitHub Actions. `.github/workflows/pages.yml` instala, prueba, compila y publica `dist` al actualizar `main`; también admite ejecución manual. Las rutas relativas permiten publicar bajo `/dulceria/` o en raíz. Las secciones no cambian la ruta: no necesitan reglas especiales de redirección.

Referencias: [Vite y Pages](https://vite.dev/guide/static-deploy#github-pages), [workflows de Pages](https://docs.github.com/en/pages/getting-started-with-github-pages/using-custom-workflows-with-github-pages), [contextos seguros](https://developer.mozilla.org/en-US/docs/Web/Security/Defenses/Secure_Contexts). La instalación y el service worker requieren HTTPS, salvo localhost. HTTP en una IP de red sirve para probar la interfaz.

El código está separado en componentes de calculadora, cobros, diálogos, historial, productos, resumen y respaldos; `domain.js` concentra las reglas de dinero e inventario, `db.js` las transacciones y `analytics.js` los periodos y búsquedas. `tests/` cubre reglas y persistencia con un simulador IndexedDB.
