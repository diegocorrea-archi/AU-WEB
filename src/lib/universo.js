// Universo de cuentas: cartera actual, cobertura mensual e historial comercial.
// No se infieren equivalencias ambiguas entre nombres de cuentas.
export const canon = (value) => String(value ?? '').normalize('NFD').replace(/[\u0300-\u036f]/g, '').toUpperCase().replace(/[^A-Z0-9]+/g, ' ').trim()
const monthOf = (date) => date?.slice(0, 7)
const sum = (rows, key) => rows.reduce((total, r) => total + (Number(r[key]) || 0), 0)
const isRtdPrimo = (r) => /\bRTD\b/.test(canon(r.producto)) && /\bPRIMO\b/.test(canon(`${r.producto} ${r.brand}`))
const validSellOut = new Set(['VENTA', 'BONIFICACIONES'])
const dateInMonth = (row, month) => monthOf(row.fecha) === month
const pastMonthEnd = (month) => { const [year, m] = month.split('-').map(Number); return new Date(Date.UTC(year, m, 0)).toISOString().slice(0, 10) }
const sale = (r) => r.concepto === 'VENTA'

export function buildUniverso({ universoOn = [], universoOff = [], actividadesOn = [], actividadesOff = [], ventas = [], sellOut = [] }, month, { canal = 'TODOS', embajador = '', brand = 'TODAS' } = {}) {
  const source = [
    ...(canal !== 'OFF' ? universoOn.map(r => ({ ...r, canalUniverso: 'ON' })) : []),
    ...(canal !== 'ON' ? universoOff.map(r => ({ ...r, canalUniverso: 'OFF' })) : []),
  ].filter(r => canon(r.status) === 'ACTIVO' && r.cuenta && (!embajador || canon(r.operador) === canon(embajador)))
  const acceptedBrand = (r) => brand === 'TODAS' || canon(r.brand) === canon(brand) || ['BOTH', 'AMBAS', 'AMBOS', 'UNION Y PRIMO', 'PRIMO Y UNION'].includes(canon(r.brand))
  const metricBrand = (r) => brand === 'TODAS' || canon(r.brand) === canon(brand)
  const accountMap = new Map()
  for (const r of source.filter(acceptedBrand)) {
    const key = `${r.canalUniverso}|${canon(r.operador)}|${canon(r.cuenta)}`
    if (!accountMap.has(key)) accountMap.set(key, { key, cuenta: r.cuenta, nombre: canon(r.cuenta), embajador: r.operador, canal: r.canalUniverso, plaza: r.plaza || '', ciudad: r.ciudad || '', brand: r.brand || '', ranking: r.ranking || '', status: r.status })
  }
  // Índices por canal/cuenta para impedir que actividades de ON cubran cuentas OFF homónimas.
  const byAccount = new Map()
  for (const a of [...actividadesOn.map(r => ({ ...r, canal: 'ON' })), ...actividadesOff.map(r => ({ ...r, canal: 'OFF' }))]) {
    if (!a.fecha || !a.cliente || !a.tipoActividad) continue
    const key = `${a.canal}|${canon(a.cliente)}`
    if (!byAccount.has(key)) byAccount.set(key, [])
    byAccount.get(key).push(a)
  }
  const bySale = new Map()
  for (const r of ventas) {
    if (!sale(r) || !metricBrand(r) || !dateInMonth(r, month) || !r.cliente) continue
    const key = canon(r.cliente)
    if (!bySale.has(key)) bySale.set(key, [])
    bySale.get(key).push(r)
  }
  const bySell = new Map()
  for (const r of sellOut) {
    if (!validSellOut.has(canon(r.concepto)) || !metricBrand(r) || !dateInMonth(r, month) || !r.cliente) continue
    const key = canon(r.cliente)
    if (!bySell.has(key)) bySell.set(key, [])
    bySell.get(key).push(r)
  }
  const cuentas = [...accountMap.values()].map(c => {
    const historial = (byAccount.get(`${c.canal}|${c.nombre}`) || [])
      .filter(a => a.fecha <= pastMonthEnd(month))
      .sort((a,b) => b.fecha.localeCompare(a.fecha))
    const propias = historial.filter(a => canon(a.embajador) === canon(c.embajador))
    const mes = propias.filter(a => dateInMonth(a, month))
    const ventasCuenta = bySale.get(c.nombre) || []
    const rtd = ventasCuenta.filter(isRtdPrimo)
    const desplazamiento = bySell.get(c.nombre) || []
    const actividadesMes = {}
    for (const a of mes) actividadesMes[a.tipoActividad] = (actividadesMes[a.tipoActividad] || 0) + 1
    return {
      ...c, visitada: mes.length > 0, visitasMes: mes.length,
      ultimaVisita: propias[0]?.fecha || null,
      ultimaVisitaCuenta: historial[0]?.fecha || null,
      diasSinVisita: propias[0] ? Math.max(0, Math.round((Date.parse(`${pastMonthEnd(month)}T00:00:00Z`) - Date.parse(`${propias[0].fecha}T00:00:00Z`)) / 86400000)) : null,
      actividadesMes,
      historial: propias,
      ventas: sum(ventasCuenta, 'monto'), botellas: sum(ventasCuenta.filter(r => !isRtdPrimo(r)), 'cantidad'),
      rtdUnidades: sum(rtd, 'cantidad'), rtdPesos: sum(rtd, 'monto'),
      sellOutBotellas: sum(desplazamiento.filter(r => !isRtdPrimo(r)), 'cantidad'),
      sellOutRtd: sum(desplazamiento.filter(isRtdPrimo), 'cantidad'),
      sellOutRegistros: desplazamiento.length,
    }
  }).sort((a,b) => a.embajador.localeCompare(b.embajador) || a.cuenta.localeCompare(b.cuenta))
  const vendedores = new Map()
  for (const c of cuentas) {
    const key = `${c.canal}|${canon(c.embajador)}`
    if (!vendedores.has(key)) vendedores.set(key,{ key, canal: c.canal, embajador: c.embajador, universo: 0, visitadas: 0, pendientes: 0 })
    const v = vendedores.get(key)
    v.universo++
    if (c.visitada) v.visitadas++
    else v.pendientes++
  }
  const resumen = {
    total: cuentas.length,
    visitadas: cuentas.filter(c=>c.visitada).length,
    pendientes: cuentas.filter(c=>!c.visitada).length,
    cobertura: cuentas.length ? cuentas.filter(c=>c.visitada).length / cuentas.length : 0,
    ventas: sum(cuentas, 'ventas'), botellas: sum(cuentas, 'botellas'), rtdUnidades: sum(cuentas, 'rtdUnidades'),
    rtdPesos: sum(cuentas, 'rtdPesos'), sellOutBotellas: sum(cuentas, 'sellOutBotellas'), sellOutRtd: sum(cuentas, 'sellOutRtd'),
  }
  return { cuentas, vendedores: [...vendedores.values()].sort((a,b)=>a.embajador.localeCompare(b.embajador)), resumen }
}
