# Verificación · Dulcería 1.1

- 17 pruebas automáticas: sumas y centavos; fiado y abonos; paquetes y sugerencias; clasificación de costos; edición/archivo; efectivo y cambio; deduplicación de venta; reposición; edición concurrente de stock y precios; búsquedas y periodos locales; transacciones IndexedDB; escrituras concurrentes y recuperación tras restauración.
- Compilación de producción y generación del manifiesto, iconos y service worker.
- Prueba interactiva en origen local independiente, sin tocar registros reales: venta libre $14 con $20 recibidos y $6 de cambio; cargo individual $12 y abono $4 con saldo $8; producto de $5/costo $2, dos piezas iniciales más doce repuestas; venta de dos unidades.
- Resumen comprobado: $36 vendidos, $28 cobrados, $8 pendientes, $24 de inventario a costo y $6 de ganancia confirmada; $26 vendidos sin costo.
- Borrador recuperado tras recargar. Descarga JSON comprobada: esquema 1, un producto, una cuenta, tres ventas y un abono. La copia contiene solo datos ficticios de la prueba.
- Diseño revisado a 390 × 844 y en escritorio. Diálogos con foco y fondo inactivo, Escape y navegación por teclado; transiciones respetan movimiento reducido.
- Se conserva la base existente. No se borraron ni importaron registros de producción.

Limitación: la revisión móvil usa tamaño de pantalla simulado, no un Android físico. La instalación real y modo avión deben comprobarse en el teléfono. Las pruebas de persistencia automatizadas usan fake-indexeddb y no sustituyen todos los comportamientos de cuota/permisos de cada navegador.
