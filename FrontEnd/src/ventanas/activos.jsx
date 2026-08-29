import { useEffect, useState } from 'react'
import { useNavigate } from 'react-router'
import { apiRequest } from '../servicios/api.js'
import Notificacion from '../componentes/Notificacion.jsx'
import './activos.css'

const initialForm = {
  nombre: '',
  tipo_activo_id: '',
  criticidad: 'media',
  codigo_interno: '',
  direccion_ip: '',
  descripcion: '',
}

const criticidadLabels = {
  baja: 'Baja',
  media: 'Media',
  alta: 'Alta',
  critica: 'Crítica',
}

const convertirNumero = (value) => {
  const number = Number(value)

  return Number.isFinite(number) ? number : null
}

const obtenerIndiceInterfaz = (key) => {
  const match = String(key).match(/\.([^.\]]+)\]$/)

  return match?.[1] ?? null
}

const obtenerNombreInterfaz = (metric, index) => {
  const match = String(metric.name ?? '').match(
    /^Interface\s+(.+?):/i,
  )

  return match?.[1] ?? `Interfaz ${index}`
}

const construirPuertosSnmp = (metrics) => {
  const ports = new Map()

  metrics.forEach((metric) => {
    const key = String(metric.key_ ?? '')

    if (!key.startsWith('net.if.')) {
      return
    }

    const index = obtenerIndiceInterfaz(key)

    if (!index) {
      return
    }

    const port = ports.get(index) ?? {
      index,
      name: obtenerNombreInterfaz(metric, index),
      status: null,
      speed: null,
      received: null,
      sent: null,
      inboundErrors: null,
      outboundErrors: null,
      lastClock: 0,
    }

    port.name = obtenerNombreInterfaz(metric, index)
    port.lastClock = Math.max(
      port.lastClock,
      Number(metric.lastclock ?? 0),
    )

    const value = convertirNumero(metric.lastvalue)

    if (key.startsWith('net.if.in.errors[')) {
      port.inboundErrors = value
    } else if (key.startsWith('net.if.out.errors[')) {
      port.outboundErrors = value
    } else if (key.startsWith('net.if.in[')) {
      port.received = value
    } else if (key.startsWith('net.if.out[')) {
      port.sent = value
    } else if (key.startsWith('net.if.status[')) {
      port.status = value
    } else if (key.startsWith('net.if.speed[')) {
      port.speed = value
    }

    ports.set(index, port)
  })

  return Array.from(ports.values()).sort((first, second) =>
    first.index.localeCompare(second.index, undefined, {
      numeric: true,
    }),
  )
}

const formatNetworkValue = (value) => {
  if (value === null || value === undefined) {
    return 'Sin datos'
  }

  const units = [
    ['Tbps', 1_000_000_000_000],
    ['Gbps', 1_000_000_000],
    ['Mbps', 1_000_000],
    ['Kbps', 1_000],
  ]

  const selected = units.find(
    ([, divisor]) => Math.abs(value) >= divisor,
  )

  if (!selected) {
    return `${value.toFixed(0)} bps`
  }

  const [unit, divisor] = selected

  return `${(value / divisor).toLocaleString('es-GT', {
    maximumFractionDigits: 2,
  })} ${unit}`
}

const formatLastCheck = (timestamp) => {
  if (!timestamp) {
    return 'Sin datos'
  }

  return new Date(timestamp * 1000).toLocaleTimeString(
    'es-GT',
    {
      hour: '2-digit',
      minute: '2-digit',
      second: '2-digit',
    },
  )
}

function SnmpPortsPanel({
  ports,
  isLoading,
  error,
  onRefresh,
}) {
  const maximumTraffic = Math.max(
    1,
    ...ports.flatMap((port) => [
      port.received ?? 0,
      port.sent ?? 0,
    ]),
  )

  const getBarWidth = (value) => {
    if (!value || value <= 0) {
      return '0%'
    }

    return `${Math.max(4, (value / maximumTraffic) * 100)}%`
  }

  return (
    <section className="snmp-ports-panel">
      <div className="snmp-ports-header">
        <div>
          <span>Monitoreo SNMP</span>
          <h4>Interfaces de red</h4>
          <p>Tráfico actual obtenido desde Zabbix.</p>
        </div>

        <button
          className="refresh-snmp-button"
          type="button"
          onClick={onRefresh}
          disabled={isLoading}
        >
          {isLoading ? 'Actualizando...' : 'Actualizar'}
        </button>
      </div>

      {error && (
        <p className="snmp-panel-message snmp-panel-error">
          {error}
        </p>
      )}

      {isLoading && ports.length === 0 ? (
        <p className="snmp-panel-message">
          Consultando métricas SNMP...
        </p>
      ) : ports.length === 0 && !error ? (
        <p className="snmp-panel-message">
          Zabbix todavía no posee métricas de interfaces para
          este activo.
        </p>
      ) : (
        <div className="snmp-port-grid">
          {ports.map((port) => {
            const isUp = port.status === 1
            const isDown = port.status === 2
            const statusText = isUp
              ? 'Disponible'
              : isDown
                ? 'Caído'
                : 'Sin dato'

            return (
              <article
                className={`snmp-port-card ${
                  isUp
                    ? 'snmp-port-up'
                    : isDown
                      ? 'snmp-port-down'
                      : 'snmp-port-unknown'
                }`}
                key={port.index}
              >
                <div className="snmp-port-title">
                  <div>
                    <span>Puerto {port.index}</span>
                    <h5>{port.name}</h5>
                  </div>

                  <span className="snmp-status-badge">
                    {statusText}
                  </span>
                </div>

                <dl className="snmp-port-facts">
                  <div>
                    <dt>Velocidad</dt>
                    <dd>{formatNetworkValue(port.speed)}</dd>
                  </div>

                  <div>
                    <dt>Errores</dt>
                    <dd>
                      {(port.inboundErrors ?? 0) +
                        (port.outboundErrors ?? 0)}
                    </dd>
                  </div>

                  <div>
                    <dt>Última lectura</dt>
                    <dd>{formatLastCheck(port.lastClock)}</dd>
                  </div>
                </dl>

                <div className="traffic-chart">
                  <div className="traffic-chart-label">
                    <span>Recibido</span>
                    <strong>
                      {formatNetworkValue(port.received)}
                    </strong>
                  </div>

                  <div className="traffic-track">
                    <span
                      className="traffic-fill traffic-received"
                      style={{
                        width: getBarWidth(port.received),
                      }}
                    ></span>
                  </div>

                  <div className="traffic-chart-label">
                    <span>Enviado</span>
                    <strong>
                      {formatNetworkValue(port.sent)}
                    </strong>
                  </div>

                  <div className="traffic-track">
                    <span
                      className="traffic-fill traffic-sent"
                      style={{
                        width: getBarWidth(port.sent),
                      }}
                    ></span>
                  </div>
                </div>
              </article>
            )
          })}
        </div>
      )}
    </section>
  )
}

function AssetsPage() {
  const navigate = useNavigate()

  const [formData, setFormData] =
    useState(initialForm)
  const [assets, setAssets] = useState([])
  const [assetTypes, setAssetTypes] = useState([])
  const [zabbixHosts, setZabbixHosts] = useState([])
  const [message, setMessage] = useState('')
  const [messageType, setMessageType] =
    useState('exito')
  const [isLoading, setIsLoading] = useState(true)
  const [isSaving, setIsSaving] = useState(false)
  const [editingId, setEditingId] = useState(null)
  const [changingStatusId, setChangingStatusId] =
    useState(null)
  const [linkingZabbixId, setLinkingZabbixId] =
    useState(null)
  const [expandedSnmpId, setExpandedSnmpId] =
    useState(null)
  const [loadingSnmpId, setLoadingSnmpId] =
    useState(null)
  const [snmpPortsByAsset, setSnmpPortsByAsset] =
    useState({})
  const [snmpErrorsByAsset, setSnmpErrorsByAsset] =
    useState({})

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
        const [assetsResponse, typesResponse] =
          await Promise.all([
            apiRequest('/activos'),
            apiRequest('/activos/tipos'),
          ])

        setAssets(assetsResponse)
        setAssetTypes(typesResponse)

        try {
          const hostsResponse = await apiRequest(
            '/zabbix/hosts',
          )

          setZabbixHosts(hostsResponse)
        } catch (error) {
          mostrarMensaje(
            `No fue posible cargar los hosts de Zabbix: ${error.message}`,
            'error',
          )
        }
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

    if (!formData.nombre || !formData.tipo_activo_id) {
      mostrarMensaje(
        'Completa el nombre y el tipo de activo.',
        'error',
      )
      return
    }

    const assetData = {
      nombre: formData.nombre.trim(),
      tipo_activo_id: Number(
        formData.tipo_activo_id,
      ),
      criticidad: formData.criticidad,
      codigo_interno:
        formData.codigo_interno.trim() || null,
      direccion_ip:
        formData.direccion_ip.trim() || null,
      descripcion:
        formData.descripcion.trim() || null,
    }

    setMessage('')
    setIsSaving(true)

    try {
      if (editingId) {
        const updatedAsset = await apiRequest(
          `/activos/${editingId}`,
          {
            method: 'PATCH',
            body: JSON.stringify(assetData),
          },
        )

        setAssets((previousAssets) =>
          previousAssets.map((asset) =>
            asset.id === editingId
              ? updatedAsset
              : asset,
          ),
        )

        mostrarMensaje(
          'Activo actualizado correctamente.',
        )
      } else {
        const newAsset = await apiRequest('/activos', {
          method: 'POST',
          body: JSON.stringify(assetData),
        })

        setAssets((previousAssets) => [
          ...previousAssets,
          newAsset,
        ])

        mostrarMensaje(
          'Activo registrado correctamente.',
        )
      }

      setFormData(initialForm)
      setEditingId(null)
    } catch (error) {
      mostrarMensaje(error.message, 'error')
    } finally {
      setIsSaving(false)
    }
  }

  const handleEdit = (asset) => {
    setEditingId(asset.id)

    setFormData({
      nombre: asset.nombre,
      tipo_activo_id: String(
        asset.tipo_activo_id,
      ),
      criticidad: asset.criticidad,
      codigo_interno:
        asset.codigo_interno ?? '',
      direccion_ip:
        asset.direccion_ip ?? '',
      descripcion:
        asset.descripcion ?? '',
    })

    setMessage('')

    window.scrollTo({
      top: 0,
      behavior: 'smooth',
    })
  }

  const handleCancelEdit = () => {
    setEditingId(null)
    setFormData(initialForm)
    setMessage('')
  }

  const handleStatusChange = async (
    assetId,
    newStatus,
  ) => {
    setMessage('')
    setChangingStatusId(assetId)

    try {
      const updatedAsset = await apiRequest(
        `/activos/${assetId}/estado`,
        {
          method: 'PATCH',
          body: JSON.stringify({
            estado: newStatus,
          }),
        },
      )

      setAssets((previousAssets) =>
        previousAssets.map((asset) =>
          asset.id === assetId
            ? updatedAsset
            : asset,
        ),
      )

      mostrarMensaje(
        'Estado del activo actualizado correctamente.',
      )
    } catch (error) {
      mostrarMensaje(error.message, 'error')
    } finally {
      setChangingStatusId(null)
    }
  }

  const handleZabbixLink = async (
    assetId,
    zabbixHostId,
  ) => {
    setMessage('')
    setLinkingZabbixId(assetId)

    try {
      const updatedAsset = await apiRequest(
        `/activos/${assetId}/zabbix`,
        {
          method: 'PATCH',
          body: JSON.stringify({
            zabbix_host_id: zabbixHostId || null,
          }),
        },
      )

      setAssets((previousAssets) =>
        previousAssets.map((asset) =>
          asset.id === assetId
            ? updatedAsset
            : asset,
        ),
      )

      mostrarMensaje(
        zabbixHostId
          ? 'Host de Zabbix vinculado correctamente.'
          : 'Host de Zabbix desvinculado correctamente.',
      )
    } catch (error) {
      mostrarMensaje(error.message, 'error')
    } finally {
      setLinkingZabbixId(null)
    }
  }

  const isZabbixHostLinked = (
    zabbixHostId,
    currentAssetId,
  ) =>
    assets.some(
      (asset) =>
        asset.id !== currentAssetId &&
        String(asset.zabbix_host_id ?? '') ===
          String(zabbixHostId),
    )

  const assetUsesSnmp = (asset) => {
    const host = zabbixHosts.find(
      (item) =>
        String(item.hostid) ===
        String(asset.zabbix_host_id ?? ''),
    )

    return host?.interfaces?.some(
      (networkInterface) =>
        String(networkInterface.type) === '2',
    )
  }

  const loadSnmpPorts = async (assetId) => {
    setLoadingSnmpId(assetId)
    setSnmpErrorsByAsset((previousErrors) => ({
      ...previousErrors,
      [assetId]: '',
    }))

    try {
      const metrics = await apiRequest(
        `/zabbix/activos/${assetId}/metricas`,
      )

      setSnmpPortsByAsset((previousPorts) => ({
        ...previousPorts,
        [assetId]: construirPuertosSnmp(metrics),
      }))
    } catch (error) {
      setSnmpErrorsByAsset((previousErrors) => ({
        ...previousErrors,
        [assetId]: error.message,
      }))
      mostrarMensaje(
        `No fue posible consultar las métricas SNMP: ${error.message}`,
        'error',
      )
    } finally {
      setLoadingSnmpId(null)
    }
  }

  const handleToggleSnmp = async (assetId) => {
    if (expandedSnmpId === assetId) {
      setExpandedSnmpId(null)
      return
    }

    setExpandedSnmpId(assetId)
    await loadSnmpPorts(assetId)
  }

  const getAssetTypeName = (typeId) => {
    const type = assetTypes.find(
      (item) => item.id === typeId,
    )

    return type?.nombre ?? `Tipo ${typeId}`
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
          <span>Inventario tecnológico</span>

          <h1>Gestión de activos</h1>

          <p>
            Registra, consulta y actualiza los recursos
            tecnológicos de la organización.
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
            <span>
              {editingId
                ? 'Actualización'
                : 'Nuevo registro'}
            </span>

            <h2>
              {editingId
                ? 'Editar activo tecnológico'
                : 'Registrar activo tecnológico'}
            </h2>

            <p>
              Los campos marcados con un asterisco son
              obligatorios.
            </p>
          </div>

          <form
            className="asset-form"
            onSubmit={handleSubmit}
          >
            <div className="form-field full-width">
              <label htmlFor="nombre">
                Nombre del activo <strong>*</strong>
              </label>

              <input
                id="nombre"
                name="nombre"
                type="text"
                placeholder="Ejemplo: Servidor principal"
                value={formData.nombre}
                onChange={handleChange}
                disabled={isSaving}
              />
            </div>

            <div className="form-field">
              <label htmlFor="tipo_activo_id">
                Tipo de activo <strong>*</strong>
              </label>

              <select
                id="tipo_activo_id"
                name="tipo_activo_id"
                value={formData.tipo_activo_id}
                onChange={handleChange}
                disabled={isSaving}
              >
                <option value="">
                  Selecciona una opción
                </option>

                {assetTypes.map((type) => (
                  <option
                    key={type.id}
                    value={type.id}
                  >
                    {type.nombre}
                  </option>
                ))}
              </select>
            </div>

            <div className="form-field">
              <label htmlFor="criticidad">
                Criticidad <strong>*</strong>
              </label>

              <select
                id="criticidad"
                name="criticidad"
                value={formData.criticidad}
                onChange={handleChange}
                disabled={isSaving}
              >
                <option value="baja">Baja</option>
                <option value="media">Media</option>
                <option value="alta">Alta</option>
                <option value="critica">
                  Crítica
                </option>
              </select>
            </div>

            <div className="form-field">
              <label htmlFor="codigo_interno">
                Código interno
              </label>

              <input
                id="codigo_interno"
                name="codigo_interno"
                type="text"
                placeholder="Ejemplo: SRV-001"
                value={formData.codigo_interno}
                onChange={handleChange}
                disabled={isSaving}
              />
            </div>

            <div className="form-field">
              <label htmlFor="direccion_ip">
                Dirección IP
              </label>

              <input
                id="direccion_ip"
                name="direccion_ip"
                type="text"
                placeholder="Ejemplo: 192.168.1.10"
                value={formData.direccion_ip}
                onChange={handleChange}
                disabled={isSaving}
              />
            </div>

            <div className="form-field full-width">
              <label htmlFor="descripcion">
                Descripción
              </label>

              <textarea
                id="descripcion"
                name="descripcion"
                rows="4"
                placeholder="Describe la función del activo..."
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
                ? 'Guardando...'
                : editingId
                  ? 'Guardar cambios'
                  : 'Registrar activo'}
            </button>

            {editingId && (
              <button
                className="back-button"
                type="button"
                onClick={handleCancelEdit}
                disabled={isSaving}
              >
                Cancelar edición
              </button>
            )}
          </form>
        </article>

        <article className="asset-list-panel">
          <div className="panel-title">
            <span>Inventario actual</span>

            <h2>Activos registrados</h2>

            <p>
              Total de activos registrados: {assets.length}
            </p>
          </div>

          {isLoading ? (
            <div className="assets-empty-state">
              <h3>Cargando activos...</h3>
            </div>
          ) : assets.length === 0 ? (
            <div className="assets-empty-state">
              <div className="assets-empty-icon">
                0
              </div>

              <h3>No existen activos registrados</h3>

              <p>
                Completa el formulario para agregar el
                primer activo tecnológico.
              </p>
            </div>
          ) : (
            <div className="asset-list">
              {assets.map((asset) => (
                <article
                  className="asset-item"
                  key={asset.id}
                >
                  <div className="asset-item-header">
                    <div>
                      <span>
                        {getAssetTypeName(
                          asset.tipo_activo_id,
                        )}
                      </span>

                      <h3>{asset.nombre}</h3>
                    </div>

                    <span
                      className={
                        `criticality-badge ` +
                        `criticality-${asset.criticidad}`
                      }
                    >
                      {criticidadLabels[
                        asset.criticidad
                      ] ?? asset.criticidad}
                    </span>
                  </div>

                  <dl className="asset-details">
                    <div>
                      <dt>Código interno</dt>

                      <dd>
                        {asset.codigo_interno ??
                          'Sin código'}
                      </dd>
                    </div>

                    <div>
                      <dt>Dirección IP</dt>

                      <dd>
                        {asset.direccion_ip ??
                          'Sin dirección'}
                      </dd>
                    </div>

                    <div>
                      <dt>Estado</dt>

                      <dd>
                        <select
                          value={asset.estado}
                          disabled={
                            changingStatusId === asset.id
                          }
                          onChange={(event) =>
                            handleStatusChange(
                              asset.id,
                              event.target.value,
                            )
                          }
                        >
                          <option value="activo">
                            Activo
                          </option>

                          <option value="inactivo">
                            Inactivo
                          </option>

                          <option value="mantenimiento">
                            Mantenimiento
                          </option>

                          <option value="retirado">
                            Retirado
                          </option>
                        </select>
                      </dd>
                    </div>

                    <div>
                      <dt>Monitoreo Zabbix</dt>

                      <dd>
                        <select
                          value={
                            asset.zabbix_host_id ?? ''
                          }
                          disabled={
                            linkingZabbixId === asset.id
                          }
                          onChange={(event) =>
                            handleZabbixLink(
                              asset.id,
                              event.target.value,
                            )
                          }
                        >
                          <option value="">
                            Sin vincular
                          </option>

                          {zabbixHosts.map((host) => {
                            const linked =
                              isZabbixHostLinked(
                                host.hostid,
                                asset.id,
                              )

                            return (
                              <option
                                key={host.hostid}
                                value={host.hostid}
                                disabled={linked}
                              >
                                {host.name || host.host}
                                {linked
                                  ? ' (ya vinculado)'
                                  : ''}
                              </option>
                            )
                          })}
                        </select>
                      </dd>
                    </div>
                  </dl>

                  {asset.descripcion && (
                    <p className="asset-description">
                      {asset.descripcion}
                    </p>
                  )}

                  <div className="asset-actions">
                    <button
                      className="edit-asset-button"
                      type="button"
                      onClick={() => handleEdit(asset)}
                    >
                      Editar activo
                    </button>

                    {asset.zabbix_host_id &&
                      assetUsesSnmp(asset) && (
                      <button
                        className="view-snmp-button"
                        type="button"
                        onClick={() =>
                          handleToggleSnmp(asset.id)
                        }
                      >
                        {expandedSnmpId === asset.id
                          ? 'Ocultar puertos'
                          : 'Ver puertos SNMP'}
                      </button>
                    )}
                  </div>

                  {expandedSnmpId === asset.id && (
                    <SnmpPortsPanel
                      ports={
                        snmpPortsByAsset[asset.id] ?? []
                      }
                      isLoading={
                        loadingSnmpId === asset.id
                      }
                      error={
                        snmpErrorsByAsset[asset.id] ?? ''
                      }
                      onRefresh={() =>
                        loadSnmpPorts(asset.id)
                      }
                    />
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

export default AssetsPage