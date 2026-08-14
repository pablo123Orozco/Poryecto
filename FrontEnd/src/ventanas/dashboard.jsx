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

const initialInfrastructure = {
  estado_general: 'sin_datos',
  total_hosts: 0,
  saludables: 0,
  degradados: 0,
  criticos: 0,
  sin_conexion: 0,
  sin_datos: 0,
  en_mantenimiento: 0,
  deshabilitados: 0,
  problemas_abiertos: 0,
  hosts: [],
}

const infrastructureStateLabels = {
  saludable: 'Saludable',
  degradado: 'Degradado',
  critico: 'Crítico',
  sin_conexion: 'Sin conexión',
  sin_datos: 'Sin datos',
  mantenimiento: 'En mantenimiento',
  deshabilitado: 'Deshabilitado',
}

function DashboardPage({ onLogout }) {
  const navigate = useNavigate()

  const [user, setUser] = useState(null)
  const [metrics, setMetrics] = useState(initialMetrics)
  const [infrastructure, setInfrastructure] = useState(
    initialInfrastructure,
  )
  const [infrastructureLoading, setInfrastructureLoading] =
    useState(true)
  const [infrastructureMessage, setInfrastructureMessage] =
    useState('')
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

      try {
        const infrastructureResponse = await apiRequest(
          '/zabbix/infraestructura',
        )

        setInfrastructure(infrastructureResponse)
      } catch (error) {
        setInfrastructureMessage(error.message)
      } finally {
        setInfrastructureLoading(false)
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

  const getInfrastructureStateLabel = () =>
    infrastructureStateLabels[
      infrastructure.estado_general
    ] ?? 'Sin datos'

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
            <button
              className="navigation-item"
               type="button"
              onClick={() => navigate('/metricas')}
            >
            Métricas
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
          <button
            className="metric-card"
            type="button"
            title="Ir a activos tecnológicos"
            onClick={() => navigate('/activos')}
          >
            <span>Activos registrados</span>
            <strong>{metrics.activos}</strong>
              <p>Equipos, sistemas y recursos</p>
            </button>

          <button
          className="metric-card"
          type="button"
          title="Ir a alertas"
          onClick={() => navigate('/alertas')}
          >
            <span>Alertas activas</span>
            <strong>{metrics.alertas}</strong>
            <p>Requieren revisión o seguimiento</p>
          </button>

          <button
            className="metric-card critical"
            type="button"
            title="Ir a incidentes"
            onClick={() => navigate('/incidentes')}
          >
            <span>Incidentes abiertos</span>
            <strong>{metrics.incidentes}</strong>
            <p>Abiertos o en investigación</p>
          </button>

          <button
            className="metric-card"
            type="button"
            title="Ir a mantenimientos"
            onClick={() => navigate('/mantenimientos')}
          >
            <span>Mantenimientos pendientes</span>
            <strong>{metrics.mantenimientos}</strong>
            <p>Programados o en proceso</p>
          </button>
        </section>

        <section className="infrastructure-section">
          <article className="dashboard-panel infrastructure-panel">
            <div className="panel-header infrastructure-header">
              <div>
                <span>Monitoreo con Zabbix</span>
                <h2>Estado de la infraestructura</h2>
              </div>

              {!infrastructureLoading &&
                !infrastructureMessage && (
                  <span
                    className={`infrastructure-status ${infrastructure.estado_general}`}
                  >
                    {getInfrastructureStateLabel()}
                  </span>
                )}
            </div>

            {infrastructureLoading ? (
              <div className="infrastructure-loading">
                Consultando el estado de los equipos...
              </div>
            ) : infrastructureMessage ? (
              <div
                className="infrastructure-error"
                role="alert"
              >
                <strong>No fue posible consultar Zabbix</strong>
                <span>{infrastructureMessage}</span>
              </div>
            ) : (
              <>
                <div className="infrastructure-grid">
                  <div className="infrastructure-item total">
                    <span>Equipos monitoreados</span>
                    <strong>{infrastructure.total_hosts}</strong>
                  </div>

                  <div className="infrastructure-item healthy">
                    <span>Saludables</span>
                    <strong>{infrastructure.saludables}</strong>
                  </div>

                  <div className="infrastructure-item degraded">
                    <span>Degradados</span>
                    <strong>{infrastructure.degradados}</strong>
                  </div>

                  <div className="infrastructure-item critical">
                    <span>Críticos</span>
                    <strong>{infrastructure.criticos}</strong>
                  </div>

                  <div className="infrastructure-item offline">
                    <span>Sin conexión</span>
                    <strong>{infrastructure.sin_conexion}</strong>
                  </div>

                  <div className="infrastructure-item problems">
                    <span>Problemas abiertos</span>
                    <strong>
                      {infrastructure.problemas_abiertos}
                    </strong>
                  </div>
                </div>

                <div className="infrastructure-footer">
                  <span>
                    Sin datos: {infrastructure.sin_datos}
                  </span>
                  <span>
                    En mantenimiento:{' '}
                    {infrastructure.en_mantenimiento}
                  </span>
                  <span>
                    Deshabilitados:{' '}
                    {infrastructure.deshabilitados}
                  </span>
                </div>
              </>
            )}
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