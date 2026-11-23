import { createContext, useContext, useEffect, useMemo, useState } from 'react'
import { emptyFilters, emptyDataset, getFilterOptions, applyFilters } from '../lib/kpis'
import { loadDataset } from '../lib/dataset'

const FilterContext = createContext(null)

export function FilterProvider({ children }) {
  const [filters, setFilters] = useState(emptyFilters)
  const [dataset, setDataset] = useState(emptyDataset)
  const [status, setStatus] = useState({ loading: true, source: null, error: null })

  const [request, setRequest] = useState({ key: 0, useSample: false })
  useEffect(() => {
    let cancelled = false
    loadDataset({ useSample: request.useSample })
      .then(({ data, source, error }) => {
        if (cancelled) return
        setDataset(data)
        setStatus({ loading: false, source, error })
      })
      .catch((error) => {
        if (cancelled) return
        setDataset(emptyDataset)
        setStatus({ loading: false, source: 'error', error: error.message })
      })
    return () => { cancelled = true }
  }, [request])

  const retrySheet = () => {
    setStatus({ loading: true, source: null, error: null })
    setRequest((r) => ({ key: r.key + 1, useSample: false }))
  }
  const showSample = () => {
    setStatus({ loading: true, source: null, error: null })
    setRequest((r) => ({ key: r.key + 1, useSample: true }))
  }

  const options = useMemo(() => getFilterOptions(dataset), [dataset])
  const filtered = useMemo(() => applyFilters(dataset, filters), [dataset, filters])

  const setFilter = (key, value) => setFilters((f) => ({ ...f, [key]: value }))
  const resetFilters = () => setFilters(emptyFilters)

  const activeCount = Object.entries(filters).filter(([, v]) => v).length

  return (
    <FilterContext.Provider
      value={{ filters, setFilter, resetFilters, options, filtered, dataset, activeCount, status, retrySheet, showSample }}
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
