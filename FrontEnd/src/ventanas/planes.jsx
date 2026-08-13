import { useEffect, useState } from 'react'
import { useNavigate } from 'react-router'
import { apiRequest } from '../servicios/api.js'
import './activos.css'

const initialForm = {
  plan_id: '',
  periodicidad: 'mensual',
}

const statusLabels = {
  pendiente: 'Pendiente',
  activa: 'Activa',
  vencida: 'Vencida',
  cancelada: 'Cancelada',
}

function PlansPage() {
  const navigate = useNavigate()

  const [formData, setFormData] = useState(initialForm)
  const [plans, setPlans] = useState([])
  const [subscriptions, setSubscriptions] = useState([])
  const [message, setMessage] = useState('')
  const [isLoading, setIsLoading] = useState(true)
  const [isSaving, setIsSaving] = useState(false)
  const [cancelingId, setCancelingId] = useState(null)

  useEffect(() => {
    const loadData = async () => {
      try {
        const [
          plansResponse,
          subscriptionsResponse,
        ] = await Promise.all([
          apiRequest('/planes'),
          apiRequest('/suscripciones'),
        ])

        setPlans(plansResponse)
        setSubscriptions(subscriptionsResponse)
      } catch (error) {
        setMessage(error.message)
      } finally {
        setIsLoading(false)
      }
    }

    loadData()
  }, [])

  const activeSubscription = subscriptions.find(
    (subscription) =>
      subscription.estado === 'activa',
  )

  const selectedPlan = plans.find(
    (plan) =>
      plan.id === Number(formData.plan_id),
  )

  const handleChange = (event) => {
    const { name, value } = event.target

    setFormData((previousData) => ({
      ...previousData,
      [name]: value,
    }))
  }

  const handleSubmit = async (event) => {
    event.preventDefault()

    if (!formData.plan_id) {
      setMessage('Selecciona un plan.')
      return
    }

    if (activeSubscription) {
      setMessage(
        'La organización ya tiene una suscripción activa.',
      )
      return
    }

    setMessage('')
    setIsSaving(true)

    try {
      const newSubscription = await apiRequest(
        '/suscripciones',
        {
          method: 'POST',
          body: JSON.stringify({
            plan_id: Number(formData.plan_id),
            periodicidad: formData.periodicidad,
          }),
        },
      )

      setSubscriptions((previousSubscriptions) => [
        newSubscription,
        ...previousSubscriptions,
      ])

      setFormData(initialForm)

      setMessage(
        'Suscripción creada correctamente.',
      )
    } catch (error) {
      setMessage(error.message)
    } finally {
      setIsSaving(false)
    }
  }

  const handleCancel = async (subscription) => {
    const confirmed = window.confirm(
      '¿Deseas cancelar la suscripción activa?',
    )

    if (!confirmed) {
      return
    }

    setMessage('')
    setCancelingId(subscription.id)

    try {
      const updatedSubscription = await apiRequest(
        `/suscripciones/${subscription.id}/cancelar`,
        {
          method: 'PATCH',
        },
      )

      setSubscriptions((previousSubscriptions) =>
        previousSubscriptions.map((item) =>
          item.id === subscription.id
            ? updatedSubscription
            : item,
        ),
      )

      setMessage(
        'Suscripción cancelada correctamente.',
      )
    } catch (error) {
      setMessage(error.message)
    } finally {
      setCancelingId(null)
    }
  }

  const getPlanName = (planId) => {
    const plan = plans.find(
      (item) => item.id === planId,
    )

    return plan?.nombre ?? `Plan ${planId}`
  }

  const formatPrice = (price) => {
    return `Q ${Number(price).toFixed(2)}`
  }

  const formatDate = (dateValue) => {
    if (!dateValue) {
      return 'Sin fecha'
    }

    return new Date(
      `${dateValue}T00:00:00`,
    ).toLocaleDateString('es-GT')
  }

  return (
    <main className="assets-page">
      <header className="assets-header">
        <div>
          <span>Servicio contratado</span>
          <h1>Planes y suscripción</h1>

          <p>
            Consulta los planes disponibles y administra la
            suscripción de la organización.
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
            <span>Planes disponibles</span>
            <h2>Seleccionar un plan</h2>

            <p>
              Cada organización puede tener una sola
              suscripción activa.
            </p>
          </div>

          {activeSubscription && (
            <div className="assets-empty-state">
              <h3>Suscripción activa</h3>

              <p>
                Plan:{' '}
                <strong>
                  {getPlanName(
                    activeSubscription.plan_id,
                  )}
                </strong>
              </p>

              <p>
                Periodicidad:{' '}
                <strong>
                  {activeSubscription.periodicidad}
                </strong>
              </p>

              <p>
                Precio contratado:{' '}
                <strong>
                  {formatPrice(
                    activeSubscription
                      .precio_contratado,
                  )}
                </strong>
              </p>

              <button
                className="delete-asset-button"
                type="button"
                disabled={
                  cancelingId === activeSubscription.id
                }
                onClick={() =>
                  handleCancel(activeSubscription)
                }
              >
                {cancelingId === activeSubscription.id
                  ? 'Cancelando...'
                  : 'Cancelar suscripción'}
              </button>
            </div>
          )}

          {!activeSubscription && (
            <form
              className="asset-form"
              onSubmit={handleSubmit}
            >
              <div className="form-field full-width">
                <label htmlFor="plan_id">
                  Plan <strong>*</strong>
                </label>

                <select
                  id="plan_id"
                  name="plan_id"
                  value={formData.plan_id}
                  onChange={handleChange}
                  disabled={isSaving}
                >
                  <option value="">
                    Selecciona un plan
                  </option>

                  {plans.map((plan) => (
                    <option
                      key={plan.id}
                      value={plan.id}
                    >
                      {plan.nombre}
                    </option>
                  ))}
                </select>
              </div>

              <div className="form-field full-width">
                <label htmlFor="periodicidad">
                  Periodicidad <strong>*</strong>
                </label>

                <select
                  id="periodicidad"
                  name="periodicidad"
                  value={formData.periodicidad}
                  onChange={handleChange}
                  disabled={isSaving}
                >
                  <option value="mensual">
                    Mensual
                  </option>

                  <option value="anual">
                    Anual
                  </option>
                </select>
              </div>

              {selectedPlan && (
                <div className="assets-empty-state">
                  <h3>{selectedPlan.nombre}</h3>

                  <p>
                    Límite de usuarios:{' '}
                    <strong>
                      {selectedPlan.limite_usuarios}
                    </strong>
                  </p>

                  <p>
                    Límite de activos:{' '}
                    <strong>
                      {selectedPlan.limite_activos}
                    </strong>
                  </p>

                  <p>
                    Precio seleccionado:{' '}
                    <strong>
                      {formData.periodicidad === 'mensual'
                        ? formatPrice(
                            selectedPlan
                              .precio_mensual,
                          )
                        : formatPrice(
                            selectedPlan.precio_anual,
                          )}
                    </strong>
                  </p>
                </div>
              )}

              <button
                className="save-asset-button"
                type="submit"
                disabled={isSaving}
              >
                {isSaving
                  ? 'Creando suscripción...'
                  : 'Contratar plan'}
              </button>
            </form>
          )}

          {message && (
            <p
              className="asset-message"
              role="alert"
            >
              {message}
            </p>
          )}
        </article>

        <article className="asset-list-panel">
          <div className="panel-title">
            <span>Historial</span>
            <h2>Suscripciones registradas</h2>

            <p>
              Total de suscripciones:{' '}
              {subscriptions.length}
            </p>
          </div>

          {isLoading ? (
            <div className="assets-empty-state">
              <h3>Cargando planes...</h3>
            </div>
          ) : subscriptions.length === 0 ? (
            <div className="assets-empty-state">
              <div className="assets-empty-icon">
                0
              </div>

              <h3>No existen suscripciones</h3>

              <p>
                Selecciona uno de los planes disponibles.
              </p>
            </div>
          ) : (
            <div className="asset-list">
              {subscriptions.map((subscription) => (
                <article
                  className="asset-item"
                  key={subscription.id}
                >
                  <div className="asset-item-header">
                    <div>
                      <span>
                        {subscription.periodicidad}
                      </span>

                      <h3>
                        {getPlanName(
                          subscription.plan_id,
                        )}
                      </h3>
                    </div>

                    <span className="criticality-badge">
                      {statusLabels[
                        subscription.estado
                      ]}
                    </span>
                  </div>

                  <dl className="asset-details">
                    <div>
                      <dt>Precio contratado</dt>

                      <dd>
                        {formatPrice(
                          subscription
                            .precio_contratado,
                        )}
                      </dd>
                    </div>

                    <div>
                      <dt>Fecha de inicio</dt>

                      <dd>
                        {formatDate(
                          subscription.inicia_en,
                        )}
                      </dd>
                    </div>

                    <div>
                      <dt>Fecha de finalización</dt>

                      <dd>
                        {formatDate(
                          subscription.termina_en,
                        )}
                      </dd>
                    </div>
                  </dl>
                </article>
              ))}
            </div>
          )}
        </article>
      </section>
    </main>
  )
}

export default PlansPage