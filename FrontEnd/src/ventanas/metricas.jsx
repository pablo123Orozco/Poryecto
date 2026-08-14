import {
  useEffect,
  useMemo,
  useState,
} from 'react'
import { useNavigate } from 'react-router'

import { apiRequest } from '../servicios/api.js'
import './metricas.css'


function formatValue(metric) {
  const value = Number(metric.valor_numerico)

  if (metric.clave_metrica === 'agent.ping') {
    return value === 1
      ? 'Disponible'
      : 'No disponible'
  }

  if (metric.clave_metrica === 'system.uptime') {
    const days = Math.floor(value / 86400)
    const hours = Math.floor(
      (value % 86400) / 3600,
    )

    return `${days} d ${hours} h`
  }

  if (!Number.isFinite(value)) {
    return metric.valor_numerico
  }

  const formattedValue = value.toLocaleString(
    'es-GT',
    {
      maximumFractionDigits: 2,
    },
  )

  return metric.unidad
    ? `${formattedValue} ${metric.unidad}`
    : formattedValue
}


function formatDate(date) {
  return new Date(date).toLocaleString(
    'es-GT',
    {
      dateStyle: 'short',
      timeStyle: 'short',
    },
  )
}


function MetricsChart({ metrics }) {
  const width = 760
  const height = 280
  const padding = 35

  if (metrics.length === 0) {
    return (
      <div className="metrics-empty-chart">
        No existen datos para esta métrica.
      </div>
    )
  }

  const values = metrics.map(
    (metric) => Number(metric.valor_numerico),
  )

  const minimum = Math.min(...values)
  const maximum = Math.max(...values)
  const range = maximum - minimum || 1

  const usableWidth = width - padding * 2
  const usableHeight = height - padding * 2

  const points = metrics.map((metric, index) => {
    const value = Number(metric.valor_numerico)

    const x =
      padding +
      (
        index /
        Math.max(metrics.length - 1, 1)
      ) *
        usableWidth

    const y =
      height -
      padding -
      ((value - minimum) / range) *
        usableHeight

    return {
      x,
      y,
      value,
      id: metric.id,
    }
  })

  const polyline = points
    .map((point) => `${point.x},${point.y}`)
    .join(' ')

  return (
    <div className="metrics-chart-container">
      <svg
        className="metrics-chart"
        viewBox={`0 0 ${width} ${height}`}
        role="img"
        aria-label="Historial de la métrica seleccionada"
      >
        <line
          x1={padding}
          y1={padding}
          x2={padding}
          y2={height - padding}
          className="chart-axis"
        />

        <line
          x1={padding}
          y1={height - padding}
          x2={width - padding}
          y2={height - padding}
          className="chart-axis"
        />

        <line
          x1={padding}
          y1={padding}
          x2={width - padding}
          y2={padding}
          className="chart-grid"
        />

        <line
          x1={padding}
          y1={height / 2}
          x2={width - padding}
          y2={height / 2}
          className="chart-grid"
        />

        <polyline
          points={polyline}
          className="chart-line"
        />

        {points.map((point) => (
          <circle
            key={point.id}
            cx={point.x}
            cy={point.y}
            r="4"
            className="chart-point"
          >
            <title>{point.value}</title>
          </circle>
        ))}

        <text
          x={padding}
          y={padding - 10}
          className="chart-label"
        >
          Máximo: {maximum.toFixed(2)}
        </text>

        <text
          x={padding}
          y={height - 8}
          className="chart-label"
        >
          Mínimo: {minimum.toFixed(2)}
        </text>
      </svg>

      <div className="chart-dates">
        <span>
          {formatDate(metrics[0].capturada_en)}
        </span>

        <span>
          {formatDate(
            metrics[metrics.length - 1].capturada_en,
          )}
        </span>
      </div>
    </div>
  )
}


function MetricsPage() {
  const navigate = useNavigate()

  const [assets, setAssets] = useState([])
  const [selectedAssetId, setSelectedAssetId] =
    useState('')

  const [metrics, setMetrics] = useState([])
  const [selectedMetricKey, setSelectedMetricKey] =
    useState('')

  const [message, setMessage] = useState('')
  const [isLoadingAssets, setIsLoadingAssets] =
    useState(true)

  const [isLoadingMetrics, setIsLoadingMetrics] =
    useState(false)

  const loadAssets = async () => {
    try {
      setIsLoadingAssets(true)
      setMessage('')

      const response = await apiRequest(
        '/activos?offset=0&limite=100',
      )

      const linkedAssets = response.filter(
        (asset) => asset.zabbix_host_id,
      )

      setAssets(linkedAssets)

      if (linkedAssets.length > 0) {
        setSelectedAssetId(
          String(linkedAssets[0].id),
        )
      }
    } catch (error) {
      setMessage(error.message)
    } finally {
      setIsLoadingAssets(false)
    }
  }

  const loadMetrics = async (assetId) => {
    if (!assetId) {
      setMetrics([])
      return
    }

    try {
      setIsLoadingMetrics(true)
      setMessage('')

      const response = await apiRequest(
        `/metricas?activo_id=${assetId}` +
          '&offset=0&limite=100',
      )

      setMetrics(response)

      const keys = [
        ...new Set(
          response.map(
            (metric) => metric.clave_metrica,
          ),
        ),
      ]

      setSelectedMetricKey((previousKey) => {
        if (keys.includes(previousKey)) {
          return previousKey
        }

        if (keys.includes('system.cpu.util')) {
          return 'system.cpu.util'
        }

        return keys[0] || ''
      })
    } catch (error) {
      setMessage(error.message)
      setMetrics([])
    } finally {
      setIsLoadingMetrics(false)
    }
  }

  useEffect(() => {
    loadAssets()
  }, [])

  useEffect(() => {
    loadMetrics(selectedAssetId)
  }, [selectedAssetId])

  const selectedAsset = assets.find(
    (asset) =>
      String(asset.id) === selectedAssetId,
  )

  const latestMetrics = useMemo(() => {
    const latestByKey = new Map()

    const orderedMetrics = [...metrics].sort(
      (first, second) =>
        new Date(second.capturada_en) -
        new Date(first.capturada_en),
    )

    orderedMetrics.forEach((metric) => {
      if (
        !latestByKey.has(metric.clave_metrica)
      ) {
        latestByKey.set(
          metric.clave_metrica,
          metric,
        )
      }
    })

    return [...latestByKey.values()]
  }, [metrics])

  const metricOptions = useMemo(() => {
    const options = new Map()

    metrics.forEach((metric) => {
      if (!options.has(metric.clave_metrica)) {
        options.set(
          metric.clave_metrica,
          metric.nombre_metrica,
        )
      }
    })

    return [...options.entries()]
  }, [metrics])

  const selectedSeries = useMemo(
    () =>
      metrics
        .filter(
          (metric) =>
            metric.clave_metrica ===
            selectedMetricKey,
        )
        .sort(
          (first, second) =>
            new Date(first.capturada_en) -
            new Date(second.capturada_en),
        ),
    [metrics, selectedMetricKey],
  )

  return (
    <main className="metrics-page">
      <header className="metrics-header">
        <div>
          <span>Monitoreo con Zabbix</span>
          <h1>Métricas de activos</h1>

          <p>
            Consulta el rendimiento y disponibilidad
            de los equipos asociados con Zabbix.
          </p>
        </div>

        <button
          className="metrics-back-button"
          type="button"
          onClick={() => navigate('/dashboard')}
        >
        </button>
      </header>

      <section className="metrics-controls">
        <div className="metrics-field">
          <label htmlFor="asset">
            Activo monitoreado
          </label>

          <select
            id="asset"
            value={selectedAssetId}
            onChange={(event) =>
              setSelectedAssetId(
                event.target.value,
              )
            }
            disabled={
              isLoadingAssets ||
              assets.length === 0
            }
          >
            {assets.length === 0 ? (
              <option value="">
                No hay activos asociados
              </option>
            ) : (
              assets.map((asset) => (
                <option
                  key={asset.id}
                  value={asset.id}
                >
                  {asset.nombre}
                </option>
              ))
            )}
          </select>
        </div>

        <button
          className="metrics-refresh-button"
          type="button"
          onClick={() =>
            loadMetrics(selectedAssetId)
          }
          disabled={
            !selectedAssetId ||
            isLoadingMetrics
          }
        >
          {isLoadingMetrics
            ? 'Actualizando...'
            : 'Actualizar datos'}
        </button>
      </section>

      {message && (
        <p className="metrics-message" role="alert">
          {message}
        </p>
      )}

      {selectedAsset && (
        <section className="monitored-asset-info">
          <div>
            <span>Activo</span>
            <strong>{selectedAsset.nombre}</strong>
          </div>

          <div>
            <span>Nombre del host</span>
            <strong>
              {selectedAsset.nombre_host ||
                'No registrado'}
            </strong>
          </div>

          <div>
            <span>ID de Zabbix</span>
            <strong>
              {selectedAsset.zabbix_host_id}
            </strong>
          </div>
        </section>
      )}

      {isLoadingMetrics ? (
        <div className="metrics-empty">
          Cargando métricas...
        </div>
      ) : latestMetrics.length === 0 ? (
        <div className="metrics-empty">
          <h2>No existen métricas registradas</h2>

          <p>
            Espera la siguiente sincronización
            automática de Zabbix.
          </p>
        </div>
      ) : (
        <>
          <section className="metrics-cards">
            {latestMetrics.map((metric) => (
              <article
                className="metric-card"
                key={metric.clave_metrica}
              >
                <span>{metric.nombre_metrica}</span>

                <strong>
                  {formatValue(metric)}
                </strong>

                <small>
                  Actualizado{' '}
                  {formatDate(
                    metric.capturada_en,
                  )}
                </small>
              </article>
            ))}
          </section>

          <section className="metrics-history">
            <div className="metrics-history-header">
              <div>
                <span>Historial</span>
                <h2>Evolución de la métrica</h2>
              </div>

              <div className="metrics-field">
                <label htmlFor="metric">
                  Métrica
                </label>

                <select
                  id="metric"
                  value={selectedMetricKey}
                  onChange={(event) =>
                    setSelectedMetricKey(
                      event.target.value,
                    )
                  }
                >
                  {metricOptions.map(
                    ([key, name]) => (
                      <option
                        key={key}
                        value={key}
                      >
                        {name}
                      </option>
                    ),
                  )}
                </select>
              </div>
            </div>

            <MetricsChart
              metrics={selectedSeries}
            />
          </section>
        </>
      )}
    </main>
  )
}

export default MetricsPage