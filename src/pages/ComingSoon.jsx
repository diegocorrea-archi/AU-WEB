export default function ComingSoon({ title }) {
  return (
    <div className="space-y-2">
      <h2 className="section-title text-2xl text-ink">{title}</h2>
      <div className="bg-panel border border-line rounded-md p-10 flex flex-col items-center justify-center text-center gap-2 mt-4">
        <span className="text-3xl">🚧</span>
        <p className="text-sm text-ink font-medium">Este dashboard va en la siguiente iteración</p>
        <p className="text-xs text-muted max-w-sm">
          Ya construimos la estructura del proyecto, los filtros globales y el conector de datos — este módulo
          reutiliza esa misma base.
        </p>
      </div>
    </div>
  )
}
