// Conector a Google Sheets (sin backend, sin API key)
// ----------------------------------------------------
// Google permite exportar cualquier hoja de un Sheet público como CSV con
// una URL de este tipo (no requiere API key ni OAuth):
//
//   https://docs.google.com/spreadsheets/d/{SHEET_ID}/gviz/tq?tqx=out:csv&sheet={NOMBRE_HOJA}
//
// Requisitos en el Sheet:
//   Archivo > Compartir > Publicar en la web  -> "Todo el documento", o
//   Compartir > "Cualquier persona con el enlace puede ver".
//
// Uso:
//   1. Copia el SHEET_ID de la URL del Google Sheet real:
//        https://docs.google.com/spreadsheets/d/<AQUI_VA_EL_ID>/edit
//   2. Crea un archivo .env (basado en .env.example) con:
//        VITE_SHEET_ID=<AQUI_VA_EL_ID>
//   3. Sustituye en src/lib/kpis.js el import de ../data/sheetData.json
//      por una llamada a fetchAllSheets() (ver README "Conectar el Sheet real").
//
// Nota: por CORS, este fetch funciona directamente desde el navegador
// porque docs.google.com responde con cabeceras públicas para /gviz/tq.
// Si en tu organización se bloquea, mueve estas mismas funciones a un
// endpoint Express (ver carpeta /server-example en el README) y haz el
// fetch desde el backend en su lugar — la lógica de parseo es idéntica.

const SHEET_ID = import.meta.env.VITE_SHEET_ID || ''

const SHEETS = {
  ventas: 'VENTAS',
  sell_out: 'SELL_OUT',
  actividades_on: 'ACTIVIDADES_ON',
  actividades_off: 'ACTIVIDADES_OFF',
  universo_on: 'UNIVERSO_ON',
  universo_off: 'UNIVERSO_OFF',
  planeacion: 'PLANEACION',
  clientes_directos: 'CLIENTES_DIRECTOS',
}

function csvUrl(sheetName) {
  return `https://docs.google.com/spreadsheets/d/${SHEET_ID}/gviz/tq?tqx=out:csv&sheet=${encodeURIComponent(
    sheetName
  )}`
}

function jsonUrl(sheetName) {
  // headers=1 fuerza a que la primera fila SIEMPRE se trate como
  // encabezado. Sin esto, el endpoint JSON de gviz a veces "adivina" mal
  // (a diferencia del CSV, que siempre usa la fila 1 como encabezado) y
  // devuelve columnas como "A", "B", "C"... en vez de los nombres reales.
  return `https://docs.google.com/spreadsheets/d/${SHEET_ID}/gviz/tq?tqx=out:json&headers=1&sheet=${encodeURIComponent(
    sheetName
  )}`
}

// Parser CSV simple pero robusto a comas dentro de comillas (común en
// columnas como "Cuentas a visitar el lunes" u "Observaciones").
// Devuelve las filas crudas (array de arrays, incluyendo la fila de
// encabezado) — parseCsv() construye los objetos por nombre de columna a
// partir de esto.
export function parseCsvRows(text) {
  const rows = []
  let row = []
  let field = ''
  let inQuotes = false

  for (let i = 0; i < text.length; i++) {
    const c = text[i]
    if (inQuotes) {
      if (c === '"' && text[i + 1] === '"') {
        field += '"'
        i++
      } else if (c === '"') {
        inQuotes = false
      } else {
        field += c
      }
    } else if (c === '"') {
      inQuotes = true
    } else if (c === ',') {
      row.push(field)
      field = ''
    } else if (c === '\n') {
      row.push(field)
      rows.push(row)
      row = []
      field = ''
    } else if (c === '\r') {
      // ignorar
    } else {
      field += c
    }
  }
  if (field.length || row.length) {
    row.push(field)
    rows.push(row)
  }
  return rows.filter((r) => r.some((v) => v !== ''))
}

export function parseCsv(text) {
  const [header, ...body] = parseCsvRows(text)
  if (!header) return []
  return body.map((r) => Object.fromEntries(header.map((h, idx) => [h.trim(), r[idx] ?? ''])))
}

export async function fetchSheetRaw(sheetName) {
  const res = await fetch(csvUrl(sheetName))
  if (!res.ok) throw new Error(`No se pudo leer la hoja ${sheetName} (${res.status})`)
  const text = await res.text()
  return parseCsvRows(text)
}

export async function fetchSheet(sheetName) {
  const rows = await fetchSheetRaw(sheetName)
  if (!rows.length) return []
  const [header, ...body] = rows
  return body.map((r) => Object.fromEntries(header.map((h, idx) => [h.trim(), r[idx] ?? ''])))
}

// --- Lectura de fecha sin ambigüedad para columnas de timestamp mixtas ----
// El CSV de Google exporta fechas como TEXTO formateado, y ese texto puede
// venir en DÍA/MES/AÑO o MES/DÍA/AÑO según si la celda es texto plano
// (auto-generado por Google Forms) o una celda de tipo Fecha real — dentro
// de la MISMA columna puede haber una mezcla de ambas, lo cual es
// irresoluble de forma confiable solo con texto.
//
// El JSON de gviz sí distingue el tipo: una celda de tipo Fecha llega como
// "Date(año, mes0indexado, día, hora, min, seg)", sin ambigüedad. El
// problema es que el JSON de gviz a veces "adivina mal" los NOMBRES de
// columna (a diferencia del CSV, que siempre usa la fila 1 tal cual) — así
// que NUNCA confiamos en los nombres de columna del JSON. En vez de eso:
// 1. Usamos el CSV (confiable) para encabezados y todos los demás campos.
// 2. Usamos el JSON solo para el VALOR de la columna de fecha, alineado
//    por posición (mismo índice de columna, mismo orden de fila).
function unwrapGvizJson(text) {
  const match = text.match(/setResponse\(([\s\S]*)\);?\s*$/)
  if (!match) throw new Error('Respuesta inesperada de Google Sheets (formato JSON no reconocido).')
  // "Date(...)" no es JSON válido tal cual. Solo lo reemplazamos cuando
  // aparece justo después de ":" (valor de una propiedad) para no tocar
  // por accidente un texto que contenga literalmente "Date(" dentro de un
  // comentario u otra celda de texto.
  const safe = match[1].replace(/:\s*Date\(([^)]*)\)/g, (_, args) => `:"__DATE__(${args})"`)
  try {
    return JSON.parse(safe)
  } catch (err) {
    const pos = Number((err.message.match(/position (\d+)/) || [])[1])
    const contexto = Number.isFinite(pos) ? safe.slice(Math.max(0, pos - 80), pos + 80) : safe.slice(0, 160)
    console.warn(`[googleSheets] No se pudo parsear el JSON de gviz. Contexto:`, contexto)
    throw err
  }
}

function cellValue(cell) {
  if (!cell || cell.v === null || cell.v === undefined) return ''
  const v = cell.v
  if (typeof v === 'string' && v.startsWith('__DATE__(')) {
    const parts = v
      .slice('__DATE__('.length, -1)
      .split(',')
      .map((n) => parseInt(n.trim(), 10))
    const [y, m0, d, h = 0, mi = 0, s = 0] = parts
    // mes en gviz viene 0-indexado (0 = enero)
    const dt = new Date(Date.UTC(y, m0, d, h, mi, s))
    return dt.toISOString()
  }
  return String(v)
}

// Trae una hoja completa por CSV (confiable) y, para UNA columna de fecha
// específica, sobreescribe su valor con la versión sin ambigüedad que
// venga del JSON — alineando filas por posición, no por nombre.
export async function fetchSheetWithReliableDate(sheetName, dateHeader) {
  const csvRows = await fetchSheetRaw(sheetName) // array de arrays, incluye encabezado
  if (!csvRows.length) return []
  const [header, ...body] = csvRows
  const dateIdx = header.findIndex((h) => h.trim() === dateHeader)

  let jsonDates = null
  if (dateIdx !== -1) {
    try {
      const res = await fetch(jsonUrl(sheetName))
      if (res.ok) {
        const text = await res.text()
        const data = unwrapGvizJson(text)
        jsonDates = (data.table.rows || []).map((r) => cellValue(r.c && r.c[dateIdx]))
        // Si gviz no detectó encabezado, la fila 0 del JSON es en realidad
        // el texto del encabezado (no un dato) — hay un desfase de 1 fila
        // contra el CSV (que ya excluye el encabezado). Lo corregimos
        // comparando tamaños en vez de asumir cuál caso aplica.
        if (jsonDates.length === body.length + 1) jsonDates = jsonDates.slice(1)
      }
    } catch (err) {
      console.warn(
        `[googleSheets] No se pudo leer "${dateHeader}" vía JSON en ${sheetName}, se usará el texto del CSV tal cual.`,
        err.message
      )
    }
  } else {
    console.warn(`[googleSheets] La hoja "${sheetName}" no tiene una columna llamada exactamente "${dateHeader}".`)
  }

  return body.map((r, i) => {
    const obj = Object.fromEntries(header.map((h, idx) => [h.trim(), r[idx] ?? '']))
    if (dateIdx !== -1 && jsonDates && jsonDates[i]) {
      obj[dateHeader] = jsonDates[i]
    }
    return obj
  })
}

export async function fetchAllSheets() {
  if (!SHEET_ID) {
    throw new Error(
      'VITE_SHEET_ID no está configurado. Define el ID del Google Sheet en tu archivo .env (ver .env.example).'
    )
  }
  const keys = Object.keys(SHEETS)
  const results = await Promise.all(
    keys.map((k) => {
      // CLIENTES_DIRECTOS se lee por posición de columna (C, D, E) porque
      // no conocemos el nombre exacto de sus encabezados.
      if (k === 'clientes_directos') return fetchSheetRaw(SHEETS[k])
      // PLANEACION y ACTIVIDADES_OFF tienen columnas de timestamp con
      // formato mixto (texto de Forms vs. celda de fecha real).
      if (k === 'planeacion') return fetchSheetWithReliableDate(SHEETS[k], 'Timestamp')
      if (k === 'actividades_off') return fetchSheetWithReliableDate(SHEETS[k], 'Marca temporal')
      return fetchSheet(SHEETS[k])
    })
  )
  return Object.fromEntries(keys.map((k, i) => [k, results[i]]))
}
