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

function serialToISO(serial) {
  const ms = Date.UTC(1899, 11, 30) + serial * 86400000
  const d = new Date(ms)
  return `${d.getUTCFullYear()}-${String(d.getUTCMonth() + 1).padStart(2, '0')}-${String(d.getUTCDate()).padStart(
    2,
    '0'
  )}`
}

// Algunas celdas de "Marca temporal"/"Timestamp" traen literalmente el
// texto "Date(2025,3,10,17,15,17)" en vez de una fecha real (probablemente
// un script/integración que guardó el resultado de `new Date(...)` como
// texto). El mes ahí viene 0-indexado, igual que en JS.
function parseDateLiteral(v) {
  const m = v.match(/^Date\((\d+),\s*(\d+),\s*(\d+)(?:,\s*(\d+),\s*(\d+),\s*(\d+))?\)$/)
  if (!m) return null
  const [, y, mo0, d] = m
  const mo = Number(mo0) + 1
  return `${y}-${String(mo).padStart(2, '0')}-${String(d).padStart(2, '0')}`
}

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

  const literal = parseDateLiteral(v)
  if (literal) return literal

  const dmy = v.match(/^(\d{1,2})[/-](\d{1,2})[/-](\d{4})/)
  if (dmy) {
    const [, d, mo, y] = dmy
    return `${y}-${mo.padStart(2, '0')}-${d.padStart(2, '0')}`
  }

  if (/^\d+(\.\d+)?$/.test(v)) {
    const serial = parseFloat(v)
    if (serial > 25000 && serial < 60000) return serialToISO(serial)
  }

  return null
}

// El "Timestamp" auto-generado por Google Forms (columna A de PLANEACION)
// viene en MES/DÍA/AÑO (locale en-US), a diferencia de las demás columnas
// de fecha de este proyecto que vienen en DÍA/MES/AÑO. Este parser es
// específico para ese caso.
export function toISODateUS(raw) {
  const v = str(raw)
  if (!v) return null

  if (/^\d{4}-\d{2}-\d{2}/.test(v)) return v.slice(0, 10)

  const literal = parseDateLiteral(v)
  if (literal) return literal

  const mdy = v.match(/^(\d{1,2})[/-](\d{1,2})[/-](\d{4})/)
  if (mdy) {
    const [, mo, d, y] = mdy
    return `${y}-${mo.padStart(2, '0')}-${d.padStart(2, '0')}`
  }

  if (/^\d+(\.\d+)?$/.test(v)) {
    const serial = parseFloat(v)
    if (serial > 25000 && serial < 60000) return serialToISO(serial)
  }

  return null
}

// Lunes de la semana ISO que contiene la fecha dada (YYYY-MM-DD -> YYYY-MM-DD).
export function mondayOf(iso) {
  if (!iso) return null
  const d = new Date(`${iso}T00:00:00Z`)
  const day = d.getUTCDay() // 0=domingo … 6=sábado
  const diff = day === 0 ? -6 : 1 - day
  d.setUTCDate(d.getUTCDate() + diff)
  return d.toISOString().slice(0, 10)
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
      cliente: str(r['Cliente']).toUpperCase(),
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
      cliente: str(r['Nombre Comercial'] || r['Nombre']).toUpperCase(),
      producto: str(r['Producto SKU']),
      brand: normalizeBrand(r['Brand']),
      canal: str(r['Distribuidor']),
      concepto: str(r['Concepto']).toUpperCase(),
      cantidad: num(r['Cantidad']),
      raw: r,
    }
  })
}

function isNA(v) {
  const s = str(v).toUpperCase()
  return !s || s === 'NA' || s === 'N/A'
}

const VISITA_TIPO_VALIDO = 'VISITA DE MANTENIMIENTO'

export function normalizeActividadesOn(rows) {
  return rows.map((r) => {
    const fecha = toISODate(r['FECHA'])
    const skuUnion = r['SKU MEZCAL UNIÓN']
    const skuPrimo = r['SKU PRIMO APERITIVO']
    const tipoActividad = str(r['¿QUÉ ACTIVIDAD VAS A REALIZAR?']).toUpperCase()
    return {
      _sheet: 'ACTIVIDADES_ON',
      fecha,
      semana: mondayOf(fecha),
      plaza: str(r['PLAZA']),
      ciudad: str(r['CIUDAD']),
      embajador: str(r['EMBAJADOR']),
      cliente: str(r['CLIENTE']).toUpperCase(),
      tipoActividad,
      esVisitaMantenimiento: tipoActividad === VISITA_TIPO_VALIDO,
      personasImpactadas: num(r['PERSONAS IMPACTADAS']),
      visitaUnion: tipoActividad === VISITA_TIPO_VALIDO && !isNA(skuUnion),
      visitaPrimo: tipoActividad === VISITA_TIPO_VALIDO && !isNA(skuPrimo),
      raw: r,
    }
  })
}

export function normalizeActividadesOff(rows) {
  const sinFecha = []
  const normalizadas = rows.map((r) => {
    const fecha = toISODate(r['FECHA']) || toISODateUS(r['Marca temporal'])
    if (!fecha && sinFecha.length < 3) sinFecha.push(r['FECHA'] || r['Marca temporal'])
    const tipoActividad = str(r['¿QUÉ ACTIVIDAD VAS A REALIZAR?']).toUpperCase()
    const esVisitaMantenimiento = tipoActividad === VISITA_TIPO_VALIDO
    return {
      _sheet: 'ACTIVIDADES_OFF',
      fecha,
      semana: mondayOf(fecha),
      embajador: str(r['EMBAJADOR']),
      cadena: str(r['NOMBRE CADENA']),
      cliente: str(r['NOMBRE SUCURSAL']).toUpperCase(),
      tipoActividad,
      esVisitaMantenimiento,
      personasImpactadas: num(r['PERSONAS IMPACTADAS']),
      visitaUnion: esVisitaMantenimiento && !isNA(r['SKU MEZCAL UNIÓN']),
      visitaPrimo: esVisitaMantenimiento && !isNA(r['SKU PRIMO APERITIVO']),
      raw: r,
    }
  })
  const totalSinFecha = normalizadas.filter((r) => !r.fecha).length
  if (totalSinFecha) {
    console.warn(
      `[ACTIVIDADES_OFF] ${totalSinFecha} de ${normalizadas.length} filas no traen una fecha reconocible en "Marca temporal". Ejemplos de valor crudo:`,
      sinFecha
    )
    if (totalSinFecha === normalizadas.length && rows[0]) {
      console.warn(
        `[ACTIVIDADES_OFF] TODAS las filas fallan — probablemente el nombre de columna no es exactamente "Marca temporal". Columnas reales recibidas:`,
        Object.keys(rows[0])
      )
    }
  }
  return normalizadas
}

export function normalizeUniversoOn(rows) {
  return rows.map((r) => ({
    _sheet: 'UNIVERSO_ON',
    cuenta: str(r['NOMBRE DE LA CUENTA']).toUpperCase(),
    status: str(r['STATUS']).toUpperCase(),
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

// Los encabezados de UNIVERSO_OFF pueden cambiar de mayúsculas/acentos
// entre exportaciones del Sheet; se reconocen por su significado.
function universoCell(row, ...names) {
  const canonical = value => str(value).normalize('NFD').replace(/[\u0300-\u036f]/g, '').toUpperCase().replace(/[^A-Z0-9]+/g, ' ').trim()
  const wanted = new Set(names.map(canonical))
  const key = Object.keys(row).find(k => wanted.has(canonical(k)))
  return key === undefined ? '' : row[key]
}

export function normalizeUniversoOff(rows) {
  return rows.map((r) => ({
    _sheet: 'UNIVERSO_OFF',
    cuenta: str(universoCell(r, 'Nombre de cuenta', 'NOMBRE DE LA CUENTA', 'CUENTA', 'NOMBRE CUENTA')).toUpperCase(),
    status: str(universoCell(r, 'STATUS', 'ESTATUS', 'ESTADO')).toUpperCase(),
    cadena: str(universoCell(r, 'CADENA')),
    canal: str(universoCell(r, 'CANAL')),
    operador: str(universoCell(r, 'Operador', 'EMBAJADOR', 'VENDEDOR', 'RESPONSABLE')),
    plaza: str(universoCell(r, 'PLAZA')),
    ciudad: str(universoCell(r, 'CIUDAD')),
    brand: normalizeBrand(universoCell(r, 'MARCA', 'BRAND')),
    ranking: str(universoCell(r, 'Ranking')),
    score: num(universoCell(r, 'Score')),
    raw: r,
  }))
}

// CLIENTES_DIRECTOS se lee por POSICIÓN de columna (B, C, D, E), no por
// nombre de encabezado, porque no conocemos el texto exacto de sus
// columnas. `rows` viene de fetchSheetRaw(): array de arrays, primera
// fila = encabezados.
export function normalizeClientesDirectos(rawRows) {
  if (!Array.isArray(rawRows) || rawRows.length < 2) return []
  const body = rawRows.slice(1)
  return body
    .filter((row) => row.some((v) => v !== ''))
    .map((row) => ({
      _sheet: 'CLIENTES_DIRECTOS',
      status: str(row[1]).toUpperCase(), // columna B
      embajador: str(row[2]), // columna C
      plaza: str(row[3]), // columna D
      cliente: str(row[4]).toUpperCase(), // columna E
    }))
    .filter((r) => r.cliente)
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
    const fecha = toISODateUS(r['Timestamp'])
    const porDia = {}
    let totalCuentas = 0
    DIAS.forEach((d) => {
      const val = str(r[DIA_KEYS[d]])
      const cuentas = val
        ? val
            .split(',')
            .map((c) => c.trim().toUpperCase())
            .filter(Boolean)
        : []
      porDia[d] = cuentas
      totalCuentas += cuentas.length
    })
    return {
      _sheet: 'PLANEACION',
      fecha,
      semana: mondayOf(fecha),
      embajador: str(r['Embajador Respondiendo el Cuestionario']),
      porDia,
      totalCuentasPlaneadas: totalCuentas,
      raw: r,
    }
  })
}
