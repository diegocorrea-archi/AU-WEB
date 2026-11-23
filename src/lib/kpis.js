// --- Opciones disponibles para los filtros globales ---------------------
// Todas las funciones de este módulo reciben el `dataset` normalizado como
// parámetro (en vez de importarlo fijo) para poder alimentarlo desde el
// Google Sheet real o desde la muestra local, sin duplicar lógica.
import { mondayOf } from './normalize.js'

function uniqueSorted(values) {
  return [...new Set(values.filter(Boolean))].sort((a, b) => a.localeCompare(b))
}

export function getFilterOptions(dataset) {
  const all = [...dataset.ventas, ...dataset.sellOut]
  return {
    plazas: uniqueSorted(all.map((r) => r.plaza)),
    ciudades: uniqueSorted(all.map((r) => r.ciudad)),
    brands: uniqueSorted(dataset.ventas.map((r) => r.brand)),
    productos: uniqueSorted(dataset.ventas.map((r) => r.producto)),
    canales: uniqueSorted(dataset.ventas.map((r) => r.canal)),
    conceptos: uniqueSorted(dataset.ventas.map((r) => r.concepto)),
    embajadores: uniqueSorted([
      ...dataset.ventas.map((r) => r.embajador),
      ...dataset.sellOut.map((r) => r.embajador),
      ...dataset.actividadesOn.map((r) => r.embajador),
      ...dataset.actividadesOff.map((r) => r.embajador),
    ]),
  }
}

export const emptyFilters = {
  fechaInicio: '',
  fechaFin: '',
  plaza: '',
  ciudad: '',
  brand: '',
  producto: '',
  canal: '',
  concepto: '',
  embajador: '',
}

function inRange(fecha, ini, fin) {
  if (!fecha) return !ini && !fin // si no hay fecha, solo pasa cuando no se filtra por fecha
  if (ini && fecha < ini) return false
  if (fin && fecha > fin) return false
  return true
}

function matches(
  row,
  filters,
  { hasBrand = true, hasProducto = true, hasCanal = true, hasConcepto = true, hasPlaza = true, hasCiudad = true } = {}
) {
  if (hasPlaza && filters.plaza && row.plaza !== filters.plaza) return false
  if (hasCiudad && filters.ciudad && row.ciudad !== filters.ciudad) return false
  if (hasBrand && filters.brand && row.brand !== filters.brand) return false
  if (hasProducto && filters.producto && row.producto !== filters.producto) return false
  if (hasCanal && filters.canal && row.canal !== filters.canal) return false
  if (hasConcepto && filters.concepto && row.concepto !== filters.concepto) return false
  if (filters.embajador && row.embajador !== filters.embajador) return false
  if (filters.fechaInicio || filters.fechaFin) {
    if (!inRange(row.fecha, filters.fechaInicio, filters.fechaFin)) return false
  }
  return true
}

export const emptyDataset = {
  ventas: [],
  sellOut: [],
  actividadesOn: [],
  actividadesOff: [],
  universoOn: [],
  universoOff: [],
  planeacion: [],
  clientesDirectos: [],
}

function weekEnd(week) {
  const date = new Date(`${week}T00:00:00Z`)
  date.setUTCDate(date.getUTCDate() + 4)
  return date.toISOString().slice(0, 10)
}

export function applyFilters(dataset, filters) {
  const ventas = dataset.ventas.filter((r) => matches(r, filters))
  // "Venta real" (la que cuenta para $, botellas, ticket, etc.) es SOLO
  // Concepto = VENTA. Si el usuario elige explícitamente un Concepto en el
  // filtro global, respetamos su elección (puede querer ver SAMPLEO,
  // BONIFICACION, etc.); si no elige nada, el default es solo VENTA.
  const ventasReales = filters.concepto ? ventas : ventas.filter((r) => r.concepto === 'VENTA')

  const sellOutBase = dataset.sellOut.filter((r) => matches(r, filters, { hasCanal: false, hasConcepto: false }))
  const SELL_OUT_CONCEPTOS_VALIDOS = ['VENTA', 'BONIFICACIONES']
  const sellOut = sellOutBase.filter((r) => SELL_OUT_CONCEPTOS_VALIDOS.includes(r.concepto))

  // Regla de negocio: solo hay dos embajadores OFF-trade válidos. Cualquier
  // otro valor en esa columna es error de captura y se descarta.
  const EMBAJADORES_OFF_VALIDOS = ['ROCIO SANCHEZ', 'ALFREDO GONZALEZ']
  const actividadesOff = dataset.actividadesOff.filter(
    (r) =>
      EMBAJADORES_OFF_VALIDOS.includes(String(r.embajador || '').trim().toUpperCase()) &&
      // ACTIVIDADES_OFF no tiene columnas de Plaza/Ciudad — esos filtros
      // globales no le aplican (antes se forzaban a '' y eso las excluía
      // por completo en cuanto alguien filtraba por Plaza o Ciudad).
      matches(r, filters, {
        hasBrand: false,
        hasProducto: false,
        hasCanal: false,
        hasConcepto: false,
        hasPlaza: false,
        hasCiudad: false,
      })
  )

  return {
    ventas,
    ventasReales,
    sellOut,
    actividadesOn: dataset.actividadesOn.filter((r) =>
      matches(r, filters, { hasBrand: false, hasProducto: false, hasCanal: false, hasConcepto: false })
    ),
    actividadesOff,
    // Regla de negocio: en los 3 universos de cuentas solo cuentan las
    // que tienen STATUS = ACTIVO (columna B en las tres hojas).
    universoOn: dataset.universoOn.filter(
      (r) =>
        r.status === 'ACTIVO' &&
        (!filters.plaza || r.plaza === filters.plaza) &&
        (!filters.ciudad || r.ciudad === filters.ciudad) &&
        (!filters.brand || r.brand === filters.brand) &&
        (!filters.embajador || r.operador === filters.embajador)
    ),
    universoOff: dataset.universoOff.filter(
      (r) =>
        r.status === 'ACTIVO' &&
        (!filters.plaza || r.plaza === filters.plaza) &&
        (!filters.ciudad || r.ciudad === filters.ciudad) &&
        (!filters.brand || r.brand === filters.brand) &&
        (!filters.embajador || r.operador === filters.embajador)
    ),
    planeacion: dataset.planeacion.filter((r) =>
      (!filters.embajador || r.embajador === filters.embajador) &&
      // Un plan semanal aplica si al menos un día lunes-viernes coincide con el rango.
      (!filters.fechaInicio || (r.semana && weekEnd(r.semana) >= filters.fechaInicio)) &&
      (!filters.fechaFin || (r.semana && r.semana <= filters.fechaFin))
    ),
    clientesDirectos: dataset.clientesDirectos.filter(
      (r) =>
        r.status === 'ACTIVO' &&
        (!filters.plaza || r.plaza === filters.plaza) &&
        (!filters.embajador || r.embajador === filters.embajador)
    ),
  }
}

const sum = (arr, fn) => arr.reduce((acc, r) => acc + fn(r), 0)
const distinct = (arr, fn) => new Set(arr.map(fn).filter(Boolean)).size

export function money(n) {
  return new Intl.NumberFormat('es-MX', { style: 'currency', currency: 'MXN', maximumFractionDigits: 0 }).format(
    n || 0
  )
}
export function integer(n) {
  return new Intl.NumberFormat('es-MX', { maximumFractionDigits: 0 }).format(n || 0)
}
export function pct(n) {
  return `${((n || 0) * 100).toFixed(1)}%`
}

// --- KPIs para el Dashboard Ejecutivo ------------------------------------
export function computeExecutiveKpis(filtered) {
  const ventasReales = filtered.ventasReales

  const ventaTotal = sum(ventasReales, (r) => r.monto)
  const botellas = sum(ventasReales, (r) => r.cantidad)
  const pedidosUnicos = distinct(ventasReales, (r) => r.pedido ?? `${r.cliente}-${r.fecha}`)
  const ticketPromedio = pedidosUnicos ? ventaTotal / pedidosUnicos : 0
  const clientesActivos = distinct(ventasReales, (r) => r.cliente)

  const sellOutTotal = sum(filtered.sellOut, (r) => r.cantidad)

  const activacionesOn = filtered.actividadesOn.length
  const activacionesOff = filtered.actividadesOff.length
  const personasImpactadas =
    sum(filtered.actividadesOn, (r) => r.personasImpactadas) +
    sum(filtered.actividadesOff, (r) => r.personasImpactadas)

  // El cumplimiento se calcula por semana y embajador. Una visita de
  // otra semana no puede satisfacer una cuenta planeada de esta semana.
  const semanasPlaneadas = [...new Set(filtered.planeacion.map((p) => p.semana).filter(Boolean))]
  const resumenSemanal = semanasPlaneadas.map((semana) => computePlaneacionSemana(filtered, semana))
  const planeadas = sum(resumenSemanal, (r) => r.totalPlaneadas)
  const ejecutadas = sum(resumenSemanal, (r) => r.totalVisitadas)
  const cumplimientoPlaneacion = planeadas ? ejecutadas / planeadas : 0

  // Universo / nuevos / perdidos (a partir de UNIVERSO_ON + UNIVERSO_OFF)
  const universo = [...filtered.universoOn, ...filtered.universoOff]
  const universoActivo = universo.filter((c) => c.status.toUpperCase() === 'ACTIVO').length
  const universoInactivo = universo.filter((c) => c.status.toUpperCase() === 'INACTIVO').length

  return {
    ventaTotal,
    botellas,
    ticketPromedio,
    clientesActivos,
    sellOutTotal,
    activacionesOn,
    activacionesOff,
    personasImpactadas,
    cumplimientoPlaneacion,
    planeadas,
    ejecutadas,
    nuevosClientes: universoActivo, // aproximación: cuentas activas en el universo filtrado
    clientesPerdidos: universoInactivo, // aproximación: cuentas inactivas en el universo filtrado
  }
}

// --- Series para gráficas -------------------------------------------------
const MES_NOMBRE = [
  '', 'Ene', 'Feb', 'Mar', 'Abr', 'May', 'Jun', 'Jul', 'Ago', 'Sep', 'Oct', 'Nov', 'Dic',
]

function sortMonthly(series) {
  const monthIndex = Object.fromEntries(MES_NOMBRE.map((mes, i) => [mes, i]))
  return series.sort((a, b) => {
    const [ma, ya] = a.name.split(' ')
    const [mb, yb] = b.name.split(' ')
    return Number(ya) - Number(yb) || monthIndex[ma] - monthIndex[mb]
  })
}

function groupSum(arr, keyFn, valueFn) {
  const map = new Map()
  arr.forEach((r) => {
    const k = keyFn(r)
    if (!k) return
    map.set(k, (map.get(k) || 0) + valueFn(r))
  })
  return [...map.entries()].map(([name, value]) => ({ name, value }))
}

export function computeExecutiveCharts(filtered) {
  const ventasReales = filtered.ventasReales

  const ventaMensual = sortMonthly(groupSum(
    ventasReales,
    (r) => (r.anio && r.mes ? `${MES_NOMBRE[r.mes]} ${r.anio}` : null),
    (r) => r.monto
  ))

  const ventaPorPlaza = groupSum(ventasReales, (r) => r.plaza, (r) => r.monto).sort((a, b) => b.value - a.value)
  const ventaPorCiudad = groupSum(ventasReales, (r) => r.ciudad, (r) => r.monto).sort((a, b) => b.value - a.value)
  const ventaPorCanal = groupSum(ventasReales, (r) => r.canal, (r) => r.monto).sort((a, b) => b.value - a.value)
  const ventaPorMarca = groupSum(ventasReales, (r) => r.brand, (r) => r.monto)
  const ventaPorSku = groupSum(ventasReales, (r) => r.producto, (r) => r.monto)
    .sort((a, b) => b.value - a.value)
    .slice(0, 8)

  const totalMarca = ventaPorMarca.reduce((a, b) => a + b.value, 0)
  const participacionMarca = ventaPorMarca.map((m) => ({
    name: m.name,
    value: m.value,
    pct: totalMarca ? m.value / totalMarca : 0,
  }))

  const topEmbajadores = groupSum(ventasReales, (r) => r.embajador, (r) => r.monto)
    .sort((a, b) => b.value - a.value)
    .slice(0, 8)

  const sellOutPorPlaza = groupSum(filtered.sellOut, (r) => r.plaza, (r) => r.cantidad).sort(
    (a, b) => b.value - a.value
  )

  return {
    ventaMensual,
    ventaPorPlaza,
    ventaPorCiudad,
    ventaPorCanal,
    ventaPorMarca,
    ventaPorSku,
    participacionMarca,
    topEmbajadores,
    sellOutPorPlaza,
  }
}

// --- Dashboard Ventas -----------------------------------------------------

export function computeVentasKpis(filtered) {
  const ventasReales = filtered.ventasReales
  const facturacion = sum(ventasReales, (r) => r.monto)
  const botellas = sum(ventasReales, (r) => r.cantidad)
  const pedidosUnicos = distinct(ventasReales, (r) => r.pedido ?? `${r.cliente}-${r.fecha}`)
  const clientes = distinct(ventasReales, (r) => r.cliente)
  const ticketPromedio = pedidosUnicos ? facturacion / pedidosUnicos : 0
  const precioPromedioBotella = botellas ? facturacion / botellas : 0

  return { facturacion, botellas, clientes, pedidosUnicos, ticketPromedio, precioPromedioBotella }
}

export function computeVentasCharts(filtered) {
  const ventasReales = filtered.ventasReales

  const tendenciaMensual = sortMonthly(groupSum(
    ventasReales,
    (r) => (r.anio && r.mes ? `${MES_NOMBRE[r.mes]} ${r.anio}` : null),
    (r) => r.monto
  ))
  const botellasMensual = sortMonthly(groupSum(
    ventasReales,
    (r) => (r.anio && r.mes ? `${MES_NOMBRE[r.mes]} ${r.anio}` : null),
    (r) => r.cantidad
  ))

  const ventaPorMarca = groupSum(ventasReales, (r) => r.brand, (r) => r.monto)
  const ventaPorSku = groupSum(ventasReales, (r) => r.producto, (r) => r.monto)
    .sort((a, b) => b.value - a.value)
    .slice(0, 10)
  const ventaPorCanal = groupSum(ventasReales, (r) => r.canal, (r) => r.monto).sort((a, b) => b.value - a.value)

  return { tendenciaMensual, botellasMensual, ventaPorMarca, ventaPorSku, ventaPorCanal }
}

// Ranking de clientes: quién compra más, cuántas botellas, de qué marca.
export function rankClientes(filtered, limit = 12) {
  const ventasReales = filtered.ventasReales
  const map = new Map()

  ventasReales.forEach((r) => {
    if (!r.cliente) return
    if (!map.has(r.cliente)) {
      map.set(r.cliente, {
        cliente: r.cliente,
        plaza: r.plaza,
        ciudad: r.ciudad,
        venta: 0,
        botellas: 0,
        pedidos: new Set(),
        marcaVenta: { Unión: 0, Primo: 0, Otro: 0 },
      })
    }
    const c = map.get(r.cliente)
    c.venta += r.monto
    c.botellas += r.cantidad
    c.pedidos.add(r.pedido ?? `${r.cliente}-${r.fecha}`)
    c.marcaVenta[r.brand] = (c.marcaVenta[r.brand] || 0) + r.monto
  })

  return [...map.values()]
    .map((c) => {
      const marcaPrincipal = Object.entries(c.marcaVenta).sort((a, b) => b[1] - a[1])[0]?.[0] || 'Otro'
      const primoPct = c.venta ? (c.marcaVenta.Primo || 0) / c.venta : 0
      return {
        cliente: c.cliente,
        plaza: c.plaza,
        ciudad: c.ciudad,
        venta: c.venta,
        botellas: c.botellas,
        pedidos: c.pedidos.size,
        marcaPrincipal,
        primoPct,
      }
    })
    .sort((a, b) => b.venta - a.venta)
    .slice(0, limit)
}

// Ranking de embajadores: venta, botellas, clientes atendidos, ticket
// promedio y su mezcla Unión/Primo — para comparar desempeño real.
export function rankEmbajadores(filtered, limit = 12) {
  const ventasReales = filtered.ventasReales
  const map = new Map()

  ventasReales.forEach((r) => {
    if (!r.embajador) return
    if (!map.has(r.embajador)) {
      map.set(r.embajador, {
        embajador: r.embajador,
        venta: 0,
        botellas: 0,
        clientes: new Set(),
        pedidos: new Set(),
        marcaVenta: { Unión: 0, Primo: 0, Otro: 0 },
      })
    }
    const e = map.get(r.embajador)
    e.venta += r.monto
    e.botellas += r.cantidad
    if (r.cliente) e.clientes.add(r.cliente)
    e.pedidos.add(r.pedido ?? `${r.embajador}-${r.fecha}`)
    e.marcaVenta[r.brand] = (e.marcaVenta[r.brand] || 0) + r.monto
  })

  return [...map.values()]
    .map((e) => ({
      embajador: e.embajador,
      venta: e.venta,
      botellas: e.botellas,
      clientes: e.clientes.size,
      pedidos: e.pedidos.size,
      ticketPromedio: e.pedidos.size ? e.venta / e.pedidos.size : 0,
      primoPct: e.venta ? (e.marcaVenta.Primo || 0) / e.venta : 0,
    }))
    .sort((a, b) => b.venta - a.venta)
    .slice(0, limit)
}

// --- Dashboard Sell Out ----------------------------------------------------
// Regla de negocio: SELL_OUT solo cuenta Concepto = VENTA o BONIFICACIONES
// (ya aplicado en applyFilters). Aquí no hay $ — todo es en unidades.

export function computeSellOutKpis(filtered) {
  const so = filtered.sellOut
  const total = sum(so, (r) => r.cantidad)
  const union = sum(so.filter((r) => r.brand === 'Unión'), (r) => r.cantidad)
  const primo = sum(so.filter((r) => r.brand === 'Primo'), (r) => r.cantidad)
  const clientes = distinct(so, (r) => r.cliente)
  const distribuidores = distinct(so, (r) => r.distribuidor)
  const embajadores = distinct(so, (r) => r.embajador)

  return { total, union, primo, primoPct: total ? primo / total : 0, clientes, distribuidores, embajadores }
}

export function computeSellOutCharts(filtered) {
  const so = filtered.sellOut

  const tendenciaMensual = sortMonthly(groupSum(
    so,
    (r) => (r.anio && r.mes ? `${MES_NOMBRE[r.mes]} ${r.anio}` : null),
    (r) => r.cantidad
  ))
  const porPlaza = groupSum(so, (r) => r.plaza, (r) => r.cantidad).sort((a, b) => b.value - a.value)
  const porMarca = groupSum(so, (r) => r.brand, (r) => r.cantidad)
  const porSku = groupSum(so, (r) => r.producto, (r) => r.cantidad)
    .sort((a, b) => b.value - a.value)
    .slice(0, 10)
  const porDistribuidor = groupSum(so, (r) => r.distribuidor, (r) => r.cantidad)
    .sort((a, b) => b.value - a.value)
    .slice(0, 8)

  return { tendenciaMensual, porPlaza, porMarca, porSku, porDistribuidor }
}

export function rankClientesSellOut(filtered, limit = 12) {
  const so = filtered.sellOut
  const map = new Map()

  so.forEach((r) => {
    if (!r.cliente) return
    if (!map.has(r.cliente)) {
      map.set(r.cliente, {
        cliente: r.cliente,
        plaza: r.plaza,
        distribuidor: r.distribuidor,
        unidades: 0,
        marca: { Unión: 0, Primo: 0, Otro: 0 },
      })
    }
    const c = map.get(r.cliente)
    c.unidades += r.cantidad
    c.marca[r.brand] = (c.marca[r.brand] || 0) + r.cantidad
  })

  return [...map.values()]
    .map((c) => ({
      cliente: c.cliente,
      plaza: c.plaza,
      distribuidor: c.distribuidor,
      unidades: c.unidades,
      primoPct: c.unidades ? (c.marca.Primo || 0) / c.unidades : 0,
    }))
    .sort((a, b) => b.unidades - a.unidades)
    .slice(0, limit)
}

export function rankEmbajadoresSellOut(filtered, limit = 12) {
  const so = filtered.sellOut
  const map = new Map()

  so.forEach((r) => {
    if (!r.embajador) return
    if (!map.has(r.embajador)) {
      map.set(r.embajador, {
        embajador: r.embajador,
        unidades: 0,
        clientes: new Set(),
        marca: { Unión: 0, Primo: 0, Otro: 0 },
      })
    }
    const e = map.get(r.embajador)
    e.unidades += r.cantidad
    if (r.cliente) e.clientes.add(r.cliente)
    e.marca[r.brand] = (e.marca[r.brand] || 0) + r.cantidad
  })

  return [...map.values()]
    .map((e) => ({
      embajador: e.embajador,
      unidades: e.unidades,
      clientes: e.clientes.size,
      primoPct: e.unidades ? (e.marca.Primo || 0) / e.unidades : 0,
    }))
    .sort((a, b) => b.unidades - a.unidades)
    .slice(0, limit)
}

// --- Dashboard Planeación ---------------------------------------------------
// Compara lo que cada embajador PLANEÓ visitar esa semana (hoja PLANEACION)
// contra lo que realmente registró en ACTIVIDADES_ON esa misma semana.
// La "semana" siempre se agrupa por su lunes (YYYY-MM-DD) para que ambas
// hojas se puedan cruzar aunque el día exacto de registro varíe.

const DIAS_ORDEN = ['lunes', 'martes', 'miercoles', 'jueves', 'viernes']
const DIA_SEMANA_NOMBRE = ['domingo', 'lunes', 'martes', 'miercoles', 'jueves', 'viernes', 'sabado']

function diaSemana(iso) {
  if (!iso) return null
  const d = new Date(`${iso}T00:00:00Z`)
  return DIA_SEMANA_NOMBRE[d.getUTCDay()]
}

export function getCurrentWeek() {
  return mondayOf(new Date().toISOString().slice(0, 10))
}

export function getAvailableWeeks(filtered) {
  const weeks = new Set()
  filtered.planeacion.forEach((p) => p.semana && weeks.add(p.semana))
  filtered.actividadesOn.forEach((a) => a.semana && weeks.add(a.semana))
  filtered.actividadesOff.forEach((a) => a.semana && weeks.add(a.semana))
  weeks.add(getCurrentWeek())
  return [...weeks].sort()
}

const DIA_MS = 86400000
export function formatWeekLabel(monday) {
  if (!monday) return ''
  const start = new Date(`${monday}T00:00:00Z`)
  const end = new Date(start.getTime() + 4 * DIA_MS)
  const fmt = (d) => d.toLocaleDateString('es-MX', { day: 'numeric', month: 'short', timeZone: 'UTC' })
  return `${fmt(start)} – ${fmt(end)}`
}

// Agrega planeación + ejecución por embajador para UNA semana (monday ISO).
// Solo cuenta como "visita" una fila de ACTIVIDADES_ON/ACTIVIDADES_OFF con
// ¿QUÉ ACTIVIDAD VAS A REALIZAR? = VISITA DE MANTENIMIENTO. Se combinan
// ambas hojas porque los dos embajadores OFF (Rocío Sánchez, Alfredo
// González) registran su ejecución en ACTIVIDADES_OFF, no en ON.
export function computePlaneacionSemana(filtered, semana) {
  const planeacionSemana = filtered.planeacion.filter((p) => p.semana === semana)
  const actividadesSemana = [...filtered.actividadesOn, ...filtered.actividadesOff].filter(
    (a) => a.semana === semana && a.esVisitaMantenimiento
  )

  const porEmbajador = new Map()
  const ensure = (embajador) => {
    if (!porEmbajador.has(embajador)) {
      porEmbajador.set(embajador, {
        embajador,
        planeadas: new Set(),
        visitadas: new Set(),
        union: 0,
        primo: 0,
      })
    }
    return porEmbajador.get(embajador)
  }

  planeacionSemana.forEach((p) => {
    if (!p.embajador) return
    const e = ensure(p.embajador)
    DIAS_ORDEN.forEach((dia) => p.porDia[dia].forEach((cuenta) => e.planeadas.add(cuenta)))
  })

  actividadesSemana.forEach((a) => {
    if (!a.embajador) return
    const e = ensure(a.embajador)
    if (a.cliente) e.visitadas.add(a.cliente)
    if (a.visitaUnion) e.union += 1
    if (a.visitaPrimo) e.primo += 1
  })

  const filas = [...porEmbajador.values()]
    .map((e) => {
      const pendientes = [...e.planeadas].filter((c) => !e.visitadas.has(c))
      const cumplidas = [...e.planeadas].filter((c) => e.visitadas.has(c))
      const extras = [...e.visitadas].filter((c) => !e.planeadas.has(c))
      return {
        embajador: e.embajador,
        planeadas: e.planeadas.size,
        visitadasDelPlan: cumplidas.length,
        cumplimiento: e.planeadas.size ? cumplidas.length / e.planeadas.size : 0,
        pendientes,
        extras,
        union: e.union,
        primo: e.primo,
      }
    })
    .sort((a, b) => b.planeadas - a.planeadas)

  const totalPlaneadas = sum(filas, (f) => f.planeadas)
  const totalVisitadas = sum(filas, (f) => f.visitadasDelPlan)

  return {
    semana,
    filas,
    totalPlaneadas,
    totalVisitadas,
    cumplimiento: totalPlaneadas ? totalVisitadas / totalPlaneadas : 0,
  }
}

// Planeadas vs visitadas por día (lunes..viernes) para una semana, para la
// gráfica de barras del calendario semanal.
export function computeDiaBreakdown(filtered, semana) {
  const planeacionSemana = filtered.planeacion.filter((p) => p.semana === semana)
  const actividadesSemana = [...filtered.actividadesOn, ...filtered.actividadesOff].filter(
    (a) => a.semana === semana && a.esVisitaMantenimiento
  )

  const planPorDia = Object.fromEntries(DIAS_ORDEN.map((d) => [d, new Set()]))
  planeacionSemana.forEach((p) => {
    DIAS_ORDEN.forEach((dia) => p.porDia[dia].forEach((cuenta) => planPorDia[dia].add(`${p.embajador}|${cuenta}`)))
  })

  const visitPorDia = Object.fromEntries(DIAS_ORDEN.map((d) => [d, new Set()]))
  actividadesSemana.forEach((a) => {
    const dia = diaSemana(a.fecha)
    if (DIAS_ORDEN.includes(dia) && a.cliente) {
      visitPorDia[dia].add(`${a.embajador}|${a.cliente}`)
    }
  })

  const NOMBRE = { lunes: 'Lun', martes: 'Mar', miercoles: 'Mié', jueves: 'Jue', viernes: 'Vie' }
  return DIAS_ORDEN.map((d) => ({
    name: NOMBRE[d],
    planeadas: planPorDia[d].size,
    visitadas: visitPorDia[d].size,
  }))
}

// Serie histórica de cumplimiento % (última N semanas con datos).
export function computeCumplimientoTrend(filtered, weeks, limit = 10) {
  const ultimas = weeks.slice(-limit)
  return ultimas.map((w) => {
    const { cumplimiento, totalPlaneadas, totalVisitadas } = computePlaneacionSemana(filtered, w)
    return {
      name: formatWeekLabel(w),
      semana: w,
      cumplimiento,
      planeadas: totalPlaneadas,
      visitadas: totalVisitadas,
    }
  })
}

// --- Dashboard Clientes -----------------------------------------------------
// Unifica los tres universos de cuentas (venta directa, ON, OFF) por
// nombre de cuenta y cruza cada una contra VENTAS + ACTIVIDADES_ON/OFF para
// traer sus métricas mes a mes.

const MES_LARGO = [
  '',
  'Enero',
  'Febrero',
  'Marzo',
  'Abril',
  'Mayo',
  'Junio',
  'Julio',
  'Agosto',
  'Septiembre',
  'Octubre',
  'Noviembre',
  'Diciembre',
]

function mesDeFecha(iso) {
  return iso ? iso.slice(0, 7) : null
}

export function getCurrentMonth() {
  return new Date().toISOString().slice(0, 7)
}

export function formatMonthLabel(ym) {
  if (!ym) return ''
  const [y, m] = ym.split('-')
  return `${MES_LARGO[Number(m)]} ${y}`
}

export function getAvailableMonths(filtered) {
  const months = new Set()
  filtered.ventasReales.forEach((r) => r.fecha && months.add(mesDeFecha(r.fecha)))
  filtered.actividadesOn.forEach((r) => r.fecha && months.add(mesDeFecha(r.fecha)))
  filtered.actividadesOff.forEach((r) => r.fecha && months.add(mesDeFecha(r.fecha)))
  months.add(getCurrentMonth())
  return [...months].sort()
}

const TIPO_ACTIVIDAD_CAMPO = {
  'VISITA DE MANTENIMIENTO': 'visitasMantenimiento',
  CAPACITACIÓN: 'capacitaciones',
  ACTIVACIÓN: 'activaciones',
  'MEJORA DE ANAQUEL': 'mejoraAnaquel',
  'EXHIBICIÓN ADICIONAL': 'exhibicion',
}

function nuevaCuenta(cliente) {
  return {
    cliente,
    universos: new Set(),
    embajador: '',
    plaza: '',
    ciudad: '',
    ventas: 0,
    botellas: 0,
    visitasMantenimiento: 0,
    capacitaciones: 0,
    activaciones: 0,
    mejoraAnaquel: 0,
    exhibicion: 0,
  }
}

// Cuenta por cuenta: universo(s) a los que pertenece, embajador dueño,
// plaza/ciudad, y sus métricas del mes seleccionado.
export function computeClientesUniverso(filtered, mes) {
  const cuentas = new Map()
  const ensure = (cliente) => {
    if (!cliente) return null
    if (!cuentas.has(cliente)) cuentas.set(cliente, nuevaCuenta(cliente))
    return cuentas.get(cliente)
  }

  filtered.clientesDirectos.forEach((r) => {
    const c = ensure(r.cliente)
    if (!c) return
    c.universos.add('Directo')
    if (!c.embajador) c.embajador = r.embajador
    if (!c.plaza) c.plaza = r.plaza
  })

  filtered.universoOn.forEach((r) => {
    const c = ensure(r.cuenta)
    if (!c) return
    c.universos.add('ON')
    if (!c.embajador) c.embajador = r.operador
    if (!c.plaza) c.plaza = r.plaza
    if (!c.ciudad) c.ciudad = r.ciudad
  })

  filtered.universoOff.forEach((r) => {
    const c = ensure(r.cuenta)
    if (!c) return
    c.universos.add('OFF')
    if (!c.embajador) c.embajador = r.operador
    if (!c.plaza) c.plaza = r.plaza
    if (!c.ciudad) c.ciudad = r.ciudad
  })

  // Métricas del mes seleccionado. Botellas viene de VENTAS (venta directa)
  // + SELL_OUT (cuentas ON, que no tienen $ pero sí volumen movido).
  filtered.ventasReales
    .filter((r) => mesDeFecha(r.fecha) === mes)
    .forEach((r) => {
      const c = ensure(r.cliente)
      if (c) {
        c.ventas += r.monto
        c.botellas += r.cantidad
      }
    })
  filtered.sellOut
    .filter((r) => mesDeFecha(r.fecha) === mes)
    .forEach((r) => {
      const c = ensure(r.cliente)
      if (c) c.botellas += r.cantidad
    })
  ;[...filtered.actividadesOn, ...filtered.actividadesOff]
    .filter((a) => mesDeFecha(a.fecha) === mes)
    .forEach((a) => {
      const c = ensure(a.cliente)
      if (!c) return
      const campo = TIPO_ACTIVIDAD_CAMPO[a.tipoActividad]
      if (campo) c[campo] += 1
    })

  return [...cuentas.values()]
    .map((c) => ({
      ...c,
      universos: [...c.universos],
      universoLabel: c.universos.size ? [...c.universos].join(' + ') : 'Sin universo asignado',
    }))
    .sort((a, b) => {
      if (b.ventas !== a.ventas) return b.ventas - a.ventas
      if (b.botellas !== a.botellas) return b.botellas - a.botellas
      const actA = a.visitasMantenimiento + a.capacitaciones + a.activaciones + a.mejoraAnaquel + a.exhibicion
      const actB = b.visitasMantenimiento + b.capacitaciones + b.activaciones + b.mejoraAnaquel + b.exhibicion
      return actB - actA
    })
}

export function computeClientesKpis(filtered, mes) {
  const universoDirecto = distinct(filtered.clientesDirectos, (r) => r.cliente)
  const universoOnCount = distinct(filtered.universoOn, (r) => r.cuenta)
  const universoOffCount = distinct(filtered.universoOff, (r) => r.cuenta)
  const universoTotal = new Set([
    ...filtered.clientesDirectos.map((r) => r.cliente),
    ...filtered.universoOn.map((r) => r.cuenta),
    ...filtered.universoOff.map((r) => r.cuenta),
  ]).size

  const actividadesMes = [...filtered.actividadesOn, ...filtered.actividadesOff].filter(
    (a) => mesDeFecha(a.fecha) === mes
  )
  const ventasMes = sum(
    filtered.ventasReales.filter((r) => mesDeFecha(r.fecha) === mes),
    (r) => r.monto
  )
  const botellasMes =
    sum(
      filtered.ventasReales.filter((r) => mesDeFecha(r.fecha) === mes),
      (r) => r.cantidad
    ) +
    sum(
      filtered.sellOut.filter((r) => mesDeFecha(r.fecha) === mes),
      (r) => r.cantidad
    )

  return {
    universoTotal,
    universoDirecto,
    universoOnCount,
    universoOffCount,
    ventasMes,
    botellasMes,
    visitasMantenimiento: actividadesMes.filter((a) => a.tipoActividad === 'VISITA DE MANTENIMIENTO').length,
    capacitaciones: actividadesMes.filter((a) => a.tipoActividad === 'CAPACITACIÓN').length,
    activaciones: actividadesMes.filter((a) => a.tipoActividad === 'ACTIVACIÓN').length,
  }
}

// Tendencia mensual agregada (últimos N meses con datos).
export function computeClientesTrend(filtered, months, limit = 12) {
  const ultimos = months.slice(-limit)
  return ultimos.map((mes) => {
    const actividadesMes = [...filtered.actividadesOn, ...filtered.actividadesOff].filter(
      (a) => mesDeFecha(a.fecha) === mes
    )
    return {
      name: formatMonthLabel(mes),
      mes,
      ventas: sum(
        filtered.ventasReales.filter((r) => mesDeFecha(r.fecha) === mes),
        (r) => r.monto
      ),
      visitas: actividadesMes.filter((a) => a.tipoActividad === 'VISITA DE MANTENIMIENTO').length,
      capacitaciones: actividadesMes.filter((a) => a.tipoActividad === 'CAPACITACIÓN').length,
      activaciones: actividadesMes.filter((a) => a.tipoActividad === 'ACTIVACIÓN').length,
    }
  })
}

export function computeCuentasPorPlaza(filtered) {
  const map = new Map()
  ;[...filtered.clientesDirectos, ...filtered.universoOn, ...filtered.universoOff].forEach((r) => {
    const plaza = r.plaza
    if (!plaza) return
    map.set(plaza, (map.get(plaza) || 0) + 1)
  })
  return [...map.entries()].map(([name, value]) => ({ name, value })).sort((a, b) => b.value - a.value)
}

// --- Dashboard Embajadores ---------------------------------------------------
// Vista 360° de cada embajador: venta directa, botellas (venta + sell out),
// actividad de campo (visitas/capacitaciones/activaciones, + anaquel y
// exhibición para los OFF), personas impactadas y sus mejores 3 cuentas.

export function computeEmbajadoresOverview(filtered) {
  const map = new Map()
  const ensure = (embajador) => {
    if (!embajador) return null
    if (!map.has(embajador)) {
      map.set(embajador, {
        embajador,
        venta: 0,
        botellas: 0,
        clientes: new Set(),
        marcaVenta: { Unión: 0, Primo: 0, Otro: 0 },
        visitasMantenimiento: 0,
        capacitaciones: 0,
        activaciones: 0,
        mejoraAnaquel: 0,
        exhibicion: 0,
        personasImpactadas: 0,
        cuentas: new Map(),
      })
    }
    return map.get(embajador)
  }

  const ensureCuenta = (e, cliente) => {
    if (!e || !cliente) return null
    if (!e.cuentas.has(cliente)) e.cuentas.set(cliente, { cliente, ventas: 0, botellas: 0, actividad: 0 })
    return e.cuentas.get(cliente)
  }

  filtered.ventasReales.forEach((r) => {
    const e = ensure(r.embajador)
    if (!e) return
    e.venta += r.monto
    e.botellas += r.cantidad
    if (r.cliente) e.clientes.add(r.cliente)
    e.marcaVenta[r.brand] = (e.marcaVenta[r.brand] || 0) + r.monto
    const c = ensureCuenta(e, r.cliente)
    if (c) {
      c.ventas += r.monto
      c.botellas += r.cantidad
    }
  })

  filtered.sellOut.forEach((r) => {
    const e = ensure(r.embajador)
    if (!e) return
    e.botellas += r.cantidad
    if (r.cliente) e.clientes.add(r.cliente)
    const c = ensureCuenta(e, r.cliente)
    if (c) c.botellas += r.cantidad
  })
  ;[...filtered.actividadesOn, ...filtered.actividadesOff].forEach((a) => {
    const e = ensure(a.embajador)
    if (!e) return
    if (a.cliente) e.clientes.add(a.cliente)
    e.personasImpactadas += a.personasImpactadas || 0
    const campo = TIPO_ACTIVIDAD_CAMPO[a.tipoActividad]
    if (campo) {
      e[campo] += 1
      const c = ensureCuenta(e, a.cliente)
      if (c) c.actividad += 1
    }
  })

  return [...map.values()]
    .map((e) => {
      const top3 = [...e.cuentas.values()]
        .sort((a, b) => b.ventas - a.ventas || b.botellas - a.botellas || b.actividad - a.actividad)
        .slice(0, 3)
      return {
        embajador: e.embajador,
        venta: e.venta,
        botellas: e.botellas,
        clientes: e.clientes.size,
        primoPct: e.venta ? (e.marcaVenta.Primo || 0) / e.venta : 0,
        visitasMantenimiento: e.visitasMantenimiento,
        capacitaciones: e.capacitaciones,
        activaciones: e.activaciones,
        mejoraAnaquel: e.mejoraAnaquel,
        exhibicion: e.exhibicion,
        personasImpactadas: e.personasImpactadas,
        top3,
      }
    })
    .sort((a, b) => {
      if (b.venta !== a.venta) return b.venta - a.venta
      const actA = a.visitasMantenimiento + a.capacitaciones + a.activaciones
      const actB = b.visitasMantenimiento + b.capacitaciones + b.activaciones
      return actB - actA
    })
}

export function computeEmbajadoresKpis(overview, filtered) {
  const cumplimientoSemanaActual = computePlaneacionSemana(filtered, getCurrentWeek()).cumplimiento
  return {
    totalEmbajadores: overview.length,
    ventaTotal: sum(overview, (e) => e.venta),
    botellasTotal: sum(overview, (e) => e.botellas),
    visitasMantenimiento: sum(overview, (e) => e.visitasMantenimiento),
    capacitaciones: sum(overview, (e) => e.capacitaciones),
    activaciones: sum(overview, (e) => e.activaciones),
    personasImpactadas: sum(overview, (e) => e.personasImpactadas),
    cumplimientoSemanaActual,
  }
}

export function computeEmbajadoresCharts(overview) {
  const porVenta = overview
    .filter((e) => e.venta > 0)
    .slice(0, 8)
    .map((e) => ({ name: e.embajador, value: e.venta }))

  const actividad = [...overview]
    .sort(
      (a, b) =>
        b.visitasMantenimiento + b.capacitaciones + b.activaciones - (a.visitasMantenimiento + a.capacitaciones + a.activaciones)
    )
    .slice(0, 8)
    .map((e) => ({
      name: e.embajador,
      visitas: e.visitasMantenimiento,
      capacitaciones: e.capacitaciones,
      activaciones: e.activaciones,
    }))

  const impacto = [...overview]
    .sort((a, b) => b.personasImpactadas - a.personasImpactadas)
    .slice(0, 8)
    .map((e) => ({ name: e.embajador, value: e.personasImpactadas }))

  return { porVenta, actividad, impacto }
}

// Detalle mes a mes de UN embajador (para el drill-down al hacer clic en su
// nombre en el ranking): venta $, botellas (venta + sell out) y actividad
// de campo, mes por mes.
export function computeEmbajadorMensual(filtered, embajador, months, limit = 12) {
  const ultimos = months.slice(-limit)
  return ultimos.map((mes) => {
    const ventasMes = filtered.ventasReales.filter((r) => r.embajador === embajador && mesDeFecha(r.fecha) === mes)
    const sellOutMes = filtered.sellOut.filter((r) => r.embajador === embajador && mesDeFecha(r.fecha) === mes)
    const actividadesMes = [...filtered.actividadesOn, ...filtered.actividadesOff].filter(
      (a) => a.embajador === embajador && mesDeFecha(a.fecha) === mes
    )

    return {
      mes,
      name: formatMonthLabel(mes),
      venta: sum(ventasMes, (r) => r.monto),
      botellas: sum(ventasMes, (r) => r.cantidad) + sum(sellOutMes, (r) => r.cantidad),
      visitasMantenimiento: actividadesMes.filter((a) => a.tipoActividad === 'VISITA DE MANTENIMIENTO').length,
      capacitaciones: actividadesMes.filter((a) => a.tipoActividad === 'CAPACITACIÓN').length,
      activaciones: actividadesMes.filter((a) => a.tipoActividad === 'ACTIVACIÓN').length,
      mejoraAnaquel: actividadesMes.filter((a) => a.tipoActividad === 'MEJORA DE ANAQUEL').length,
      exhibicion: actividadesMes.filter((a) => a.tipoActividad === 'EXHIBICIÓN ADICIONAL').length,
    }
  })
}
