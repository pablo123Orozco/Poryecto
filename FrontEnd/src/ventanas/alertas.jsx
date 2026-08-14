import { useEffect, useState } from 'react'
import { useNavigate } from 'react-router'
import { apiRequest } from '../servicios/api.js'
import Notificacion from '../componentes/Notificacion.jsx'
import './activos.css'

const initialForm = {
  activo_id: '',
  titulo: '',
  severidad: 'media',
  descripcion: '',
}

const severityLabels = {
  informativa: 'Informativa',
  baja: 'Baja',
  media: 'Media',
  alta: 'Alta',
  critica: 'Crítica',
}

const statusLabels = {
  activa: 'Activa',
  reconocida: 'Reconocida',
  resuelta: 'Resuelta',
  descartada: 'Descartada',
}

function AlertsPage() {
  const navigate = useNavigate()

  const [formData, setFormData] =
    useState(initialForm)
  const [alerts, setAlerts] = useState([])
  const [assets, setAssets] = useState([])
  const [message, setMessage] = useState('')
  const [messageType, setMessageType] =
    useState('exito')
  const [isLoading, setIsLoading] = useState(true)
  const [isSaving, setIsSaving] = useState(false)
  const [changingStatusId, setChangingStatusId] =
    useState(null)

  const mostrarMensaje = (
    texto,
    tipo = 'exito',
  ) => {
    setMessageType(tipo)
    setMessage(texto)
  }

  useEffect(() => {
    const loadData = async () => {
      try {
        const [alertsResponse, assetsResponse] =
          await Promise.all([
            apiRequest('/alertas?offset=0&limite=100'),
            apiRequest('/activos?offset=0&limite=100'),
          ])

        setAlerts(alertsResponse)
        setAssets(assetsResponse)
      } catch (error) {
        setMessageType('error')
        setMessage(error.message)
      } finally {
        setIsLoading(false)
      }
    }

    loadData()
  }, [])

  const handleChange = (event) => {
    const { name, value } = event.target

    setFormData((previousData) => ({
      ...previousData,
      [name]: value,
    }))
  }

  const handleSubmit = async (event) => {
    event.preventDefault()

    if (!formData.activo_id || !formData.titulo) {
      mostrarMensaje(
        'Selecciona un activo y escribe el título.',
        'error',
      )
      return
    }

    setMessage('')
    setIsSaving(true)

    try {
      const newAlert = await apiRequest('/alertas', {
        method: 'POST',
        body: JSON.stringify({
          activo_id: Number(formData.activo_id),
          titulo: formData.titulo.trim(),
          severidad: formData.severidad,
          descripcion:
            formData.descripcion.trim() || null,
        }),
      })

      setAlerts((previousAlerts) => [
        ...previousAlerts,
        newAlert,
      ])

      setFormData(initialForm)

      mostrarMensaje(
        'Alerta registrada correctamente.',
      )
    } catch (error) {
      mostrarMensaje(error.message, 'error')
    } finally {
      setIsSaving(false)
    }
  }

  const handleStatusChange = async (
    alertId,
    newStatus,
  ) => {
    setMessage('')
    setChangingStatusId(alertId)

    try {
      const updatedAlert = await apiRequest(
        `/alertas/${alertId}/estado`,
        {
          method: 'PATCH',
          body: JSON.stringify({
            estado: newStatus,
          }),
        },
      )

      setAlerts((previousAlerts) =>
        previousAlerts.map((alert) =>
          alert.id === alertId
            ? updatedAlert
            : alert,
        ),
      )

      mostrarMensaje(
        'Estado de la alerta actualizado correctamente.',
      )
    } catch (error) {
      mostrarMensaje(error.message, 'error')
    } finally {
      setChangingStatusId(null)
    }
  }

  const getAssetName = (assetId) => {
    const asset = assets.find(
      (item) => item.id === assetId,
    )

    return asset?.nombre ?? `Activo ${assetId}`
  }

  const getAvailableStatuses = (status) => {
    if (status === 'activa') {
      return [
        'activa',
        'reconocida',
        'descartada',
      ]
    }

    if (status === 'reconocida') {
      return [
        'reconocida',
        'resuelta',
        'descartada',
      ]
    }

    return [status]
  }

  const formatDate = (dateValue) => {
    if (!dateValue) {
      return 'Sin fecha'
    }

    return new Date(dateValue).toLocaleString(
      'es-GT',
    )
  }

  return (
    <main className="assets-page">
      <Notificacion
        mensaje={message}
        tipo={messageType}
        alCerrar={() => setMessage('')}
      />

      <header className="assets-header">
        <div>
          <span>Monitoreo</span>

          <h1>Gestión de alertas</h1>

          <p>
            Registra y administra las alertas relacionadas
            con los activos tecnológicos.
          </p>
        </div>

        <button
          className="back-button"
          type="button"
          aria-label="Volver al dashboard"
          title="Volver al dashboard"
          onClick={() => navigate('/dashboard')}
        ></button>
      </header>

      <section className="assets-content">
        <article className="asset-form-panel">
          <div className="panel-title">
            <span>Nueva alerta</span>

            <h2>Registrar alerta</h2>

            <p>
              Selecciona el activo relacionado y establece
              la severidad.
            </p>
          </div>

          <form
            className="asset-form"
            onSubmit={handleSubmit}
          >
            <div className="form-field full-width">
              <label htmlFor="activo_id">
                Activo relacionado <strong>*</strong>
              </label>

              <select
                id="activo_id"
                name="activo_id"
                value={formData.activo_id}
                onChange={handleChange}
                disabled={isSaving}
              >
                <option value="">
                  Selecciona un activo
                </option>

                {assets.map((asset) => (
                  <option
                    key={asset.id}
                    value={asset.id}
                  >
                    {asset.nombre}
                  </option>
                ))}
              </select>
            </div>

            <div className="form-field full-width">
              <label htmlFor="titulo">
                Título <strong>*</strong>
              </label>

              <input
                id="titulo"
                name="titulo"
                type="text"
                placeholder="Ejemplo: Uso elevado de memoria"
                value={formData.titulo}
                onChange={handleChange}
                disabled={isSaving}
              />
            </div>

            <div className="form-field full-width">
              <label htmlFor="severidad">
                Severidad <strong>*</strong>
              </label>

              <select
                id="severidad"
                name="severidad"
                value={formData.severidad}
                onChange={handleChange}
                disabled={isSaving}
              >
                <option value="informativa">
                  Informativa
                </option>

                <option value="baja">
                  Baja
                </option>

                <option value="media">
                  Media
                </option>

                <option value="alta">
                  Alta
                </option>

                <option value="critica">
                  Crítica
                </option>
              </select>
            </div>

            <div className="form-field full-width">
              <label htmlFor="descripcion">
                Descripción
              </label>

              <textarea
                id="descripcion"
                name="descripcion"
                rows="4"
                placeholder="Describe la alerta..."
                value={formData.descripcion}
                onChange={handleChange}
                disabled={isSaving}
              />
            </div>

            <button
              className="save-asset-button"
              type="submit"
              disabled={isSaving}
            >
              {isSaving
                ? 'Registrando...'
                : 'Registrar alerta'}
            </button>
          </form>
        </article>

        <article className="asset-list-panel">
          <div className="panel-title">
            <span>Alertas registradas</span>

            <h2>Seguimiento de alertas</h2>

            <p>
              Total de alertas: {alerts.length}
            </p>
          </div>

          {isLoading ? (
            <div className="assets-empty-state">
              <h3>Cargando alertas...</h3>
            </div>
          ) : alerts.length === 0 ? (
            <div className="assets-empty-state">
              <div className="assets-empty-icon">
                0
              </div>

              <h3>No existen alertas registradas</h3>

              <p>
                Utiliza el formulario para registrar la
                primera alerta.
              </p>
            </div>
          ) : (
            <div className="asset-list">
              {alerts.map((alert) => (
                <article
                  className="asset-item"
                  key={alert.id}
                >
                  <div className="asset-item-header">
                    <div>
                      <span>
                        {getAssetName(alert.activo_id)}
                      </span>

                      <h3>{alert.titulo}</h3>
                    </div>

                    <span
                      className={
                        `criticality-badge ` +
                        `criticality-${alert.severidad}`
                      }
                    >
                      {severityLabels[
                        alert.severidad
                      ] ?? alert.severidad}
                    </span>
                  </div>

                  <dl className="asset-details">
                    <div>
                      <dt>Estado</dt>

                      <dd>
                        <select
                          value={alert.estado}
                          disabled={
                            changingStatusId ===
                              alert.id ||
                            alert.estado ===
                              'resuelta' ||
                            alert.estado ===
                              'descartada'
                          }
                          onChange={(event) =>
                            handleStatusChange(
                              alert.id,
                              event.target.value,
                            )
                          }
                        >
                          {getAvailableStatuses(
                            alert.estado,
                          ).map((alertStatus) => (
                            <option
                              key={alertStatus}
                              value={alertStatus}
                            >
                              {
                                statusLabels[
                                  alertStatus
                                ]
                              }
                            </option>
                          ))}
                        </select>
                      </dd>
                    </div>

                    <div>
                      <dt>Detectada</dt>

                      <dd>
                        {formatDate(
                          alert.detectada_en,
                        )}
                      </dd>
                    </div>

                    <div>
                      <dt>Severidad</dt>

                      <dd>
                        {severityLabels[
                          alert.severidad
                        ] ?? alert.severidad}
                      </dd>
                    </div>
                  </dl>

                  {alert.descripcion && (
                    <p className="asset-description">
                      {alert.descripcion}
                    </p>
                  )}
                </article>
              ))}
            </div>
          )}
        </article>
      </section>
    </main>
  )
}

export default AlertsPage