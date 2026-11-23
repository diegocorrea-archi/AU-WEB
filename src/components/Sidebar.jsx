import { useState } from 'react'
import { NavLink } from 'react-router-dom'

const ITEMS = [
  { to: '/', label: 'Dashboard Ejecutivo', icon: '◆' },
  { to: '/ventas', label: 'Ventas', icon: '▲' },
  { to: '/sell-out', label: 'Sell Out', icon: '▽' },
  { to: '/activaciones', label: 'Activaciones', icon: '●' },
  { to: '/universo', label: 'Universo', icon: '▦' },
  { to: '/clientes', label: 'Clientes', icon: '□' },
  { to: '/planeacion', label: 'Planeación', icon: '▥' },
  { to: '/embajadores', label: 'Embajadores', icon: '☆' },
]

export default function Sidebar() {
  const [open, setOpen] = useState(false)
  return (
    <>
    <button type="button" aria-label={open ? 'Cerrar menú' : 'Abrir menú'} aria-expanded={open}
      className="md:hidden fixed top-3 left-3 z-50 bg-sidebar text-white px-3 py-2 rounded-md shadow-lg"
      onClick={() => setOpen((v) => !v)}>{open ? '✕' : '☰'} Menú</button>
    {open && <button type="button" aria-label="Cerrar navegación" className="md:hidden fixed inset-0 bg-black/50 z-30" onClick={() => setOpen(false)} />}
    <aside className={`fixed left-0 top-0 z-40 h-screen w-60 bg-sidebar text-sidebartext flex flex-col shrink-0 transition-transform md:translate-x-0 ${open ? 'translate-x-0' : '-translate-x-full'}`}>

      <div className="px-6 py-6 border-b border-white/10">
        <p className="text-[11px] uppercase tracking-[0.18em] text-white/40">Archipiélago Spirits</p>
        <h1 className="section-title text-xl mt-1 leading-tight">
          Dashboard <br /> Comercial
        </h1>
        <div className="brand-stripe mt-4">
          <span className="bg-union flex-1" />
          <span className="bg-primo flex-1" />
        </div>
        <div className="flex justify-between text-[10px] uppercase tracking-wide text-white/40 mt-1.5">
          <span>Unión</span>
          <span>Primo</span>
        </div>
      </div>

      <nav className="flex-1 px-3 py-4 space-y-1 overflow-y-auto">
        {ITEMS.map((item) => (
          <NavLink
            key={item.to}
            onClick={() => setOpen(false)}
            to={item.to}
            end={item.to === '/'}
            className={({ isActive }) =>
              `flex items-center gap-3 px-3 py-2.5 rounded-md text-sm transition-colors ${
                isActive ? 'bg-white/10 text-white' : 'text-white/60 hover:bg-white/5 hover:text-white'
              }`
            }
          >
            <span className="text-xs w-4 text-center opacity-70">{item.icon}</span>
            {item.label}
          </NavLink>
        ))}
      </nav>

      <div className="px-6 py-4 border-t border-white/10 text-[11px] text-white/35">
        Fuente: Google Sheets
        <br />
        Sin login · vista compartida
      </div>
    </aside>
    </>
  )
}
