import raw from '../data/sheetData.json'
import { fetchAllSheets } from './googleSheets'
import {
  normalizeVentas,
  normalizeSellOut,
  normalizeActividadesOn,
  normalizeActividadesOff,
  normalizeUniversoOn,
  normalizeUniversoOff,
  normalizePlaneacion,
  normalizeClientesDirectos,
} from './normalize'

function buildDataset(sheets) {
  return {
    ventas: normalizeVentas(sheets.ventas || []),
    sellOut: normalizeSellOut(sheets.sell_out || []),
    actividadesOn: normalizeActividadesOn(sheets.actividades_on || []),
    actividadesOff: normalizeActividadesOff(sheets.actividades_off || []),
    universoOn: normalizeUniversoOn(sheets.universo_on || []),
    universoOff: normalizeUniversoOff(sheets.universo_off || []),
    planeacion: normalizePlaneacion(sheets.planeacion || []),
    // CLIENTES_DIRECTOS no existe en el Excel de muestra (sheetData.json),
    // solo en el Google Sheet real — por eso el fallback es [].
    clientesDirectos: normalizeClientesDirectos(sheets.clientes_directos || []),
  }
}

// Intenta cargar el Google Sheet real (via VITE_SHEET_ID). Si falla por
// cualquier motivo (ID no configurado, hoja no compartida, nombre de hoja
// distinto, CORS, etc.) cae de vuelta a la muestra local para que el
// dashboard nunca se quede en blanco — pero deja el motivo del error
// disponible para mostrarlo en la UI.
export async function loadDataset() {
  try {
    const sheets = await fetchAllSheets()
    return { data: buildDataset(sheets), source: 'sheet', error: null }
  } catch (err) {
    return { data: buildDataset(raw), source: 'muestra', error: err.message }
  }
}
