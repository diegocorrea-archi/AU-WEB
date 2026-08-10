// --- Opciones disponibles para los filtros globales ---------------------
// Todas las funciones de este módulo reciben el `dataset` normalizado como
// parámetro (en vez de importarlo fijo) para poder alimentarlo desde el
// Google Sheet real o desde la muestra local, sin duplicar lógica.
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
  { hasBrand = true, hasProducto = true, hasCanal = true, hasConcepto = true } = {}
) {
  if (filters.plaza && row.plaza !== filters.plaza) return false
  if (filters.ciudad && row.ciudad !== filters.ciudad) return false
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

  return {
    ventas,
    ventasReales,
    sellOut,
    actividadesOn: dataset.actividadesOn.filter((r) =>
      matches(r, filters, { hasBrand: false, hasProducto: false, hasCanal: false, hasConcepto: false })
    ),
    actividadesOff: dataset.actividadesOff.filter((r) =>
      matches({ ...r, plaza: '', ciudad: '' }, filters, {
        hasBrand: false,
        hasProducto: false,
        hasCanal: false,
        hasConcepto: false,
      })
    ),
    universoOn: dataset.universoOn.filter(
      (r) =>
        (!filters.plaza || r.plaza === filters.plaza) &&
        (!filters.ciudad || r.ciudad === filters.ciudad) &&
        (!filters.brand || r.brand === filters.brand)
    ),
    universoOff: dataset.universoOff.filter(
      (r) =>
        (!filters.plaza || r.plaza === filters.plaza) &&
        (!filters.ciudad || r.ciudad === filters.ciudad) &&
        (!filters.brand || r.brand === filters.brand)
    ),
    planeacion: dataset.planeacion.filter((r) => !filters.embajador || r.embajador === filters.embajador),
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

  // Cumplimiento de planeación: cuentas planeadas por embajador que
  // efectivamente registran una actividad ON con ese mismo cliente.
  const clientesVisitadosPorEmbajador = new Map()
  filtered.actividadesOn.forEach((a) => {
    if (!a.embajador) return
    if (!clientesVisitadosPorEmbajador.has(a.embajador)) {
      clientesVisitadosPorEmbajador.set(a.embajador, new Set())
    }
    if (a.cliente) clientesVisitadosPorEmbajador.get(a.embajador).add(a.cliente.toUpperCase())
  })
  let planeadas = 0
  let ejecutadas = 0
  filtered.planeacion.forEach((p) => {
    const visitadas = clientesVisitadosPorEmbajador.get(p.embajador) || new Set()
    Object.values(p.porDia).forEach((cuentas) => {
      cuentas.forEach((c) => {
        planeadas += 1
        if (visitadas.has(c.toUpperCase())) ejecutadas += 1
      })
    })
  })
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

  const ventaMensual = groupSum(
    ventasReales,
    (r) => (r.anio && r.mes ? `${MES_NOMBRE[r.mes]} ${r.anio}` : null),
    (r) => r.monto
  )

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

  const tendenciaMensual = groupSum(
    ventasReales,
    (r) => (r.anio && r.mes ? `${MES_NOMBRE[r.mes]} ${r.anio}` : null),
    (r) => r.monto
  )
  const botellasMensual = groupSum(
    ventasReales,
    (r) => (r.anio && r.mes ? `${MES_NOMBRE[r.mes]} ${r.anio}` : null),
    (r) => r.cantidad
  )

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

  const tendenciaMensual = groupSum(
    so,
    (r) => (r.anio && r.mes ? `${MES_NOMBRE[r.mes]} ${r.anio}` : null),
    (r) => r.cantidad
  )
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
