export default function ChartCard({ title, subtitle, children, className = '' }) {
  return (
    <div className={`bg-panel border border-line rounded-md p-4 flex flex-col ${className}`}>
      <div className="mb-3">
        <h3 className="text-sm font-medium text-ink">{title}</h3>
        {subtitle && <p className="text-xs text-muted mt-0.5">{subtitle}</p>}
      </div>
      <div className="flex-1 min-h-0">{children}</div>
    </div>
  )
}
