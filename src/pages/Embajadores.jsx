import { useMemo, useState } from 'react'
import { Bar, BarChart, CartesianGrid, Line, LineChart, ResponsiveContainer, Tooltip, XAxis, YAxis } from 'recharts'
import { useFilters } from '../context/FilterContext'
import {
  computeEmbajadorMensual,
  computeEmbajadoresCharts,
  computeEmbajadoresKpis,
  computeEmbajadoresOverview,
  formatWeekLabel,
  getAvailableMonths,
  getCurrentWeek,
  integer,
  money,
  pct,
} from '../lib/kpis'
import KpiCard from '../components/KpiCard'
import ChartCard from '../components/charts/ChartCard'
import EmptyState from '../components/EmptyState'
import RankTable, { BrandSplitBar } from '../components/RankTable'

const UNION = '#B9862F'
const PRIMO = '#E1543A'
const NEUTRO = '#9B8F73'
const MUTED = '#6B6F68'

const tooltipStyle = {
  fontSize: 12,
  borderRadius: 8,
  border: '1px solid #E6E2D8',
  boxShadow: '0 4px 16px rgba(0,0,0,0.06)',
}

function formatCuenta(c) {
  if (c.ventas > 0) return `${c.cliente} (${money(c.ventas)})`
  if (c.botellas > 0) return `${c.cliente} (${integer(c.botellas)} bot.)`
  if (c.actividad > 0) return `${c.cliente} (${c.actividad} activ.)`
  return c.cliente
}

export default function Embajadores() {
  const { filtered } = useFilters()
  const overview = useMemo(() => computeEmbajadoresOverview(filtered), [filtered])
  const k = computeEmbajadoresKpis(overview, filtered)
  const c = computeEmbajadoresCharts(overview)
  const semanaActual = getCurrentWeek()
  const months = useMemo(() => getAvailableMonths(filtered), [filtered])

  const [seleccionado, setSeleccionado] = useState(null)
  const embajador = seleccionado || overview[0]?.embajador || null
  const mensual = useMemo(
    () => (embajador ? computeEmbajadorMensual(filtered, embajador, months, 12) : []),
    [filtered, embajador, months]
  )

  const cols = [
    {
      key: 'embajador',
      label: 'Embajador',
      render: (r) => (
        <button
          onClick={() => setSeleccionado(r.embajador)}
          className={`text-left hover:underline ${
            r.embajador === embajador ? 'text-union font-medium' : 'text-ink'
          }`}
        >
          {r.embajador}
        </button>
      ),
    },
    { key: 'clientes', label: 'Clientes', align: 'right' },
    { key: 'venta', label: 'Venta $', align: 'right', render: (r) => money(r.venta) },
    { key: 'botellas', label: 'Botellas', align: 'right', render: (r) => integer(r.botellas) },
    {
      key: 'visitasMantenimiento',
      label: 'Visitas Mant.',
      align: 'right',
      render: (r) => integer(r.visitasMantenimiento),
    },
    { key: 'capacitaciones', label: 'Capacitaciones', align: 'right', render: (r) => integer(r.capacitaciones) },
    { key: 'activaciones', label: 'Activaciones', align: 'right', render: (r) => integer(r.activaciones) },
    { key: 'mejoraAnaquel', label: 'Mejora Anaquel', align: 'right', render: (r) => integer(r.mejoraAnaquel) },
    { key: 'exhibicion', label: 'Exhibición', align: 'right', render: (r) => integer(r.exhibicion) },
    {
      key: 'personasImpactadas',
      label: 'Personas Imp.',
      align: 'right',
      render: (r) => integer(r.personasImpactadas),
    },
    { key: 'marca', label: 'Marca (Unión/Primo)', render: (r) => <BrandSplitBar primoPct={r.primoPct} /> },
    {
      key: 'top3',
      label: 'Top 3 cuentas',
      render: (r) =>
        r.top3.length ? (
          <span className="text-xs text-muted">{r.top3.map(formatCuenta).join(' · ')}</span>
        ) : (
          <span className="text-xs text-muted">—</span>
        ),
    },
  ]

  return (
    <div className="space-y-6">
      <div>
        <h2 className="section-title text-2xl text-ink">Embajadores</h2>
        <p className="text-sm text-muted mt-1">Vista 360° de venta, actividad de campo e impacto por embajador.</p>
      </div>

      <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-7 gap-3">
        <KpiCard label="Embajadores" value={integer(k.totalEmbajadores)} />
        <KpiCard label="Venta Total" value={money(k.ventaTotal)} />
        <KpiCard label="Botellas Total" value={integer(k.botellasTotal)} />
        <KpiCard label="Visitas Mant." value={integer(k.visitasMantenimiento)} />
        <KpiCard label="Capacitaciones" value={integer(k.capacitaciones)} />
        <KpiCard label="Activaciones" value={integer(k.activaciones)} />
        <KpiCard label="Personas Impactadas" value={integer(k.personasImpactadas)} />
      </div>

      <div className="bg-panel border border-line rounded-md p-4 flex flex-wrap items-center justify-between gap-3">
        <div>
          <p className="text-sm font-medium text-ink">Cumplimiento de Planeación — semana actual</p>
          <p className="text-xs text-muted mt-0.5">
            Semana del {formatWeekLabel(semanaActual)}. Ve a Planeación para el detalle por embajador.
          </p>
        </div>
        <span
          className={`kpi-value text-2xl ${
            k.cumplimientoSemanaActual >= 0.7 ? 'text-positive' : k.cumplimientoSemanaActual >= 0.4 ? 'text-ink' : 'text-negative'
          }`}
        >
          {pct(k.cumplimientoSemanaActual)}
        </span>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        <ChartCard title="Top embajadores por venta" className="h-64">
          {c.porVenta.length ? (
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={c.porVenta} layout="vertical" margin={{ left: 8 }}>
                <CartesianGrid stroke="#E6E2D8" horizontal={false} />
                <XAxis type="number" tick={{ fontSize: 11, fill: MUTED }} axisLine={false} tickLine={false} />
                <YAxis
                  type="category"
                  dataKey="name"
                  width={120}
                  tick={{ fontSize: 10, fill: '#1B1D1B' }}
                  axisLine={false}
                  tickLine={false}
                />
                <Tooltip contentStyle={tooltipStyle} formatter={(v) => money(v)} />
                <Bar dataKey="value" fill={UNION} radius={[0, 4, 4, 0]} barSize={14} />
              </BarChart>
            </ResponsiveContainer>
          ) : (
            <EmptyState />
          )}
        </ChartCard>

        <ChartCard title="Personas impactadas" subtitle="Top 8 embajadores" className="h-64">
          {c.impacto.some((i) => i.value) ? (
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={c.impacto} layout="vertical" margin={{ left: 8 }}>
                <CartesianGrid stroke="#E6E2D8" horizontal={false} />
                <XAxis type="number" tick={{ fontSize: 11, fill: MUTED }} axisLine={false} tickLine={false} />
                <YAxis
                  type="category"
                  dataKey="name"
                  width={120}
                  tick={{ fontSize: 10, fill: '#1B1D1B' }}
                  axisLine={false}
                  tickLine={false}
                />
                <Tooltip contentStyle={tooltipStyle} />
                <Bar dataKey="value" fill={PRIMO} radius={[0, 4, 4, 0]} barSize={14} />
              </BarChart>
            </ResponsiveContainer>
          ) : (
            <EmptyState />
          )}
        </ChartCard>

        <ChartCard
          title="Actividad de campo por embajador"
          subtitle="Visitas, capacitaciones y activaciones — top 8"
          className="h-64 lg:col-span-2"
        >
          {c.actividad.length ? (
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={c.actividad}>
                <CartesianGrid stroke="#E6E2D8" vertical={false} />
                <XAxis dataKey="name" tick={{ fontSize: 10, fill: MUTED }} axisLine={{ stroke: '#E6E2D8' }} />
                <YAxis tick={{ fontSize: 11, fill: MUTED }} axisLine={false} tickLine={false} />
                <Tooltip contentStyle={tooltipStyle} />
                <Bar dataKey="visitas" name="Visitas Mant." fill={UNION} radius={[4, 4, 0, 0]} barSize={14} />
                <Bar dataKey="capacitaciones" name="Capacitaciones" fill={PRIMO} radius={[4, 4, 0, 0]} barSize={14} />
                <Bar dataKey="activaciones" name="Activaciones" fill={NEUTRO} radius={[4, 4, 0, 0]} barSize={14} />
              </BarChart>
            </ResponsiveContainer>
          ) : (
            <EmptyState />
          )}
        </ChartCard>
      </div>

      <div className="bg-panel border border-line rounded-md p-4">
        <div className="mb-3">
          <h3 className="text-sm font-medium text-ink">
            Detalle mensual — <span className="text-union">{embajador || '—'}</span>
          </h3>
          <p className="text-xs text-muted mt-0.5">
            Haz clic en cualquier embajador de la tabla de abajo para ver su historial mes a mes.
          </p>
        </div>

        {mensual.some((m) => m.venta || m.botellas || m.visitasMantenimiento || m.capacitaciones || m.activaciones) ? (
          <>
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 mb-4">
              <ChartCard title="Venta mensual" className="h-56">
                <ResponsiveContainer width="100%" height="100%">
                  <LineChart data={mensual}>
                    <CartesianGrid stroke="#E6E2D8" vertical={false} />
                    <XAxis dataKey="name" tick={{ fontSize: 10, fill: MUTED }} axisLine={{ stroke: '#E6E2D8' }} />
                    <YAxis tick={{ fontSize: 11, fill: MUTED }} axisLine={false} tickLine={false} />
                    <Tooltip contentStyle={tooltipStyle} formatter={(v) => money(v)} />
                    <Line type="monotone" dataKey="venta" stroke={UNION} strokeWidth={2.5} dot={{ r: 3 }} />
                  </LineChart>
                </ResponsiveContainer>
              </ChartCard>

              <ChartCard title="Actividad mensual" subtitle="Visitas, capacitaciones, activaciones" className="h-56">
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={mensual}>
                    <CartesianGrid stroke="#E6E2D8" vertical={false} />
                    <XAxis dataKey="name" tick={{ fontSize: 10, fill: MUTED }} axisLine={{ stroke: '#E6E2D8' }} />
                    <YAxis tick={{ fontSize: 11, fill: MUTED }} axisLine={false} tickLine={false} />
                    <Tooltip contentStyle={tooltipStyle} />
                    <Bar
                      dataKey="visitasMantenimiento"
                      name="Visitas Mant."
                      fill={UNION}
                      radius={[4, 4, 0, 0]}
                      barSize={10}
                    />
                    <Bar dataKey="capacitaciones" name="Capacitaciones" fill={PRIMO} radius={[4, 4, 0, 0]} barSize={10} />
                    <Bar dataKey="activaciones" name="Activaciones" fill={NEUTRO} radius={[4, 4, 0, 0]} barSize={10} />
                  </BarChart>
                </ResponsiveContainer>
              </ChartCard>
            </div>

            <RankTable
              columns={[
                { key: 'name', label: 'Mes' },
                { key: 'venta', label: 'Venta $', align: 'right', render: (r) => money(r.venta) },
                { key: 'botellas', label: 'Botellas', align: 'right', render: (r) => integer(r.botellas) },
                {
                  key: 'visitasMantenimiento',
                  label: 'Visitas Mant.',
                  align: 'right',
                  render: (r) => integer(r.visitasMantenimiento),
                },
                { key: 'capacitaciones', label: 'Capacitaciones', align: 'right', render: (r) => integer(r.capacitaciones) },
                { key: 'activaciones', label: 'Activaciones', align: 'right', render: (r) => integer(r.activaciones) },
                { key: 'mejoraAnaquel', label: 'Mejora Anaquel', align: 'right', render: (r) => integer(r.mejoraAnaquel) },
                { key: 'exhibicion', label: 'Exhibición', align: 'right', render: (r) => integer(r.exhibicion) },
              ]}
              rows={mensual.slice().reverse()}
              rowKey={(r) => r.mes}
            />
          </>
        ) : (
          <EmptyState message="Este embajador no tiene historial en los meses disponibles." />
        )}
      </div>

      <div className="bg-panel border border-line rounded-md p-4">
        <div className="mb-3">
          <h3 className="text-sm font-medium text-ink">Ranking completo de embajadores</h3>
          <p className="text-xs text-muted mt-0.5">
            Venta, botellas, actividad de campo, personas impactadas y sus 3 mejores cuentas. Clic en el nombre para
            ver su detalle mensual arriba.
          </p>
        </div>
        <RankTable columns={cols} rows={overview} rowKey={(r) => r.embajador} />
      </div>
    </div>
  )
}
