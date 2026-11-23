# Actualización de confiabilidad — noviembre de 2026

## Cambios incorporados

- Cumplimiento ejecutivo por semana/embajador, en lugar de acreditar visitas de semanas distintas.
- Filtrado de planes semanales por intersección de fecha (lunes a viernes).
- Tendencias mensuales ordenadas por año y mes en ventas, sell out y ejecutivo.
- Si falla Google Sheets, se muestran datos vacíos y un error visible; **nunca** se reemplazan por datos de muestra automáticamente.
- Botones para reintentar conexión o activar la demostración explícitamente. La demostración muestra una advertencia persistente.
- Hoja opcional `CLIENTES_DIRECTOS` con degradación controlada a lista vacía si no existe.
- Menú responsivo con apertura/cierre para móvil.
- Pruebas automatizadas de reglas esenciales mediante `npm test`.

## Operación

Instalar dependencias con `npm ci` (requiere acceso al registro de npm), configurar `VITE_SHEET_ID` en `.env`, ejecutar `npm run dev` para desarrollo o `npm run build` para publicación. Ejecutar `npm test` antes de desplegar.

Si no se configura `VITE_SHEET_ID`, la pantalla comienza sin cifras y permite habilitar la demostración explícitamente. El archivo `src/data/sheetData.json` no debe utilizarse como evidencia de operación actual.

## Alcance y pendientes

- Se conservaron las reglas actuales: ventas reales `VENTA`; sell out `VENTA` y `BONIFICACIONES`.
- Algunos filtros no son aplicables a todas las hojas porque carecen de esas columnas (por ejemplo, marca/canal en actividades). No se fuerza su aplicación por inferencia.
- El identificador único de clientes y la homologación entre fuentes requieren reglas de negocio y catálogo maestro; **no** se realizó una fusión heurística que pudiera alterar métricas.
- El sistema sigue sin backend ni autenticación; no colocar secretos en variables `VITE_` del cliente.
- `Activaciones` sigue como módulo provisional.
- Falta validación de la aplicación completa contra el Google Sheet productivo y pruebas de compilación/visualización donde estén disponibles las dependencias.

---

# Dashboard Comercial Spirits — Primo + Unión

Frontend del dashboard interno (Power BI/Tableau-style) para Mezcal Unión y
Primo Aperitivo. Este entregable cubre **estructura del proyecto + Dashboard
Ejecutivo completo**, con filtros globales conectados a datos reales de la
muestra proporcionada. El resto del menú (Ventas, Sell Out, Activaciones,
Clientes, Planeación, Embajadores) ya está enrutado como siguiente iteración.

## Stack

- React 18 + Vite
- TailwindCSS (tokens de diseño en `tailwind.config.js`)
- Recharts
- React Router

No hay backend todavía: los datos viven en `src/data/sheetData.json` (extraídos
del Excel que compartiste) y se normalizan en `src/lib/normalize.js`. Esto es
intencional — así puedes ver el Dashboard Ejecutivo funcionando ya, y el
"conector real" (`src/lib/googleSheets.js`) queda documentado para el
siguiente paso.

## Correr el proyecto

```bash
npm install
npm run dev
```

Abre `http://localhost:5173`.

## Sobre los datos de esta demo

El Excel que compartiste trae **la estructura real** de todas las hojas, pero
solo `SELL_OUT`, `ACTIVIDADES_ON`, `ACTIVIDADES_OFF`, `UNIVERSO_ON`,
`UNIVERSO_OFF` y `PLANEACION` tienen filas con datos reales cargados (59, 54,
64, 25, 6 y 10 respectivamente en la muestra). `VENTAS` solo trae 7 filas
reales — el resto de la hoja está vacía en el archivo que subiste. Por eso el
KPI "Venta mensual" se ve angosto: no es un bug, es que la muestra no tiene
más historial de ventas. En cuanto conectes el Sheet productivo (con el
histórico completo), esa gráfica y los KPIs de venta van a poblarse solos —
no hay que tocar código.

## Conectar el Google Sheet real

Ya está conectado por defecto. El flujo es:

1. En el Sheet real: **Compartir → "Cualquier persona con el enlace puede
   ver"** (o Archivo → Publicar en la web). Sin esto, Google bloquea la
   lectura y el dashboard cae automáticamente a la muestra local.
2. Copia el ID del Sheet desde la URL:
   `https://docs.google.com/spreadsheets/d/<ESTE_ES_EL_ID>/edit`
3. Copia `.env.example` a `.env` (mismo folder que `package.json`) y pega el
   ID **sin espacios**:
   ```
   VITE_SHEET_ID=1UGP5N6HCtmNPwDlvWkhHyKK_OyYLk9m0V77guTr651E
   ```
4. Reinicia `npm run dev` (Vite solo lee `.env` al arrancar).

**Nota sobre `CLIENTES_DIRECTOS`**: esta hoja no viene en el Excel de muestra, así que la página de Clientes solo trae datos de venta directa cuando está conectada al Sheet real. Se lee por posición de columna (C, D, E), no por nombre de encabezado, porque no conocíamos el texto exacto de esas columnas — si el orden de columnas cambia en el Sheet real, hay que ajustar `normalizeClientesDirectos` en `src/lib/normalize.js`.

`src/lib/dataset.js` intenta leer el Sheet real primero
(`fetchAllSheets()` en `googleSheets.js`, sin API key, vía
`gviz/tq?tqx=out:csv`). Si algo falla — Sheet no compartido, nombre de hoja
distinto, sin conexión — cae automáticamente a `sheetData.json` para que el
dashboard nunca se quede en blanco. Vas a ver el estado real justo arriba de
los filtros:

- 🟢 **"Conectado al Google Sheet en vivo"** → todo bien, los KPIs son datos
  reales y en vivo.
- 🔴 **"Usando datos de muestra"** → algo falló; pasa el mouse sobre el
  mensaje (o revisa la consola del navegador) para ver el detalle del error.
  Las causas más comunes son: el Sheet no está compartido públicamente, el ID
  tiene un espacio o carácter de más, o el nombre de alguna hoja (`VENTAS`,
  `SELL_OUT`, etc.) no coincide exactamente con el del Sheet real.

Esto es exactamente lo que pediste evitar: **no hay base de datos**, la fuente
de verdad sigue siendo el Google Sheet.

## Arquitectura de datos

```
sheetData.json (o Google Sheets en vivo)
        │
        ▼
normalize.js   → mapea cada hoja a una forma común
                 (fecha, plaza, ciudad, brand, embajador, monto, cantidad…)
        │
        ▼
kpis.js        → filtros globales + cálculo de KPIs + series para gráficas
        │
        ▼
FilterContext  → estado de filtros compartido por toda la app
        │
        ▼
Páginas (DashboardEjecutivo, …) → consumen `useFilters()` y las funciones
                                    de kpis.js, nunca tocan los datos crudos
```

Esta capa es la razón por la que agregar un dashboard nuevo (p. ej. Ventas)
es rápido: se reutilizan `dataset`, `applyFilters` y los helpers de
agregación; solo cambian las gráficas y KPIs específicos de esa vista.

## Filtros globales

Implementados y funcionando en `FilterBar`: Fecha (rango), Plaza, Ciudad,
Brand, Producto, Canal, Embajador. Afectan todas las tarjetas y gráficas del
Dashboard Ejecutivo automáticamente vía `FilterContext`.

## Diseño

- **Paleta**: fondo papel cálido (`#F6F4EF`), sidebar carbón (`#14171A`),
  y un código de color consistente por marca en todo el dashboard — cobre
  (`#B9862F`) para Unión, coral (`#E1543A`) para Primo. Esa dualidad de color
  es el hilo visual que se repite en KPIs, gráficas y la barra de marca del
  sidebar.
- **Tipografía**: Fraunces para títulos de sección (con carácter, no
  genérica), Inter para UI, IBM Plex Mono para las cifras de los KPIs — le da
  un aire de "panel de instrumentos" a los números.
- Sidebar fija, cards con borde de 1px, modo claro, responsive con grid que
  colapsa de 6 → 2 columnas en mobile.

## KPIs avanzados ya implementados

- **Cumplimiento de Planeación**: cruza `PLANEACION` (cuentas planeadas por
  embajador y día) contra `ACTIVIDADES_ON` (cliente + embajador con actividad
  registrada) para calcular % real de ejecución — no es un placeholder.
- **Participación de marca**: % de venta Unión vs Primo, ya filtrable.

## Siguientes pasos sugeridos

1. Conectar el Sheet real (arriba) y confirmar que los nombres de columna no
   cambiaron — si cambian, solo se ajusta `normalize.js`.
2. Construir Ventas, Sell Out, Activaciones, Clientes, Planeación y
   Embajadores reutilizando `applyFilters` + nuevas funciones en `kpis.js`.
3. Exportación a Excel/PDF (se puede agregar con `xlsx` + `jspdf` en el
   frontend, sin backend).
4. Si más adelante se necesita cachear o proteger el Sheet, mover
   `googleSheets.js` a un endpoint Express — la lógica de parseo ya está
   aislada para eso.

## Pestaña Activaciones — Primo (noviembre 2026)

Ruta: `/#/activaciones`. Lee las hojas `ACTIVIDADES_ON` y `ACTIVIDADES_OFF` del mismo Google Sheet configurado con `VITE_SHEET_ID`; no hace falta crear hojas adicionales.

- Selector de canal ON / OFF y mes (meses disponibles en los registros); KPIs de metas, actividades realizadas, porcentaje, pendientes y actividades adicionales sin meta.
- Metas **por persona y mes**: ON 80 visitas de mantenimiento, 2 capacitaciones, 1 activación, 1 prospección/catalogación y 1 catalogación de cóctel (85 en total); OFF 20 visitas, 1 capacitación, 4 activaciones, 1 mejora de anaquel y 1 exhibición adicional (27 en total).
- Clasificación de Primo: `SKU PRIMO APERITIVO` debe tener un valor no vacío/distinto de NA, N/A, NO, etc. Se mantiene el mismo criterio en ambos canales y en todas las categorías. El `tipoActividad` viene de la columna `¿QUÉ ACTIVIDAD VAS A REALIZAR?` (L en ON, I en OFF). Las variantes de mayúsculas, acentos y espacios se normalizan para comparar.
- Las actividades cuyo tipo no tiene meta aparecen como **adicionales**, sin aumentar el numerador de cumplimiento. Un porcentaje puede superar 100%; los faltantes se suman por categoría, de modo que los excedentes de una categoría no compensan otra.
- En OFF se utiliza `FECHA` para el mes de la actividad; solo si no es válida se usa `Marca temporal`, que indica cuándo se ingresó el formulario. ON utiliza `FECHA`.
- **Limitación importante:** solo se conoce a los embajadores con actividad Primo en el mes consultado. Una persona sin actividad no puede añadirse a la meta del equipo sin un padrón de personas activas por canal/mes. Para conseguir una comparación total correcta, habrá que añadir un padrón de activos o asignaciones mensuales. Además, el filtro global de fechas puede reducir las actividades mostradas sin prorratear la meta mensual (se advierte en pantalla). Los filtros globales de marca, producto, canal y concepto no cambian esta vista porque se define exclusivamente como Primo y tiene selector ON/OFF propio.
- `ACTIVIDADES_OFF` conserva la restricción existente en `applyFilters` de embajadores autorizados (`ROCIO SANCHEZ` y `ALFREDO GONZALEZ`). Si el personal OFF cambia, hay que actualizar esa regla para que sus registros aparezcan.
- Pruebas: `npm test`. Compilación: `npm run build` tras `npm install`.
