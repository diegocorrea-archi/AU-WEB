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

// Nunca presenta datos históricos como cifras en vivo por un error de conexión.
// La muestra se habilita únicamente por una acción explícita del usuario.
export async function loadDataset({ useSample = false } = {}) {
  if (useSample) return { data: buildDataset(raw), source: 'muestra', error: null }
  try {
    const sheets = await fetchAllSheets()
    return { data: buildDataset(sheets), source: 'sheet', error: null }
  } catch (err) {
    return { data: buildDataset({}), source: 'error', error: err.message }
  }
}
