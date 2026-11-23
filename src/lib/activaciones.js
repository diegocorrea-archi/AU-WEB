// Objetivos mensuales individuales para PRIMO. Las actividades sin objetivo
// se reportan como adicionales; no inflan el cumplimiento.
export const METAS_PRIMO = {
  ON: [
    { id: 'VISITA DE MANTENIMIENTO', nombre: 'Visita de mantenimiento', meta: 80 },
    { id: 'CAPACITACIÓN', nombre: 'Capacitación', meta: 2 },
    { id: 'ACTIVACIÓN', nombre: 'Activación', meta: 1 },
    { id: 'PROSPECCIÓN / CATALOGACIÓN', nombre: 'Prospección / Catalogación', meta: 1 },
    { id: 'CATALOGACIÓN DE CÓCTEL', nombre: 'Catalogación de cóctel', meta: 1 },
  ],
  OFF: [
    { id: 'VISITA DE MANTENIMIENTO', nombre: 'Visita de mantenimiento', meta: 20 },
    { id: 'CAPACITACIÓN', nombre: 'Capacitación', meta: 1 },
    { id: 'ACTIVACIÓN', nombre: 'Activación', meta: 4 },
    { id: 'MEJORA DE ANAQUEL', nombre: 'Mejora de anaquel', meta: 1 },
    { id: 'EXHIBICIÓN ADICIONAL', nombre: 'Exhibición adicional', meta: 1 },
  ],
}

const clean = (v) => String(v ?? '').trim().toUpperCase().normalize('NFD').replace(/[\u0300-\u036f]/g, '').replace(/\s+/g, ' ')
const present = (v) => !['', 'NA', 'N/A', 'NO', 'NINGUNO', 'NINGUNA', '-', 'NULL'].includes(clean(v))
const key = (v) => clean(v)
export const esPrimo = (r) => present(r.raw?.['SKU PRIMO APERITIVO'])
export const mesDe = (r) => r.fecha?.slice(0, 7) ?? ''

export function mesesActivaciones(filtered, canal = 'ON') {
  const rows = canal === 'ON' ? filtered.actividadesOn : filtered.actividadesOff
  return [...new Set(rows.map(mesDe).filter(Boolean))].sort().reverse()
}

export function calcularActivaciones(filtered, { canal = 'ON', mes, embajador = '' } = {}) {
  const metas = METAS_PRIMO[canal]
  if (!metas) throw new Error(`Canal de activaciones desconocido: ${canal}`)
  const rows = (canal === 'ON' ? filtered.actividadesOn : filtered.actividadesOff)
    .filter((r) => mesDe(r) === mes && esPrimo(r) && (!embajador || key(r.embajador) === key(embajador)))
  // Se listan únicamente las personas con registros Primo en el periodo.
  // No existe todavía un padrón oficial de personal activo por mes.
  const names = new Map()
  rows.forEach((r) => { if (key(r.embajador) && !names.has(key(r.embajador))) names.set(key(r.embajador), r.embajador.trim()) })
  const porPersona = [...names.entries()].map(([id, nombre]) => {
    const actividades = rows.filter((r) => key(r.embajador) === id)
    const desglose = metas.map((m) => {
      const realizadas = actividades.filter((r) => key(r.tipoActividad) === key(m.id)).length
      return { ...m, realizadas, faltantes: Math.max(0, m.meta - realizadas), cumplimiento: realizadas / m.meta }
    })
    const extras = actividades.filter((r) => !metas.some((m) => key(m.id) === key(r.tipoActividad)))
    const meta = desglose.reduce((a, r) => a + r.meta, 0)
    const realizadas = desglose.reduce((a, r) => a + r.realizadas, 0)
    return { id, embajador: nombre, meta, realizadas, extras: extras.length, faltantes: desglose.reduce((a, r) => a + r.faltantes, 0), cumplimiento: realizadas / meta, desglose }
  }).sort((a, b) => b.cumplimiento - a.cumplimiento || a.embajador.localeCompare(b.embajador))
  const desglose = metas.map((m, i) => {
    const realizadas = porPersona.reduce((a, p) => a + p.desglose[i].realizadas, 0)
    const meta = m.meta * porPersona.length
    return { ...m, meta, realizadas, faltantes: Math.max(0, meta - realizadas), cumplimiento: meta ? realizadas / meta : null }
  })
  const meta = desglose.reduce((a, d) => a + d.meta, 0)
  const realizadas = desglose.reduce((a, d) => a + d.realizadas, 0)
  const detalle = rows.slice().sort((a, b) => (b.fecha || '').localeCompare(a.fecha || ''))
  return {
    canal, mes, personas: porPersona.length, meta, realizadas,
    faltantes: desglose.reduce((a, d) => a + d.faltantes, 0),
    adicionales: porPersona.reduce((a, p) => a + p.extras, 0),
    cumplimiento: meta ? realizadas / meta : null,
    desglose, porPersona, detalle,
  }
}
