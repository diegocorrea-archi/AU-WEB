import { HashRouter, Route, Routes } from 'react-router-dom'
import Sidebar from './components/Sidebar'
import FilterBar from './components/FilterBar'
import DashboardEjecutivo from './pages/DashboardEjecutivo'
import Ventas from './pages/Ventas'
import SellOut from './pages/SellOut'
import Planeacion from './pages/Planeacion'
import Clientes from './pages/Clientes'
import Embajadores from './pages/Embajadores'
import Activaciones from './pages/Activaciones'
import Universo from './pages/Universo'
import { FilterProvider } from './context/FilterContext'

export default function App() {
  return (
    <FilterProvider>
      <HashRouter>
        <div className="min-h-screen">
          <Sidebar />
          <main className="md:pl-60">
            <div className="max-w-[1400px] mx-auto px-3 md:px-6 pt-16 md:pt-6 pb-6 space-y-5">
              <FilterBar />
              <Routes>
                <Route path="/" element={<DashboardEjecutivo />} />
                <Route path="/ventas" element={<Ventas />} />
                <Route path="/sell-out" element={<SellOut />} />
                <Route path="/activaciones" element={<Activaciones />} />
                <Route path="/universo" element={<Universo />} />
                <Route path="/clientes" element={<Clientes />} />
                <Route path="/planeacion" element={<Planeacion />} />
                <Route path="/embajadores" element={<Embajadores />} />
              </Routes>
            </div>
          </main>
        </div>
      </HashRouter>
    </FilterProvider>
  )
}
