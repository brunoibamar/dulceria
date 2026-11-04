# Cambios de inventario para revisión

- Al escribir el nombre se muestran hasta seis productos existentes, incluidos archivados, con un botón para abrir su ficha.
- Se impiden nombres duplicados al crear y editar, ignorando acentos, mayúsculas y espacios repetidos.
- Eliminar producto pide confirmación y lo retira del inventario activo y del catálogo de venta. Conserva ventas y movimientos; puede reactivarse desde Archivados.
- Verificación: 31 pruebas aprobadas y compilación de producción correcta.
- Revisión visual aprobada por el usuario. Incluye búsqueda de coincidencias, apertura de ficha y confirmación de eliminación.

## Segunda actualización

- Reponer registra piezas y pago juntos; actualización opcional del costo para ventas futuras. Conserva el modo de solo sumar piezas para compras ya registradas.
- Más opciones agrupa editar, eliminar y reactivar en las tarjetas de inventario.
- Lista automática de compras con mínimos sugeridos, acceso a Reponer y descarga de texto.
- 34 pruebas, compilación y revisión visual del flujo de compra y menú.

## Cierre mensual automático

- Carpeta recordada en el dispositivo; intento automático al abrir o mantener abierta la app tras cambiar de mes. Solicitud de atención solo si falla el cierre.
- Archivos mensuales verificados antes de retirar detalle; bases restaurables antes y después del cierre.
- Conserva inventario, cuentas fiadas, abonos, identidad de retiros, ganancias y referencia de caja. Totales diarios compactos conservan las cifras del Resumen.
- No se garantiza ejecución con la app cerrada ni permisos permanentes del navegador. La compatibilidad debe comprobarse en el teléfono.
- 45 pruebas aprobadas, incluida confirmación y restauración en IndexedDB; compilación y formato correctos.

## Consulta de reportes dentro de la aplicación

- Selector de mes en Respaldo para ver y descargar el informe mostrado.
- Lectura de cierres desde la carpeta guardada y comprobación de su detalle; meses abiertos desde los datos actuales, sin esperar a terminar el mes.
- Mensajes específicos para meses sin ventas, carpeta sin permiso y archivos faltantes o dañados.
- 49 pruebas aprobadas y compilación correcta.
