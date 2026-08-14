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

function AssetsPage() {
  const navigate = useNavigate()

  const [formData, setFormData] =
    useState(initialForm)
  const [assets, setAssets] = useState([])
  const [assetTypes, setAssetTypes] = useState([])
  const [message, setMessage] = useState('')
  const [messageType, setMessageType] =
    useState('exito')
  const [isLoading, setIsLoading] = useState(true)
  const [isSaving, setIsSaving] = useState(false)
  const [editingId, setEditingId] = useState(null)
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
        const [assetsResponse, typesResponse] =
          await Promise.all([
            apiRequest('/activos'),
            apiRequest('/activos/tipos'),
          ])

        setAssets(assetsResponse)
        setAssetTypes(typesResponse)
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
                  </dl>

                  {asset.descripcion && (
                    <p className="asset-description">
                      {asset.descripcion}
                    </p>
                  )}

                  <button
                    className="edit-asset-button"
                    type="button"
                    onClick={() => handleEdit(asset)}
                  >
                    Editar activo
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

export default AssetsPage