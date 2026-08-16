import { useMemo, useState } from 'react'
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
  computeClientesKpis,
  computeClientesTrend,
  computeClientesUniverso,
  computeCuentasPorPlaza,
  formatMonthLabel,
  getAvailableMonths,
  getCurrentMonth,
  integer,
  money,
} from '../lib/kpis'
import KpiCard from '../components/KpiCard'
import ChartCard from '../components/charts/ChartCard'
import EmptyState from '../components/EmptyState'
import RankTable from '../components/RankTable'

const UNION = '#B9862F'
const PRIMO = '#E1543A'
const MUTED = '#6B6F68'
const NEUTRO = '#9B8F73'

const tooltipStyle = {
  fontSize: 12,
  borderRadius: 8,
  border: '1px solid #E6E2D8',
  boxShadow: '0 4px 16px rgba(0,0,0,0.06)',
}

function universoColor(label) {
  if (label.includes('Directo')) return UNION
  if (label.includes('ON') && label.includes('OFF')) return '#7A6B9E'
  if (label.includes('ON')) return PRIMO
  if (label.includes('OFF')) return NEUTRO
  return MUTED
}

const PAGE_SIZE = 60

export default function Clientes() {
  const { filtered } = useFilters()
  const months = useMemo(() => getAvailableMonths(filtered), [filtered])
  const currentMonth = getCurrentMonth()
  const [mes, setMes] = useState(currentMonth)
  const [busqueda, setBusqueda] = useState('')
  const [visibles, setVisibles] = useState(PAGE_SIZE)

  const mesValido = months.includes(mes) ? mes : months[months.length - 1]

  const k = computeClientesKpis(filtered, mesValido)
  const cuentas = useMemo(() => computeClientesUniverso(filtered, mesValido), [filtered, mesValido])
  const trend = useMemo(() => computeClientesTrend(filtered, months, 12), [filtered, months])
  const porPlaza = useMemo(() => computeCuentasPorPlaza(filtered), [filtered])

  const universoDonut = useMemo(() => {
    const map = new Map()
    cuentas.forEach((c) => {
      map.set(c.universoLabel, (map.get(c.universoLabel) || 0) + 1)
    })
    return [...map.entries()].map(([name, value]) => ({ name, value }))
  }, [cuentas])

  const cuentasFiltradas = useMemo(() => {
    const q = busqueda.trim().toUpperCase()
    if (!q) return cuentas
    return cuentas.filter((c) => c.cliente.includes(q) || c.embajador.toUpperCase().includes(q))
  }, [cuentas, busqueda])

  const cols = [
    { key: 'cliente', label: 'Cuenta' },
    { key: 'universoLabel', label: 'Universo' },
    { key: 'embajador', label: 'Embajador' },
    { key: 'plaza', label: 'Plaza' },
    { key: 'ciudad', label: 'Ciudad' },
    { key: 'ventas', label: 'Ventas $', align: 'right', render: (r) => money(r.ventas) },
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
  ]

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <h2 className="section-title text-2xl text-ink">Clientes</h2>
          <p className="text-sm text-muted mt-1">
            Universo unificado: venta directa, ON (Sell Out) y OFF, con su actividad mes a mes.
          </p>
        </div>
        <label className="flex flex-col gap-1">
          <span className="text-[10px] uppercase tracking-wide text-muted">Mes</span>
          <select
            value={mesValido}
            onChange={(e) => {
              setMes(e.target.value)
              setVisibles(PAGE_SIZE)
            }}
            className="text-sm bg-panel border border-line rounded-sm px-2.5 py-1.5 text-ink focus:border-union min-w-[180px]"
          >
            {months
              .slice()
              .reverse()
              .map((m) => (
                <option key={m} value={m}>
                  {formatMonthLabel(m)}
                  {m === currentMonth ? ' · mes actual' : ''}
                </option>
              ))}
          </select>
        </label>
      </div>

      <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-9 gap-3">
        <KpiCard label="Universo Total" value={integer(k.universoTotal)} />
        <KpiCard label="Cuentas Directas" value={integer(k.universoDirecto)} />
        <KpiCard label="Cuentas ON" value={integer(k.universoOnCount)} />
        <KpiCard label="Cuentas OFF" value={integer(k.universoOffCount)} />
        <KpiCard label="Ventas del Mes" value={money(k.ventasMes)} />
        <KpiCard label="Botellas del Mes" value={integer(k.botellasMes)} />
        <KpiCard label="Visitas Mant." value={integer(k.visitasMantenimiento)} sub="este mes" />
        <KpiCard label="Capacitaciones" value={integer(k.capacitaciones)} sub="este mes" />
        <KpiCard label="Activaciones" value={integer(k.activaciones)} sub="este mes" />
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        <ChartCard title="Universo por tipo" subtitle="Directo / ON / OFF" className="h-64">
          {universoDonut.length ? (
            <ResponsiveContainer width="100%" height="100%">
              <PieChart>
                <Pie
                  data={universoDonut}
                  dataKey="value"
                  nameKey="name"
                  innerRadius={50}
                  outerRadius={80}
                  paddingAngle={2}
                  label={({ name, value }) => `${name}: ${value}`}
                  labelLine={false}
                >
                  {universoDonut.map((u) => (
                    <Cell key={u.name} fill={universoColor(u.name)} />
                  ))}
                </Pie>
                <Tooltip contentStyle={tooltipStyle} />
              </PieChart>
            </ResponsiveContainer>
          ) : (
            <EmptyState />
          )}
        </ChartCard>

        <ChartCard title="Cuentas por plaza" className="h-64">
          {porPlaza.length ? (
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={porPlaza} layout="vertical" margin={{ left: 8 }}>
                <CartesianGrid stroke="#E6E2D8" horizontal={false} />
                <XAxis type="number" tick={{ fontSize: 11, fill: MUTED }} axisLine={false} tickLine={false} />
                <YAxis
                  type="category"
                  dataKey="name"
                  width={110}
                  tick={{ fontSize: 11, fill: '#1B1D1B' }}
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

        <ChartCard
          title="Tendencia mensual"
          subtitle="Visitas, capacitaciones y activaciones (últimos 12 meses)"
          className="h-64 lg:col-span-2"
        >
          {trend.some((t) => t.visitas || t.capacitaciones || t.activaciones) ? (
            <ResponsiveContainer width="100%" height="100%">
              <LineChart data={trend}>
                <CartesianGrid stroke="#E6E2D8" vertical={false} />
                <XAxis dataKey="name" tick={{ fontSize: 10, fill: MUTED }} axisLine={{ stroke: '#E6E2D8' }} />
                <YAxis tick={{ fontSize: 11, fill: MUTED }} axisLine={false} tickLine={false} />
                <Tooltip contentStyle={tooltipStyle} />
                <Line
                  type="monotone"
                  dataKey="visitas"
                  name="Visitas Mant."
                  stroke={UNION}
                  strokeWidth={2}
                  dot={{ r: 2 }}
                />
                <Line
                  type="monotone"
                  dataKey="capacitaciones"
                  name="Capacitaciones"
                  stroke={PRIMO}
                  strokeWidth={2}
                  dot={{ r: 2 }}
                />
                <Line
                  type="monotone"
                  dataKey="activaciones"
                  name="Activaciones"
                  stroke={NEUTRO}
                  strokeWidth={2}
                  dot={{ r: 2 }}
                />
              </LineChart>
            </ResponsiveContainer>
          ) : (
            <EmptyState message="Aún no hay suficiente histórico para mostrar tendencia." />
          )}
        </ChartCard>
      </div>

      <div className="bg-panel border border-line rounded-md p-4">
        <div className="flex flex-wrap items-end justify-between gap-3 mb-3">
          <div>
            <h3 className="text-sm font-medium text-ink">Cuentas — {formatMonthLabel(mesValido)}</h3>
            <p className="text-xs text-muted mt-0.5">
              {cuentasFiltradas.length} cuenta{cuentasFiltradas.length === 1 ? '' : 's'} · ordenadas por venta y
              actividad
            </p>
          </div>
          <input
            type="text"
            value={busqueda}
            onChange={(e) => {
              setBusqueda(e.target.value)
              setVisibles(PAGE_SIZE)
            }}
            placeholder="Buscar por cuenta o embajador…"
            className="text-sm bg-paper border border-line rounded-sm px-3 py-1.5 text-ink focus:border-union min-w-[240px]"
          />
        </div>
        <RankTable columns={cols} rows={cuentasFiltradas.slice(0, visibles)} rowKey={(r) => r.cliente} />
        {visibles < cuentasFiltradas.length && (
          <div className="flex justify-center mt-3">
            <button
              onClick={() => setVisibles((v) => v + PAGE_SIZE)}
              className="text-sm px-4 py-1.5 rounded-sm border border-line text-muted hover:text-ink hover:border-ink transition-colors"
            >
              Cargar más ({cuentasFiltradas.length - visibles} restantes)
            </button>
          </div>
        )}
      </div>
    </div>
  )
}
