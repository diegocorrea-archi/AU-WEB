import { useFilters } from '../context/FilterContext'

function Select({ label, value, onChange, options, hint }) {
  return (
    <label className="flex flex-col gap-1 min-w-[140px]">
      <span className="text-[10px] uppercase tracking-wide text-muted">{label}</span>
      <select
        value={value}
        onChange={(e) => onChange(e.target.value)}
        className="text-sm bg-panel border border-line rounded-sm px-2.5 py-1.5 text-ink focus:border-union"
      >
        <option value="">Todos</option>
        {options.map((o) => (
          <option key={o} value={o}>
            {o}
          </option>
        ))}
      </select>
      {hint && <span className="text-[10px] text-muted">{hint}</span>}
    </label>
  )
}

function DataSourceBadge({ status }) {
  if (status.loading) {
    return <span className="text-xs text-muted animate-pulse">Cargando datos…</span>
  }
  if (status.source === 'sheet') {
    return (
      <span className="text-xs text-positive flex items-center gap-1.5">
        <span className="h-1.5 w-1.5 rounded-full bg-positive inline-block" />
        Conectado al Google Sheet en vivo
      </span>
    )
  }
  if (status.source === 'muestra') return <span className="text-xs font-semibold text-negative">MODO DEMOSTRACIÓN · cifras de muestra, NO actuales</span>
  return <span className="text-xs font-semibold text-negative">Sin conexión a Google Sheets · no se muestran datos</span>
}

export default function FilterBar() {
  const { filters, setFilter, resetFilters, options, activeCount, status, retrySheet, showSample } = useFilters()

  return (
    <div className="space-y-2">
      <div className="flex items-center justify-between">
        <DataSourceBadge status={status} />
        {status.source === 'error' && status.error && (
          <span className="text-[11px] text-muted">Detalle: {status.error}</span>
        )}
      </div>
      {status.source === 'error' && (
        <div role="alert" className="rounded-md border border-red-300 bg-red-50 px-4 py-3 text-sm text-red-900 flex flex-wrap items-center gap-3">
          <strong>No hay datos en vivo disponibles.</strong> Revisa el acceso al Sheet o intenta de nuevo.
          <button type="button" onClick={retrySheet} className="underline font-semibold">Reintentar</button>
          <button type="button" onClick={showSample} className="underline font-semibold">Ver datos de demostración</button>
        </div>
      )}
      {status.source === 'muestra' && (
        <div role="status" className="rounded-md border border-amber-300 bg-amber-50 px-4 py-2 text-sm text-amber-900 flex flex-wrap items-center gap-2">
          Datos de demostración: no utilizar para decisiones comerciales.
          <button type="button" onClick={retrySheet} className="underline font-semibold">Conectar datos reales</button>
        </div>
      )}
      <div className="bg-panel border border-line rounded-md px-4 py-3 flex flex-wrap items-end gap-3">
      <label className="flex flex-col gap-1">
        <span className="text-[10px] uppercase tracking-wide text-muted">Desde</span>
        <input
          type="date"
          value={filters.fechaInicio}
          onChange={(e) => setFilter('fechaInicio', e.target.value)}
          className="text-sm bg-panel border border-line rounded-sm px-2.5 py-1.5 text-ink focus:border-union"
        />
      </label>
      <label className="flex flex-col gap-1">
        <span className="text-[10px] uppercase tracking-wide text-muted">Hasta</span>
        <input
          type="date"
          value={filters.fechaFin}
          onChange={(e) => setFilter('fechaFin', e.target.value)}
          className="text-sm bg-panel border border-line rounded-sm px-2.5 py-1.5 text-ink focus:border-union"
        />
      </label>
      <Select label="Plaza" value={filters.plaza} onChange={(v) => setFilter('plaza', v)} options={options.plazas} />
      <Select
        label="Ciudad"
        value={filters.ciudad}
        onChange={(v) => setFilter('ciudad', v)}
        options={options.ciudades}
      />
      <Select label="Brand" value={filters.brand} onChange={(v) => setFilter('brand', v)} options={options.brands} />
      <Select
        label="Producto"
        value={filters.producto}
        onChange={(v) => setFilter('producto', v)}
        options={options.productos}
      />
      <Select label="Canal" value={filters.canal} onChange={(v) => setFilter('canal', v)} options={options.canales} />
      <Select
        label="Concepto"
        value={filters.concepto}
        onChange={(v) => setFilter('concepto', v)}
        options={options.conceptos}
        hint="Todos = solo VENTA"
      />
      <Select
        label="Embajador"
        value={filters.embajador}
        onChange={(v) => setFilter('embajador', v)}
        options={options.embajadores}
      />

      <button
        onClick={resetFilters}
        disabled={!activeCount}
        className="ml-auto text-sm px-3 py-1.5 rounded-sm border border-line text-muted hover:text-ink hover:border-ink disabled:opacity-40 disabled:hover:border-line disabled:hover:text-muted transition-colors"
      >
        Limpiar filtros{activeCount ? ` (${activeCount})` : ''}
      </button>
      </div>
    </div>
  )
}
