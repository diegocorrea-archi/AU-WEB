
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

// URL de exportacion CSV
function csvUrl(sheetName) {
  const params = new URLSearchParams({
    tqx: 'out:csv',
    sheet: sheetName,
  })

  // Evita que Google Sheets combine varias filas
  // como encabezados en UNIVERSO_OFF.
  if (sheetName === SHEETS.universo_off) {
    params.set('headers', '0')
  }

  return `https://docs.google.com/spreadsheets/d/${SHEET_ID}/gviz/tq?${params.toString()}`
}

// URL JSON para fechas confiables
function jsonUrl(sheetName) {
  const params = new URLSearchParams({
    tqx: 'out:json',
    headers: '1',
    sheet: sheetName,
  })

  return `https://docs.google.com/spreadsheets/d/${SHEET_ID}/gviz/tq?${params.toString()}`
}

// Parser CSV
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
    } else if (c !== '\r') {
      field += c
    }
  }

  if (field.length || row.length) {
    row.push(field)
    rows.push(row)
  }

  // Eliminar filas completamente vacias
  return rows.filter((r) =>
    r.some((v) => String(v).trim() !== '')
  )
}

// Convertir filas CSV a objetos
export function parseCsv(text) {
  const [header, ...body] = parseCsvRows(text)

  if (!header) return []

  const columns = header.map((h) =>
    String(h).replace(/^\uFEFF/, '').trim()
  )

  return body.map((r) =>
    Object.fromEntries(
      columns.map((h, idx) => [h, r[idx] ?? ''])
    )
  )
}

// Validacion de encabezados de UNIVERSO_OFF
function validateUniversoOffHeader(header) {
  const normalized = header.map((h) =>
    String(h)
      .replace(/^\uFEFF/, '')
      .trim()
      .toUpperCase()
  )

  const required = [
    'NOMBRE DE CUENTA',
    'STATUS',
    'OPERADOR',
  ]

  const missing = required.filter(
    (name) => !normalized.includes(name)
  )

  if (missing.length) {
    console.error(
      '[UNIVERSO_OFF] Encabezados recibidos:',
      header
    )

    throw new Error(
      'UNIVERSO_OFF tiene encabezados incorrectos. ' +
      'Faltan: ' + missing.join(', ') + '. ' +
      'Google Sheets podria estar combinando las ' +
      'primeras filas como encabezados.'
    )
  }
}

// Obtener filas crudas
export async function fetchSheetRaw(sheetName) {
  const url = csvUrl(sheetName)

  const res = await fetch(url, {
    cache: 'no-store',
  })

  if (!res.ok) {
    throw new Error(
      `No se pudo leer la hoja ${sheetName} (${res.status})`
    )
  }

  const text = await res.text()
  const rows = parseCsvRows(text)

  if (sheetName === SHEETS.universo_off && rows.length) {
    validateUniversoOffHeader(rows[0])

    console.info(
      '[UNIVERSO_OFF] Filas de datos recibidas:',
      rows.length - 1
    )
  }

  return rows
}

// Obtener hoja como objetos
export async function fetchSheet(sheetName) {
  const rows = await fetchSheetRaw(sheetName)

  if (!rows.length) return []

  const [header, ...body] = rows

  const columns = header.map((h) =>
    String(h).replace(/^\uFEFF/, '').trim()
  )

  const result = body.map((r) =>
    Object.fromEntries(
      columns.map((h, idx) => [h, r[idx] ?? ''])
    )
  )

  if (sheetName === SHEETS.universo_off) {
    const activos = result.filter(
      (r) =>
        String(r.STATUS || '')
          .trim()
          .toUpperCase() === 'ACTIVO'
    )

    console.info(
      '[UNIVERSO_OFF] Registros totales:',
      result.length
    )

    console.info(
      '[UNIVERSO_OFF] Registros ACTIVO:',
      activos.length
    )

    console.info(
      '[UNIVERSO_OFF] Operadores:',
      [...new Set(
        activos.map((r) => r.Operador).filter(Boolean)
      )]
    )
  }

  return result
}

// Procesamiento de JSON de Google Visualization
function unwrapGvizJson(text) {
  const match = text.match(
    /setResponse\(([\s\S]*)\);?\s*$/
  )

  if (!match) {
    throw new Error(
      'Respuesta inesperada de Google Sheets.'
    )
  }

  const safe = match[1].replace(
    /:\s*Date\(([^)]*)\)/g,
    (_, args) => `:"__DATE__(${args})"`
  )

  try {
    return JSON.parse(safe)
  } catch (err) {
    const pos = Number(
      (err.message.match(/position (\d+)/) || [])[1]
    )

    const contexto = Number.isFinite(pos)
      ? safe.slice(
          Math.max(0, pos - 80),
          pos + 80
        )
      : safe.slice(0, 160)

    console.warn(
      '[googleSheets] Error procesando JSON:',
      contexto
    )

    throw err
  }
}

// Extraer valor de una celda
function cellValue(cell) {
  if (
    !cell ||
    cell.v === null ||
    cell.v === undefined
  ) {
    return ''
  }

  const v = cell.v

  if (
    typeof v === 'string' &&
    v.startsWith('__DATE__(')
  ) {
    const parts = v
      .slice('__DATE__('.length, -1)
      .split(',')
      .map((n) => parseInt(n.trim(), 10))

    const [
      y,
      m0,
      d,
      h = 0,
      mi = 0,
      s = 0,
    ] = parts

    const dt = new Date(
      Date.UTC(y, m0, d, h, mi, s)
    )

    return dt.toISOString()
  }

  return String(v)
}

// Obtener hojas con fechas confiables
export async function fetchSheetWithReliableDate(
  sheetName,
  dateHeader
) {
  const csvRows = await fetchSheetRaw(sheetName)

  if (!csvRows.length) return []

  const [header, ...body] = csvRows

  const dateIdx = header.findIndex(
    (h) => h.trim() === dateHeader
  )

  let jsonDates = null

  if (dateIdx !== -1) {
    try {
      const res = await fetch(jsonUrl(sheetName))

      if (res.ok) {
        const text = await res.text()
        const data = unwrapGvizJson(text)

        jsonDates = (data.table.rows || []).map(
          (r) => cellValue(r.c && r.c[dateIdx])
        )

        // Corregir desfase entre JSON y CSV
        if (jsonDates.length === body.length + 1) {
          jsonDates = jsonDates.slice(1)
        }
      }
    } catch (err) {
      console.warn(
        `[googleSheets] No se pudo leer ${dateHeader} ` +
        `en ${sheetName}. Se usara el CSV.`,
        err.message
      )
    }
  } else {
    console.warn(
      `[googleSheets] No existe la columna ` +
      `"${dateHeader}" en ${sheetName}.`
    )
  }

  return body.map((r, i) => {
    const obj = Object.fromEntries(
      header.map((h, idx) => [
        h.trim(),
        r[idx] ?? '',
      ])
    )

    if (
      dateIdx !== -1 &&
      jsonDates &&
      jsonDates[i]
    ) {
      obj[dateHeader] = jsonDates[i]
    }

    return obj
  })
}

// Obtener todas las hojas
export async function fetchAllSheets() {
  if (!SHEET_ID) {
    throw new Error(
      'VITE_SHEET_ID no esta configurado. ' +
      'Define el ID de Google Sheets en .env.'
    )
  }

  const keys = Object.keys(SHEETS)

  const results = await Promise.all(
    keys.map((k) => {
      // CLIENTES_DIRECTOS utiliza columnas por posicion
      if (k === 'clientes_directos') {
        return fetchSheetRaw(SHEETS[k]).catch(
          (err) => {
            console.warn(
              '[googleSheets] CLIENTES_DIRECTOS no disponible:',
              err.message
            )
            return []
          }
        )
      }

      // PLANEACION contiene fechas mixtas
      if (k === 'planeacion') {
        return fetchSheetWithReliableDate(
          SHEETS[k],
          'Timestamp'
        )
      }

      // ACTIVIDADES_OFF contiene fechas mixtas
      if (k === 'actividades_off') {
        return fetchSheetWithReliableDate(
          SHEETS[k],
          'Marca temporal'
        )
      }

      return fetchSheet(SHEETS[k])
    })
  )

  return Object.fromEntries(
    keys.map((k, i) => [k, results[i]])
  )
}
