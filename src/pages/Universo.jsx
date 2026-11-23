import { useMemo, useState } from 'react'
import { useFilters } from '../context/FilterContext'
import { buildUniverso, canon } from '../lib/universo'
import { formatMonthLabel, getAvailableMonths, getCurrentMonth, integer, money } from '../lib/kpis'
import KpiCard from '../components/KpiCard'

const PAGE = 50
const pct = n => `${(n * 100).toFixed(1)}%`
const dates = d => d ? new Date(`${d}T12:00:00Z`).toLocaleDateString('es-MX', { timeZone:'UTC', day:'2-digit', month:'short', year:'numeric' }) : 'Sin registro'
const selectClass = 'bg-panel border border-line rounded-sm px-3 py-2 text-sm text-ink min-w-0'

export default function Universo() {
  const { dataset, filtered, filters, status } = useFilters()
  const [month, setMonth] = useState(getCurrentMonth())
  const [canal, setCanal] = useState('TODOS')
  const [marca, setMarca] = useState('TODAS')
  const [vendedor, setVendedor] = useState('')
  const [busqueda, setBusqueda] = useState('')
  const [pendientes, setPendientes] = useState(false)
  const [selectedKey, setSelectedKey] = useState(null)
  const [limit, setLimit] = useState(PAGE)

  const meses = useMemo(() => {
    const all = new Set(getAvailableMonths(filtered))
    dataset.sellOut.forEach(r => r.fecha && all.add(r.fecha.slice(0,7)))
    return [...all].sort()
  }, [filtered, dataset])
  const selectedMonth = meses.includes(month) ? month : meses.at(-1) || getCurrentMonth()
  // Se utiliza el universo filtrado para el padrón ACTIVO y los movimientos
  // originales para conservar el historial de última visita previo al mes.
  // Los filtros globales de fechas se mantienen para las métricas comerciales.
  const activeScope = (r) => canon(r.status) === 'ACTIVO' && (!filters.plaza || r.plaza === filters.plaza) && (!filters.ciudad || r.ciudad === filters.ciudad) && (!filters.embajador || canon(r.operador) === canon(filters.embajador)) && (!filters.brand || [canon(filters.brand), 'BOTH', 'AMBAS', 'AMBOS', 'UNION Y PRIMO', 'PRIMO Y UNION'].includes(canon(r.brand)))
  const feed = useMemo(() => ({
    universoOn: dataset.universoOn.filter(activeScope),
    universoOff: dataset.universoOff.filter(activeScope),
    actividadesOn: dataset.actividadesOn,
    actividadesOff: dataset.actividadesOff,
    ventas: dataset.ventas,
    sellOut: dataset.sellOut,
  }), [filtered, dataset, filters.plaza, filters.ciudad, filters.embajador, filters.brand])
  const diagnosticoOff = useMemo(() => ({
    registros: dataset.universoOff.length,
    activos: dataset.universoOff.filter(r => canon(r.status) === 'ACTIVO').length,
    conCuenta: dataset.universoOff.filter(r => canon(r.status) === 'ACTIVO' && r.cuenta).length,
    filtrados: feed.universoOff.length,
  }), [dataset.universoOff, feed.universoOff])
  const { cuentas, vendedores, resumen } = useMemo(() => buildUniverso(feed, selectedMonth, { canal, brand: marca, embajador: vendedor }), [feed, selectedMonth, canal, marca, vendedor])
  const opcionesVendedor = useMemo(() => {
    const rows = [...feed.universoOn.map(r=>({...r, canal:'ON'})), ...feed.universoOff.map(r=>({...r, canal:'OFF'}))]
    return [...new Set(rows.filter(r=>canal==='TODOS'||r.canal===canal).map(r=>r.operador).filter(Boolean))].sort()
  }, [feed, canal])
  const visibles = useMemo(() => cuentas.filter(c => (!pendientes || !c.visitada) && (!busqueda || [c.cuenta,c.embajador,c.plaza,c.ciudad].some(t => canon(t).includes(canon(busqueda))))), [cuentas, pendientes, busqueda])
  const seleccionada = cuentas.find(c=>c.key===selectedKey)
  const resetPage = () => { setLimit(PAGE); setSelectedKey(null) }

  return <div className="space-y-6">
    <div>
      <h2 className="section-title text-2xl text-ink">Universo</h2>
      <p className="text-sm text-muted mt-1">Cuentas activas asignadas actualmente · cobertura y actividad del mes · últimas visitas históricas.</p>
    </div>
    {status.source === 'muestra' && <p className="text-sm bg-yellow-50 border border-yellow-200 p-3 rounded">Estás viendo datos de muestra, no registros actualizados de Google Sheets.</p>}
    <div className="bg-panel border border-line p-4 rounded-sm flex flex-wrap gap-3 items-end">
      <label className="flex flex-col gap-1"><span className="text-xs text-muted">Mes</span><select className={selectClass} value={selectedMonth} onChange={e=>{setMonth(e.target.value);resetPage()}}>{meses.slice().reverse().map(m=><option key={m} value={m}>{formatMonthLabel(m)}</option>)}</select></label>
      <label className="flex flex-col gap-1"><span className="text-xs text-muted">Canal</span><select className={selectClass} value={canal} onChange={e=>{setCanal(e.target.value);setVendedor('');resetPage()}}><option value="TODOS">ON y OFF</option><option value="ON">ON</option><option value="OFF">OFF</option></select></label>
      <label className="flex flex-col gap-1"><span className="text-xs text-muted">Marca del universo</span><select className={selectClass} value={marca} onChange={e=>{setMarca(e.target.value);resetPage()}}><option value="TODAS">Unión y Primo</option><option value="Unión">Unión</option><option value="Primo">Primo</option></select></label>
      <label className="flex flex-col gap-1"><span className="text-xs text-muted">Vendedor</span><select className={selectClass} value={opcionesVendedor.includes(vendedor)?vendedor:''} onChange={e=>{setVendedor(e.target.value);resetPage()}}><option value="">Todos</option>{opcionesVendedor.map(n=><option key={n} value={n}>{n}</option>)}</select></label>
    </div>
    {(canal === 'OFF' || canal === 'TODOS') && diagnosticoOff.conCuenta === 0 && <div role="alert" className="bg-amber-50 border border-amber-300 p-3 text-sm text-amber-900">No se encontraron cuentas activas con nombre en UNIVERSO_OFF. Verifica que la hoja tenga las columnas de cuenta, STATUS y Operador, y que existan registros con estado ACTIVO. Registros recibidos: {diagnosticoOff.registros}; activos: {diagnosticoOff.activos}.</div>}
    {(canal === 'OFF' || canal === 'TODOS') && diagnosticoOff.conCuenta > 0 && diagnosticoOff.filtrados === 0 && <div role="alert" className="bg-amber-50 border border-amber-300 p-3 text-sm text-amber-900">UNIVERSO_OFF contiene {diagnosticoOff.conCuenta} cuentas activas, pero ninguna coincide con los filtros globales de plaza, ciudad, embajador o marca. Prueba «Limpiar filtros» en la barra superior.</div>}
    <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-4 gap-3">
      <KpiCard label="Universo activo" value={integer(resumen.total)} />
      <KpiCard label="Cuentas visitadas" value={integer(resumen.visitadas)} sub="Al menos una actividad del vendedor en el mes" />
      <KpiCard label="Por visitar" value={integer(resumen.pendientes)} />
      <KpiCard label="Cobertura mensual" value={pct(resumen.cobertura)} />
      <KpiCard label="Ventas directas $" value={money(resumen.ventas)} sub="VENTAS · concepto VENTA" />
      <KpiCard label="Botellas (sin RTD)" value={integer(resumen.botellas)} />
      <KpiCard label="RTD Primo · unidades" value={integer(resumen.rtdUnidades)} />
      <KpiCard label="RTD Primo · $" value={money(resumen.rtdPesos)} />
      <KpiCard label="Sell Out · botellas" value={integer(resumen.sellOutBotellas)} sub="Desplazamiento sin RTD" />
      <KpiCard label="Sell Out · RTD" value={integer(resumen.sellOutRtd)} sub="Unidades desplazadas" />
    </div>
    <div className="bg-panel border border-line rounded-sm p-4 space-y-2">
      <div className="flex justify-between text-sm"><strong>Cobertura del mes</strong><strong>{pct(resumen.cobertura)}</strong></div>
      <div className="h-3 bg-gray-100 rounded-full overflow-hidden"><div className="bg-union h-full" style={{width:`${resumen.cobertura*100}%`}} /></div>
      <p className="text-xs text-muted">Se cuenta una sola vez cada cuenta con al menos una actividad registrada por su vendedor actual durante el mes, independientemente del tipo de actividad.</p>
    </div>
    <section className="space-y-3">
      <h3 className="section-title text-xl">Cobertura por vendedor</h3>
      <div className="overflow-auto border border-line bg-panel rounded-sm"><table className="w-full text-sm text-left"><thead className="bg-gray-50 text-xs uppercase text-muted"><tr>{['Vendedor','Canal','Universo','Visitadas','Pendientes','Cobertura'].map(t=><th key={t} className="p-3 whitespace-nowrap">{t}</th>)}</tr></thead><tbody>{vendedores.map(v=><tr key={v.key} className="border-t border-line hover:bg-gray-50 cursor-pointer" onClick={()=>{setVendedor(v.embajador);resetPage()}}><td className="p-3 font-medium">{v.embajador}</td><td className="p-3">{v.canal}</td><td className="p-3">{integer(v.universo)}</td><td className="p-3">{integer(v.visitadas)}</td><td className="p-3">{integer(v.pendientes)}</td><td className="p-3">{pct(v.universo?v.visitadas/v.universo:0)}</td></tr>)}</tbody></table>{!vendedores.length && <p className="text-muted text-sm p-4">No se encontraron vendedores con cuentas activas.</p>}</div>
    </section>
    <section className="space-y-3">
      <div className="flex flex-wrap gap-3 justify-between items-end"><div><h3 className="section-title text-xl">Detalle de cuentas</h3><p className="text-muted text-xs">{integer(visibles.length)} cuentas · selecciona una para ver el historial.</p></div><div className="flex flex-wrap gap-3 items-center"><label className="flex gap-2 items-center text-sm"><input type="checkbox" checked={pendientes} onChange={e=>{setPendientes(e.target.checked);resetPage()}}/> Solo pendientes</label><input className={selectClass} placeholder="Buscar cuenta o vendedor" value={busqueda} onChange={e=>{setBusqueda(e.target.value);resetPage()}} /></div></div>
      <div className="overflow-x-auto bg-panel border border-line rounded-sm"><table className="w-full text-xs text-left"><thead className="bg-gray-50 text-muted uppercase"><tr>{['Cuenta','Canal','Vendedor','Mes','Última visita','Visitas mes','Venta $','Botellas','RTD uds.','RTD $','Sell Out bot.','Sell Out RTD'].map(t=><th key={t} className="p-3 whitespace-nowrap">{t}</th>)}</tr></thead><tbody>{visibles.slice(0,limit).map(c=><tr key={c.key} className={`border-t border-line cursor-pointer hover:bg-gray-50 ${selectedKey===c.key?'bg-orange-50':''}`} onClick={()=>setSelectedKey(c.key)}><td className="p-3 font-semibold min-w-[160px]">{c.cuenta}</td><td className="p-3">{c.canal}</td><td className="p-3 whitespace-nowrap">{c.embajador}</td><td className="p-3"><span className={c.visitada?'text-green-700':'text-red-700'}>{c.visitada?'Visitada':'Pendiente'}</span></td><td className="p-3 whitespace-nowrap">{dates(c.ultimaVisita)}</td><td className="p-3 text-right">{c.visitasMes}</td><td className="p-3 text-right">{money(c.ventas)}</td><td className="p-3 text-right">{integer(c.botellas)}</td><td className="p-3 text-right">{integer(c.rtdUnidades)}</td><td className="p-3 text-right">{money(c.rtdPesos)}</td><td className="p-3 text-right">{integer(c.sellOutBotellas)}</td><td className="p-3 text-right">{integer(c.sellOutRtd)}</td></tr>)}</tbody></table>{!visibles.length && <p className="p-5 text-muted">No hay cuentas para esta selección.</p>}</div>
      {visibles.length>limit && <button type="button" onClick={()=>setLimit(n=>n+PAGE)} className="border border-line bg-panel rounded-sm px-4 py-2 text-sm">Mostrar más ({integer(visibles.length-limit)} restantes)</button>}
    </section>
    {seleccionada && <section className="bg-panel border border-line rounded-sm p-4 space-y-4">
      <div className="flex justify-between gap-3 items-start"><div><h3 className="section-title text-xl">{seleccionada.cuenta}</h3><p className="text-sm text-muted">{seleccionada.canal} · {seleccionada.embajador} · {seleccionada.plaza} · {seleccionada.brand}</p></div><button type="button" onClick={()=>setSelectedKey(null)} className="text-sm border border-line px-3 py-1">Cerrar ×</button></div>
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3"><KpiCard label="Última visita del vendedor" value={dates(seleccionada.ultimaVisita)} /><KpiCard label="Visitas / actividades del mes" value={integer(seleccionada.visitasMes)} /><KpiCard label="Venta directa $" value={money(seleccionada.ventas)} /><KpiCard label="Sell Out (botellas)" value={integer(seleccionada.sellOutBotellas)} /></div>
      {seleccionada.ultimaVisitaCuenta && seleccionada.ultimaVisitaCuenta!==seleccionada.ultimaVisita && <p className="text-xs text-muted">Última actividad registrada en la cuenta por cualquier vendedor: {dates(seleccionada.ultimaVisitaCuenta)}.</p>}
      <div><h4 className="font-semibold text-sm mb-2">Tipos de actividad del mes</h4>{Object.keys(seleccionada.actividadesMes).length?<div className="flex flex-wrap gap-2">{Object.entries(seleccionada.actividadesMes).map(([tipo,n])=><span key={tipo} className="bg-gray-100 rounded-sm px-2 py-1 text-xs">{tipo}: {n}</span>)}</div>:<p className="text-sm text-muted">Sin actividades del vendedor en este mes.</p>}</div>
      <div><h4 className="font-semibold text-sm mb-2">Historial de actividades (hasta el mes seleccionado)</h4><div className="max-h-80 overflow-auto"><table className="w-full text-sm text-left"><thead className="bg-gray-50 text-muted text-xs"><tr><th className="p-2">Fecha</th><th className="p-2">Actividad</th><th className="p-2">Embajador</th><th className="p-2">Evidencia</th></tr></thead><tbody>{seleccionada.historial.map((a,i)=>{const link=a.raw?.['FOTO DE EVIDENCIA PRIMO'] || a.raw?.['FOTO DE EVIDENCIA UNIÓN'] || a.raw?.['FOTO DE EJECUCIÓN PRIMO'] || a.raw?.['FOTO DE EJECUCIÓN UNIÓN'];return <tr key={`${a.fecha}-${i}`} className="border-t border-line"><td className="p-2 whitespace-nowrap">{dates(a.fecha)}</td><td className="p-2">{a.tipoActividad}</td><td className="p-2">{a.embajador}</td><td className="p-2">{typeof link==='string'&&/^https:\/\//.test(link)?<a href={link} target="_blank" rel="noreferrer" className="underline text-blue-700">Abrir</a>:'—'}</td></tr>})}</tbody></table>{!seleccionada.historial.length && <p className="p-3 text-sm text-muted">Esta cuenta aún no registra actividades del vendedor asignado en el historial disponible.</p>}</div></div>
    </section>}
    <p className="text-xs text-muted leading-relaxed">Notas: las ventas en pesos y botellas provienen de VENTAS (concepto VENTA); los RTD Primo se separan de las botellas convencionales. Sell Out proviene de desplazamiento (VENTA y BONIFICACIONES), solo muestra unidades porque no dispone de importes comparables. Los filtros propios de Universo utilizan el mes elegido; las fechas del filtro global no restringen el historial ni las cifras de esta pestaña. Los cruces de cuentas se realizan por nombre normalizado; nombres diferentes entre hojas requieren homologación. Si la misma cuenta aparece en ambos canales, sus ventas pueden mostrarse en ambos registros. La última visita refleja la actividad del vendedor asignado actualmente.</p>
  </div>
}
