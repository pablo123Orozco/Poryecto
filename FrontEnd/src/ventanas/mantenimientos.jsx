import { useEffect, useState } from 'react'
import { useNavigate } from 'react-router'
import { apiRequest } from '../servicios/api.js'
import './activos.css'

const initialForm = {
  activo_id: '',
  tipo: 'preventivo',
  descripcion: '',
  costo: '',
  programado_para: '',
}

const typeLabels = {
  preventivo: 'Preventivo',
  correctivo: 'Correctivo',
}

const statusLabels = {
  programado: 'Programado',
  en_proceso: 'En proceso',
  completado: 'Completado',
  cancelado: 'Cancelado',
}

function MaintenancePage() {
  const navigate = useNavigate()

  const [formData, setFormData] = useState(initialForm)
  const [maintenance, setMaintenance] = useState([])
  const [assets, setAssets] = useState([])
  const [user, setUser] = useState(null)
  const [message, setMessage] = useState('')
  const [statusMessage, setStatusMessage] = useState('')
  const [isLoading, setIsLoading] = useState(true)
  const [isSaving, setIsSaving] = useState(false)
  const [changingStatusId, setChangingStatusId] =
    useState(null)

  useEffect(() => {
    const loadData = async () => {
      try {
        const [
          maintenanceResponse,
          assetsResponse,
          userResponse,
        ] = await Promise.all([
          apiRequest(
            '/mantenimientos?offset=0&limite=100',
          ),
          apiRequest('/activos?offset=0&limite=100'),
          apiRequest('/auth/me'),
        ])

        setMaintenance(maintenanceResponse)
        setAssets(assetsResponse)
        setUser(userResponse)
      } catch (error) {
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

    if (!formData.activo_id || !formData.descripcion) {
      setMessage(
        'Selecciona un activo y escribe la descripción.',
      )
      return
    }

    if (!user) {
      setMessage(
        'No fue posible identificar al usuario.',
      )
      return
    }

    setMessage('')
    setIsSaving(true)

    try {
      const newMaintenance = await apiRequest(
        '/mantenimientos',
        {
          method: 'POST',
          body: JSON.stringify({
            activo_id: Number(formData.activo_id),
            responsable_id: user.id,
            tipo: formData.tipo,
            descripcion:
              formData.descripcion.trim(),
            costo:
              formData.costo === ''
                ? null
                : Number(formData.costo),
            programado_para:
              formData.programado_para
                ? new Date(
                    formData.programado_para,
                  ).toISOString()
                : null,
          }),
        },
      )

      setMaintenance((previousMaintenance) => [
        ...previousMaintenance,
        newMaintenance,
      ])

      setFormData(initialForm)

      setMessage(
        'Mantenimiento registrado correctamente.',
      )
    } catch (error) {
      setMessage(error.message)
    } finally {
      setIsSaving(false)
    }
  }

  const handleStatusChange = async (
    maintenanceId,
    newStatus,
  ) => {
    setStatusMessage('')
    setChangingStatusId(maintenanceId)

    try {
      const currentMaintenance = maintenance.find(
        (item) => item.id === maintenanceId,
      )

      if (
        newStatus === 'en_proceso' &&
        !currentMaintenance?.responsable_id &&
        user
      ) {
        await apiRequest(
          `/mantenimientos/${maintenanceId}`,
          {
            method: 'PATCH',
            body: JSON.stringify({
              responsable_id: user.id,
            }),
          },
        )
      }

      const updatedMaintenance = await apiRequest(
        `/mantenimientos/${maintenanceId}/estado`,
        {
          method: 'PATCH',
          body: JSON.stringify({
            estado: newStatus,
          }),
        },
      )

      setMaintenance((previousMaintenance) =>
        previousMaintenance.map((item) =>
          item.id === maintenanceId
            ? updatedMaintenance
            : item,
        ),
      )

      setStatusMessage(
        'Estado del mantenimiento actualizado correctamente.',
      )
    } catch (error) {
      setStatusMessage(error.message)
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
    if (status === 'programado') {
      return [
        'programado',
        'en_proceso',
        'cancelado',
      ]
    }

    if (status === 'en_proceso') {
      return [
        'en_proceso',
        'completado',
        'cancelado',
      ]
    }

    return [status]
  }

  const formatDate = (dateValue) => {
    if (!dateValue) {
      return 'Sin fecha'
    }

    return new Date(dateValue).toLocaleString('es-GT')
  }

  const formatCost = (cost) => {
    if (cost === null || cost === undefined) {
      return 'Sin costo'
    }

    return `Q ${Number(cost).toFixed(2)}`
  }

  return (
    <main className="assets-page">
      <header className="assets-header">
        <div>
          <span>Control operativo</span>
          <h1>Gestión de mantenimientos</h1>

          <p>
            Programa y controla los mantenimientos de los
            activos tecnológicos.
          </p>
        </div>

        <button
          className="back-button"
          type="button"
          onClick={() => navigate('/dashboard')}
        >
          Volver al dashboard
        </button>
      </header>

      <section className="assets-content">
        <article className="asset-form-panel">
          <div className="panel-title">
            <span>Nuevo mantenimiento</span>
            <h2>Programar mantenimiento</h2>

            <p>
              El mantenimiento quedará asignado al usuario
              autenticado.
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
              <label htmlFor="tipo">
                Tipo <strong>*</strong>
              </label>

              <select
                id="tipo"
                name="tipo"
                value={formData.tipo}
                onChange={handleChange}
                disabled={isSaving}
              >
                <option value="preventivo">
                  Preventivo
                </option>

                <option value="correctivo">
                  Correctivo
                </option>
              </select>
            </div>

            <div className="form-field full-width">
              <label htmlFor="descripcion">
                Descripción <strong>*</strong>
              </label>

              <textarea
                id="descripcion"
                name="descripcion"
                rows="4"
                placeholder="Describe el trabajo que se realizará..."
                value={formData.descripcion}
                onChange={handleChange}
                disabled={isSaving}
              />
            </div>

            <div className="form-field">
              <label htmlFor="costo">
                Costo estimado
              </label>

              <input
                id="costo"
                name="costo"
                type="number"
                min="0"
                step="0.01"
                placeholder="Ejemplo: 500.00"
                value={formData.costo}
                onChange={handleChange}
                disabled={isSaving}
              />
            </div>

            <div className="form-field">
              <label htmlFor="programado_para">
                Fecha programada
              </label>

              <input
                id="programado_para"
                name="programado_para"
                type="datetime-local"
                value={formData.programado_para}
                onChange={handleChange}
                disabled={isSaving}
              />
            </div>

            {message && (
              <p
                className="asset-message"
                role="alert"
              >
                {message}
              </p>
            )}

            <button
              className="save-asset-button"
              type="submit"
              disabled={isSaving}
            >
              {isSaving
                ? 'Registrando...'
                : 'Programar mantenimiento'}
            </button>
          </form>
        </article>

        <article className="asset-list-panel">
          <div className="panel-title">
            <span>Mantenimientos registrados</span>
            <h2>Seguimiento de mantenimientos</h2>

            <p>
              Total de mantenimientos: {maintenance.length}
            </p>
          </div>

          {statusMessage && (
            <p
              className="asset-message"
              role="alert"
            >
              {statusMessage}
            </p>
          )}

          {isLoading ? (
            <div className="assets-empty-state">
              <h3>Cargando mantenimientos...</h3>
            </div>
          ) : maintenance.length === 0 ? (
            <div className="assets-empty-state">
              <div className="assets-empty-icon">
                0
              </div>

              <h3>
                No existen mantenimientos registrados
              </h3>

              <p>
                Utiliza el formulario para programar el
                primer mantenimiento.
              </p>
            </div>
          ) : (
            <div className="asset-list">
              {maintenance.map((item) => (
                <article
                  className="asset-item"
                  key={item.id}
                >
                  <div className="asset-item-header">
                    <div>
                      <span>
                        {getAssetName(item.activo_id)}
                      </span>

                      <h3>
                        Mantenimiento{' '}
                        {typeLabels[item.tipo]}
                      </h3>
                    </div>

                    <span className="criticality-badge">
                      {statusLabels[item.estado]}
                    </span>
                  </div>

                  <dl className="asset-details">
                    <div>
                      <dt>Estado</dt>

                      <dd>
                        <select
                          value={item.estado}
                          disabled={
                            changingStatusId === item.id ||
                            item.estado === 'completado' ||
                            item.estado === 'cancelado'
                          }
                          onChange={(event) =>
                            handleStatusChange(
                              item.id,
                              event.target.value,
                            )
                          }
                        >
                          {getAvailableStatuses(
                            item.estado,
                          ).map((status) => (
                            <option
                              key={status}
                              value={status}
                            >
                              {statusLabels[status]}
                            </option>
                          ))}
                        </select>
                      </dd>
                    </div>

                    <div>
                      <dt>Fecha programada</dt>

                      <dd>
                        {formatDate(
                          item.programado_para,
                        )}
                      </dd>
                    </div>

                    <div>
                      <dt>Costo</dt>
                      <dd>{formatCost(item.costo)}</dd>
                    </div>
                  </dl>

                  <p className="asset-description">
                    {item.descripcion}
                  </p>
                </article>
              ))}
            </div>
          )}
        </article>
      </section>
    </main>
  )
}

export default MaintenancePage