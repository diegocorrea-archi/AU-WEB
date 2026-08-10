import {
  Bar,
  BarChart,
  CartesianGrid,
  Cell,
  Line,
  LineChart,
  Pie,
  PieChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from 'recharts'
import { useFilters } from '../context/FilterContext'
import { computeExecutiveCharts, computeExecutiveKpis, integer, money, pct } from '../lib/kpis'
import KpiCard from '../components/KpiCard'
import ChartCard from '../components/charts/ChartCard'
import EmptyState from '../components/EmptyState'

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

function brandColor(name) {
  if (name === 'Unión') return UNION
  if (name === 'Primo') return PRIMO
  return MUTED
}

export default function DashboardEjecutivo() {
  const { filtered } = useFilters()
  const k = computeExecutiveKpis(filtered)
  const c = computeExecutiveCharts(filtered)

  const primoShare = c.participacionMarca.find((m) => m.name === 'Primo')?.pct ?? 0

  return (
    <div className="space-y-6">
      <div>
        <h2 className="section-title text-2xl text-ink">Dashboard Ejecutivo</h2>
        <p className="text-sm text-muted mt-1">Vista consolidada de Unión y Primo Aperitivo.</p>
      </div>

      {/* KPIs */}
      <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-6 gap-3">
        <KpiCard label="Venta $" value={money(k.ventaTotal)} splitPct={primoShare} />
        <KpiCard label="Botellas" value={integer(k.botellas)} />
        <KpiCard label="Ticket Promedio" value={money(k.ticketPromedio)} />
        <KpiCard label="Clientes Activos" value={integer(k.clientesActivos)} />
        <KpiCard label="Sell Out" value={integer(k.sellOutTotal)} sub="botellas" />
        <KpiCard label="Activaciones ON" value={integer(k.activacionesOn)} />
        <KpiCard label="Activaciones OFF" value={integer(k.activacionesOff)} />
        <KpiCard label="Personas Impactadas" value={integer(k.personasImpactadas)} />
        <KpiCard
          label="Cumplimiento Planeación"
          value={pct(k.cumplimientoPlaneacion)}
          sub={`${integer(k.ejecutadas)} de ${integer(k.planeadas)} visitas`}
        />
        <KpiCard label="Cuentas Activas" value={integer(k.nuevosClientes)} sub="universo ON + OFF" />
        <KpiCard label="Cuentas Inactivas" value={integer(k.clientesPerdidos)} sub="universo ON + OFF" />
      </div>

      {/* Charts */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        <ChartCard title="Venta mensual" subtitle="Suma de PRECIO FINAL, concepto = VENTA" className="h-72">
          {c.ventaMensual.length ? (
            <ResponsiveContainer width="100%" height="100%">
              <LineChart data={c.ventaMensual}>
                <CartesianGrid stroke="#E6E2D8" vertical={false} />
                <XAxis dataKey="name" tick={{ fontSize: 11, fill: MUTED }} axisLine={{ stroke: '#E6E2D8' }} />
                <YAxis tick={{ fontSize: 11, fill: MUTED }} axisLine={false} tickLine={false} />
                <Tooltip contentStyle={tooltipStyle} formatter={(v) => money(v)} />
                <Line type="monotone" dataKey="value" stroke={UNION} strokeWidth={2.5} dot={{ r: 3 }} />
              </LineChart>
            </ResponsiveContainer>
          ) : (
            <EmptyState />
          )}
        </ChartCard>

        <ChartCard title="Participación Primo vs Unión" subtitle="% de venta por marca" className="h-72">
          {c.participacionMarca.length ? (
            <ResponsiveContainer width="100%" height="100%">
              <PieChart>
                <Pie
                  data={c.participacionMarca}
                  dataKey="value"
                  nameKey="name"
                  innerRadius={55}
                  outerRadius={85}
                  paddingAngle={2}
                  label={({ name, pct: p }) => `${name} ${(p * 100).toFixed(0)}%`}
                  labelLine={false}
                >
                  {c.participacionMarca.map((m) => (
                    <Cell key={m.name} fill={brandColor(m.name)} />
                  ))}
                </Pie>
                <Tooltip contentStyle={tooltipStyle} formatter={(v) => money(v)} />
              </PieChart>
            </ResponsiveContainer>
          ) : (
            <EmptyState />
          )}
        </ChartCard>

        <ChartCard title="Venta por plaza" className="h-64">
          {c.ventaPorPlaza.length ? (
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={c.ventaPorPlaza} layout="vertical" margin={{ left: 8 }}>
                <CartesianGrid stroke="#E6E2D8" horizontal={false} />
                <XAxis type="number" tick={{ fontSize: 11, fill: MUTED }} axisLine={false} tickLine={false} />
                <YAxis
                  type="category"
                  dataKey="name"
                  width={110}
                  tick={{ fontSize: 11, fill: INK }}
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

        <ChartCard title="Venta por ciudad" className="h-64">
          {c.ventaPorCiudad.length ? (
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={c.ventaPorCiudad} layout="vertical" margin={{ left: 8 }}>
                <CartesianGrid stroke="#E6E2D8" horizontal={false} />
                <XAxis type="number" tick={{ fontSize: 11, fill: MUTED }} axisLine={false} tickLine={false} />
                <YAxis
                  type="category"
                  dataKey="name"
                  width={110}
                  tick={{ fontSize: 11, fill: INK }}
                  axisLine={false}
                  tickLine={false}
                />
                <Tooltip contentStyle={tooltipStyle} formatter={(v) => money(v)} />
                <Bar dataKey="value" fill={PRIMO} radius={[0, 4, 4, 0]} barSize={14} />
              </BarChart>
            </ResponsiveContainer>
          ) : (
            <EmptyState />
          )}
        </ChartCard>

        <ChartCard title="Venta por canal" className="h-64">
          {c.ventaPorCanal.length ? (
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={c.ventaPorCanal}>
                <CartesianGrid stroke="#E6E2D8" vertical={false} />
                <XAxis dataKey="name" tick={{ fontSize: 10, fill: MUTED }} axisLine={{ stroke: '#E6E2D8' }} />
                <YAxis tick={{ fontSize: 11, fill: MUTED }} axisLine={false} tickLine={false} />
                <Tooltip contentStyle={tooltipStyle} formatter={(v) => money(v)} />
                <Bar dataKey="value" fill={UNION} radius={[4, 4, 0, 0]} barSize={28} />
              </BarChart>
            </ResponsiveContainer>
          ) : (
            <EmptyState />
          )}
        </ChartCard>

        <ChartCard title="Venta por SKU" subtitle="Top 8" className="h-64">
          {c.ventaPorSku.length ? (
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={c.ventaPorSku} layout="vertical" margin={{ left: 8 }}>
                <CartesianGrid stroke="#E6E2D8" horizontal={false} />
                <XAxis type="number" tick={{ fontSize: 11, fill: MUTED }} axisLine={false} tickLine={false} />
                <YAxis
                  type="category"
                  dataKey="name"
                  width={130}
                  tick={{ fontSize: 10, fill: INK }}
                  axisLine={false}
                  tickLine={false}
                />
                <Tooltip contentStyle={tooltipStyle} formatter={(v) => money(v)} />
                <Bar dataKey="value" fill={PRIMO} radius={[0, 4, 4, 0]} barSize={14} />
              </BarChart>
            </ResponsiveContainer>
          ) : (
            <EmptyState />
          )}
        </ChartCard>

        <ChartCard title="Top embajadores" subtitle="Por venta $" className="h-64">
          {c.topEmbajadores.length ? (
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={c.topEmbajadores} layout="vertical" margin={{ left: 8 }}>
                <CartesianGrid stroke="#E6E2D8" horizontal={false} />
                <XAxis type="number" tick={{ fontSize: 11, fill: MUTED }} axisLine={false} tickLine={false} />
                <YAxis
                  type="category"
                  dataKey="name"
                  width={110}
                  tick={{ fontSize: 10, fill: INK }}
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

        <ChartCard title="Sell Out por plaza" subtitle="Botellas" className="h-64">
          {c.sellOutPorPlaza.length ? (
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={c.sellOutPorPlaza}>
                <CartesianGrid stroke="#E6E2D8" vertical={false} />
                <XAxis dataKey="name" tick={{ fontSize: 11, fill: MUTED }} axisLine={{ stroke: '#E6E2D8' }} />
                <YAxis tick={{ fontSize: 11, fill: MUTED }} axisLine={false} tickLine={false} />
                <Tooltip contentStyle={tooltipStyle} />
                <Bar dataKey="value" fill={PRIMO} radius={[4, 4, 0, 0]} barSize={28} />
              </BarChart>
            </ResponsiveContainer>
          ) : (
            <EmptyState />
          )}
        </ChartCard>
      </div>
    </div>
  )
}
