// src/services/normalization.js
import api from './api'

const normalization = {

  getRules(params = {}) {
    return api.get('/normalization-rules/', { params })
  },

  getRule(ruleId) {
    return api.get(`/normalization-rules/${ruleId}/`)
  },

  // data: { name, description, rule_type, config }
  createRule(data) {
    return api.post('/normalization-rules/', data)
  },

  updateRule(ruleId, data) {
    return api.put(`/normalization-rules/${ruleId}/`, data)
  },

  patchRule(ruleId, data) {
    return api.patch(`/normalization-rules/${ruleId}/`, data)
  },

  deleteRule(ruleId) {
    return api.delete(`/normalization-rules/${ruleId}/`)
  },

}

export default normalization