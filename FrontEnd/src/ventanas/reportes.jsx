import { useEffect, useState } from 'react'
import { useNavigate } from 'react-router'
import {
  apiDownload,
  apiRequest,
} from '../servicios/api.js'
import './activos.css'

const initialForm = {
  nombre: '',
  tipo: 'activos',
}

const typeLabels = {
  activos: 'Activos',
  alertas: 'Alertas',
  incidentes: 'Incidentes',
  mantenimientos: 'Mantenimientos',
}

function ReportsPage() {
  const navigate = useNavigate()

  const [formData, setFormData] = useState(initialForm)
  const [reports, setReports] = useState([])
  const [message, setMessage] = useState('')
  const [isLoading, setIsLoading] = useState(true)
  const [isGenerating, setIsGenerating] =
    useState(false)
  const [downloadingId, setDownloadingId] =
    useState(null)

  useEffect(() => {
    const loadReports = async () => {
      try {
        const response = await apiRequest(
          '/reportes?offset=0&limite=100',
        )

        const excelReports = response.filter(
          (report) => report.formato === 'XLSX',
        )

        setReports(excelReports)
      } catch (error) {
        setMessage(error.message)
      } finally {
        setIsLoading(false)
      }
    }

    loadReports()
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

    if (!formData.nombre.trim()) {
      setMessage(
        'Escribe un nombre para el reporte.',
      )
      return
    }

    setMessage('')
    setIsGenerating(true)

    try {
      const newReport = await apiRequest('/reportes', {
        method: 'POST',
        body: JSON.stringify({
          nombre: formData.nombre.trim(),
          tipo: formData.tipo,
        }),
      })

      setReports((previousReports) => [
        newReport,
        ...previousReports,
      ])

      setFormData(initialForm)

      setMessage(
        'Reporte Excel generado correctamente.',
      )
    } catch (error) {
      setMessage(error.message)
    } finally {
      setIsGenerating(false)
    }
  }

  const handleDownload = async (report) => {
    setMessage('')
    setDownloadingId(report.id)

    try {
      const safeName = report.nombre
        .replace(/[^a-zA-Z0-9_-]/g, '_')
        .replace(/_+/g, '_')

      await apiDownload(
        `/reportes/${report.id}/descargar`,
        `${safeName || 'reporte'}.xlsx`,
      )

      setMessage(
        'Reporte Excel descargado correctamente.',
      )
    } catch (error) {
      setMessage(error.message)
    } finally {
      setDownloadingId(null)
    }
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
          <span>Exportación de información</span>
          <h1>Gestión de reportes</h1>

          <p>
            Genera y descarga reportes de la organización
            en formato Excel.
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
            <span>Nuevo reporte</span>
            <h2>Generar reporte Excel</h2>

            <p>
              Selecciona la información que deseas incluir.
            </p>
          </div>

          <form
            className="asset-form"
            onSubmit={handleSubmit}
          >
            <div className="form-field full-width">
              <label htmlFor="nombre">
                Nombre del reporte <strong>*</strong>
              </label>

              <input
                id="nombre"
                name="nombre"
                type="text"
                placeholder="Ejemplo: Inventario mensual"
                value={formData.nombre}
                onChange={handleChange}
                disabled={isGenerating}
              />
            </div>

            <div className="form-field full-width">
              <label htmlFor="tipo">
                Contenido del reporte <strong>*</strong>
              </label>

              <select
                id="tipo"
                name="tipo"
                value={formData.tipo}
                onChange={handleChange}
                disabled={isGenerating}
              >
                <option value="activos">
                  Activos
                </option>

                <option value="alertas">
                  Alertas
                </option>

                <option value="incidentes">
                  Incidentes
                </option>

                <option value="mantenimientos">
                  Mantenimientos
                </option>
              </select>
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
              disabled={isGenerating}
            >
              {isGenerating
                ? 'Generando...'
                : 'Generar Excel'}
            </button>
          </form>
        </article>

        <article className="asset-list-panel">
          <div className="panel-title">
            <span>Historial</span>
            <h2>Reportes Excel generados</h2>

            <p>
              Total de reportes Excel: {reports.length}
            </p>
          </div>

          {isLoading ? (
            <div className="assets-empty-state">
              <h3>Cargando reportes...</h3>
            </div>
          ) : reports.length === 0 ? (
            <div className="assets-empty-state">
              <div className="assets-empty-icon">
                0
              </div>

              <h3>
                No existen reportes Excel generados
              </h3>

              <p>
                Utiliza el formulario para generar el primer
                reporte.
              </p>
            </div>
          ) : (
            <div className="asset-list">
              {reports.map((report) => (
                <article
                  className="asset-item"
                  key={report.id}
                >
                  <div className="asset-item-header">
                    <div>
                      <span>
                        {typeLabels[report.tipo] ??
                          report.tipo}
                      </span>

                      <h3>{report.nombre}</h3>
                    </div>

                    <span className="criticality-badge">
                      Excel
                    </span>
                  </div>

                  <dl className="asset-details">
                    <div>
                      <dt>Contenido</dt>

                      <dd>
                        {typeLabels[report.tipo] ??
                          report.tipo}
                      </dd>
                    </div>

                    <div>
                      <dt>Formato</dt>
                      <dd>Excel (.xlsx)</dd>
                    </div>

                    <div>
                      <dt>Fecha de generación</dt>

                      <dd>
                        {formatDate(
                          report.generado_en,
                        )}
                      </dd>
                    </div>
                  </dl>

                  <button
                    className="edit-asset-button"
                    type="button"
                    disabled={
                      downloadingId === report.id
                    }
                    onClick={() =>
                      handleDownload(report)
                    }
                  >
                    {downloadingId === report.id
                      ? 'Descargando...'
                      : 'Descargar Excel'}
                  </button>
                </article>
              ))}
            </div>
          )}
        </article>
      </section>
    </main>
  )
}

export default ReportsPage