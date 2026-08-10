import { Bar, BarChart, CartesianGrid, Line, LineChart, ResponsiveContainer, Tooltip, XAxis, YAxis } from 'recharts'
import { useFilters } from '../context/FilterContext'
import {
  computeVentasCharts,
  computeVentasKpis,
  integer,
  money,
  rankClientes,
  rankEmbajadores,
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

export default function Ventas() {
  const { filtered } = useFilters()
  const k = computeVentasKpis(filtered)
  const c = computeVentasCharts(filtered)
  const clientes = rankClientes(filtered, 12)
  const embajadores = rankEmbajadores(filtered, 12)

  const clienteCols = [
    { key: 'cliente', label: 'Cliente' },
    { key: 'plaza', label: 'Plaza' },
    { key: 'pedidos', label: 'Pedidos', align: 'right' },
    { key: 'botellas', label: 'Botellas', align: 'right', render: (r) => integer(r.botellas) },
    { key: 'venta', label: 'Venta $', align: 'right', render: (r) => money(r.venta) },
    {
      key: 'marca',
      label: 'Marca (Unión / Primo)',
      render: (r) => <BrandSplitBar primoPct={r.primoPct} />,
    },
  ]

  const embajadorCols = [
    { key: 'embajador', label: 'Embajador' },
    { key: 'clientes', label: 'Clientes', align: 'right' },
    { key: 'pedidos', label: 'Pedidos', align: 'right' },
    { key: 'botellas', label: 'Botellas', align: 'right', render: (r) => integer(r.botellas) },
    { key: 'ticketPromedio', label: 'Ticket Prom.', align: 'right', render: (r) => money(r.ticketPromedio) },
    { key: 'venta', label: 'Venta $', align: 'right', render: (r) => money(r.venta) },
    {
      key: 'marca',
      label: 'Marca (Unión / Primo)',
      render: (r) => <BrandSplitBar primoPct={r.primoPct} />,
    },
  ]

  return (
    <div className="space-y-6">
      <div>
        <h2 className="section-title text-2xl text-ink">Ventas</h2>
        <p className="text-sm text-muted mt-1">Facturación, clientes y desempeño de embajadores.</p>
      </div>

      <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-3">
        <KpiCard label="Facturación" value={money(k.facturacion)} />
        <KpiCard label="Botellas" value={integer(k.botellas)} />
        <KpiCard label="Clientes" value={integer(k.clientes)} />
        <KpiCard label="Pedidos" value={integer(k.pedidosUnicos)} />
        <KpiCard label="Ticket Promedio" value={money(k.ticketPromedio)} sub="por pedido" />
        <KpiCard label="Precio Prom. / Botella" value={money(k.precioPromedioBotella)} />
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        <ChartCard title="Tendencia de facturación" subtitle="Venta $ mensual" className="h-64">
          {c.tendenciaMensual.length ? (
            <ResponsiveContainer width="100%" height="100%">
              <LineChart data={c.tendenciaMensual}>
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

        <ChartCard title="Tendencia de botellas" subtitle="Volumen mensual" className="h-64">
          {c.botellasMensual.length ? (
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={c.botellasMensual}>
                <CartesianGrid stroke="#E6E2D8" vertical={false} />
                <XAxis dataKey="name" tick={{ fontSize: 11, fill: MUTED }} axisLine={{ stroke: '#E6E2D8' }} />
                <YAxis tick={{ fontSize: 11, fill: MUTED }} axisLine={false} tickLine={false} />
                <Tooltip contentStyle={tooltipStyle} />
                <Bar dataKey="value" fill={PRIMO} radius={[4, 4, 0, 0]} barSize={24} />
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
          <p className="text-xs text-muted mt-0.5">Top 12 por venta $, con botellas compradas y marca principal.</p>
        </div>
        <RankTable columns={clienteCols} rows={clientes} rowKey={(r) => r.cliente} />
      </div>

      <div className="bg-panel border border-line rounded-md p-4">
        <div className="mb-3">
          <h3 className="text-sm font-medium text-ink">Ranking de embajadores</h3>
          <p className="text-xs text-muted mt-0.5">
            Top 12 por venta $, con clientes atendidos, ticket promedio y mezcla de marca.
          </p>
        </div>
        <RankTable columns={embajadorCols} rows={embajadores} rowKey={(r) => r.embajador} />
      </div>

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
    </div>
  )
}
