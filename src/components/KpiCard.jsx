export default function KpiCard({ label, value, sub, splitPct }) {
  return (
    <div className="bg-panel border border-line rounded-md p-4 flex flex-col gap-2 min-w-0">
      <span className="text-[11px] uppercase tracking-wide text-muted">{label}</span>
      <span className="kpi-value text-2xl text-ink truncate">{value}</span>
      {sub && <span className="text-xs text-muted">{sub}</span>}
      {typeof splitPct === 'number' && (
        <div className="brand-stripe mt-1">
          <span className="bg-union" style={{ width: `${(1 - splitPct) * 100}%` }} />
          <span className="bg-primo" style={{ width: `${splitPct * 100}%` }} />
        </div>
      )}
    </div>
  )
}
