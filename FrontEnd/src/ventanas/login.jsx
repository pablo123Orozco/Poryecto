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

  const handleChange = (event) => {
    const { name, value } = event.target

    setFormData((previousData) => ({
      ...previousData,
      [name]: value,
    }))
  }

  const handleSubmit = async (event) => {
    event.preventDefault()

    if (!formData.email || !formData.password) {
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
      <section className="login-information">
        <div className="brand">
          <div className="brand-icon">CS</div>

          <div>
            <p className="brand-label">
              Plataforma inteligente
            </p>

            <h1>
              Gestión Preventiva de Riesgos Cibernéticos
            </h1>
          </div>
        </div>

        <div className="platform-description">
          <h2>
            Protege los activos tecnológicos de tu
            organización
          </h2>

          <p>
            Identifica vulnerabilidades, evalúa riesgos y
            recibe recomendaciones preventivas apoyadas por
            inteligencia artificial.
          </p>

          <ul>
            <li>Gestión de activos tecnológicos</li>
            <li>Evaluación y priorización de riesgos</li>
            <li>Seguimiento de planes de remediación</li>
            <li>Evaluación de cumplimiento</li>
          </ul>
        </div>
      </section>

      <section className="login-container">
        <div className="login-card">
          <div className="login-header">
            <span>Acceso seguro</span>
            <h2>Iniciar sesión</h2>

            <p>
              Ingresa tus credenciales para acceder a la
              plataforma.
            </p>
          </div>

          <form
            className="login-form"
            onSubmit={handleSubmit}
          >
            <div className="form-group">
              <label htmlFor="email">
                Correo electrónico
              </label>

              <input
                type="email"
                id="email"
                name="email"
                placeholder="usuario@institucion.gob.gt"
                value={formData.email}
                onChange={handleChange}
                autoComplete="email"
                disabled={isLoading}
              />
            </div>

            <div className="form-group">
              <label htmlFor="password">
                Contraseña
              </label>

              <input
                type="password"
                id="password"
                name="password"
                placeholder="Ingresa tu contraseña"
                value={formData.password}
                onChange={handleChange}
                autoComplete="current-password"
                disabled={isLoading}
              />
            </div>

            <button
              type="submit"
              className="login-button"
              disabled={isLoading}
            >
              {isLoading ? 'Ingresando...' : 'Continuar'}
            </button>

            {message && (
              <p className="form-message" role="alert">
                {message}
              </p>
            )}
          </form>

          <p className="security-message">
            El acceso está protegido mediante autenticación
            segura con JWT.
          </p>
        </div>
      </section>
    </main>
  )
}

export default LoginPage