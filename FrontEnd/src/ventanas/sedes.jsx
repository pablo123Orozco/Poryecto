import { useEffect, useState } from 'react'
import { useNavigate } from 'react-router'
import { apiRequest } from '../servicios/api.js'
import Notificacion from '../componentes/Notificacion.jsx'
import './activos.css'

const initialForm = {
  nombre: '',
  direccion: '',
  ciudad: '',
  pais: 'Guatemala',
}

function SitesPage() {
  const navigate = useNavigate()

  const [sites, setSites] = useState([])
  const [currentUser, setCurrentUser] =
    useState(null)
  const [formData, setFormData] =
    useState(initialForm)
  const [editingId, setEditingId] = useState(null)
  const [message, setMessage] = useState('')
  const [messageType, setMessageType] =
    useState('exito')
  const [isLoading, setIsLoading] = useState(true)
  const [isSaving, setIsSaving] = useState(false)

  const isAdmin =
    currentUser?.rol === 'ADMIN_EMPRESA'

  const mostrarMensaje = (
    texto,
    tipo = 'exito',
  ) => {
    setMessageType(tipo)
    setMessage(texto)
  }

  const loadData = async () => {
    try {
      setIsLoading(true)

      const [sitesResponse, userResponse] =
        await Promise.all([
          apiRequest('/sedes?offset=0&limite=100'),
          apiRequest('/auth/me'),
        ])

      setSites(sitesResponse)
      setCurrentUser(userResponse)
    } catch (error) {
      mostrarMensaje(error.message, 'error')
    } finally {
      setIsLoading(false)
    }
  }

  useEffect(() => {
    loadData()
  }, [])

  const handleChange = (event) => {
    const { name, value } = event.target

    setFormData((previousData) => ({
      ...previousData,
      [name]: value,
    }))
  }

  const resetForm = () => {
    setFormData(initialForm)
    setEditingId(null)
  }

  const handleSubmit = async (event) => {
    event.preventDefault()

    if (
      !formData.nombre.trim() ||
      !formData.pais.trim()
    ) {
      mostrarMensaje(
        'Completa el nombre y el país.',
        'error',
      )
      return
    }

    const data = {
      nombre: formData.nombre.trim(),
      direccion:
        formData.direccion.trim() || null,
      ciudad: formData.ciudad.trim() || null,
      pais: formData.pais.trim(),
    }

    try {
      setIsSaving(true)
      setMessage('')

      if (editingId) {
        await apiRequest(`/sedes/${editingId}`, {
          method: 'PATCH',
          body: JSON.stringify(data),
        })

        mostrarMensaje(
          'Sede actualizada correctamente.',
        )
      } else {
        await apiRequest('/sedes', {
          method: 'POST',
          body: JSON.stringify(data),
        })

        mostrarMensaje(
          'Sede registrada correctamente.',
        )
      }

      resetForm()
      await loadData()
    } catch (error) {
      mostrarMensaje(error.message, 'error')
    } finally {
      setIsSaving(false)
    }
  }

  const startEditing = (site) => {
    setEditingId(site.id)

    setFormData({
      nombre: site.nombre,
      direccion: site.direccion || '',
      ciudad: site.ciudad || '',
      pais: site.pais,
    })

    setMessage('')

    window.scrollTo({
      top: 0,
      behavior: 'smooth',
    })
  }

  const deactivateSite = async (site) => {
    if (
      !window.confirm(
        `¿Deseas desactivar la sede ${site.nombre}?`,
      )
    ) {
      return
    }

    try {
      setMessage('')

      await apiRequest(
        `/sedes/${site.id}/desactivar`,
        {
          method: 'PATCH',
        },
      )

      mostrarMensaje(
        'Sede desactivada correctamente.',
      )

      await loadData()
    } catch (error) {
      mostrarMensaje(error.message, 'error')
    }
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
          <span>Organización</span>

          <h1>Gestión de sedes</h1>

          <p>
            Consulta y administra las ubicaciones de la
            organización.
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
        {isAdmin && (
          <article className="asset-form-panel">
            <div className="panel-title">
              <span>
                {editingId
                  ? 'Editar sede'
                  : 'Nueva sede'}
              </span>

              <h2>
                {editingId
                  ? 'Actualizar sede'
                  : 'Registrar sede'}
              </h2>

              <p>
                El nombre y el país son obligatorios.
              </p>
            </div>

            <form
              className="asset-form"
              onSubmit={handleSubmit}
            >
              <div className="form-field full-width">
                <label htmlFor="nombre">
                  Nombre <strong>*</strong>
                </label>

                <input
                  id="nombre"
                  name="nombre"
                  type="text"
                  value={formData.nombre}
                  onChange={handleChange}
                  disabled={isSaving}
                />
              </div>

              <div className="form-field full-width">
                <label htmlFor="direccion">
                  Dirección
                </label>

                <input
                  id="direccion"
                  name="direccion"
                  type="text"
                  value={formData.direccion}
                  onChange={handleChange}
                  disabled={isSaving}
                />
              </div>

              <div className="form-field">
                <label htmlFor="ciudad">
                  Ciudad
                </label>

                <input
                  id="ciudad"
                  name="ciudad"
                  type="text"
                  value={formData.ciudad}
                  onChange={handleChange}
                  disabled={isSaving}
                />
              </div>

              <div className="form-field">
                <label htmlFor="pais">
                  País <strong>*</strong>
                </label>

                <input
                  id="pais"
                  name="pais"
                  type="text"
                  value={formData.pais}
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
                    : 'Registrar sede'}
              </button>

              {editingId && (
                <button
                  className="back-button"
                  type="button"
                  onClick={resetForm}
                  disabled={isSaving}
                >
                  Cancelar edición
                </button>
              )}
            </form>
          </article>
        )}

        <article className="asset-list-panel">
          <div className="panel-title">
            <span>Ubicaciones</span>

            <h2>Sedes registradas</h2>

            <p>Total de sedes: {sites.length}</p>
          </div>

          {isLoading ? (
            <div className="assets-empty-state">
              <h3>Cargando sedes...</h3>
            </div>
          ) : sites.length === 0 ? (
            <div className="assets-empty-state">
              <div className="assets-empty-icon">
                0
              </div>

              <h3>No existen sedes registradas</h3>
            </div>
          ) : (
            <div className="asset-list">
              {sites.map((site) => (
                <article
                  className="asset-item"
                  key={site.id}
                >
                  <div className="asset-item-header">
                    <div>
                      <span>
                        {site.ciudad || site.pais}
                      </span>

                      <h3>{site.nombre}</h3>
                    </div>

                    <span
                      className={
                        `criticality-badge ` +
                        `site-status-${
                          site.activa
                            ? 'activa'
                            : 'inactiva'
                        }`
                      }
                    >
                      {site.activa
                        ? 'Activa'
                        : 'Inactiva'}
                    </span>
                  </div>

                  <dl className="asset-details">
                    <div>
                      <dt>Dirección</dt>

                      <dd>
                        {site.direccion ||
                          'No registrada'}
                      </dd>
                    </div>

                    <div>
                      <dt>Ciudad</dt>

                      <dd>
                        {site.ciudad ||
                          'No registrada'}
                      </dd>
                    </div>

                    <div>
                      <dt>País</dt>

                      <dd>{site.pais}</dd>
                    </div>
                  </dl>

                  {isAdmin && site.activa && (
                    <div className="asset-actions">
                      <button
                        className="back-button"
                        type="button"
                        onClick={() =>
                          startEditing(site)
                        }
                      >
                        Editar
                      </button>

                      <button
                        className="delete-asset-button"
                        type="button"
                        onClick={() =>
                          deactivateSite(site)
                        }
                      >
                        Desactivar
                      </button>
                    </div>
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

export default SitesPage