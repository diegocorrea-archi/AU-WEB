import { useMemo, useState } from 'react'
import { Bar, BarChart, CartesianGrid, Legend, ResponsiveContainer, Tooltip, XAxis, YAxis } from 'recharts'
import { useFilters } from '../context/FilterContext'
import { calcularActivaciones, esPrimo, mesesActivaciones, METAS_PRIMO } from '../lib/activaciones'
import { integer, pct } from '../lib/kpis'
import KpiCard from '../components/KpiCard'
import ChartCard from '../components/charts/ChartCard'
import EmptyState from '../components/EmptyState'

const fmtMes = (s) => s ? new Intl.DateTimeFormat('es-MX', { year: 'numeric', month: 'long', timeZone: 'UTC' }).format(new Date(`${s}-01T12:00:00Z`)) : ''
const pctOrDash = (n) => n === null ? '—' : pct(n)
const table = 'w-full text-sm text-left'
const th = 'px-3 py-2.5 text-xs uppercase text-muted tracking-wide whitespace-nowrap'
const td = 'px-3 py-3 border-t border-line'

export default function Activaciones() {
  const { filtered, filters, status } = useFilters()
  const [canal, setCanal] = useState('ON')
  const [mesElegido, setMesElegido] = useState('')
  const [personaElegida, setPersonaElegida] = useState('')
  const [verTodos, setVerTodos] = useState(false)
  const meses = useMemo(() => mesesActivaciones(filtered, canal), [filtered, canal])
  // El mes más reciente disponible se selecciona automáticamente; se evita
  // mostrar valores falsos cuando cambia el canal o los filtros globales.
  const mes = meses.includes(mesElegido) ? mesElegido : meses[0] || ''
  const resumen = useMemo(() => calcularActivaciones(filtered, { canal, mes }), [filtered, canal, mes])
  const persona = resumen.porPersona.find((p) => p.id === personaElegida)
  const desglose = persona?.desglose ?? resumen.desglose
  const detalle = persona ? resumen.detalle.filter((r) => r.embajador.trim().toUpperCase() === persona.id) : resumen.detalle
  const muestra = verTodos ? detalle : detalle.slice(0, 40)
  const datosGrafica = desglose.map((d) => ({ name: d.nombre, Meta: d.meta, Realizadas: d.realizadas }))
  const rowsDisponibles = canal === 'ON' ? filtered.actividadesOn : filtered.actividadesOff
  const sinPrimo = rowsDisponibles.filter((r) => r.fecha?.startsWith(mes) && !esPrimo(r)).length
  const parcial = Boolean(filters.fechaInicio || filters.fechaFin)
  const [year, month] = mes.split('-').map(Number)
  const primero = mes ? `${mes}-01` : ''
  const ultimo = mes ? `${mes}-${String(new Date(Date.UTC(year, month, 0)).getUTCDate()).padStart(2, '0')}` : ''
  const rangoParcial = parcial && mes && ((filters.fechaInicio && filters.fechaInicio > primero) || (filters.fechaFin && filters.fechaFin < ultimo))

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <h2 className="section-title text-2xl text-ink">Activaciones</h2>
          <p className="text-sm text-muted mt-1">Primo · actividades realizadas frente a objetivos mensuales por embajador.</p>
        </div>
        <div className="flex gap-3 flex-wrap items-end">
          <label className="flex flex-col gap-1">
            <span className="text-[10px] uppercase tracking-wide text-muted">Canal</span>
            <select aria-label="Canal de activaciones" value={canal} onChange={(e) => { setCanal(e.target.value); setMesElegido(''); setPersonaElegida('') }} className="bg-panel border border-line rounded-sm px-3 py-2 text-sm text-ink">
              <option value="ON">ON</option><option value="OFF">OFF</option>
            </select>
          </label>
          <label className="flex flex-col gap-1">
            <span className="text-[10px] uppercase tracking-wide text-muted">Mes</span>
            <select aria-label="Mes de activaciones" value={mes} onChange={(e) => { setMesElegido(e.target.value); setPersonaElegida('') }} className="bg-panel border border-line rounded-sm px-3 py-2 text-sm text-ink" disabled={!meses.length}>
              {meses.map((m) => <option key={m} value={m}>{fmtMes(m)}</option>)}
            </select>
          </label>
        </div>
      </div>
      {rangoParcial && <p role="status" className="border border-amber-300 bg-amber-50 rounded-md p-3 text-sm text-amber-900">El filtro global de fechas cubre solo parte de {fmtMes(mes)}: se muestran las actividades dentro del rango, pero las metas corresponden al mes completo. Quita el filtro de fechas para comparar el mes íntegro.</p>}
      {filters.brand === 'Unión' && <p className="bg-panel border border-line rounded-md p-3 text-sm text-muted">Esta pestaña está dedicada a Primo; el filtro global de marca no cambia sus resultados.</p>}
      <p className="text-xs text-muted">Objetivos por persona: {METAS_PRIMO[canal].map((d) => `${d.meta} ${d.nombre.toLowerCase()}`).join(' · ')}. El cumplimiento puede superar el 100%.</p>
      <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-3">
        <KpiCard label="Embajadores registrados" value={integer(resumen.personas)} sub="con Primo en el mes" />
        <KpiCard label="Meta mensual conjunta" value={integer(resumen.meta)} />
        <KpiCard label="Actividades realizadas" value={integer(resumen.realizadas)} sub="con objetivo" />
        <KpiCard label="Cumplimiento" value={pctOrDash(resumen.cumplimiento)} />
        <KpiCard label="Faltantes por tipo" value={integer(resumen.faltantes)} />
        <KpiCard label="Sin meta asignada" value={integer(resumen.adicionales)} sub="reportadas aparte" />
      </div>
      <p className="text-xs text-muted">La meta del equipo se calcula solo con embajadores que registraron actividades de Primo durante el mes seleccionado. Sin un padrón de personal activo no es posible incluir a quienes tienen cero registros; esto puede reducir artificialmente la meta del equipo.</p>
      {!mes || !resumen.personas ? (
        <EmptyState message={status.loading ? 'Cargando actividades…' : 'No hay actividades de Primo para este canal, mes y filtros. Prueba con otro periodo o embajador.'} />
      ) : <>
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
          <ChartCard title="Proyectadas vs. realizadas" subtitle={persona ? persona.embajador : `Total del equipo ${canal}`} className="h-80">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={datosGrafica} layout="vertical" margin={{ left: 16, right: 16 }}>
                <CartesianGrid stroke="#E6E2D8" horizontal={false} />
                <XAxis type="number" tick={{ fontSize: 11 }} allowDecimals={false} />
                <YAxis type="category" dataKey="name" width={150} tick={{ fontSize: 10 }} />
                <Tooltip /><Legend />
                <Bar dataKey="Meta" fill="#B9862F" radius={[0, 4, 4, 0]} />
                <Bar dataKey="Realizadas" fill="#E1543A" radius={[0, 4, 4, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </ChartCard>
          <div className="bg-panel border border-line rounded-md p-4 overflow-x-auto">
            <h3 className="font-semibold text-ink mb-1">Cumplimiento por actividad</h3>
            <p className="text-xs text-muted mb-3">{persona ? persona.embajador : `Equipo ${canal}`} · {fmtMes(mes)}</p>
            <table className={table}>
              <thead><tr><th className={th}>Actividad</th><th className={`${th} text-right`}>Meta</th><th className={`${th} text-right`}>Real</th><th className={`${th} text-right`}>%</th></tr></thead>
              <tbody>{desglose.map((d) => <tr key={d.id}>
                <td className={td}>{d.nombre}</td><td className={`${td} text-right`}>{d.meta}</td><td className={`${td} text-right`}>{d.realizadas}</td>
                <td className={`${td} text-right font-semibold ${d.cumplimiento !== null && d.cumplimiento >= 1 ? 'text-positive' : 'text-negative'}`}>{pctOrDash(d.cumplimiento)}</td>
              </tr>)}</tbody>
            </table>
          </div>
        </div>
        <div className="bg-panel border border-line rounded-md p-4 overflow-x-auto">
          <div className="flex flex-wrap justify-between gap-2 items-center mb-3">
            <div><h3 className="font-semibold text-ink">Desempeño por embajador</h3><p className="text-xs text-muted">Selecciona una persona para ver su detalle.</p></div>
            {persona && <button type="button" onClick={() => setPersonaElegida('')} className="text-xs underline text-ink">Ver equipo completo</button>}
          </div>
          <table className={table}>
            <thead><tr><th className={th}>Embajador</th><th className={`${th} text-right`}>Meta</th><th className={`${th} text-right`}>Real</th><th className={`${th} text-right`}>Faltantes</th><th className={`${th} text-right`}>Extras</th><th className={`${th} text-right`}>Cumplimiento</th></tr></thead>
            <tbody>{resumen.porPersona.map((p) => <tr key={p.id} className={persona?.id === p.id ? 'bg-gray-50' : ''}>
              <td className={td}><button type="button" className="text-left underline decoration-dotted hover:decoration-solid" onClick={() => setPersonaElegida(persona?.id === p.id ? '' : p.id)}>{p.embajador}</button></td>
              <td className={`${td} text-right`}>{p.meta}</td><td className={`${td} text-right`}>{p.realizadas}</td><td className={`${td} text-right`}>{p.faltantes}</td><td className={`${td} text-right`}>{p.extras}</td>
              <td className={`${td} text-right font-semibold ${p.cumplimiento >= 1 ? 'text-positive' : 'text-negative'}`}>{pct(p.cumplimiento)}</td>
            </tr>)}</tbody>
          </table>
        </div>
        <div className="bg-panel border border-line rounded-md p-4 overflow-x-auto">
          <div className="flex flex-wrap justify-between gap-2 mb-3 items-center">
            <div><h3 className="font-semibold text-ink">Registro de actividades Primo</h3><p className="text-xs text-muted">{detalle.length} registros · {resumen.adicionales} adicionales sin objetivo · {sinPrimo} registros de otras marcas o sin SKU Primo excluidos</p></div>
            {detalle.length > 40 && <button type="button" onClick={() => setVerTodos((v) => !v)} className="text-xs underline text-ink">{verTodos ? 'Mostrar primeras 40' : `Ver los ${detalle.length} registros`}</button>}
          </div>
          <table className={table}>
            <thead><tr><th className={th}>Fecha</th><th className={th}>Embajador</th><th className={th}>Cliente</th><th className={th}>Tipo de actividad</th><th className={th}>Evidencia</th></tr></thead>
            <tbody>{muestra.map((r, i) => <tr key={`${r.fecha}-${r.embajador}-${i}`}>
              <td className={`${td} whitespace-nowrap`}>{r.fecha}</td><td className={td}>{r.embajador}</td><td className={td}>{r.cliente || '—'}</td><td className={td}>{r.tipoActividad || 'Sin clasificar'}</td>
              <td className={td}>{/^https:\/\//i.test(String(r.raw?.['FOTO DE EVIDENCIA PRIMO'] || '')) ? <a className="underline" href={String(r.raw['FOTO DE EVIDENCIA PRIMO']).split(',')[0].trim()} target="_blank" rel="noopener noreferrer">Ver foto</a> : '—'}</td>
            </tr>)}</tbody>
          </table>
        </div>
      </>}
    </div>
  )
}
