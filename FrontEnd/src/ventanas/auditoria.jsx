import { useEffect, useMemo, useState } from 'react'
import { useNavigate } from 'react-router'
import { apiRequest } from '../servicios/api.js'
import './auditoria.css'

const PAGE_SIZE = 25

const actionLabels = {
  actualizar: 'Actualización',
  crear: 'Creación',
  eliminar: 'Eliminación',
  iniciar_sesion: 'Inicio de sesión',
  registrar: 'Registro',
}

function formatDate(dateValue) {
  if (!dateValue) {
    return 'Sin fecha'
  }

  const date = new Date(dateValue)

  if (Number.isNaN(date.getTime())) {
    return dateValue
  }

  return date.toLocaleString('es-GT', {
    dateStyle: 'short',
    timeStyle: 'medium',
  })
}

function getDetails(record) {
  if (
    record.detalles &&
    typeof record.detalles === 'object' &&
    !Array.isArray(record.detalles)
  ) {
    return record.detalles
  }

  return {}
}

function getResponseClass(statusCode) {
  const code = Number(statusCode)

  if (code >= 500) return 'response-error'
  if (code >= 400) return 'response-warning'
  if (code >= 200 && code < 400) return 'response-success'

  return 'response-neutral'
}

function AuditPage() {
  const navigate = useNavigate()

  const [records, setRecords] = useState([])
  const [offset, setOffset] = useState(0)
  const [search, setSearch] = useState('')
  const [actionFilter, setActionFilter] = useState('')
  const [isLoading, setIsLoading] = useState(true)
  const [message, setMessage] = useState('')

  useEffect(() => {
    const loadAudit = async () => {
      try {
        setIsLoading(true)
        setMessage('')

        const response = await apiRequest(
          `/auditoria?offset=${offset}&limite=${PAGE_SIZE}`,
        )

        setRecords(Array.isArray(response) ? response : [])
      } catch (error) {
        setRecords([])
        setMessage(error.message)
      } finally {
        setIsLoading(false)
      }
    }

    loadAudit()
  }, [offset])

  const availableActions = useMemo(
    () =>
      [...new Set(records.map((record) => record.accion))]
        .filter(Boolean)
        .sort(),
    [records],
  )

  const filteredRecords = useMemo(() => {
    const normalizedSearch = search.trim().toLowerCase()

    return records.filter((record) => {
      const details = getDetails(record)
      const matchesAction =
        !actionFilter || record.accion === actionFilter

      const searchableContent = [
        record.id,
        record.usuario_id,
        record.accion,
        record.entidad,
        record.entidad_id,
        record.direccion_ip,
        details.metodo,
        details.ruta,
        details.codigo_respuesta,
      ]
        .filter((value) => value !== null && value !== undefined)
        .join(' ')
        .toLowerCase()

      return (
        matchesAction &&
        (!normalizedSearch ||
          searchableContent.includes(normalizedSearch))
      )
    })
  }, [actionFilter, records, search])

  const currentPage = Math.floor(offset / PAGE_SIZE) + 1

  return (
    <main className="audit-page">
      <header className="audit-header">
        <div>
          <span>Seguridad y trazabilidad</span>
          <h1>Registro de auditoría</h1>

          <p>
            Consulta las acciones realizadas por los usuarios de la
            organización.
          </p>
        </div>

        <button
          className="audit-back-button"
          type="button"
          onClick={() => navigate('/dashboard')}
          aria-label="Volver al dashboard"
          title="Volver al dashboard"
        >
          <svg
            aria-hidden="true"
            viewBox="0 0 24 24"
            width="22"
            height="22"
          >
            <path
              d="M19 12H5m6-6-6 6 6 6"
              fill="none"
              stroke="currentColor"
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth="2"
            />
          </svg>
        </button>
      </header>

      <section className="audit-panel">
        <div className="audit-panel-heading">
          <div>
            <span>Actividad registrada</span>
            <h2>Movimientos del sistema</h2>
            <p>Página {currentPage} · {records.length} registros cargados</p>
          </div>

          <div className="audit-filters">
            <label>
              <span>Buscar</span>
              <input
                type="search"
                placeholder="Usuario, entidad, ruta o IP"
                value={search}
                onChange={(event) => setSearch(event.target.value)}
              />
            </label>

            <label>
              <span>Acción</span>
              <select
                value={actionFilter}
                onChange={(event) =>
                  setActionFilter(event.target.value)
                }
              >
                <option value="">Todas</option>

                {availableActions.map((action) => (
                  <option value={action} key={action}>
                    {actionLabels[action] ?? action}
                  </option>
                ))}
              </select>
            </label>
          </div>
        </div>

        {message && (
          <div className="audit-message" role="alert">
            <strong>No fue posible cargar la auditoría.</strong>
            <span>{message}</span>
          </div>
        )}

        {isLoading ? (
          <div className="audit-empty-state">
            <div className="audit-loader" aria-hidden="true" />
            <h3>Cargando registros...</h3>
          </div>
        ) : filteredRecords.length === 0 ? (
          <div className="audit-empty-state">
            <div className="audit-empty-icon" aria-hidden="true">
              0
            </div>
            <h3>No hay registros para mostrar</h3>
            <p>
              Cambia los filtros o realiza una acción dentro de la
              plataforma.
            </p>
          </div>
        ) : (
          <div className="audit-table-wrapper">
            <table className="audit-table">
              <thead>
                <tr>
                  <th>Fecha y hora</th>
                  <th>Usuario</th>
                  <th>Acción</th>
                  <th>Entidad</th>
                  <th>Solicitud</th>
                  <th>Respuesta</th>
                  <th>Dirección IP</th>
                </tr>
              </thead>

              <tbody>
                {filteredRecords.map((record) => {
                  const details = getDetails(record)
                  const responseCode = details.codigo_respuesta

                  return (
                    <tr key={record.id}>
                      <td>
                        <span className="audit-date">
                          {formatDate(record.creado_en)}
                        </span>
                      </td>

                      <td>
                        <strong className="audit-user">
                          {record.usuario_id
                            ? `Usuario #${record.usuario_id}`
                            : 'Sistema'}
                        </strong>
                      </td>

                      <td>
                        <span
                          className={`audit-action audit-action-${record.accion}`}
                        >
                          {actionLabels[record.accion] ??
                            record.accion ??
                            'Sin acción'}
                        </span>
                      </td>

                      <td>
                        <strong>{record.entidad ?? 'Sin entidad'}</strong>
                        <small>
                          {record.entidad_id
                            ? `ID ${record.entidad_id}`
                            : 'Sin recurso asociado'}
                        </small>
                      </td>

                      <td>
                        <span className="audit-request">
                          <strong>{details.metodo ?? '—'}</strong>
                          <code>{details.ruta ?? 'Sin ruta'}</code>
                        </span>
                      </td>

                      <td>
                        <span
                          className={`audit-response ${getResponseClass(
                            responseCode,
                          )}`}
                        >
                          {responseCode ?? '—'}
                        </span>
                      </td>

                      <td>
                        <code className="audit-ip">
                          {record.direccion_ip ?? 'No disponible'}
                        </code>
                      </td>
                    </tr>
                  )
                })}
              </tbody>
            </table>
          </div>
        )}

        <footer className="audit-pagination">
          <button
            type="button"
            disabled={offset === 0 || isLoading}
            onClick={() =>
              setOffset((currentOffset) =>
                Math.max(0, currentOffset - PAGE_SIZE),
              )
            }
          >
            Anterior
          </button>

          <span>Página {currentPage}</span>

          <button
            type="button"
            disabled={records.length < PAGE_SIZE || isLoading}
            onClick={() =>
              setOffset((currentOffset) => currentOffset + PAGE_SIZE)
            }
          >
            Siguiente
          </button>
        </footer>
      </section>
    </main>
  )
}

export default AuditPage
