import { createContext, useContext, useEffect, useMemo, useState } from 'react'
import { emptyFilters, emptyDataset, getFilterOptions, applyFilters } from '../lib/kpis'
import { loadDataset } from '../lib/dataset'

const FilterContext = createContext(null)

export function FilterProvider({ children }) {
  const [filters, setFilters] = useState(emptyFilters)
  const [dataset, setDataset] = useState(emptyDataset)
  const [status, setStatus] = useState({ loading: true, source: null, error: null })

  useEffect(() => {
    let cancelled = false
    loadDataset().then(({ data, source, error }) => {
      if (cancelled) return
      setDataset(data)
      setStatus({ loading: false, source, error })
    })
    return () => {
      cancelled = true
    }
  }, [])

  const options = useMemo(() => getFilterOptions(dataset), [dataset])
  const filtered = useMemo(() => applyFilters(dataset, filters), [dataset, filters])

  const setFilter = (key, value) => setFilters((f) => ({ ...f, [key]: value }))
  const resetFilters = () => setFilters(emptyFilters)

  const activeCount = Object.entries(filters).filter(([, v]) => v).length

  return (
    <FilterContext.Provider
      value={{ filters, setFilter, resetFilters, options, filtered, activeCount, status }}
    >
      {children}
    </FilterContext.Provider>
  )
}

export function useFilters() {
  const ctx = useContext(FilterContext)
  if (!ctx) throw new Error('useFilters debe usarse dentro de <FilterProvider>')
  return ctx
}
