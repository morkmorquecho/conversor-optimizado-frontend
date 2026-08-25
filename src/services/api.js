// src/services/api.js
import axios from 'axios'

const api = axios.create({
  baseURL: import.meta.env.VITE_API_URL,
})

// ── HELPERS ──────────────────────────────────────────────────────────────────
function normalizeFieldErrors(context) {
  if (!context || typeof context !== 'object') return context

  const normalized = {}
  for (const key in context) {
    const value = context[key]
    normalized[key] = Array.isArray(value) ? value : typeof value === 'string' ? [value] : value
  }
  return normalized
}

function resolveErrorType(context) {
  if (typeof context === 'string' && context.length > 0) return 'message_error'
  if (typeof context === 'object' && context !== null && Object.keys(context).length > 0)
    return 'field_errors'
  return 'unknown'
}

function createApiError(responseData) {
  const rawContext = responseData.errors?.context ?? {}
  const context = normalizeFieldErrors(rawContext)
  const type = resolveErrorType(context)

  const message =
    responseData.message || (typeof rawContext === 'string' ? rawContext : 'Error inesperado')

  const error = new Error(message)
  error.errors = responseData.errors
  error.code = responseData.errors?.code || null
  error.source = responseData.errors?.source || null
  error.context = context
  error.type = type

  return error
}

function isFormattedApiError(response) {
  return response?.data?.success === false
}

function createDetailError(data) {
  const message = data?.detail || data?.message
  if (!message) return null
  return new Error(typeof message === 'string' ? message : 'Error inesperado')
}

// ── INTERCEPTOR ──────────────────────────────────────────────────────────────
api.interceptors.response.use(
  (response) => {
    // Descargas binarias (Excel, etc.): el body ya es un Blob, no el shape
    // {success, data, errors, message}. Regresamos la response completa
    // para que el caller tenga acceso a response.data (blob) y
    // response.headers (Content-Disposition con el nombre real del archivo).
    if (response.config.responseType === 'blob') {
      return response
    }

    if (response.status === 204 || response.status === 304 || !response.data) {
      return null
    }

    const { success, data, errors, message } = response.data
    if (!success) {
      return Promise.reject(createApiError({ success, errors, message }))
    }
    return data
  },

  async (error) => {
    const { response, config } = error

    // Si pedimos blob pero el backend respondió un error, axios igual
    // envuelve el body como Blob. Hay que leerlo como texto y parsear
    // el JSON real antes de poder formatear el error.
    if (config?.responseType === 'blob' && response?.data instanceof Blob) {
      try {
        const text = await response.data.text()
        const parsed = JSON.parse(text)
        if (parsed?.success === false) return Promise.reject(createApiError(parsed))
        const detailError = createDetailError(parsed)
        if (detailError) return Promise.reject(detailError)
      } catch {
        // el blob no era JSON parseable; cae al manejo genérico de abajo
      }
    }

    if (isFormattedApiError(response)) {
      return Promise.reject(createApiError(response.data))
    }

    const detailError = createDetailError(response?.data)
    if (detailError) return Promise.reject(detailError)

    // Error de red, timeout, CORS, etc. (sin response del servidor)
    return Promise.reject(error)
  },
)

export default api
