import { useEffect, useState } from 'react'
import { useNavigate } from 'react-router'
import { apiRequest } from '../servicios/api.js'
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

  const [formData, setFormData] = useState(initialForm)
  const [assets, setAssets] = useState([])
  const [assetTypes, setAssetTypes] = useState([])
  const [message, setMessage] = useState('')
  const [isLoading, setIsLoading] = useState(true)
  const [isSaving, setIsSaving] = useState(false)

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
      setMessage(
        'Completa el nombre y el tipo de activo.',
      )
      return
    }

    setMessage('')
    setIsSaving(true)

    try {
      const newAsset = await apiRequest('/activos', {
        method: 'POST',
        body: JSON.stringify({
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
        }),
      })

      setAssets((previousAssets) => [
        ...previousAssets,
        newAsset,
      ])

      setFormData(initialForm)
      setMessage('Activo registrado correctamente.')
    } catch (error) {
      setMessage(error.message)
    } finally {
      setIsSaving(false)
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
      <header className="assets-header">
        <div>
          <span>Inventario tecnológico</span>
          <h1>Gestión de activos</h1>

          <p>
            Registra y consulta los recursos tecnológicos
            de la organización.
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
            <span>Nuevo registro</span>
            <h2>Registrar activo tecnológico</h2>

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
                : 'Registrar activo'}
            </button>
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
              <div className="assets-empty-icon">0</div>

              <h3>No existen activos registrados</h3>

              <p>
                Completa el formulario para agregar el primer
                activo tecnológico de la organización.
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
                      ]}
                    </span>
                  </div>

                  <dl className="asset-details">
                    <div>
                      <dt>Código interno</dt>
                      <dd>
                        {asset.codigo_interno ?? 'Sin código'}
                      </dd>
                    </div>

                    <div>
                      <dt>Dirección IP</dt>
                      <dd>
                        {asset.direccion_ip ?? 'Sin dirección'}
                      </dd>
                    </div>

                    <div>
                      <dt>Estado</dt>
                      <dd>{asset.estado}</dd>
                    </div>
                  </dl>

                  {asset.descripcion && (
                    <p className="asset-description">
                      {asset.descripcion}
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

export default AssetsPage