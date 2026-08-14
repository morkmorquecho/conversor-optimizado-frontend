// src/services/templates.js
import api from './api'

const templateService = {

  // ── TEMPLATES ──
  getTemplates(supplierId, params = {}) {
    return api.get(`/suppliers/${supplierId}/templates/`, { params })
  },

  getTemplate(supplierId, templateId) {
    return api.get(`/suppliers/${supplierId}/templates/${templateId}/`)
  },

  // data: { layout, name, document_type, is_active }
  createTemplate(supplierId, data) {
    return api.post(`/suppliers/${supplierId}/templates/`, data)
  },

  updateTemplate(supplierId, templateId, data) {
    return api.put(`/suppliers/${supplierId}/templates/${templateId}/`, data)
  },

  patchTemplate(supplierId, templateId, data) {
    return api.patch(`/suppliers/${supplierId}/templates/${templateId}/`, data)
  },

  deleteTemplate(supplierId, templateId) {
    return api.delete(`/suppliers/${supplierId}/templates/${templateId}/`)
  },

  // ── TEMPLATE FIELDS (mapeo layout_field <-> columna del archivo fuente) ──
  getTemplateFields(supplierId, templateId, params = {}) {
    return api.get(`/suppliers/${supplierId}/templates/${templateId}/fields/`, { params })
  },

  // data: { layout_field, source_field, extraction_type, worksheet, header_occurrence }
  createTemplateField(supplierId, templateId, data) {
    return api.post(`/suppliers/${supplierId}/templates/${templateId}/fields/`, data)
  },

  updateTemplateField(supplierId, templateId, fieldId, data) {
    return api.put(`/suppliers/${supplierId}/templates/${templateId}/fields/${fieldId}/`, data)
  },

  patchTemplateField(supplierId, templateId, fieldId, data) {
    return api.patch(`/suppliers/${supplierId}/templates/${templateId}/fields/${fieldId}/`, data)
  },

  deleteTemplateField(supplierId, templateId, fieldId) {
    return api.delete(`/suppliers/${supplierId}/templates/${templateId}/fields/${fieldId}/`)
  },

  // ── TEMPLATE FIELD RULES (cadena de NormalizationRule por campo) ──
  getTemplateFieldRules(supplierId, templateId, fieldId, params = {}) {
    return api.get(
      `/suppliers/${supplierId}/templates/${templateId}/fields/${fieldId}/rules/`,
      { params },
    )
  },

  // data: { normalization_rule, sort_order }
  createTemplateFieldRule(supplierId, templateId, fieldId, data) {
    return api.post(
      `/suppliers/${supplierId}/templates/${templateId}/fields/${fieldId}/rules/`,
      data,
    )
  },

  deleteTemplateFieldRule(supplierId, templateId, fieldId, ruleId) {
    return api.delete(
      `/suppliers/${supplierId}/templates/${templateId}/fields/${fieldId}/rules/${ruleId}/`,
    )
  },

  reorderTemplateFieldRules(supplierId, templateId, fieldId, orderedIds) {
    return api.post(
      `/suppliers/${supplierId}/templates/${templateId}/fields/${fieldId}/rules/reorder/`,
      { order: orderedIds },
    )
  },

}

export default templateService