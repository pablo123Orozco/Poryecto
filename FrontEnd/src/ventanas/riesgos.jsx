import { useEffect, useMemo, useState } from 'react'
import { useNavigate } from 'react-router'
import { apiRequest } from '../servicios/api.js'
import './riesgos.css'

const NIST_FUNCTIONS = {
  GV: 'Gobernar',
  ID: 'Identificar',
  PR: 'Proteger',
  DE: 'Detectar',
  RS: 'Responder',
  RC: 'Recuperar',
}

const NIST_CATEGORIES = {
  GV: [
    ['GV.OC', 'Contexto organizacional'],
    ['GV.RM', 'Estrategia de gestión de riesgos'],
    ['GV.RR', 'Roles, responsabilidades y autoridades'],
    ['GV.PO', 'Política'],
    ['GV.OV', 'Supervisión'],
    ['GV.SC', 'Riesgo de la cadena de suministro'],
  ],
  ID: [
    ['ID.AM', 'Gestión de activos'],
    ['ID.RA', 'Evaluación de riesgos'],
    ['ID.IM', 'Mejora'],
  ],
  PR: [
    ['PR.AA', 'Identidad, autenticación y acceso'],
    ['PR.AT', 'Concientización y capacitación'],
    ['PR.DS', 'Seguridad de los datos'],
    ['PR.PS', 'Seguridad de plataformas'],
    ['PR.IR', 'Resiliencia de la infraestructura'],
  ],
  DE: [
    ['DE.CM', 'Monitoreo continuo'],
    ['DE.AE', 'Análisis de eventos adversos'],
  ],
  RS: [
    ['RS.MA', 'Gestión de incidentes'],
    ['RS.AN', 'Análisis de incidentes'],
    ['RS.CO', 'Comunicación y reporte'],
    ['RS.MI', 'Mitigación de incidentes'],
  ],
  RC: [
    ['RC.RP', 'Ejecución del plan de recuperación'],
    ['RC.CO', 'Comunicación de recuperación'],
  ],
}

const initialForm = {
  activo_id: '',
  responsable_id: '',
  titulo: '',
  descripcion: '',
  amenaza: '',
  vulnerabilidad: '',
  controles_existentes: '',
  probabilidad: '3',
  impacto: '3',
  tratamiento: 'reducir',
  plan_tratamiento: '',
  probabilidad_residual: '',
  impacto_residual: '',
  nist_funcion: 'ID',
  nist_categoria: 'ID.RA',
  nist_subcategoria: '',
  estado: 'identificado',
  fecha_revision: '',
}

const levelLabels = {
  bajo: 'Bajo',
  medio: 'Medio',
  alto: 'Alto',
  critico: 'Crítico',
}

const statusLabels = {
  identificado: 'Identificado',
  en_tratamiento: 'En tratamiento',
  aceptado: 'Aceptado',
  cerrado: 'Cerrado',
}

const treatmentLabels = {
  aceptar: 'Aceptar',
  reducir: 'Reducir',
  transferir: 'Transferir',
  evitar: 'Evitar',
}

function getRiskLevel(score) {
  if (score <= 4) return 'bajo'
  if (score <= 9) return 'medio'
  if (score <= 16) return 'alto'
  return 'critico'
}

function RiskAssessmentsPage() {
  const navigate = useNavigate()

  const [evaluations, setEvaluations] = useState([])
  const [assets, setAssets] = useState([])
  const [users, setUsers] = useState([])
  const [currentUser, setCurrentUser] = useState(null)
  const [formData, setFormData] = useState(initialForm)
  const [editingId, setEditingId] = useState(null)
  const [message, setMessage] = useState('')
  const [isLoading, setIsLoading] = useState(true)
  const [isSaving, setIsSaving] = useState(false)
  const [search, setSearch] = useState('')
  const [levelFilter, setLevelFilter] = useState('todos')
  const [statusFilter, setStatusFilter] = useState('todos')

  const canManage = [
    'ADMIN_EMPRESA',
    'ANALISTA_SEGURIDAD',
  ].includes(currentUser?.rol)

  const loadData = async () => {
    try {
      setIsLoading(true)

      const [riskResponse, assetResponse, userResponse] =
        await Promise.all([
          apiRequest('/riesgos?offset=0&limite=100'),
          apiRequest('/activos?offset=0&limite=100'),
          apiRequest('/auth/me'),
        ])

      let availableUsers = [userResponse]

      if (userResponse.rol === 'ADMIN_EMPRESA') {
        try {
          availableUsers = await apiRequest(
            '/usuarios?offset=0&limite=100',
          )
        } catch {
          availableUsers = [userResponse]
        }
      }

      setEvaluations(riskResponse)
      setAssets(assetResponse)
      setCurrentUser(userResponse)
      setUsers(availableUsers.filter((user) => user.activo !== false))
    } catch (error) {
      setMessage(error.message)
    } finally {
      setIsLoading(false)
    }
  }

  useEffect(() => {
    loadData()
  }, [])

  const scorePreview =
    Number(formData.probabilidad) * Number(formData.impacto)
  const levelPreview = getRiskLevel(scorePreview)

  const residualScorePreview =
    formData.probabilidad_residual && formData.impacto_residual
      ? Number(formData.probabilidad_residual) *
        Number(formData.impacto_residual)
      : null

  const assetNames = useMemo(
    () =>
      Object.fromEntries(
        assets.map((asset) => [asset.id, asset.nombre]),
      ),
    [assets],
  )

  const userNames = useMemo(
    () =>
      Object.fromEntries(
        users.map((user) => [
          user.id,
          `${user.nombres} ${user.apellidos}`,
        ]),
      ),
    [users],
  )

  const filteredEvaluations = useMemo(() => {
    const term = search.trim().toLowerCase()

    return evaluations.filter((evaluation) => {
      const assetName = assetNames[evaluation.activo_id] ?? ''
      const matchesSearch =
        !term ||
        evaluation.codigo.toLowerCase().includes(term) ||
        evaluation.titulo.toLowerCase().includes(term) ||
        evaluation.amenaza.toLowerCase().includes(term) ||
        assetName.toLowerCase().includes(term)

      const matchesLevel =
        levelFilter === 'todos' ||
        evaluation.nivel_inherente === levelFilter

      const matchesStatus =
        statusFilter === 'todos' ||
        evaluation.estado === statusFilter

      return matchesSearch && matchesLevel && matchesStatus
    })
  }, [
    evaluations,
    search,
    levelFilter,
    statusFilter,
    assetNames,
  ])

  const summary = useMemo(
    () => ({
      total: evaluations.length,
      critical: evaluations.filter(
        (item) => item.nivel_inherente === 'critico',
      ).length,
      high: evaluations.filter(
        (item) => item.nivel_inherente === 'alto',
      ).length,
      treatment: evaluations.filter(
        (item) => item.estado === 'en_tratamiento',
      ).length,
    }),
    [evaluations],
  )

  const handleChange = (event) => {
    const { name, value } = event.target

    if (name === 'nist_funcion') {
      setFormData((previous) => ({
        ...previous,
        nist_funcion: value,
        nist_categoria: NIST_CATEGORIES[value][0][0],
        nist_subcategoria: '',
      }))
      return
    }

    setFormData((previous) => ({
      ...previous,
      [name]: value,
    }))
  }

  const buildPayload = () => ({
    activo_id: Number(formData.activo_id),
    responsable_id: formData.responsable_id
      ? Number(formData.responsable_id)
      : null,
    titulo: formData.titulo.trim(),
    descripcion: formData.descripcion.trim() || null,
    amenaza: formData.amenaza.trim(),
    vulnerabilidad: formData.vulnerabilidad.trim(),
    controles_existentes:
      formData.controles_existentes.trim() || null,
    probabilidad: Number(formData.probabilidad),
    impacto: Number(formData.impacto),
    tratamiento: formData.tratamiento,
    plan_tratamiento: formData.plan_tratamiento.trim() || null,
    probabilidad_residual: formData.probabilidad_residual
      ? Number(formData.probabilidad_residual)
      : null,
    impacto_residual: formData.impacto_residual
      ? Number(formData.impacto_residual)
      : null,
    nist_funcion: formData.nist_funcion,
    nist_categoria: formData.nist_categoria,
    nist_subcategoria: formData.nist_subcategoria.trim() || null,
    estado: formData.estado,
    fecha_revision: formData.fecha_revision || null,
  })

  const resetForm = () => {
    setFormData(initialForm)
    setEditingId(null)
  }

  const handleSubmit = async (event) => {
    event.preventDefault()

    if (
      !formData.activo_id ||
      !formData.titulo.trim() ||
      !formData.amenaza.trim() ||
      !formData.vulnerabilidad.trim()
    ) {
      setMessage('Completa todos los campos obligatorios.')
      return
    }

    if (
      Boolean(formData.probabilidad_residual) !==
      Boolean(formData.impacto_residual)
    ) {
      setMessage(
        'La probabilidad y el impacto residual deben completarse juntos.',
      )
      return
    }

    try {
      setIsSaving(true)
      setMessage('')

      await apiRequest(
        editingId ? `/riesgos/${editingId}` : '/riesgos',
        {
          method: editingId ? 'PATCH' : 'POST',
          body: JSON.stringify(buildPayload()),
        },
      )

      const successMessage = editingId
        ? 'Evaluación actualizada correctamente.'
        : 'Evaluación registrada correctamente.'

      resetForm()
      await loadData()
      setMessage(successMessage)
    } catch (error) {
      setMessage(error.message)
    } finally {
      setIsSaving(false)
    }
  }

  const editEvaluation = (evaluation) => {
    setEditingId(evaluation.id)
    setFormData({
      activo_id: String(evaluation.activo_id),
      responsable_id: evaluation.responsable_id
        ? String(evaluation.responsable_id)
        : '',
      titulo: evaluation.titulo,
      descripcion: evaluation.descripcion ?? '',
      amenaza: evaluation.amenaza,
      vulnerabilidad: evaluation.vulnerabilidad,
      controles_existentes: evaluation.controles_existentes ?? '',
      probabilidad: String(evaluation.probabilidad),
      impacto: String(evaluation.impacto),
      tratamiento: evaluation.tratamiento,
      plan_tratamiento: evaluation.plan_tratamiento ?? '',
      probabilidad_residual: evaluation.probabilidad_residual
        ? String(evaluation.probabilidad_residual)
        : '',
      impacto_residual: evaluation.impacto_residual
        ? String(evaluation.impacto_residual)
        : '',
      nist_funcion: evaluation.nist_funcion,
      nist_categoria: evaluation.nist_categoria,
      nist_subcategoria: evaluation.nist_subcategoria ?? '',
      estado: evaluation.estado,
      fecha_revision: evaluation.fecha_revision ?? '',
    })

    window.scrollTo({ top: 0, behavior: 'smooth' })
  }

  return (
    <main className="risk-page">
      <header className="risk-header">
        <div>
          <span>Gestión preventiva</span>
          <h1>Evaluación de riesgos NIST</h1>
          <p>
            Identifica amenazas y vulnerabilidades, prioriza el riesgo
            y documenta su tratamiento mediante una matriz de 5 × 5.
          </p>
        </div>

        <button
          className="risk-back-button"
          type="button"
          onClick={() => navigate('/dashboard')}
        >
          Volver al dashboard
        </button>
      </header>

      <section className="risk-summary-grid">
        <article>
          <span>Riesgos registrados</span>
          <strong>{summary.total}</strong>
          <p>Total de evaluaciones</p>
        </article>

        <article className="risk-summary-critical">
          <span>Nivel crítico</span>
          <strong>{summary.critical}</strong>
          <p>Requieren atención inmediata</p>
        </article>

        <article className="risk-summary-high">
          <span>Nivel alto</span>
          <strong>{summary.high}</strong>
          <p>Necesitan acciones prioritarias</p>
        </article>

        <article className="risk-summary-treatment">
          <span>En tratamiento</span>
          <strong>{summary.treatment}</strong>
          <p>Con medidas en seguimiento</p>
        </article>
      </section>

      {message && (
        <p className="risk-page-message" role="alert">
          {message}
        </p>
      )}

      <section
        className={
          canManage
            ? 'risk-content'
            : 'risk-content risk-content-readonly'
        }
      >
        {canManage && (
          <article className="risk-form-panel">
            <div className="risk-panel-title">
              <span>{editingId ? 'Actualización' : 'Nueva evaluación'}</span>
              <h2>
                {editingId
                  ? 'Actualizar riesgo'
                  : 'Registrar riesgo'}
              </h2>
              <p>
                Los campos marcados con un asterisco son obligatorios.
              </p>
            </div>

            <form className="risk-form" onSubmit={handleSubmit}>
              <h3>Identificación</h3>

              <div className="risk-field risk-full-width">
                <label htmlFor="activo_id">
                  Activo evaluado <strong>*</strong>
                </label>
                <select
                  id="activo_id"
                  name="activo_id"
                  value={formData.activo_id}
                  onChange={handleChange}
                  disabled={isSaving}
                >
                  <option value="">Selecciona un activo</option>
                  {assets.map((asset) => (
                    <option key={asset.id} value={asset.id}>
                      {asset.nombre} — {asset.codigo_interno || `ID ${asset.id}`}
                    </option>
                  ))}
                </select>
              </div>

              <div className="risk-field risk-full-width">
                <label htmlFor="titulo">
                  Título del riesgo <strong>*</strong>
                </label>
                <input
                  id="titulo"
                  name="titulo"
                  type="text"
                  placeholder="Ejemplo: Interrupción del servidor clínico"
                  value={formData.titulo}
                  onChange={handleChange}
                  disabled={isSaving}
                />
              </div>

              <div className="risk-field risk-full-width">
                <label htmlFor="descripcion">Descripción</label>
                <textarea
                  id="descripcion"
                  name="descripcion"
                  placeholder="Describe el contexto y las consecuencias posibles."
                  value={formData.descripcion}
                  onChange={handleChange}
                  disabled={isSaving}
                />
              </div>

              <div className="risk-field risk-full-width">
                <label htmlFor="amenaza">
                  Amenaza <strong>*</strong>
                </label>
                <textarea
                  id="amenaza"
                  name="amenaza"
                  placeholder="Evento o actor que puede causar daño."
                  value={formData.amenaza}
                  onChange={handleChange}
                  disabled={isSaving}
                />
              </div>

              <div className="risk-field risk-full-width">
                <label htmlFor="vulnerabilidad">
                  Vulnerabilidad <strong>*</strong>
                </label>
                <textarea
                  id="vulnerabilidad"
                  name="vulnerabilidad"
                  placeholder="Debilidad que puede ser aprovechada por la amenaza."
                  value={formData.vulnerabilidad}
                  onChange={handleChange}
                  disabled={isSaving}
                />
              </div>

              <div className="risk-field risk-full-width">
                <label htmlFor="controles_existentes">
                  Controles existentes
                </label>
                <textarea
                  id="controles_existentes"
                  name="controles_existentes"
                  placeholder="Medidas de protección aplicadas actualmente."
                  value={formData.controles_existentes}
                  onChange={handleChange}
                  disabled={isSaving}
                />
              </div>

              <h3>Clasificación NIST CSF 2.0</h3>

              <div className="risk-field">
                <label htmlFor="nist_funcion">
                  Función NIST <strong>*</strong>
                </label>
                <select
                  id="nist_funcion"
                  name="nist_funcion"
                  value={formData.nist_funcion}
                  onChange={handleChange}
                  disabled={isSaving}
                >
                  {Object.entries(NIST_FUNCTIONS).map(([code, label]) => (
                    <option key={code} value={code}>
                      {code} — {label}
                    </option>
                  ))}
                </select>
              </div>

              <div className="risk-field">
                <label htmlFor="nist_categoria">
                  Categoría <strong>*</strong>
                </label>
                <select
                  id="nist_categoria"
                  name="nist_categoria"
                  value={formData.nist_categoria}
                  onChange={handleChange}
                  disabled={isSaving}
                >
                  {NIST_CATEGORIES[formData.nist_funcion].map(
                    ([code, label]) => (
                      <option key={code} value={code}>
                        {code} — {label}
                      </option>
                    ),
                  )}
                </select>
              </div>

              <div className="risk-field risk-full-width">
                <label htmlFor="nist_subcategoria">
                  Subcategoría NIST opcional
                </label>
                <input
                  id="nist_subcategoria"
                  name="nist_subcategoria"
                  type="text"
                  placeholder="Ejemplo: ID.RA-01"
                  value={formData.nist_subcategoria}
                  onChange={handleChange}
                  disabled={isSaving}
                />
              </div>

              <h3>Valoración inherente</h3>

              <div className="risk-field">
                <label htmlFor="probabilidad">
                  Probabilidad <strong>*</strong>
                </label>
                <select
                  id="probabilidad"
                  name="probabilidad"
                  value={formData.probabilidad}
                  onChange={handleChange}
                  disabled={isSaving}
                >
                  <option value="1">1 — Muy baja</option>
                  <option value="2">2 — Baja</option>
                  <option value="3">3 — Media</option>
                  <option value="4">4 — Alta</option>
                  <option value="5">5 — Muy alta</option>
                </select>
              </div>

              <div className="risk-field">
                <label htmlFor="impacto">
                  Impacto <strong>*</strong>
                </label>
                <select
                  id="impacto"
                  name="impacto"
                  value={formData.impacto}
                  onChange={handleChange}
                  disabled={isSaving}
                >
                  <option value="1">1 — Insignificante</option>
                  <option value="2">2 — Menor</option>
                  <option value="3">3 — Moderado</option>
                  <option value="4">4 — Mayor</option>
                  <option value="5">5 — Crítico</option>
                </select>
              </div>

              <div
                className={`risk-score-preview risk-level-${levelPreview}`}
              >
                <span>Riesgo inherente calculado</span>
                <strong>{scorePreview} / 25</strong>
                <b>{levelLabels[levelPreview]}</b>
                <p>Probabilidad × impacto</p>
              </div>

              <h3>Tratamiento y riesgo residual</h3>

              <div className="risk-field">
                <label htmlFor="tratamiento">
                  Tratamiento <strong>*</strong>
                </label>
                <select
                  id="tratamiento"
                  name="tratamiento"
                  value={formData.tratamiento}
                  onChange={handleChange}
                  disabled={isSaving}
                >
                  <option value="aceptar">Aceptar</option>
                  <option value="reducir">Reducir</option>
                  <option value="transferir">Transferir</option>
                  <option value="evitar">Evitar</option>
                </select>
              </div>

              <div className="risk-field">
                <label htmlFor="responsable_id">Responsable</label>
                <select
                  id="responsable_id"
                  name="responsable_id"
                  value={formData.responsable_id}
                  onChange={handleChange}
                  disabled={isSaving}
                >
                  <option value="">Sin asignar</option>
                  {users.map((user) => (
                    <option key={user.id} value={user.id}>
                      {user.nombres} {user.apellidos}
                    </option>
                  ))}
                </select>
              </div>

              <div className="risk-field risk-full-width">
                <label htmlFor="plan_tratamiento">
                  Plan de tratamiento
                </label>
                <textarea
                  id="plan_tratamiento"
                  name="plan_tratamiento"
                  placeholder="Acciones, recursos y resultados esperados."
                  value={formData.plan_tratamiento}
                  onChange={handleChange}
                  disabled={isSaving}
                />
              </div>

              <div className="risk-field">
                <label htmlFor="probabilidad_residual">
                  Probabilidad residual
                </label>
                <select
                  id="probabilidad_residual"
                  name="probabilidad_residual"
                  value={formData.probabilidad_residual}
                  onChange={handleChange}
                  disabled={isSaving}
                >
                  <option value="">Sin evaluar</option>
                  {[1, 2, 3, 4, 5].map((value) => (
                    <option key={value} value={value}>{value}</option>
                  ))}
                </select>
              </div>

              <div className="risk-field">
                <label htmlFor="impacto_residual">
                  Impacto residual
                </label>
                <select
                  id="impacto_residual"
                  name="impacto_residual"
                  value={formData.impacto_residual}
                  onChange={handleChange}
                  disabled={isSaving}
                >
                  <option value="">Sin evaluar</option>
                  {[1, 2, 3, 4, 5].map((value) => (
                    <option key={value} value={value}>{value}</option>
                  ))}
                </select>
              </div>

              {residualScorePreview !== null && (
                <div
                  className={`risk-score-preview risk-level-${getRiskLevel(
                    residualScorePreview,
                  )}`}
                >
                  <span>Riesgo residual calculado</span>
                  <strong>{residualScorePreview} / 25</strong>
                  <b>{levelLabels[getRiskLevel(residualScorePreview)]}</b>
                  <p>Resultado posterior al tratamiento</p>
                </div>
              )}

              <div className="risk-field">
                <label htmlFor="estado">Estado</label>
                <select
                  id="estado"
                  name="estado"
                  value={formData.estado}
                  onChange={handleChange}
                  disabled={isSaving}
                >
                  {Object.entries(statusLabels).map(([value, label]) => (
                    <option key={value} value={value}>{label}</option>
                  ))}
                </select>
              </div>

              <div className="risk-field">
                <label htmlFor="fecha_revision">
                  Próxima revisión
                </label>
                <input
                  id="fecha_revision"
                  name="fecha_revision"
                  type="date"
                  value={formData.fecha_revision}
                  onChange={handleChange}
                  disabled={isSaving}
                />
              </div>

              <button
                className="risk-save-button"
                type="submit"
                disabled={isSaving}
              >
                {isSaving
                  ? 'Guardando evaluación...'
                  : editingId
                    ? 'Actualizar evaluación'
                    : 'Registrar evaluación'}
              </button>

              {editingId && (
                <button
                  className="risk-cancel-button"
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

        <article className="risk-list-panel">
          <div className="risk-list-heading">
            <div>
              <span>Registro organizacional</span>
              <h2>Riesgos identificados</h2>
              <p>
                {filteredEvaluations.length} de {evaluations.length}
                {' '}evaluaciones visibles
              </p>
            </div>
          </div>

          <div className="risk-filters">
            <input
              type="search"
              placeholder="Buscar por código, riesgo, amenaza o activo"
              value={search}
              onChange={(event) => setSearch(event.target.value)}
            />

            <select
              value={levelFilter}
              onChange={(event) => setLevelFilter(event.target.value)}
            >
              <option value="todos">Todos los niveles</option>
              <option value="critico">Crítico</option>
              <option value="alto">Alto</option>
              <option value="medio">Medio</option>
              <option value="bajo">Bajo</option>
            </select>

            <select
              value={statusFilter}
              onChange={(event) => setStatusFilter(event.target.value)}
            >
              <option value="todos">Todos los estados</option>
              {Object.entries(statusLabels).map(([value, label]) => (
                <option key={value} value={value}>{label}</option>
              ))}
            </select>
          </div>

          {isLoading ? (
            <div className="risk-empty-state">
              <h3>Cargando evaluaciones...</h3>
            </div>
          ) : filteredEvaluations.length === 0 ? (
            <div className="risk-empty-state">
              <div>0</div>
              <h3>No existen evaluaciones para mostrar</h3>
              <p>
                Registra el primer riesgo o modifica los filtros de búsqueda.
              </p>
            </div>
          ) : (
            <div className="risk-list">
              {filteredEvaluations.map((evaluation) => (
                <article
                  className={`risk-item risk-item-${evaluation.nivel_inherente}`}
                  key={evaluation.id}
                >
                  <div className="risk-item-header">
                    <div>
                      <span>{evaluation.codigo}</span>
                      <h3>{evaluation.titulo}</h3>
                      <p>
                        {assetNames[evaluation.activo_id] ??
                          `Activo ${evaluation.activo_id}`}
                      </p>
                    </div>

                    <div className="risk-item-score">
                      <strong>{evaluation.puntaje_inherente}</strong>
                      <span>{levelLabels[evaluation.nivel_inherente]}</span>
                    </div>
                  </div>

                  <div className="risk-badges">
                    <span>{statusLabels[evaluation.estado]}</span>
                    <span>
                      {evaluation.nist_categoria} ·{' '}
                      {NIST_FUNCTIONS[evaluation.nist_funcion]}
                    </span>
                    <span>{treatmentLabels[evaluation.tratamiento]}</span>
                  </div>

                  <dl className="risk-details">
                    <div>
                      <dt>Amenaza</dt>
                      <dd>{evaluation.amenaza}</dd>
                    </div>
                    <div>
                      <dt>Vulnerabilidad</dt>
                      <dd>{evaluation.vulnerabilidad}</dd>
                    </div>
                    <div>
                      <dt>Probabilidad e impacto</dt>
                      <dd>
                        {evaluation.probabilidad} × {evaluation.impacto}
                      </dd>
                    </div>
                    <div>
                      <dt>Riesgo residual</dt>
                      <dd>
                        {evaluation.puntaje_residual !== null
                          ? `${evaluation.puntaje_residual} — ${
                              levelLabels[evaluation.nivel_residual]
                            }`
                          : 'Pendiente de evaluación'}
                      </dd>
                    </div>
                    <div>
                      <dt>Responsable</dt>
                      <dd>
                        {evaluation.responsable_id
                          ? userNames[evaluation.responsable_id] ??
                            `Usuario ${evaluation.responsable_id}`
                          : 'Sin asignar'}
                      </dd>
                    </div>
                    <div>
                      <dt>Próxima revisión</dt>
                      <dd>{evaluation.fecha_revision || 'Sin programar'}</dd>
                    </div>
                  </dl>

                  {canManage && (
                    <button
                      className="risk-edit-button"
                      type="button"
                      onClick={() => editEvaluation(evaluation)}
                    >
                      Editar evaluación
                    </button>
                  )}
                </article>
              ))}
            </div>
          )}

          <p className="risk-method-note">
            Metodología interna alineada con NIST SP 800-30 Rev. 1 y
            clasificada mediante NIST CSF 2.0. La matriz numérica de 5 × 5
            es una adaptación definida para esta plataforma.
          </p>
        </article>
      </section>
    </main>
  )
}

export default RiskAssessmentsPage
