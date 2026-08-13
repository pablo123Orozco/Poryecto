import { useEffect, useState } from 'react'
import { useNavigate } from 'react-router'
import { apiRequest } from '../servicios/api.js'
import './activos.css'

const initialForm = {
  nombres: '',
  apellidos: '',
  email: '',
  password: '',
  telefono: '',
  rol: 'TECNICO',
}

function UsersPage() {
  const navigate = useNavigate()

  const [users, setUsers] = useState([])
  const [formData, setFormData] = useState(initialForm)
  const [message, setMessage] = useState('')
  const [isLoading, setIsLoading] = useState(true)
  const [isSaving, setIsSaving] = useState(false)

  const loadUsers = async () => {
    try {
      setIsLoading(true)
      const response = await apiRequest(
        '/usuarios?offset=0&limite=100',
      )
      setUsers(response)
    } catch (error) {
      setMessage(error.message)
    } finally {
      setIsLoading(false)
    }
  }

  useEffect(() => {
    loadUsers()
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

    if (
      !formData.nombres.trim() ||
      !formData.apellidos.trim() ||
      !formData.email.trim() ||
      !formData.password
    ) {
      setMessage('Completa todos los campos obligatorios.')
      return
    }

    if (formData.password.length < 12) {
      setMessage(
        'La contraseña debe contener al menos 12 caracteres.',
      )
      return
    }

    try {
      setIsSaving(true)
      setMessage('')

      await apiRequest('/usuarios', {
        method: 'POST',
        body: JSON.stringify({
          nombres: formData.nombres.trim(),
          apellidos: formData.apellidos.trim(),
          email: formData.email.trim(),
          password: formData.password,
          telefono: formData.telefono.trim() || null,
          rol: formData.rol,
        }),
      })

      setFormData(initialForm)
      setMessage('Usuario registrado correctamente.')
      await loadUsers()
    } catch (error) {
      setMessage(error.message)
    } finally {
      setIsSaving(false)
    }
  }

  const changeUserStatus = async (user) => {
    const action = user.activo ? 'desactivar' : 'activar'

    if (
      !window.confirm(
        `¿Deseas ${action} al usuario ${user.nombres}?`,
      )
    ) {
      return
    }

    try {
      setMessage('')

      await apiRequest(`/usuarios/${user.id}/estado`, {
        method: 'PATCH',
        body: JSON.stringify({
          activo: !user.activo,
        }),
      })

      setMessage(`Usuario ${action}do correctamente.`)
      await loadUsers()
    } catch (error) {
      setMessage(error.message)
    }
  }

  return (
    <main className="assets-page">
      <header className="assets-header">
        <div>
          <span>Administración</span>
          <h1>Gestión de usuarios</h1>

          <p>
            Registra y administra los usuarios de la
            organización.
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
            <span>Nuevo usuario</span>
            <h2>Registrar usuario</h2>

            <p>
              Los campos marcados con un asterisco son
              obligatorios.
            </p>
          </div>

          <form className="asset-form" onSubmit={handleSubmit}>
            <div className="form-field">
              <label htmlFor="nombres">
                Nombres <strong>*</strong>
              </label>

              <input
                id="nombres"
                name="nombres"
                type="text"
                value={formData.nombres}
                onChange={handleChange}
                disabled={isSaving}
              />
            </div>

            <div className="form-field">
              <label htmlFor="apellidos">
                Apellidos <strong>*</strong>
              </label>

              <input
                id="apellidos"
                name="apellidos"
                type="text"
                value={formData.apellidos}
                onChange={handleChange}
                disabled={isSaving}
              />
            </div>

            <div className="form-field full-width">
              <label htmlFor="email">
                Correo electrónico <strong>*</strong>
              </label>

              <input
                id="email"
                name="email"
                type="email"
                value={formData.email}
                onChange={handleChange}
                disabled={isSaving}
              />
            </div>

            <div className="form-field">
              <label htmlFor="password">
                Contraseña <strong>*</strong>
              </label>

              <input
                id="password"
                name="password"
                type="password"
                minLength="12"
                value={formData.password}
                onChange={handleChange}
                disabled={isSaving}
              />
            </div>

            <div className="form-field">
              <label htmlFor="telefono">Teléfono</label>

              <input
                id="telefono"
                name="telefono"
                type="text"
                value={formData.telefono}
                onChange={handleChange}
                disabled={isSaving}
              />
            </div>

            <div className="form-field full-width">
              <label htmlFor="rol">
                Rol <strong>*</strong>
              </label>

              <select
                id="rol"
                name="rol"
                value={formData.rol}
                onChange={handleChange}
                disabled={isSaving}
              >
                <option value="TECNICO">Técnico</option>

                <option value="ANALISTA_SEGURIDAD">
                  Analista de seguridad
                </option>

                <option value="AUDITOR">Auditor</option>

                <option value="ADMIN_EMPRESA">
                  Administrador de empresa
                </option>
              </select>
            </div>

            {message && (
              <p className="asset-message" role="alert">
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
                : 'Registrar usuario'}
            </button>
          </form>
        </article>

        <article className="asset-list-panel">
          <div className="panel-title">
            <span>Usuarios actuales</span>
            <h2>Usuarios registrados</h2>

            <p>Total de usuarios: {users.length}</p>
          </div>

          {isLoading ? (
            <p>Cargando usuarios...</p>
          ) : users.length === 0 ? (
            <div className="assets-empty-state">
              <h3>No existen usuarios registrados</h3>
            </div>
          ) : (
            <div className="asset-list">
              {users.map((user) => (
                <article className="asset-item" key={user.id}>
                  <div className="asset-item-header">
                    <div>
                      <span>{user.rol}</span>

                      <h3>
                        {user.nombres} {user.apellidos}
                      </h3>
                    </div>

                    <span className="criticality-badge">
                      {user.activo ? 'Activo' : 'Inactivo'}
                    </span>
                  </div>

                  <dl className="asset-details">
                    <div>
                      <dt>Correo</dt>
                      <dd>{user.email}</dd>
                    </div>

                    <div>
                      <dt>Teléfono</dt>
                      <dd>{user.telefono || 'No registrado'}</dd>
                    </div>

                    <div>
                      <dt>Último acceso</dt>
                      <dd>
                        {user.ultimo_acceso_en
                          ? new Date(
                              user.ultimo_acceso_en,
                            ).toLocaleString()
                          : 'Sin accesos'}
                      </dd>
                    </div>
                  </dl>

                  <button
                    className="delete-asset-button"
                    type="button"
                    onClick={() => changeUserStatus(user)}
                  >
                    {user.activo
                      ? 'Desactivar usuario'
                      : 'Activar usuario'}
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

export default UsersPage