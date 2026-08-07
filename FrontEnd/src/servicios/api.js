const API_URL =
  import.meta.env.VITE_API_URL ??
  'http://127.0.0.1:8000/api/v1'

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

  const contentType = response.headers.get('content-type')
  const data = contentType?.includes('application/json')
    ? await response.json()
    : null

  if (!response.ok) {
    if (response.status === 401) {
  localStorage.removeItem('access_token')

  if (window.location.pathname !== '/login') {
    window.location.assign('/login')
  }
}
  }

  return data
}