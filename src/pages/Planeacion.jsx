import { useMemo, useState } from 'react'
import { Bar, BarChart, CartesianGrid, Line, LineChart, ResponsiveContainer, Tooltip, XAxis, YAxis } from 'recharts'
import { useFilters } from '../context/FilterContext'
import {
  computeCumplimientoTrend,
  computeDiaBreakdown,
  computePlaneacionSemana,
  formatWeekLabel,
  getAvailableWeeks,
  getCurrentWeek,
  integer,
  pct,
} from '../lib/kpis'
import KpiCard from '../components/KpiCard'
import ChartCard from '../components/charts/ChartCard'
import EmptyState from '../components/EmptyState'
import RankTable from '../components/RankTable'

const UNION = '#B9862F'
const PRIMO = '#E1543A'
const INK = '#1B1D1B'
const MUTED = '#6B6F68'

const tooltipStyle = {
  fontSize: 12,
  borderRadius: 8,
  border: '1px solid #E6E2D8',
  boxShadow: '0 4px 16px rgba(0,0,0,0.06)',
}

export default function Planeacion() {
  const { filtered } = useFilters()
  const weeks = useMemo(() => getAvailableWeeks(filtered), [filtered])
  const currentWeek = getCurrentWeek()
  const [semana, setSemana] = useState(currentWeek)

  // Si la semana seleccionada no existe en la lista disponible (cambiaron
  // los filtros), cae de vuelta a la última semana con datos.
  const semanaValida = weeks.includes(semana) ? semana : weeks[weeks.length - 1]

  const data = computePlaneacionSemana(filtered, semanaValida)
  const diaData = computeDiaBreakdown(filtered, semanaValida)
  const trend = computeCumplimientoTrend(filtered, weeks, 10)

  const embajadoresConPendientes = data.filas.filter((f) => f.pendientes.length > 0)
  const totalExtra = data.filas.reduce((acc, f) => acc + f.extras.length, 0)

  const cols = [
    { key: 'embajador', label: 'Embajador' },
    { key: 'planeadas', label: 'Planeadas', align: 'right', render: (r) => integer(r.planeadas) },
    { key: 'visitadasDelPlan', label: 'Visitadas', align: 'right', render: (r) => integer(r.visitadasDelPlan) },
    {
      key: 'cumplimiento',
      label: 'Cumplimiento',
      align: 'right',
      render: (r) => (
        <span className={r.cumplimiento >= 0.7 ? 'text-positive' : r.cumplimiento >= 0.4 ? '' : 'text-negative'}>
          {pct(r.cumplimiento)}
        </span>
      ),
    },
    { key: 'pendientes', label: 'Pendientes', align: 'right', render: (r) => integer(r.pendientes.length) },
    { key: 'union', label: 'Visitas Unión', align: 'right', render: (r) => integer(r.union) },
    { key: 'primo', label: 'Visitas Primo', align: 'right', render: (r) => integer(r.primo) },
  ]

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <h2 className="section-title text-2xl text-ink">Planeación</h2>
          <p className="text-sm text-muted mt-1">Lo que cada embajador planeó visitar vs. lo que realmente visitó.</p>
        </div>
        <label className="flex flex-col gap-1">
          <span className="text-[10px] uppercase tracking-wide text-muted">Semana</span>
          <select
            value={semanaValida}
            onChange={(e) => setSemana(e.target.value)}
            className="text-sm bg-panel border border-line rounded-sm px-2.5 py-1.5 text-ink focus:border-union min-w-[220px]"
          >
            {weeks
              .slice()
              .reverse()
              .map((w) => (
                <option key={w} value={w}>
                  {formatWeekLabel(w)}
                  {w === currentWeek ? ' · semana actual' : ''}
                </option>
              ))}
          </select>
        </label>
      </div>

      <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-5 gap-3">
        <KpiCard label="Visitas Planeadas" value={integer(data.totalPlaneadas)} />
        <KpiCard label="Visitas Ejecutadas" value={integer(data.totalVisitadas)} sub="de lo planeado" />
        <KpiCard label="Cumplimiento %" value={pct(data.cumplimiento)} />
        <KpiCard label="Embajadores con Plan" value={integer(data.filas.filter((f) => f.planeadas > 0).length)} />
        <KpiCard label="Visitas Fuera de Plan" value={integer(totalExtra)} sub="no estaban planeadas" />
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        <ChartCard title="Calendario semanal" subtitle="Planeadas vs. visitadas por día" className="h-64">
          {diaData.some((d) => d.planeadas || d.visitadas) ? (
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={diaData}>
                <CartesianGrid stroke="#E6E2D8" vertical={false} />
                <XAxis dataKey="name" tick={{ fontSize: 11, fill: MUTED }} axisLine={{ stroke: '#E6E2D8' }} />
                <YAxis tick={{ fontSize: 11, fill: MUTED }} axisLine={false} tickLine={false} />
                <Tooltip contentStyle={tooltipStyle} />
                <Bar dataKey="planeadas" fill={UNION} radius={[4, 4, 0, 0]} barSize={16} name="Planeadas" />
                <Bar dataKey="visitadas" fill={PRIMO} radius={[4, 4, 0, 0]} barSize={16} name="Visitadas" />
              </BarChart>
            </ResponsiveContainer>
          ) : (
            <EmptyState message="Sin planeación ni visitas registradas esta semana." />
          )}
        </ChartCard>

        <ChartCard title="Cumplimiento histórico" subtitle="Últimas semanas con datos" className="h-64">
          {trend.some((t) => t.planeadas) ? (
            <ResponsiveContainer width="100%" height="100%">
              <LineChart data={trend}>
                <CartesianGrid stroke="#E6E2D8" vertical={false} />
                <XAxis dataKey="name" tick={{ fontSize: 10, fill: MUTED }} axisLine={{ stroke: '#E6E2D8' }} />
                <YAxis
                  tick={{ fontSize: 11, fill: MUTED }}
                  axisLine={false}
                  tickLine={false}
                  tickFormatter={(v) => `${Math.round(v * 100)}%`}
                  domain={[0, 1]}
                />
                <Tooltip contentStyle={tooltipStyle} formatter={(v) => pct(v)} />
                <Line type="monotone" dataKey="cumplimiento" stroke={UNION} strokeWidth={2.5} dot={{ r: 3 }} />
              </LineChart>
            </ResponsiveContainer>
          ) : (
            <EmptyState message="Aún no hay suficiente histórico para mostrar tendencia." />
          )}
        </ChartCard>
      </div>

      <div className="bg-panel border border-line rounded-md p-4">
        <div className="mb-3">
          <h3 className="text-sm font-medium text-ink">Cumplimiento por embajador</h3>
          <p className="text-xs text-muted mt-0.5">
            Semana del {formatWeekLabel(semanaValida)}
            {semanaValida === currentWeek ? ' (actual)' : ''}.
          </p>
        </div>
        <RankTable columns={cols} rows={data.filas} rowKey={(r) => r.embajador} />
      </div>

      <div className="bg-panel border border-line rounded-md p-4">
        <div className="mb-3">
          <h3 className="text-sm font-medium text-ink">Cuentas pendientes por visitar</h3>
          <p className="text-xs text-muted mt-0.5">Lo que cada embajador planeó y aún no registra como visitado.</p>
        </div>
        {embajadoresConPendientes.length ? (
          <div className="space-y-3">
            {embajadoresConPendientes.map((f) => (
              <div key={f.embajador} className="border-b border-line last:border-0 pb-3 last:pb-0">
                <p className="text-sm font-medium text-ink">
                  {f.embajador}{' '}
                  <span className="text-xs font-normal text-muted">
                    ({f.pendientes.length} de {f.planeadas} pendientes)
                  </span>
                </p>
                <p className="text-xs text-muted mt-1">{f.pendientes.join(', ')}</p>
              </div>
            ))}
          </div>
        ) : (
          <EmptyState message="Nadie tiene cuentas pendientes esta semana — o no hay planeación cargada." />
        )}
      </div>
    </div>
  )
}
