# Verificación de entrega

- Compilación de producción: correcta con Vite 7.3.7 y React 19.3.1; dependencias fijadas en pnpm-lock.yaml.
- PWA: manifiesto, iconos y service worker generados; 12 entradas de precaché, aproximadamente 275 KiB.
- Cuatro pruebas automáticas correctas: sumas y decimales sin eval; fiado y abonos hasta saldo cero; existencias y conservación del costo histórico; validación de respaldos y referencias.
- El paquete incluye fuente, workflow de GitHub Pages, iconos, instrucciones y dist compilado. No incluye node_modules ni datos personales.
- Revisión visual de las siete imágenes: fondo oscuro, tarjetas redondeadas, acentos rosas/morados y cobros/abonos verdes incorporados al diseño responsive.
- Vista previa local comprobada en el navegador integrado: interfaz visible y suma 5+5+2+2 = $14. No se ha verificado en un teléfono Android real ni desplegado a GitHub Pages.

## Comprobación recomendada al instalar

1. Crea una persona y un producto de prueba con costo $2, precio $5 y tres existencias.
2. Suma 5+5+2+2: debe mostrar $14. Confirma un cobro y recarga: debe persistir.
3. Vende dos unidades desde Catálogo a esa persona: saldo $10, una existencia restante. Abona $4: saldo $6. Un abono mayor a $6 debe rechazarse.
4. Cambia el costo del producto a $3: la ganancia bruta de esa venta debe seguir siendo $6.
5. Exporta JSON, ábrelo para comprobar que contiene registros y restáuralo en otro navegador vacío.
6. Instala desde HTTPS, abre desde el icono con internet y después en modo avión. Registra otra operación, cierra y vuelve a abrir.
7. Antes de usar datos reales, conserva o restaura una copia vacía para evitar mezclar pruebas y operaciones del negocio. No hay borrado de operaciones en este MVP.

