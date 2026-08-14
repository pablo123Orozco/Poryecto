import { useEffect } from 'react'
import './notificacion.css'

function Notificacion({
  mensaje,
  tipo = 'exito',
  alCerrar,
}) {
  useEffect(() => {
    if (!mensaje) {
      return undefined
    }

    const temporizador = window.setTimeout(() => {
      alCerrar()
    }, 3500)

    return () => {
      window.clearTimeout(temporizador)
    }
  }, [mensaje, alCerrar])

  if (!mensaje) {
    return null
  }

  const esExito = tipo === 'exito'

  return (
    <div
      className={`notificacion notificacion-${tipo}`}
      role={esExito ? 'status' : 'alert'}
    >
      <div className="notificacion-icono">
        {esExito ? '✓' : '!'}
      </div>

      <div className="notificacion-contenido">
        <strong>
          {esExito
            ? 'Operación realizada'
            : 'No fue posible completar la operación'}
        </strong>

        <span>{mensaje}</span>
      </div>

      <button
        className="notificacion-cerrar"
        type="button"
        aria-label="Cerrar notificación"
        onClick={alCerrar}
      >
        ×
      </button>
    </div>
  )
}

export default Notificacion