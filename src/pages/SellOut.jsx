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
import {
  computeSellOutCharts,
  computeSellOutKpis,
  integer,
  pct,
  rankClientesSellOut,
  rankEmbajadoresSellOut,
} from '../lib/kpis'
import KpiCard from '../components/KpiCard'
import ChartCard from '../components/charts/ChartCard'
import EmptyState from '../components/EmptyState'
import RankTable, { BrandSplitBar } from '../components/RankTable'

const UNION = '#B9862F'
const PRIMO = '#E1543A'
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

export default function SellOut() {
  const { filtered } = useFilters()
  const k = computeSellOutKpis(filtered)
  const c = computeSellOutCharts(filtered)
  const clientes = rankClientesSellOut(filtered, 12)
  const embajadores = rankEmbajadoresSellOut(filtered, 12)

  const clienteCols = [
    { key: 'cliente', label: 'Cliente' },
    { key: 'plaza', label: 'Plaza' },
    { key: 'distribuidor', label: 'Distribuidor' },
    { key: 'unidades', label: 'Unidades', align: 'right', render: (r) => integer(r.unidades) },
    {
      key: 'marca',
      label: 'Marca (Unión / Primo)',
      render: (r) => <BrandSplitBar primoPct={r.primoPct} />,
    },
  ]

  const embajadorCols = [
    { key: 'embajador', label: 'Embajador' },
    { key: 'clientes', label: 'Clientes', align: 'right' },
    { key: 'unidades', label: 'Unidades', align: 'right', render: (r) => integer(r.unidades) },
    {
      key: 'marca',
      label: 'Marca (Unión / Primo)',
      render: (r) => <BrandSplitBar primoPct={r.primoPct} />,
    },
  ]

  const marcaData = c.porMarca.map((m) => ({ ...m, pct: k.total ? m.value / k.total : 0 }))

  return (
    <div className="space-y-6">
      <div>
        <h2 className="section-title text-2xl text-ink">Sell Out</h2>
        <p className="text-sm text-muted mt-1">
          Salida real a consumidor final, en unidades. Solo Concepto = Venta y Bonificaciones.
        </p>
      </div>

      <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-3">
        <KpiCard label="Sell Out Total" value={integer(k.total)} sub="botellas" splitPct={k.primoPct} />
        <KpiCard label="Sell Out Unión" value={integer(k.union)} />
        <KpiCard label="Sell Out Primo" value={integer(k.primo)} />
        <KpiCard label="% Primo" value={pct(k.primoPct)} />
        <KpiCard label="Clientes" value={integer(k.clientes)} />
        <KpiCard label="Embajadores Activos" value={integer(k.embajadores)} />
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        <ChartCard title="Tendencia de Sell Out" subtitle="Unidades por mes" className="h-64">
          {c.tendenciaMensual.length ? (
            <ResponsiveContainer width="100%" height="100%">
              <LineChart data={c.tendenciaMensual}>
                <CartesianGrid stroke="#E6E2D8" vertical={false} />
                <XAxis dataKey="name" tick={{ fontSize: 11, fill: MUTED }} axisLine={{ stroke: '#E6E2D8' }} />
                <YAxis tick={{ fontSize: 11, fill: MUTED }} axisLine={false} tickLine={false} />
                <Tooltip contentStyle={tooltipStyle} />
                <Line type="monotone" dataKey="value" stroke={PRIMO} strokeWidth={2.5} dot={{ r: 3 }} />
              </LineChart>
            </ResponsiveContainer>
          ) : (
            <EmptyState />
          )}
        </ChartCard>

        <ChartCard title="Sell Out por marca" subtitle="Unión vs Primo" className="h-64">
          {marcaData.length ? (
            <ResponsiveContainer width="100%" height="100%">
              <PieChart>
                <Pie
                  data={marcaData}
                  dataKey="value"
                  nameKey="name"
                  innerRadius={50}
                  outerRadius={80}
                  paddingAngle={2}
                  label={({ name, pct: p }) => `${name} ${(p * 100).toFixed(0)}%`}
                  labelLine={false}
                >
                  {marcaData.map((m) => (
                    <Cell key={m.name} fill={brandColor(m.name)} />
                  ))}
                </Pie>
                <Tooltip contentStyle={tooltipStyle} />
              </PieChart>
            </ResponsiveContainer>
          ) : (
            <EmptyState />
          )}
        </ChartCard>

        <ChartCard title="Sell Out por plaza" className="h-64">
          {c.porPlaza.length ? (
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={c.porPlaza}>
                <CartesianGrid stroke="#E6E2D8" vertical={false} />
                <XAxis dataKey="name" tick={{ fontSize: 11, fill: MUTED }} axisLine={{ stroke: '#E6E2D8' }} />
                <YAxis tick={{ fontSize: 11, fill: MUTED }} axisLine={false} tickLine={false} />
                <Tooltip contentStyle={tooltipStyle} />
                <Bar dataKey="value" fill={UNION} radius={[4, 4, 0, 0]} barSize={26} />
              </BarChart>
            </ResponsiveContainer>
          ) : (
            <EmptyState />
          )}
        </ChartCard>

        <ChartCard title="Sell Out por SKU" subtitle="Top 10" className="h-64">
          {c.porSku.length ? (
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={c.porSku} layout="vertical" margin={{ left: 8 }}>
                <CartesianGrid stroke="#E6E2D8" horizontal={false} />
                <XAxis type="number" tick={{ fontSize: 11, fill: MUTED }} axisLine={false} tickLine={false} />
                <YAxis
                  type="category"
                  dataKey="name"
                  width={130}
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
      </div>

      <div className="bg-panel border border-line rounded-md p-4">
        <div className="mb-3">
          <h3 className="text-sm font-medium text-ink">Ranking de clientes</h3>
          <p className="text-xs text-muted mt-0.5">Top 12 por unidades de Sell Out, con distribuidor y marca.</p>
        </div>
        <RankTable columns={clienteCols} rows={clientes} rowKey={(r) => r.cliente} />
      </div>

      <div className="bg-panel border border-line rounded-md p-4">
        <div className="mb-3">
          <h3 className="text-sm font-medium text-ink">Ranking de embajadores</h3>
          <p className="text-xs text-muted mt-0.5">Top 12 por unidades, con clientes cubiertos y mezcla de marca.</p>
        </div>
        <RankTable columns={embajadorCols} rows={embajadores} rowKey={(r) => r.embajador} />
      </div>

      <ChartCard title="Top distribuidores" subtitle="Unidades por distribuidor" className="h-64">
        {c.porDistribuidor.length ? (
          <ResponsiveContainer width="100%" height="100%">
            <BarChart data={c.porDistribuidor} layout="vertical" margin={{ left: 8 }}>
              <CartesianGrid stroke="#E6E2D8" horizontal={false} />
              <XAxis type="number" tick={{ fontSize: 11, fill: MUTED }} axisLine={false} tickLine={false} />
              <YAxis
                type="category"
                dataKey="name"
                width={130}
                tick={{ fontSize: 10, fill: '#1B1D1B' }}
                axisLine={false}
                tickLine={false}
              />
              <Tooltip contentStyle={tooltipStyle} />
              <Bar dataKey="value" fill={UNION} radius={[0, 4, 4, 0]} barSize={14} />
            </BarChart>
          </ResponsiveContainer>
        ) : (
          <EmptyState />
        )}
      </ChartCard>
    </div>
  )
}
