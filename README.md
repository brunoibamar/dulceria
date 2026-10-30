# Dulcería 🍬

Aplicación personal para una tienda pequeña. React + Vite + JavaScript y CSS. Calculadora protagonista, catálogo opcional, cuentas de deudores, abonos, existencias, costos, resumen y respaldos. Sin servidor de datos, cuentas de acceso ni servicios en la nube. Empieza vacía: no contiene datos de las capturas de referencia.

## Abrir en tu computadora

1. Instala Node.js 22.12 o posterior (versión LTS).
2. Extrae el ZIP. Abre una terminal dentro de la carpeta `dulceria`.
3. Ejecuta `npm install` y luego `npm run dev`.
4. Abre la dirección que muestra Vite (normalmente http://localhost:5173).

No abras index.html con doble clic: necesita el servidor de desarrollo o el contenido compilado servido por HTTP.

Para verificar: `npm test` y `npm run build`. Para probar la versión compilada: `npm run preview`. El resultado se genera en `dist/`. El ZIP de entrega incluye la compilación preparada; en GitHub, dist se genera al compilar. No necesitas subir node_modules a GitHub. El archivo pnpm-lock.yaml fija las versiones utilizadas en el despliegue; si cambias dependencias, actualiza ese archivo con pnpm 11.25.0.

## Publicar en GitHub Pages

1. Crea un repositorio en tu cuenta (por ejemplo `dulceria`).
2. Sube **el contenido de esta carpeta**, incluyendo `src`, `public`, `package.json`, `pnpm-lock.yaml`, `vite.config.js` y la carpeta oculta `.github`. No subas node_modules, respaldos JSON ni registros personales. Si usas la web de GitHub, comprueba que el workflow `.github/workflows/pages.yml` también se haya subido.
3. Usa `main` como rama principal, o cambia el nombre de la rama en el workflow.
4. En Settings → Pages → Build and deployment, selecciona **GitHub Actions**.
5. En Actions, abre «Publicar Dulcería» y espera a que termine. Puedes ejecutarlo manualmente con Run workflow.
6. Abre la URL que devuelve el despliegue, normalmente `https://TU-USUARIO.github.io/dulceria/`.

La configuración usa rutas relativas para admitir repositorios y dominios raíz sin editar el nombre del repositorio. La navegación interna no cambia la ruta, por lo que recargar una sección no produce un error 404. Repositorio del proyecto: https://github.com/brunoibamar/dulceria (privado). Ramas iniciales: main y movil-refactor. GitHub Pages no está activado; su disponibilidad para un repositorio privado depende del plan de la cuenta.

El workflow instala, prueba, compila y publica únicamente `dist`. También puedes alojar esa carpeta en cualquier servidor estático. Referencias: [Vite / GitHub Pages](https://vite.dev/guide/static-deploy#github-pages) y [workflows de Pages](https://docs.github.com/en/pages/getting-started-with-github-pages/using-custom-workflows-with-github-pages).

## Instalar en Android y trabajar sin conexión

1. Abre tu URL **HTTPS** con Chrome en Android y deja completar la primera carga con internet.
2. En Respaldo puedes usar el botón de instalación cuando Chrome lo ofrezca; también está disponible en el menú de Chrome → Instalar aplicación / Agregar a pantalla principal.
3. Abre una vez desde el icono, cierra y vuelve a abrir en modo avión para verificar tu dispositivo.
4. Cuando aparezca un aviso de nueva versión, termina tu venta y pulsa Actualizar aplicación.

El service worker guarda los archivos de la aplicación; IndexedDB guarda los registros. No usa fuentes externas, analítica ni peticiones a un backend. HTTP en una IP de tu red sirve para probar la interfaz, pero la instalación y service workers necesitan HTTPS, salvo localhost. Consulta [contextos seguros de MDN](https://developer.mozilla.org/en-US/docs/Web/Security/Defenses/Secure_Contexts) y [caché PWA](https://developer.mozilla.org/en-US/docs/Web/Progressive_web_apps/Guides/Caching).

## Uso

- **Nueva venta:** escribe `5+5+2+2` o pulsa el teclado. Acepta punto decimal, importes positivos con hasta dos decimales y únicamente sumas. Un `+` final permite seguir capturando. Cobrar pide confirmar que recibiste el dinero; Agregar a deudor elige la cuenta y registra una venta fiada.
- **Catálogo opcional:** crea primero productos en Inventario. Toca un producto varias veces para agregar unidades. Quitar elimina esa línea completa. Al guardar la venta se revisan existencias y se descuentan en la misma transacción que la venta.
- **Deudores:** registra nombre, teléfono y notas. La cuenta empieza en cero. Para cargar un saldo previo usa la calculadora y agrega el total a esa persona. El abono no puede superar el saldo ni ser cero. Toca el nombre para consultar movimientos.
- **Inventario:** precio y costo por unidad; existencias enteras. Editar existencias registra un ajuste. Margen = (precio − costo) / precio; si el precio es cero se muestra «—». Puede ser negativo cuando el costo supera al precio.
- **Resumen:** ventas incluye contado y fiado. Dinero cobrado = contado + abonos; un abono no se cuenta dos veces como venta. Ganancia bruta conocida incluye solo catálogo y utiliza el costo de cada venta, aunque el costo actual cambie. No equivale a utilidad neta: no incluye gastos, compras ni el costo desconocido de sumas libres. «Hoy» usa el día local del dispositivo.
- **Respaldo:** descarga un JSON a diario y comprueba que existe en Descargas. Para restaurar, elige el archivo, revisa la cantidad de registros y confirma el reemplazo. No combina archivos. El archivo debe ser de esta aplicación y versión de esquema 1; máximo 20 MB.

## Límites y cuidado de tus datos

Cada navegador, perfil y dispositivo mantiene datos separados. El código y la interfaz de GitHub Pages pueden ser públicos; tus registros permanecen en tu navegador, no se publican en GitHub. No hay contraseña ficticia ni protección contra quien tenga acceso a tu teléfono desbloqueado.

IndexedDB no es una garantía contra pérdida: borrar datos del sitio, usar incógnito, perder el teléfono o una limpieza por falta de espacio puede borrar los registros. Solicitar almacenamiento persistente ayuda si el navegador lo permite, pero no sustituye respaldos. Cambiar de dominio u origen requiere exportar e importar. Varias aplicaciones del mismo dominio GitHub Pages comparten origen: esta app usa su propia base con nombre `dulceria-local-v1`; dos copias de Dulcería bajo el mismo origen compartirán esa base. Usa un dominio u origen distinto para negocios separados.

Los respaldos contienen nombres, teléfonos y cuentas en texto legible, sin cifrado. Guárdalos en un lugar protegido. No los subas al repositorio. Se valida la estructura antes de restaurar y los cambios de registros son atómicos. En varias pestañas se evitan escrituras perdidas al leer y modificar dentro de una transacción; vuelve a enfocar una pestaña para refrescar su vista.

MVP sin devoluciones, cancelaciones, gastos, borrado de operaciones, impresión de tickets ni sincronización. Un cobro confirmado no tiene deshacer: revisa el importe antes de confirmar. Para corregir datos históricos hay que restaurar una copia anterior; no se recomienda editar el JSON manualmente. Las sumas libres no descuentan inventario. No hay integración con tarjetas ni terminales: Cobrar es un registro manual.

## Archivos

- `src/main.jsx`: pantallas y acciones.
- `src/domain.js`: importes en centavos, ventas, abonos y validación.
- `src/db.js`: persistencia IndexedDB mediante transacciones.
- `src/style.css`: diseño oscuro adaptable inspirado en las siete capturas.
- `public/icons`: iconos Android normales y maskable.
- `vite.config.js`: build, manifiesto PWA y caché offline.
- `tests/domain.test.js`: comprobaciones de reglas financieras.
- `.github/workflows/pages.yml`: publicación automática.

Para una actualización, exporta tus datos primero y conserva el nombre de la base y el esquema. Los archivos de caché se actualizan sin borrar IndexedDB.

