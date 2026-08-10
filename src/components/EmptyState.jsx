export default function EmptyState({ message = 'Sin datos para los filtros seleccionados.' }) {
  return (
    <div className="h-full min-h-[140px] flex items-center justify-center text-center px-4">
      <p className="text-sm text-muted">{message}</p>
    </div>
  )
}
