import { useState } from 'react'
import { apiRequest } from '../servicios/api.js'
import './login.css'

function LoginPage({ onLogin }) {
  const [formData, setFormData] = useState({
    email: '',
    password: '',
  })
  const [message, setMessage] = useState('')
  const [isLoading, setIsLoading] = useState(false)
  const [showPassword, setShowPassword] = useState(false)

  const handleChange = (event) => {
    const { name, value } = event.target

    setFormData((previousData) => ({
      ...previousData,
      [name]: value,
    }))

    if (message) {
      setMessage('')
    }
  }

  const handleSubmit = async (event) => {
    event.preventDefault()

    if (!formData.email.trim() || !formData.password) {
      setMessage(
        'Completa el correo electrónico y la contraseña.',
      )
      return
    }

    setMessage('')
    setIsLoading(true)

    try {
      const response = await apiRequest('/auth/login', {
        method: 'POST',
        body: JSON.stringify({
          email: formData.email.trim(),
          password: formData.password,
        }),
      })

      localStorage.setItem(
        'access_token',
        response.access_token,
      )

      onLogin()
    } catch (error) {
      setMessage(error.message)
    } finally {
      setIsLoading(false)
    }
  }

  return (
    <main className="login-page">
      <section className="login-showcase">
        <div className="login-showcase-content">
          <div className="login-brand">
          </div>

          <div className="login-presentation">

            <h1>
              Protege la infraestructura tecnológica de tu
              organización
            </h1>

            <p>
              Supervisa activos, atiende alertas y toma
              decisiones preventivas desde una plataforma
              segura diseñada para entornos críticos.
            </p>

            <div className="login-features">
              <article>
                <div className="login-feature-icon" aria-hidden="true">
                  <svg viewBox="0 0 24 24">
                    <path d="M4 5.5h16v10H4zM9 19h6M12 15.5V19" />
                  </svg>
                </div>

                <div>
                  <strong>Activos y Zabbix</strong>
                  <span>Visibilidad del estado operativo</span>
                </div>
              </article>

              <article>
                <div className="login-feature-icon" aria-hidden="true">
                  <svg viewBox="0 0 24 24">
                    <path d="M12 3 3.5 7v5.5c0 4.2 3.6 7.2 8.5 8.5 4.9-1.3 8.5-4.3 8.5-8.5V7z" />
                    <path d="m8.7 12.2 2.1 2.1 4.7-4.8" />
                  </svg>
                </div>

                <div>
                  <strong>Control y auditoría</strong>
                  <span>Trazabilidad de las operaciones</span>
                </div>
              </article>

              <article>
                <div className="login-feature-icon" aria-hidden="true">
                  <svg viewBox="0 0 24 24">
                    <path d="M12 3v3M12 18v3M3 12h3M18 12h3M5.6 5.6l2.1 2.1M16.3 16.3l2.1 2.1M18.4 5.6l-2.1 2.1M7.7 16.3l-2.1 2.1" />
                    <circle cx="12" cy="12" r="4" />
                  </svg>
                </div>

                <div>
                  <strong>Análisis preventivo</strong>
                  <span>Recomendaciones apoyadas por IA</span>
                </div>
              </article>

              <article>
                <div className="login-feature-icon" aria-hidden="true">
                  <svg viewBox="0 0 24 24">
                    <path d="M5 3.5h10l4 4V21H5z" />
                    <path d="M15 3.5V8h4M8 12h8M8 16h8" />
                  </svg>
                </div>

                <div>
                  <strong>Reportes ejecutivos</strong>
                  <span>Información exportable y organizada</span>
                </div>
              </article>
            </div>
          </div>
        </div>
      </section>

      <section className="login-access">
        <div className="login-access-content">
          <div className="login-access-intro">
          </div>

          <div className="login-card">
            <div className="login-card-accent" />

            <div className="login-card-body">
              <div className="login-header">
                <div className="login-lock-icon" aria-hidden="true">
                  <svg viewBox="0 0 24 24">
                    <rect x="5" y="10" width="14" height="10" rx="2" />
                    <path d="M8.5 10V7.5a3.5 3.5 0 0 1 7 0V10M12 14v2" />
                  </svg>
                </div>

                <span>Acceso seguro</span>
                <h2>Bienvenido de nuevo</h2>

                <p>
                  Ingresa tus credenciales para acceder al
                  panel de monitoreo.
                </p>
              </div>

              <form
                className="login-form"
                onSubmit={handleSubmit}
                noValidate
              >
                <div className="login-field">
                  <label htmlFor="email">
                    Correo electrónico
                  </label>

                  <div className="login-input-wrapper">
                    <svg viewBox="0 0 24 24" aria-hidden="true">
                      <rect x="3" y="5" width="18" height="14" rx="2" />
                      <path d="m4 7 8 6 8-6" />
                    </svg>

                    <input
                      type="email"
                      id="email"
                      name="email"
                      placeholder="usuario@institucion.gob.gt"
                      value={formData.email}
                      onChange={handleChange}
                      autoComplete="email"
                      autoFocus
                      disabled={isLoading}
                      aria-describedby={
                        message ? 'login-message' : undefined
                      }
                    />
                  </div>
                </div>

                <div className="login-field">
                  <label htmlFor="password">
                    Contraseña
                  </label>

                  <div className="login-input-wrapper">
                    <svg viewBox="0 0 24 24" aria-hidden="true">
                      <rect x="4" y="10" width="16" height="10" rx="2" />
                      <path d="M8 10V7.5a4 4 0 0 1 8 0V10M12 14v2" />
                    </svg>

                    <input
                      type={showPassword ? 'text' : 'password'}
                      id="password"
                      name="password"
                      placeholder="Ingresa tu contraseña"
                      value={formData.password}
                      onChange={handleChange}
                      autoComplete="current-password"
                      disabled={isLoading}
                      aria-describedby={
                        message ? 'login-message' : undefined
                      }
                    />

                    <button
                      className="password-toggle"
                      type="button"
                      onClick={() =>
                        setShowPassword((previous) => !previous)
                      }
                      disabled={isLoading}
                      aria-label={
                        showPassword
                          ? 'Ocultar contraseña'
                          : 'Mostrar contraseña'
                      }
                      aria-pressed={showPassword}
                    >
                      {showPassword ? (
                        <svg viewBox="0 0 24 24" aria-hidden="true">
                          <path d="M3 3l18 18M10.6 10.7a2 2 0 0 0 2.7 2.7M9.8 5.2A10.8 10.8 0 0 1 12 5c5.5 0 9 7 9 7a15.7 15.7 0 0 1-2.1 3M6.6 6.7C4.3 8.3 3 12 3 12s3.5 7 9 7a9.8 9.8 0 0 0 3-.5" />
                        </svg>
                      ) : (
                        <svg viewBox="0 0 24 24" aria-hidden="true">
                          <path d="M3 12s3.5-7 9-7 9 7 9 7-3.5 7-9 7-9-7-9-7z" />
                          <circle cx="12" cy="12" r="2.5" />
                        </svg>
                      )}
                    </button>
                  </div>
                </div>

                {message && (
                  <p
                    id="login-message"
                    className="login-form-message"
                    role="alert"
                  >
                    <span aria-hidden="true">!</span>
                    {message}
                  </p>
                )}

                <button
                  type="submit"
                  className="login-button"
                  disabled={isLoading}
                >
                  {isLoading && (
                    <span
                      className="login-spinner"
                      aria-hidden="true"
                    />
                  )}

                  {isLoading
                    ? 'Verificando acceso...'
                    : 'Iniciar sesión'}

                  {!isLoading && (
                    <svg viewBox="0 0 24 24" aria-hidden="true">
                      <path d="M5 12h14M14 7l5 5-5 5" />
                    </svg>
                  )}
                </button>
              </form>

              <div className="login-security-message">
                <svg viewBox="0 0 24 24" aria-hidden="true">
                  <rect x="5" y="10" width="14" height="10" rx="2" />
                  <path d="M8.5 10V7.5a3.5 3.5 0 0 1 7 0V10" />
                </svg>

                <span>
                  Sesión protegida mediante autenticación JWT
                </span>
              </div>
            </div>
          </div>

          <p className="login-support-message">
            Si tienes problemas para ingresar, comunícate con
            el administrador de tu organización.
          </p>
        </div>
      </section>
    </main>
  )
}

export default LoginPage
