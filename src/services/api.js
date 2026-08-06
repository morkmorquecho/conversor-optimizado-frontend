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

// ── INTERCEPTOR ──────────────────────────────────────────────────────────────
api.interceptors.response.use(
  (response) => {
    // 204 (sin contenido) y 304 (no modificado, servido desde caché del
    // navegador) no traen body utilizable — evita que revienten al
    // desestructurar response.data.
    if (response.status === 204 || response.status === 304 || !response.data) {
      return null
    }

    const { success, data, errors, message } = response.data
    if (!success) {
      return Promise.reject(createApiError({ success, errors, message }))
    }
    return data
  },

  (error) => {
    const { response } = error

    if (isFormattedApiError(response)) {
      return Promise.reject(createApiError(response.data))
    }

    // Error de red, timeout, CORS, etc. (sin response del servidor)
    return Promise.reject(error)
  },
)

export default api