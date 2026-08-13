const API_URL =
  import.meta.env.VITE_API_URL ??
  'http://127.0.0.1:8000/api/v1'

function handleUnauthorized(response) {
  if (response.status !== 401) {
    return
  }

  localStorage.removeItem('access_token')

  if (window.location.pathname !== '/login') {
    window.location.assign('/login')
  }
}

async function getErrorMessage(response) {
  const contentType = response.headers.get('content-type')

  if (!contentType?.includes('application/json')) {
    return 'No fue posible completar la solicitud.'
  }

  const data = await response.json()

  if (Array.isArray(data.detail)) {
    return data.detail
      .map((error) => error.msg)
      .join(', ')
  }

  return (
    data.detail ??
    'No fue posible completar la solicitud.'
  )
}

export async function apiRequest(ruta, opciones = {}) {
  const token = localStorage.getItem('access_token')
  const headers = {
    ...opciones.headers,
  }

  if (opciones.body) {
    headers['Content-Type'] = 'application/json'
  }

  if (token) {
    headers.Authorization = `Bearer ${token}`
  }

  const response = await fetch(`${API_URL}${ruta}`, {
    ...opciones,
    headers,
  })

  handleUnauthorized(response)

  if (!response.ok) {
    throw new Error(
      await getErrorMessage(response),
    )
  }

  if (response.status === 204) {
    return null
  }

  const contentType = response.headers.get('content-type')

  return contentType?.includes('application/json')
    ? response.json()
    : null
}

export async function apiDownload(
  ruta,
  defaultFileName = 'reporte.csv',
) {
  const token = localStorage.getItem('access_token')
  const headers = {}

  if (token) {
    headers.Authorization = `Bearer ${token}`
  }

  const response = await fetch(`${API_URL}${ruta}`, {
    method: 'GET',
    headers,
  })

  handleUnauthorized(response)

  if (!response.ok) {
    throw new Error(
      await getErrorMessage(response),
    )
  }

  const file = await response.blob()
  const fileUrl = URL.createObjectURL(file)
  const link = document.createElement('a')

  link.href = fileUrl
  link.download = defaultFileName

  document.body.appendChild(link)
  link.click()
  link.remove()

  URL.revokeObjectURL(fileUrl)
}