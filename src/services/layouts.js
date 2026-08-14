// src/services/layout.js
import api from './api'

const layoutService = {

  // ── LAYOUTS ──
  getLayouts(params = {}) {
    return api.get('/layouts/', { params })
  },

  getLayout(layoutId) {
    return api.get(`/layouts/${layoutId}/`)
  },

  createLayout(data) {
    // data: { code, name }
    return api.post('/layouts/', data)
  },

  updateLayout(layoutId, data) {
    return api.put(`/layouts/${layoutId}/`, data)
  },

  patchLayout(layoutId, data) {
    return api.patch(`/layouts/${layoutId}/`, data)
  },

  deleteLayout(layoutId) {
    // Falla si hay Templates activos apuntando a este layout (PROTECT).
    return api.delete(`/layouts/${layoutId}/`)
  },

  // ── LAYOUT FIELDS ──
  getLayoutFields(layoutId, params = {}) {
    return api.get(`/layouts/${layoutId}/fields/`, { params })
  },

  createLayoutField(layoutId, data) {
    // data: { name, sort_order }
    return api.post(`/layouts/${layoutId}/fields/`, data)
  },

  updateLayoutField(layoutId, fieldId, data) {
    return api.put(`/layouts/${layoutId}/fields/${fieldId}/`, data)
  },

  patchLayoutField(layoutId, fieldId, data) {
    return api.patch(`/layouts/${layoutId}/fields/${fieldId}/`, data)
  },

  deleteLayoutField(layoutId, fieldId) {
    // Falla si hay TemplateField apuntando a este campo (PROTECT).
    return api.delete(`/layouts/${layoutId}/fields/${fieldId}/`)
  },

  reorderLayoutFields(layoutId, orderedIds) {
    // orderedIds: [11, 10, 12] -> reasigna sort_order según la posición (1-indexed)
    return api.post(`/layouts/${layoutId}/fields/reorder/`, { order: orderedIds })
  },

}

export default layoutService