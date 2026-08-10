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
