import { useState } from 'react'
import {
  Navigate,
  Route,
  Routes,
  useNavigate,
} from 'react-router'

import LoginPage from './ventanas/login.jsx'
import DashboardPage from './ventanas/dashboard.jsx'
import AssetsPage from './ventanas/activos.jsx'
import AlertsPage from './ventanas/alertas.jsx'
import IncidentsPage from './ventanas/incidentes.jsx'
import MaintenancePage from './ventanas/mantenimientos.jsx'
import ReportsPage from './ventanas/reportes.jsx'
import PlansPage from './ventanas/planes.jsx'
import UsersPage from './ventanas/usuarios.jsx'
import SitesPage from './ventanas/sedes.jsx'
import MetricsPage from './ventanas/metricas.jsx'

function App() {
  const [isAuthenticated, setIsAuthenticated] = useState(
    () => Boolean(localStorage.getItem('access_token')),
  )

  const navigate = useNavigate()

  const handleLogin = () => {
    setIsAuthenticated(true)
    navigate('/dashboard')
  }

  const handleLogout = () => {
    localStorage.removeItem('access_token')
    setIsAuthenticated(false)
    navigate('/login')
  }

  const protectedPage = (page) => (
    isAuthenticated
      ? page
      : <Navigate to="/login" replace />
  )

  return (
    <Routes>
      <Route
        path="/login"
        element={
          isAuthenticated ? (
            <Navigate to="/dashboard" replace />
          ) : (
            <LoginPage onLogin={handleLogin} />
          )
        }
      />

      <Route
        path="/dashboard"
        element={protectedPage(
          <DashboardPage onLogout={handleLogout} />,
        )}
      />

      <Route
        path="/activos"
        element={protectedPage(<AssetsPage />)}
      />

      <Route
        path="/alertas"
        element={protectedPage(<AlertsPage />)}
      />

      <Route
        path="/incidentes"
        element={protectedPage(<IncidentsPage />)}
      />

      <Route
        path="/mantenimientos"
        element={protectedPage(<MaintenancePage />)}
      />

      <Route
        path="/reportes"
        element={protectedPage(<ReportsPage />)}
      />

      <Route
        path="/planes"
        element={protectedPage(<PlansPage />)}
      />
      <Route
       path="/usuarios"
      element={protectedPage(<UsersPage />)}
      />
      <Route
        path="/sedes"
        element={protectedPage(<SitesPage />)}
      />
      <Route
        path="/metricas"
         element={protectedPage(<MetricsPage />)}
      />

      <Route
        path="*"
        element={
          <Navigate
            to={isAuthenticated ? '/dashboard' : '/login'}
            replace
          />
        }
      />
    </Routes>
  )
}

export default App