import EmptyState from './EmptyState'

export default function RankTable({ columns, rows, rowKey }) {
  if (!rows.length) return <EmptyState />

  return (
    <div className="overflow-x-auto">
      <table className="w-full text-sm">
        <thead>
          <tr className="text-left border-b border-line">
            {columns.map((col) => (
              <th
                key={col.key}
                className={`py-2 px-3 text-[11px] uppercase tracking-wide text-muted font-medium ${
                  col.align === 'right' ? 'text-right' : ''
                }`}
              >
                {col.label}
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {rows.map((row, i) => (
            <tr key={rowKey(row)} className={i % 2 ? 'bg-paper/60' : ''}>
              {columns.map((col) => (
                <td
                  key={col.key}
                  className={`py-2 px-3 align-middle ${col.align === 'right' ? 'text-right kpi-value' : ''}`}
                >
                  {col.render ? col.render(row) : row[col.key]}
                </td>
              ))}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  )
}

export function BrandSplitBar({ primoPct }) {
  const pct = Number.isFinite(primoPct) ? primoPct : 0
  return (
    <div className="flex items-center gap-2 min-w-[90px]">
      <div className="brand-stripe flex-1">
        <span className="bg-union" style={{ width: `${(1 - pct) * 100}%` }} />
        <span className="bg-primo" style={{ width: `${pct * 100}%` }} />
      </div>
      <span className="text-[10px] text-muted w-8 text-right">{Math.round(pct * 100)}%</span>
    </div>
  )
}
