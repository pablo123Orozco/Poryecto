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
        element={
          isAuthenticated ? (
            <DashboardPage onLogout={handleLogout} />
          ) : (
            <Navigate to="/login" replace />
          )
        }
      />

      <Route
        path="/activos"
        element={
          isAuthenticated ? (
            <AssetsPage />
          ) : (
            <Navigate to="/login" replace />
          )
        }
      />

      <Route
        path="/"
        element={
          <Navigate
            to={
              isAuthenticated
                ? '/dashboard'
                : '/login'
            }
            replace
          />
        }
      />

      <Route
        path="*"
        element={
          <Navigate
            to={
              isAuthenticated
                ? '/dashboard'
                : '/login'
            }
            replace
          />
        }
      />
    </Routes>
  )
}

export default App