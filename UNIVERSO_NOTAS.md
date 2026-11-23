# Nueva pestaña Universo (ON / OFF)

## Acceso
Ruta `#/universo`. No reemplaza la pantalla anterior de Clientes ni modifica las metas de Activaciones.

## Origen y reglas
- UNIVERSO_ON y UNIVERSO_OFF: únicamente `STATUS = ACTIVO`; el vendedor actual es OPERADOR / Operador.
- ACTIVIDADES_ON y ACTIVIDADES_OFF: cualquier tipo de actividad, una cuenta se considera visitada una sola vez por mes cuando la registra su vendedor actual. La última visita se busca hasta el cierre del mes elegido, incluso si ocurrió en meses anteriores.
- VENTAS: solo `Concepto = VENTA`. Se muestra importe desde `PRECIO FINAL`. Botellas convencionales separadas de unidades RTD PRIMO. El RTD se identifica por texto `PRIMO` y `RTD` en el campo Producto; si el nombre real no usa ambos términos, modificar la función `isRtdPrimo` en `src/lib/universo.js`.
- SELL_OUT: conceptos `VENTA` y `BONIFICACIONES`, unidades desplazadas. No se muestra dinero de Sell Out porque esa hoja no contiene importe equiparable. Se separan botellas convencionales y RTD.
- Cruces por nombre de cuenta normalizado (mayúsculas, tildes, espacios y signos). No se usa coincidencia aproximada para evitar unir sucursales equivocadas.
- Los filtros propios (mes, canal, vendedor, marca) tienen prioridad de lectura; los filtros globales de plaza/ciudad/embajador/marca se aplican al padrón. El filtro global de rango de fechas no afecta el periodo ni el historial de esta pantalla.

## Limitaciones conocidas
- Si la misma cuenta está en ambos canales, la venta puede verse duplicada en la vista combinada: VENTAS y SELL_OUT no incluyen un identificador único compartido con el universo para resolver el canal de cada venta. Revisar importes por canal antes de utilizarlos como cierre contable.
- Las diferencias de nombres entre universo, ventas y actividades requieren una tabla de homologación.
- El archivo de muestra local no contiene ventas RTD, por lo que las métricas RTD pueden verse en cero hasta cargar el Google Sheet real.
- Las actividades OFF conservan el criterio preexistente de validar los dos embajadores OFF autorizados.

## Validación
Ejecutar `npm install`, `npm test` y `npm run build` antes de publicar. Comparar 3 cuentas reales ON/OFF con los registros de Sheets, especialmente su asignación de vendedor, SKU RTD y Sell Out.
