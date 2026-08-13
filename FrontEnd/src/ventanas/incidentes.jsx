import { useEffect, useState } from 'react'
import { useNavigate } from 'react-router'
import { apiRequest } from '../servicios/api.js'
import './activos.css'

const initialForm = {
  activo_id: '',
  titulo: '',
  prioridad: 'media',
  descripcion: '',
}

const priorityLabels = {
  baja: 'Baja',
  media: 'Media',
  alta: 'Alta',
  critica: 'Crítica',
}

const statusLabels = {
  abierto: 'Abierto',
  en_investigacion: 'En investigación',
  resuelto: 'Resuelto',
  cerrado: 'Cerrado',
}

function IncidentsPage() {
  const navigate = useNavigate()

  const [formData, setFormData] = useState(initialForm)
  const [incidents, setIncidents] = useState([])
  const [assets, setAssets] = useState([])
  const [user, setUser] = useState(null)
  const [solutions, setSolutions] = useState({})
  const [message, setMessage] = useState('')
  const [statusMessage, setStatusMessage] = useState('')
  const [isLoading, setIsLoading] = useState(true)
  const [isSaving, setIsSaving] = useState(false)
  const [changingStatusId, setChangingStatusId] =
    useState(null)
  const [savingSolutionId, setSavingSolutionId] =
    useState(null)

  useEffect(() => {
    const loadData = async () => {
      try {
        const [
          incidentsResponse,
          assetsResponse,
          userResponse,
        ] = await Promise.all([
          apiRequest(
            '/incidentes?offset=0&limite=100',
          ),
          apiRequest('/activos?offset=0&limite=100'),
          apiRequest('/auth/me'),
        ])

        setIncidents(incidentsResponse)
        setAssets(assetsResponse)
        setUser(userResponse)

        setSolutions(
          Object.fromEntries(
            incidentsResponse.map((incident) => [
              incident.id,
              incident.solucion ?? '',
            ]),
          ),
        )
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

    if (!formData.activo_id || !formData.titulo) {
      setMessage(
        'Selecciona un activo y escribe el título.',
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
      const newIncident = await apiRequest(
        '/incidentes',
        {
          method: 'POST',
          body: JSON.stringify({
            activo_id: Number(formData.activo_id),
            asignado_a: user.id,
            titulo: formData.titulo.trim(),
            prioridad: formData.prioridad,
            descripcion:
              formData.descripcion.trim() || null,
          }),
        },
      )

      setIncidents((previousIncidents) => [
        ...previousIncidents,
        newIncident,
      ])

      setSolutions((previousSolutions) => ({
        ...previousSolutions,
        [newIncident.id]: '',
      }))

      setFormData(initialForm)

      setMessage(
        'Incidente registrado correctamente.',
      )
    } catch (error) {
      setMessage(error.message)
    } finally {
      setIsSaving(false)
    }
  }

  const handleStatusChange = async (
    incidentId,
    newStatus,
  ) => {
    setStatusMessage('')
    setChangingStatusId(incidentId)

    try {
      const currentIncident = incidents.find(
        (incident) => incident.id === incidentId,
      )

      if (
        newStatus === 'en_investigacion' &&
        !currentIncident?.asignado_a &&
        user
      ) {
        await apiRequest(
          `/incidentes/${incidentId}`,
          {
            method: 'PATCH',
            body: JSON.stringify({
              asignado_a: user.id,
            }),
          },
        )
      }

      const updatedIncident = await apiRequest(
        `/incidentes/${incidentId}/estado`,
        {
          method: 'PATCH',
          body: JSON.stringify({
            estado: newStatus,
          }),
        },
      )

      setIncidents((previousIncidents) =>
        previousIncidents.map((incident) =>
          incident.id === incidentId
            ? updatedIncident
            : incident,
        ),
      )

      setStatusMessage(
        'Estado del incidente actualizado correctamente.',
      )
    } catch (error) {
      setStatusMessage(error.message)
    } finally {
      setChangingStatusId(null)
    }
  }

  const handleSolutionChange = (
    incidentId,
    value,
  ) => {
    setSolutions((previousSolutions) => ({
      ...previousSolutions,
      [incidentId]: value,
    }))
  }

  const handleSaveSolution = async (incidentId) => {
    const solution = solutions[incidentId]?.trim()

    if (!solution) {
      setStatusMessage(
        'Escribe la solución antes de guardarla.',
      )
      return
    }

    setStatusMessage('')
    setSavingSolutionId(incidentId)

    try {
      const updatedIncident = await apiRequest(
        `/incidentes/${incidentId}`,
        {
          method: 'PATCH',
          body: JSON.stringify({
            solucion: solution,
          }),
        },
      )

      setIncidents((previousIncidents) =>
        previousIncidents.map((incident) =>
          incident.id === incidentId
            ? updatedIncident
            : incident,
        ),
      )

      setStatusMessage(
        'Solución del incidente guardada correctamente.',
      )
    } catch (error) {
      setStatusMessage(error.message)
    } finally {
      setSavingSolutionId(null)
    }
  }

  const getAssetName = (assetId) => {
    const asset = assets.find(
      (item) => item.id === assetId,
    )

    return asset?.nombre ?? `Activo ${assetId}`
  }

  const getAvailableStatuses = (status) => {
    if (status === 'abierto') {
      return ['abierto', 'en_investigacion']
    }

    if (status === 'en_investigacion') {
      return ['en_investigacion', 'resuelto']
    }

    if (status === 'resuelto') {
      return ['resuelto', 'cerrado']
    }

    return ['cerrado']
  }

  const formatDate = (dateValue) => {
    if (!dateValue) {
      return 'Sin fecha'
    }

    return new Date(dateValue).toLocaleString('es-GT')
  }

  return (
    <main className="assets-page">
      <header className="assets-header">
        <div>
          <span>Seguimiento operativo</span>
          <h1>Gestión de incidentes</h1>

          <p>
            Registra y administra los incidentes
            relacionados con los activos tecnológicos.
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
            <span>Nuevo incidente</span>
            <h2>Registrar incidente</h2>

            <p>
              El incidente quedará asignado al usuario
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
              <label htmlFor="titulo">
                Título <strong>*</strong>
              </label>

              <input
                id="titulo"
                name="titulo"
                type="text"
                placeholder="Ejemplo: Falla de conectividad"
                value={formData.titulo}
                onChange={handleChange}
                disabled={isSaving}
              />
            </div>

            <div className="form-field full-width">
              <label htmlFor="prioridad">
                Prioridad <strong>*</strong>
              </label>

              <select
                id="prioridad"
                name="prioridad"
                value={formData.prioridad}
                onChange={handleChange}
                disabled={isSaving}
              >
                <option value="baja">Baja</option>
                <option value="media">Media</option>
                <option value="alta">Alta</option>
                <option value="critica">Crítica</option>
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
                placeholder="Describe lo ocurrido..."
                value={formData.descripcion}
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
                : 'Registrar incidente'}
            </button>
          </form>
        </article>

        <article className="asset-list-panel">
          <div className="panel-title">
            <span>Incidentes registrados</span>
            <h2>Seguimiento de incidentes</h2>

            <p>
              Total de incidentes: {incidents.length}
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
              <h3>Cargando incidentes...</h3>
            </div>
          ) : incidents.length === 0 ? (
            <div className="assets-empty-state">
              <div className="assets-empty-icon">
                0
              </div>

              <h3>No existen incidentes registrados</h3>

              <p>
                Utiliza el formulario para registrar el
                primer incidente.
              </p>
            </div>
          ) : (
            <div className="asset-list">
              {incidents.map((incident) => (
                <article
                  className="asset-item"
                  key={incident.id}
                >
                  <div className="asset-item-header">
                    <div>
                      <span>{incident.codigo}</span>
                      <h3>{incident.titulo}</h3>
                    </div>

                    <span
                      className={
                        `criticality-badge ` +
                        `criticality-${incident.prioridad}`
                      }
                    >
                      {priorityLabels[
                        incident.prioridad
                      ]}
                    </span>
                  </div>

                  <dl className="asset-details">
                    <div>
                      <dt>Activo</dt>

                      <dd>
                        {getAssetName(
                          incident.activo_id,
                        )}
                      </dd>
                    </div>

                    <div>
                      <dt>Estado</dt>

                      <dd>
                        <select
                          value={incident.estado}
                          disabled={
                            changingStatusId === incident.id ||
                            incident.estado === 'cerrado'
                          }
                          onChange={(event) =>
                            handleStatusChange(
                              incident.id,
                              event.target.value,
                            )
                          }
                        >
                          {getAvailableStatuses(
                            incident.estado,
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
                      <dt>Fecha de apertura</dt>

                      <dd>
                        {formatDate(
                          incident.abierto_en,
                        )}
                      </dd>
                    </div>
                  </dl>

                  {incident.descripcion && (
                    <p className="asset-description">
                      {incident.descripcion}
                    </p>
                  )}

                  {incident.estado ===
                    'en_investigacion' && (
                    <div className="form-field full-width">
                      <label
                        htmlFor={`solucion-${incident.id}`}
                      >
                        Solución del incidente
                      </label>

                      <textarea
                        id={`solucion-${incident.id}`}
                        rows="3"
                        value={
                          solutions[incident.id] ?? ''
                        }
                        onChange={(event) =>
                          handleSolutionChange(
                            incident.id,
                            event.target.value,
                          )
                        }
                        placeholder="Describe la solución aplicada..."
                        disabled={
                          savingSolutionId === incident.id
                        }
                      />

                      <button
                        className="edit-asset-button"
                        type="button"
                        disabled={
                          savingSolutionId === incident.id
                        }
                        onClick={() =>
                          handleSaveSolution(incident.id)
                        }
                      >
                        {savingSolutionId === incident.id
                          ? 'Guardando...'
                          : 'Guardar solución'}
                      </button>
                    </div>
                  )}

                  {incident.solucion &&
                    incident.estado !==
                      'en_investigacion' && (
                      <p className="asset-description">
                        <strong>Solución:</strong>{' '}
                        {incident.solucion}
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

export default IncidentsPage