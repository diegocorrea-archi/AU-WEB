// Cada hoja de Google Sheets tiene columnas con nombres distintos para
// conceptos equivalentes (p.ej. "Mezcalero" en VENTAS y "Embajador" en
// SELL_OUT ambos son el vendedor/embajador de campo).
//
// Estas funciones normalizan cada fila a una forma común para que los
// filtros globales y los cálculos de KPI no necesiten conocer la hoja de
// origen. Si el nombre de una columna cambia en el Sheet real, solo hay
// que ajustar el mapeo aquí — el resto de la app no se toca.

const num = (v) => {
  if (v === null || v === undefined || v === '') return 0
  if (typeof v === 'number') return Number.isFinite(v) ? v : 0
  // Limpia formato moneda / miles: "$1,400.00" -> "1400.00"
  // Soporta negativos "-$50.00" o "($50.00)" como negativo.
  let s = String(v).trim()
  const isParenNegative = /^\(.*\)$/.test(s)
  s = s.replace(/[^0-9.\-]/g, '')
  const n = parseFloat(s)
  if (!Number.isFinite(n)) return 0
  return isParenNegative ? -Math.abs(n) : n
}

const str = (v) => (v === null || v === undefined ? '' : String(v).trim())

// Google Sheets exporta fechas como texto DD/MM/YYYY (p.ej. "27/01/2023")
// al leerlas vía CSV. La muestra local (Excel -> JSON) ya viene en ISO
// (YYYY-MM-DD). Algunas columnas sin formato de fecha explícito exportan el
// número de serie de Sheets (días desde 1899-12-30) en vez de texto — este
// parser cubre los tres casos para que comparaciones de rango y
// agrupaciones por mes/año sean consistentes sin importar la fuente.
export function toISODate(raw) {
  const v = str(raw)
  if (!v) return null

  if (/^\d{4}-\d{2}-\d{2}/.test(v)) return v.slice(0, 10)

  const dmy = v.match(/^(\d{1,2})[/-](\d{1,2})[/-](\d{4})/)
  if (dmy) {
    const [, d, mo, y] = dmy
    return `${y}-${mo.padStart(2, '0')}-${d.padStart(2, '0')}`
  }

  // Número de serie de Google Sheets (días desde 1899-12-30). Rango
  // razonable ~1970-2060 para no confundir con cantidades/precios.
  if (/^\d+(\.\d+)?$/.test(v)) {
    const serial = parseFloat(v)
    if (serial > 25000 && serial < 60000) {
      const ms = Date.UTC(1899, 11, 30) + serial * 86400000
      const d = new Date(ms)
      return `${d.getUTCFullYear()}-${String(d.getUTCMonth() + 1).padStart(2, '0')}-${String(
        d.getUTCDate()
      ).padStart(2, '0')}`
    }
  }

  return null
}

// Normaliza nombre de marca a 'Unión' | 'Primo' | 'Otro'
export function normalizeBrand(raw) {
  const b = str(raw).toUpperCase()
  if (b.includes('PRIMO')) return 'Primo'
  if (b.includes('UNION') || b.includes('UNIÓN')) return 'Unión'
  return b ? b : 'Otro'
}

export function normalizeVentas(rows) {
  const sinFecha = []
  const montoSospechoso = []
  const normalizadas = rows.map((r) => {
    const fecha = toISODate(r['Fecha de Facturación'])
    if (!fecha && sinFecha.length < 3) sinFecha.push(r['Fecha de Facturación'])
    const cantidad = num(r['Cantidad'])
    const monto = num(r['PRECIO FINAL'])
    if (cantidad > 0 && monto === 0 && montoSospechoso.length < 3) {
      montoSospechoso.push(r['PRECIO FINAL'])
    }
    return {
      _sheet: 'VENTAS',
      fecha,
      anio: fecha ? Number(fecha.slice(0, 4)) : 0,
      mes: fecha ? Number(fecha.slice(5, 7)) : 0,
      trimestre: str(r['TRIMESTRE']),
      plaza: str(r['Plaza']),
      ciudad: str(r['Ciudad']),
      embajador: str(r['Mezcalero']),
      cliente: str(r['Cliente']),
      producto: str(r['Producto']),
      brand: normalizeBrand(r['Brand']),
      canal: str(r['Canal (MKT SOLO PARA FREEGOODS)']),
      concepto: str(r['Concepto']).toUpperCase(),
      tipoVenta: str(r['TIPO DE VENTA']),
      status: str(r['STATUS']),
      cantidad,
      monto,
      pedido: r['REQ'],
      raw: r,
    }
  })
  const totalSinFecha = normalizadas.filter((r) => !r.fecha).length
  if (totalSinFecha) {
    console.warn(
      `[VENTAS] ${totalSinFecha} de ${normalizadas.length} filas no traen una fecha reconocible en "Fecha de Facturación". Ejemplos de valor crudo:`,
      sinFecha
    )
  }
  if (montoSospechoso.length) {
    console.warn(
      `[VENTAS] Hay filas con Cantidad > 0 pero PRECIO FINAL = 0 tras parsear. Ejemplos de valor crudo:`,
      montoSospechoso
    )
  }
  return normalizadas
}

export function normalizeSellOut(rows) {
  return rows.map((r) => {
    const fecha = toISODate(r['Fecha'])
    return {
      _sheet: 'SELL_OUT',
      fecha,
      anio: fecha ? Number(fecha.slice(0, 4)) : 0,
      mes: fecha ? Number(fecha.slice(5, 7)) : 0,
      plaza: str(r['Plaza']),
      ciudad: str(r['Ciudad']),
      embajador: str(r['Embajador']),
      distribuidor: str(r['Distribuidor']),
      cliente: str(r['Nombre Comercial'] || r['Nombre']),
      producto: str(r['Producto SKU']),
      brand: normalizeBrand(r['Brand']),
      canal: str(r['Distribuidor']),
      concepto: str(r['Concepto']).toUpperCase(),
      cantidad: num(r['Cantidad']),
      raw: r,
    }
  })
}

export function normalizeActividadesOn(rows) {
  return rows.map((r) => ({
    _sheet: 'ACTIVIDADES_ON',
    fecha: toISODate(r['FECHA']),
    plaza: str(r['PLAZA']),
    ciudad: str(r['CIUDAD']),
    embajador: str(r['EMBAJADOR']),
    cliente: str(r['CLIENTE']),
    tipoActividad: str(r['¿QUÉ ACTIVIDAD VAS A REALIZAR?']),
    personasImpactadas: num(r['PERSONAS IMPACTADAS']),
    raw: r,
  }))
}

export function normalizeActividadesOff(rows) {
  return rows.map((r) => ({
    _sheet: 'ACTIVIDADES_OFF',
    fecha: toISODate(r['FECHA']),
    embajador: str(r['EMBAJADOR']),
    cadena: str(r['NOMBRE CADENA']),
    sucursal: str(r['NOMBRE SUCURSAL']),
    tipoActividad: str(r['¿QUÉ ACTIVIDAD VAS A REALIZAR?']),
    personasImpactadas: num(r['PERSONAS IMPACTADAS']),
    raw: r,
  }))
}

export function normalizeUniversoOn(rows) {
  return rows.map((r) => ({
    _sheet: 'UNIVERSO_ON',
    cuenta: str(r['NOMBRE DE LA CUENTA']),
    status: str(r['STATUS']),
    operador: str(r['OPERADOR']),
    plaza: str(r['PLAZA']),
    ciudad: str(r['CIUDAD']),
    brand: normalizeBrand(r['BRAND']),
    ranking: str(r['RANKING']),
    score: num(r['SCORE']),
    potencialPrimo: num(r['POTENCIAL PRIMO']),
    potencialUnion: num(r['POTENCIAL UNIÓN']),
    raw: r,
  }))
}

export function normalizeUniversoOff(rows) {
  return rows.map((r) => ({
    _sheet: 'UNIVERSO_OFF',
    cuenta: str(r['Nombre de cuenta']),
    status: str(r['STATUS']),
    cadena: str(r['CADENA']),
    canal: str(r['CANAL']),
    operador: str(r['Operador']),
    plaza: str(r['PLAZA']),
    ciudad: str(r['CIUDAD']),
    brand: normalizeBrand(r['MARCA']),
    ranking: str(r['Ranking']),
    score: num(r['Score']),
    raw: r,
  }))
}

const DIAS = ['lunes', 'martes', 'miercoles', 'jueves', 'viernes']
const DIA_KEYS = {
  lunes: 'Cuentas a visitar el lunes',
  martes: 'Cuentas a visitar el martes',
  miercoles: 'cuentas a visitar el miercoles',
  jueves: 'cuentas a visitar el jueves',
  viernes: 'cuentas a visitar el viernes',
}

export function normalizePlaneacion(rows) {
  return rows.map((r) => {
    const porDia = {}
    let totalCuentas = 0
    DIAS.forEach((d) => {
      const val = str(r[DIA_KEYS[d]])
      const cuentas = val ? val.split(',').map((c) => c.trim()).filter(Boolean) : []
      porDia[d] = cuentas
      totalCuentas += cuentas.length
    })
    return {
      _sheet: 'PLANEACION',
      embajador: str(r['Embajador Respondiendo el Cuestionario']),
      porDia,
      totalCuentasPlaneadas: totalCuentas,
      raw: r,
    }
  })
}
