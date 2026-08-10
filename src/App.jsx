import { BrowserRouter, Route, Routes } from 'react-router-dom'
import Sidebar from './components/Sidebar'
import FilterBar from './components/FilterBar'
import DashboardEjecutivo from './pages/DashboardEjecutivo'
import Ventas from './pages/Ventas'
import SellOut from './pages/SellOut'
import ComingSoon from './pages/ComingSoon'
import { FilterProvider } from './context/FilterContext'

export default function App() {
  return (
    <FilterProvider>
      <BrowserRouter>
        <div className="min-h-screen">
          <Sidebar />
          <main className="pl-60">
            <div className="max-w-[1400px] mx-auto px-6 py-6 space-y-5">
              <FilterBar />
              <Routes>
                <Route path="/" element={<DashboardEjecutivo />} />
                <Route path="/ventas" element={<Ventas />} />
                <Route path="/sell-out" element={<SellOut />} />
                <Route path="/activaciones" element={<ComingSoon title="Activaciones" />} />
                <Route path="/clientes" element={<ComingSoon title="Clientes" />} />
                <Route path="/planeacion" element={<ComingSoon title="Planeación" />} />
                <Route path="/embajadores" element={<ComingSoon title="Embajadores" />} />
              </Routes>
            </div>
          </main>
        </div>
      </BrowserRouter>
    </FilterProvider>
  )
}
