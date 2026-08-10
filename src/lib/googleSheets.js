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
}

function csvUrl(sheetName) {
  return `https://docs.google.com/spreadsheets/d/${SHEET_ID}/gviz/tq?tqx=out:csv&sheet=${encodeURIComponent(
    sheetName
  )}`
}

// Parser CSV simple pero robusto a comas dentro de comillas (común en
// columnas como "Cuentas a visitar el lunes" u "Observaciones").
export function parseCsv(text) {
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

  const [header, ...body] = rows
  return body
    .filter((r) => r.some((v) => v !== ''))
    .map((r) => Object.fromEntries(header.map((h, idx) => [h.trim(), r[idx] ?? ''])))
}

export async function fetchSheet(sheetName) {
  const res = await fetch(csvUrl(sheetName))
  if (!res.ok) throw new Error(`No se pudo leer la hoja ${sheetName} (${res.status})`)
  const text = await res.text()
  return parseCsv(text)
}

export async function fetchAllSheets() {
  if (!SHEET_ID) {
    throw new Error(
      'VITE_SHEET_ID no está configurado. Define el ID del Google Sheet en tu archivo .env (ver .env.example).'
    )
  }
  const keys = Object.keys(SHEETS)
  const results = await Promise.all(keys.map((k) => fetchSheet(SHEETS[k])))
  return Object.fromEntries(keys.map((k, i) => [k, results[i]]))
}
