import { useEffect, useState } from 'react'
import { useNavigate } from 'react-router'
import { apiRequest } from '../servicios/api.js'
import './dashboard.css'

const initialMetrics = {
  activos: 0,
  alertas: 0,
  alertasCriticas: 0,
  incidentes: 0,
  mantenimientos: 0,
}

function DashboardPage({ onLogout }) {
  const navigate = useNavigate()

  const [user, setUser] = useState(null)
  const [metrics, setMetrics] = useState(initialMetrics)
  const [message, setMessage] = useState('')

  useEffect(() => {
    const loadDashboard = async () => {
      try {
        const [
          userResponse,
          assetsResponse,
          alertsResponse,
          incidentsResponse,
          maintenanceResponse,
        ] = await Promise.all([
          apiRequest('/auth/me'),
          apiRequest('/activos?offset=0&limite=100'),
          apiRequest('/alertas?offset=0&limite=100'),
          apiRequest('/incidentes?offset=0&limite=100'),
          apiRequest(
            '/mantenimientos?offset=0&limite=100',
          ),
        ])

        const activeAlerts = alertsResponse.filter(
          (alert) =>
            alert.estado === 'activa' ||
            alert.estado === 'reconocida',
        )

        const openIncidents = incidentsResponse.filter(
          (incident) =>
            incident.estado === 'abierto' ||
            incident.estado === 'en_investigacion',
        )

        const pendingMaintenance =
          maintenanceResponse.filter(
            (maintenance) =>
              maintenance.estado === 'programado' ||
              maintenance.estado === 'en_proceso',
          )

        setUser(userResponse)

        setMetrics({
          activos: assetsResponse.length,
          alertas: activeAlerts.length,
          alertasCriticas: activeAlerts.filter(
            (alert) => alert.severidad === 'critica',
          ).length,
          incidentes: openIncidents.length,
          mantenimientos: pendingMaintenance.length,
        })
      } catch (error) {
        setMessage(error.message)
      }
    }

    loadDashboard()
  }, [])

  const getInitials = () => {
    if (!user) {
      return 'US'
    }

    return (
      `${user.nombres?.[0] ?? ''}` +
      `${user.apellidos?.[0] ?? ''}`
    ).toUpperCase()
  }

  const getRoleName = () => {
    const roles = {
      ADMIN_EMPRESA: 'Administrador',
      TECNICO: 'Técnico',
      ANALISTA_SEGURIDAD: 'Analista de seguridad',
      AUDITOR: 'Auditor',
    }

    return roles[user?.rol] ?? 'Usuario'
  }

  return (
    <div className="dashboard-layout">
      <aside className="sidebar">
        <div>
          <div className="sidebar-brand">
            <div className="sidebar-logo">GR</div>

            <div>
              <span>Plataforma inteligente</span>
              <strong>Gestión de Activos</strong>
            </div>
          </div>

          <nav className="sidebar-navigation">
            <button
              className="navigation-item active"
              type="button"
            >
              Dashboard
            </button>

            <button
              className="navigation-item"
              type="button"
              onClick={() => navigate('/activos')}
            >
              Activos tecnológicos
            </button>

            <button
              className="navigation-item"
              type="button"
              onClick={() => navigate('/alertas')}
            >
              Alertas
            </button>

            <button
              className="navigation-item"
              type="button"
              onClick={() => navigate('/incidentes')}
            >
              Incidentes
            </button>

            <button
              className="navigation-item"
              type="button"
              onClick={() => navigate('/mantenimientos')}
            >
              Mantenimientos
            </button>

            <button
              className="navigation-item"
              type="button"
              onClick={() => navigate('/reportes')}
            >
              Reportes
            </button>

            <button
              className="navigation-item"
              type="button"
              onClick={() => navigate('/planes')}
            >
              Planes y suscripción
            </button>
            <button
              className="navigation-item"
              type="button"
              onClick={() => navigate('/usuarios')}
            >
              Usuarios
            </button>
            <button
              className="navigation-item"
               type="button"
              onClick={() => navigate('/sedes')}
            >
            Sedes
            </button>
          </nav>
        </div>

        <button
          className="logout-button"
          type="button"
          onClick={onLogout}
        >
          Cerrar sesión
        </button>
      </aside>

      <main className="dashboard-content">
        <header className="dashboard-header">
          <div>
            <span>Resumen general</span>
            <h1>Dashboard de monitoreo</h1>

            <p>
              Visualiza el estado actual de los activos de
              la organización.
            </p>

            {message && (
              <p role="alert">{message}</p>
            )}
          </div>

          <div className="user-information">
            <div className="user-avatar">
              {getInitials()}
            </div>

            <div>
              <strong>{getRoleName()}</strong>

              <span>
                {user
                  ? `${user.nombres} ${user.apellidos}`
                  : 'Cargando usuario...'}
              </span>
            </div>
          </div>
        </header>

        <section className="metrics-grid">
          <article className="metric-card">
            <span>Activos registrados</span>
            <strong>{metrics.activos}</strong>
            <p>Equipos, sistemas y recursos</p>
          </article>

          <article className="metric-card">
            <span>Alertas activas</span>
            <strong>{metrics.alertas}</strong>
            <p>Requieren revisión o seguimiento</p>
          </article>

          <article className="metric-card critical">
            <span>Incidentes abiertos</span>
            <strong>{metrics.incidentes}</strong>
            <p>Abiertos o en investigación</p>
          </article>

          <article className="metric-card">
            <span>Mantenimientos pendientes</span>
            <strong>{metrics.mantenimientos}</strong>
            <p>Programados o en proceso</p>
          </article>
        </section>

        <section className="dashboard-sections">
          <article className="dashboard-panel">
            <div className="panel-header">
              <div>
                <span>Estado actual</span>
                <h2>Alertas de la organización</h2>
              </div>
            </div>

            <div className="empty-state">
              <div className="empty-icon">!</div>

              {metrics.alertas === 0 ? (
                <>
                  <h3>No existen alertas activas</h3>

                  <p>
                    Actualmente no existen alertas que
                    requieran atención.
                  </p>
                </>
              ) : (
                <>
                  <h3>
                    {metrics.alertas} alertas requieren
                    atención
                  </h3>

                  <p>
                    {metrics.alertasCriticas} corresponden a
                    alertas de severidad crítica.
                  </p>
                </>
              )}
            </div>
          </article>

          <article className="dashboard-panel">
            <div className="panel-header">
              <div>
                <span>Seguimiento</span>
                <h2>Acciones prioritarias</h2>
              </div>
            </div>

            <div className="empty-state small">
              {metrics.incidentes === 0 &&
              metrics.mantenimientos === 0 ? (
                <>
                  <h3>No hay acciones pendientes</h3>

                  <p>
                    No existen incidentes abiertos ni
                    mantenimientos pendientes.
                  </p>
                </>
              ) : (
                <>
                  <h3>Existen acciones pendientes</h3>

                  <p>
                    Revisa los incidentes y mantenimientos
                    que todavía no han finalizado.
                  </p>
                </>
              )}
            </div>
          </article>
        </section>
      </main>
    </div>
  )
}

export default DashboardPage