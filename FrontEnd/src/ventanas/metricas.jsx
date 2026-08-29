import { useEffect, useMemo, useState } from 'react'
import { useNavigate } from 'react-router'
import { apiRequest } from '../servicios/api.js'
import './metricas.css'

const HISTORY_HOURS = 6

const statusLabels = {
  saludable: 'Saludable',
  degradado: 'Degradado',
  critico: 'Crítico',
  sin_conexion: 'Sin conexión',
  sin_datos: 'Sin datos',
  mantenimiento: 'En mantenimiento',
  desconocido: 'Desconocido',
}

function formatMetricValue(value, unit = '') {
  const number = Number(value)

  if (!Number.isFinite(number)) {
    return 'Sin datos'
  }

  const normalizedUnit = String(unit).trim()

  if (normalizedUnit === 'bps') {
    const scales = [
      ['Tbps', 1_000_000_000_000],
      ['Gbps', 1_000_000_000],
      ['Mbps', 1_000_000],
      ['Kbps', 1_000],
    ]
    const scale = scales.find(([, divisor]) =>
      Math.abs(number) >= divisor,
    )

    if (scale) {
      return `${(number / scale[1]).toLocaleString('es-GT', {
        maximumFractionDigits: 2,
      })} ${scale[0]}`
    }
  }

  return `${number.toLocaleString('es-GT', {
    maximumFractionDigits: 2,
  })}${normalizedUnit ? ` ${normalizedUnit}` : ''}`
}

function formatTime(timestamp) {
  return new Date(timestamp * 1000).toLocaleTimeString('es-GT', {
    hour: '2-digit',
    minute: '2-digit',
  })
}

function getStatusClass(status) {
  return String(status ?? 'desconocido')
    .toLowerCase()
    .replaceAll(' ', '_')
}

function selectDefaultMetric(metrics) {
  const priorities = [
    (metric) => String(metric.key_).startsWith('system.cpu.util'),
    (metric) => metric.key_ === 'vm.memory.util',
    (metric) => String(metric.key_).startsWith('net.if.in['),
    (metric) => String(metric.key_).startsWith('net.if.out['),
  ]

  for (const matches of priorities) {
    const metric = metrics.find(matches)

    if (metric) return metric.key_
  }

  return metrics[0]?.key_ ?? ''
}

function HistoryChart({ history }) {
  const points = useMemo(
    () =>
      (history?.puntos ?? [])
        .map((point) => ({
          timestamp: Number(point.timestamp),
          value: Number(point.valor),
        }))
        .filter(
          (point) =>
            Number.isFinite(point.timestamp) &&
            Number.isFinite(point.value),
        ),
    [history],
  )

  if (points.length === 0) {
    return (
      <div className="metrics-chart-empty">
        <div>0</div>
        <h3>Sin datos históricos</h3>
        <p>Zabbix todavía no posee lecturas para esta métrica.</p>
      </div>
    )
  }

  const width = 960
  const height = 330
  const margin = { top: 24, right: 24, bottom: 42, left: 76 }
  const graphWidth = width - margin.left - margin.right
  const graphHeight = height - margin.top - margin.bottom
  const minimumTime = Math.min(...points.map((point) => point.timestamp))
  const maximumTime = Math.max(...points.map((point) => point.timestamp))
  const timeRange = Math.max(1, maximumTime - minimumTime)
  const values = points.map((point) => point.value)
  const rawMinimumValue = Math.min(...values)
  const rawMaximumValue = Math.max(...values)
  const valuePadding = Math.max(
    (rawMaximumValue - rawMinimumValue) * 0.12,
    Math.abs(rawMaximumValue) * 0.03,
    1,
  )
  const minimumValue = Math.max(0, rawMinimumValue - valuePadding)
  const maximumValue = rawMaximumValue + valuePadding
  const valueRange = Math.max(1, maximumValue - minimumValue)

  const coordinates = points.map((point) => ({
    x:
      margin.left +
      ((point.timestamp - minimumTime) / timeRange) * graphWidth,
    y:
      margin.top +
      graphHeight -
      ((point.value - minimumValue) / valueRange) * graphHeight,
  }))

  const linePoints = coordinates
    .map((point) => `${point.x},${point.y}`)
    .join(' ')
  const lastPoint = coordinates.at(-1)
  const horizontalGuides = [0, 0.25, 0.5, 0.75, 1]
  const timeLabels = [minimumTime, minimumTime + timeRange / 2, maximumTime]

  return (
    <div className="metrics-chart">
      <svg
        viewBox={`0 0 ${width} ${height}`}
        role="img"
        aria-label={`Historial de ${history.nombre}`}
      >
        <defs>
          <linearGradient id="metricArea" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor="#2878bd" stopOpacity="0.28" />
            <stop offset="100%" stopColor="#2878bd" stopOpacity="0.02" />
          </linearGradient>
        </defs>

        {horizontalGuides.map((guide) => {
          const y = margin.top + graphHeight * guide
          const value = maximumValue - valueRange * guide

          return (
            <g key={guide}>
              <line
                x1={margin.left}
                x2={width - margin.right}
                y1={y}
                y2={y}
                className="metrics-grid-line"
              />
              <text
                x={margin.left - 12}
                y={y + 4}
                textAnchor="end"
                className="metrics-axis-label"
              >
                {formatMetricValue(value, history.unidad)}
              </text>
            </g>
          )
        })}

        <polygon
          points={`${margin.left},${margin.top + graphHeight} ${linePoints} ${width - margin.right},${margin.top + graphHeight}`}
          fill="url(#metricArea)"
        />

        <polyline
          points={linePoints}
          className="metrics-chart-line"
        />

        {lastPoint && (
          <circle
            cx={lastPoint.x}
            cy={lastPoint.y}
            r="5"
            className="metrics-last-point"
          />
        )}

        {timeLabels.map((timestamp, index) => (
          <text
            key={`${timestamp}-${index}`}
            x={
              margin.left +
              (graphWidth / (timeLabels.length - 1)) * index
            }
            y={height - 12}
            textAnchor={
              index === 0
                ? 'start'
                : index === timeLabels.length - 1
                  ? 'end'
                  : 'middle'
            }
            className="metrics-axis-label"
          >
            {formatTime(timestamp)}
          </text>
        ))}
      </svg>
    </div>
  )
}

function MetricsPage() {
  const navigate = useNavigate()

  const [infrastructure, setInfrastructure] = useState(null)
  const [assets, setAssets] = useState([])
  const [selectedAssetId, setSelectedAssetId] = useState('')
  const [metrics, setMetrics] = useState([])
  const [selectedMetricKey, setSelectedMetricKey] = useState('')
  const [history, setHistory] = useState(null)
  const [isLoadingOverview, setIsLoadingOverview] = useState(true)
  const [isLoadingMetrics, setIsLoadingMetrics] = useState(false)
  const [isLoadingHistory, setIsLoadingHistory] = useState(false)
  const [message, setMessage] = useState('')

  const linkedAssets = useMemo(
    () => assets.filter((asset) => asset.zabbix_host_id),
    [assets],
  )

  const selectedAsset = linkedAssets.find(
    (asset) => String(asset.id) === String(selectedAssetId),
  )

  const selectedHost = infrastructure?.hosts?.find(
    (host) =>
      String(host.zabbix_host_id) ===
      String(selectedAsset?.zabbix_host_id ?? ''),
  )

  const selectedMetric = metrics.find(
    (metric) => metric.key_ === selectedMetricKey,
  )

  const loadOverview = async () => {
    try {
      setIsLoadingOverview(true)
      setMessage('')

      const [infrastructureResponse, assetsResponse] =
        await Promise.all([
          apiRequest('/zabbix/infraestructura'),
          apiRequest('/activos?offset=0&limite=100'),
        ])

      const loadedAssets = Array.isArray(assetsResponse)
        ? assetsResponse
        : []

      setInfrastructure(infrastructureResponse)
      setAssets(loadedAssets)

      const firstLinkedAsset = loadedAssets.find(
        (asset) => asset.zabbix_host_id,
      )

      setSelectedAssetId((currentId) => {
        const stillExists = loadedAssets.some(
          (asset) =>
            asset.zabbix_host_id &&
            String(asset.id) === String(currentId),
        )

        return stillExists
          ? currentId
          : String(firstLinkedAsset?.id ?? '')
      })
    } catch (error) {
      setMessage(error.message)
    } finally {
      setIsLoadingOverview(false)
    }
  }

  const loadAssetMetrics = async (assetId) => {
    if (!assetId) {
      setMetrics([])
      setSelectedMetricKey('')
      return
    }

    try {
      setIsLoadingMetrics(true)
      setMessage('')
      setHistory(null)

      const response = await apiRequest(
        `/zabbix/activos/${assetId}/metricas`,
      )
      const numericMetrics = (Array.isArray(response) ? response : [])
        .filter((metric) => ['0', '3'].includes(String(metric.value_type)))

      setMetrics(numericMetrics)
      setSelectedMetricKey(selectDefaultMetric(numericMetrics))
    } catch (error) {
      setMetrics([])
      setSelectedMetricKey('')
      setMessage(error.message)
    } finally {
      setIsLoadingMetrics(false)
    }
  }

  useEffect(() => {
    loadOverview()
  }, [])

  useEffect(() => {
    loadAssetMetrics(selectedAssetId)
  }, [selectedAssetId])

  useEffect(() => {
    const loadHistory = async () => {
      if (!selectedAssetId || !selectedMetricKey) {
        setHistory(null)
        return
      }

      try {
        setIsLoadingHistory(true)
        setMessage('')

        const response = await apiRequest(
          `/zabbix/activos/${selectedAssetId}/metricas/historial` +
            `?clave=${encodeURIComponent(selectedMetricKey)}` +
            `&horas=${HISTORY_HOURS}&limite=600`,
        )

        setHistory(response)
      } catch (error) {
        setHistory(null)
        setMessage(error.message)
      } finally {
        setIsLoadingHistory(false)
      }
    }

    loadHistory()
  }, [selectedAssetId, selectedMetricKey])

  const refreshData = async () => {
    await loadOverview()

    if (selectedAssetId) {
      await loadAssetMetrics(selectedAssetId)
    }
  }

  const generalStatus = infrastructure?.estado_general ?? 'desconocido'

  return (
    <main className="metrics-page">
      <header className="metrics-header">
        <div>
          <span>Monitoreo Zabbix</span>
          <h1>Métricas de infraestructura</h1>
          <p>
            Consulta el estado actual y el historial de los activos
            tecnológicos vinculados.
          </p>
        </div>

        <button
          className="metrics-back-button"
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

      {message && (
        <div className="metrics-message" role="alert">
          <strong>No fue posible completar la consulta.</strong>
          <span>{message}</span>
        </div>
      )}

      <section className="metrics-summary">
        <article>
          <span>Estado general</span>
          <div className="metrics-status-value">
            <i className={`status-dot status-${getStatusClass(generalStatus)}`} />
            <strong>{statusLabels[generalStatus] ?? generalStatus}</strong>
          </div>
        </article>

        <article>
          <span>Activos vinculados</span>
          <strong>{linkedAssets.length}</strong>
          <small>Registrados en la plataforma</small>
        </article>

        <article>
          <span>Problemas abiertos</span>
          <strong>{infrastructure?.problemas_abiertos ?? 0}</strong>
          <small>Detectados por Zabbix</small>
        </article>

        <article>
          <span>Hosts saludables</span>
          <strong>{infrastructure?.saludables ?? 0}</strong>
          <small>Sin problemas activos</small>
        </article>
      </section>

      <section className="metrics-main-panel">
        <div className="metrics-panel-heading">
          <div>
            <span>Historial</span>
            <h2>Comportamiento de la métrica</h2>
            <p>Lecturas registradas durante las últimas seis horas.</p>
          </div>

          <button
            className="metrics-refresh-button"
            type="button"
            disabled={isLoadingOverview || isLoadingMetrics}
            onClick={refreshData}
          >
            {isLoadingOverview || isLoadingMetrics
              ? 'Actualizando...'
              : 'Actualizar datos'}
          </button>
        </div>

        {isLoadingOverview ? (
          <div className="metrics-loading-state">
            <div className="metrics-loader" />
            <h3>Consultando Zabbix...</h3>
          </div>
        ) : linkedAssets.length === 0 ? (
          <div className="metrics-loading-state">
            <div className="metrics-empty-icon">0</div>
            <h3>No existen activos vinculados</h3>
            <p>
              Vincula un activo con un host de Zabbix desde la vista de
              activos.
            </p>
            <button type="button" onClick={() => navigate('/activos')}>
              Ir a activos
            </button>
          </div>
        ) : (
          <>
            <div className="metrics-controls">
              <label>
                <span>Activo monitoreado</span>
                <select
                  value={selectedAssetId}
                  onChange={(event) =>
                    setSelectedAssetId(event.target.value)
                  }
                >
                  {linkedAssets.map((asset) => (
                    <option value={asset.id} key={asset.id}>
                      {asset.nombre}
                    </option>
                  ))}
                </select>
              </label>

              <label>
                <span>Métrica</span>
                <select
                  value={selectedMetricKey}
                  disabled={isLoadingMetrics || metrics.length === 0}
                  onChange={(event) =>
                    setSelectedMetricKey(event.target.value)
                  }
                >
                  {metrics.length === 0 && (
                    <option value="">Sin métricas disponibles</option>
                  )}

                  {metrics.map((metric) => (
                    <option value={metric.key_} key={metric.itemid}>
                      {metric.name}
                    </option>
                  ))}
                </select>
              </label>

              <div className="selected-host-status">
                <span>Estado del host</span>
                <strong>
                  <i
                    className={`status-dot status-${getStatusClass(
                      selectedHost?.estado,
                    )}`}
                  />
                  {statusLabels[selectedHost?.estado] ??
                    selectedHost?.estado ??
                    'Sin datos'}
                </strong>
              </div>
            </div>

            <div className="metrics-chart-heading">
              <div>
                <span>{selectedAsset?.nombre ?? 'Activo'}</span>
                <h3>
                  {history?.nombre ??
                    selectedMetric?.name ??
                    'Selecciona una métrica'}
                </h3>
              </div>

              <div className="metrics-current-value">
                <span>Último valor</span>
                <strong>
                  {formatMetricValue(
                    selectedMetric?.lastvalue,
                    selectedMetric?.units,
                  )}
                </strong>
              </div>
            </div>

            {isLoadingMetrics || isLoadingHistory ? (
              <div className="metrics-loading-state chart-loading">
                <div className="metrics-loader" />
                <h3>Cargando historial...</h3>
              </div>
            ) : metrics.length === 0 ? (
              <div className="metrics-loading-state chart-loading">
                <h3>Zabbix no devolvió métricas numéricas</h3>
                <p>Espera una nueva lectura y vuelve a actualizar.</p>
              </div>
            ) : (
              <HistoryChart history={history} />
            )}
          </>
        )}
      </section>
    </main>
  )
}

export default MetricsPage
