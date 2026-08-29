import { useEffect, useMemo, useState } from 'react'
import { useNavigate } from 'react-router'
import { apiRequest } from '../servicios/api.js'
import './ia.css'

const riskLabels = {
  bajo: 'Riesgo bajo',
  medio: 'Riesgo medio',
  alto: 'Riesgo alto',
  critico: 'Riesgo crítico',
}

const priorityLabels = {
  baja: 'Baja',
  media: 'Media',
  alta: 'Alta',
  critica: 'Crítica',
}

function formatDate(value) {
  if (!value) return 'Sin fecha'

  return new Date(value).toLocaleString('es-GT', {
    dateStyle: 'medium',
    timeStyle: 'short',
  })
}

function AIPage() {
  const navigate = useNavigate()

  const [assets, setAssets] = useState([])
  const [selectedAssetId, setSelectedAssetId] = useState('')
  const [analysis, setAnalysis] = useState(null)
  const [isLoadingAssets, setIsLoadingAssets] = useState(true)
  const [isAnalyzing, setIsAnalyzing] = useState(false)
  const [message, setMessage] = useState('')

  const linkedAssets = useMemo(
    () => assets.filter((asset) => asset.zabbix_host_id),
    [assets],
  )

  const selectedAsset = linkedAssets.find(
    (asset) => String(asset.id) === String(selectedAssetId),
  )

  useEffect(() => {
    const loadAssets = async () => {
      try {
        setIsLoadingAssets(true)
        setMessage('')

        const response = await apiRequest(
          '/activos?offset=0&limite=100',
        )
        const loadedAssets = Array.isArray(response) ? response : []
        const linked = loadedAssets.filter(
          (asset) => asset.zabbix_host_id,
        )

        setAssets(loadedAssets)
        setSelectedAssetId(
          linked.length > 0 ? String(linked[0].id) : '',
        )
      } catch (error) {
        setMessage(error.message)
      } finally {
        setIsLoadingAssets(false)
      }
    }

    loadAssets()
  }, [])

  const handleAssetChange = (event) => {
    setSelectedAssetId(event.target.value)
    setAnalysis(null)
    setMessage('')
  }

  const handleAnalyze = async () => {
    if (!selectedAssetId) {
      setMessage('Selecciona un activo vinculado con Zabbix.')
      return
    }

    try {
      setIsAnalyzing(true)
      setMessage('')
      setAnalysis(null)

      const response = await apiRequest(
        `/ia/activos/${selectedAssetId}/analizar`,
        { method: 'POST' },
      )

      setAnalysis(response)
    } catch (error) {
      setMessage(error.message)
    } finally {
      setIsAnalyzing(false)
    }
  }

  return (
    <main className="ai-page">
      <header className="ai-header">
        <div>
          <span>Inteligencia artificial</span>
          <h1>Análisis preventivo</h1>
          <p>
            Genera recomendaciones a partir de las métricas y problemas
            detectados por Zabbix.
          </p>
        </div>

        <button
          className="ai-back-button"
          type="button"
          onClick={() => navigate('/dashboard')}
          aria-label="Volver al dashboard"
          title="Volver al dashboard"
        >
          <svg aria-hidden="true" viewBox="0 0 24 24" width="22" height="22">
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

      <section className="ai-control-panel">
        <div className="ai-control-copy">
          <span>Nuevo análisis</span>
          <h2>Selecciona el activo</h2>
          <p>
            La IA utilizará únicamente información técnica obtenida desde
            la plataforma.
          </p>
        </div>

        {isLoadingAssets ? (
          <div className="ai-loading-inline">
            <div className="ai-loader" />
            <span>Cargando activos...</span>
          </div>
        ) : linkedAssets.length === 0 ? (
          <div className="ai-no-assets">
            <strong>No existen activos vinculados con Zabbix.</strong>
            <button type="button" onClick={() => navigate('/activos')}>
              Ir a activos
            </button>
          </div>
        ) : (
          <div className="ai-controls">
            <label>
              <span>Activo monitoreado</span>
              <select
                value={selectedAssetId}
                onChange={handleAssetChange}
                disabled={isAnalyzing}
              >
                {linkedAssets.map((asset) => (
                  <option value={asset.id} key={asset.id}>
                    {asset.nombre}
                  </option>
                ))}
              </select>
            </label>

            <button
              type="button"
              disabled={isAnalyzing}
              onClick={handleAnalyze}
            >
              {isAnalyzing
                ? 'Analizando información...'
                : 'Generar análisis'}
            </button>
          </div>
        )}
      </section>

      {message && (
        <div className="ai-message" role="alert">
          <strong>No fue posible generar el análisis.</strong>
          <span>{message}</span>
        </div>
      )}

      {isAnalyzing && (
        <section className="ai-waiting-panel">
          <div className="ai-loader large" />
          <h2>Analizando {selectedAsset?.nombre}...</h2>
          <p>
            Groq está evaluando las métricas y los problemas abiertos del
            activo.
          </p>
        </section>
      )}

      {!isAnalyzing && !analysis && !message && linkedAssets.length > 0 && (
        <section className="ai-empty-panel">
          <div className="ai-symbol" aria-hidden="true">IA</div>
          <h2>El análisis aparecerá aquí</h2>
          <p>
            Selecciona un activo y presiona Generar análisis para obtener
            recomendaciones preventivas.
          </p>
        </section>
      )}

      {!isAnalyzing && analysis && (
        <section className="ai-results">
          <article className="ai-result-summary">
            <div className="ai-result-heading">
              <div>
                <span>Resultado para {selectedAsset?.nombre}</span>
                <h2>Evaluación preventiva</h2>
              </div>

              <span
                className={`ai-risk-badge risk-${analysis.nivel_riesgo}`}
              >
                {riskLabels[analysis.nivel_riesgo] ??
                  analysis.nivel_riesgo}
              </span>
            </div>

            <p className="ai-summary-text">{analysis.resumen}</p>

            <div className="ai-result-meta">
              <span>Generado: {formatDate(analysis.generado_en)}</span>
              <span>Modelo: {analysis.modelo}</span>
            </div>
          </article>

          <article className="ai-findings-panel">
            <div className="ai-section-heading">
              <span>Observaciones</span>
              <h2>Hallazgos identificados</h2>
            </div>

            <ul className="ai-findings-list">
              {(analysis.hallazgos ?? []).map((finding, index) => (
                <li key={`${finding}-${index}`}>
                  <span>{index + 1}</span>
                  <p>{finding}</p>
                </li>
              ))}
            </ul>
          </article>

          <article className="ai-recommendations-panel">
            <div className="ai-section-heading">
              <span>Plan preventivo</span>
              <h2>Recomendaciones</h2>
            </div>

            <div className="ai-recommendations-list">
              {(analysis.recomendaciones ?? []).map(
                (recommendation, index) => (
                  <article
                    className="ai-recommendation"
                    key={`${recommendation.titulo}-${index}`}
                  >
                    <div>
                      <span
                        className={`ai-priority priority-${recommendation.prioridad}`}
                      >
                        Prioridad{' '}
                        {priorityLabels[recommendation.prioridad] ??
                          recommendation.prioridad}
                      </span>
                      <h3>{recommendation.titulo}</h3>
                    </div>

                    <p>{recommendation.descripcion}</p>

                    <div className="ai-action">
                      <strong>Acción sugerida</strong>
                      <span>{recommendation.accion}</span>
                    </div>
                  </article>
                ),
              )}
            </div>
          </article>

          <aside className="ai-warning">
            <strong>Importante</strong>
            <p>{analysis.advertencia}</p>
          </aside>
        </section>
      )}
    </main>
  )
}

export default AIPage
