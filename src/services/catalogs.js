// src/services/catalogService.js
import api from './api'

const catalogService = {

  // ── DEDUPLICADO ──
  deduplicateExcel(supplierCatalog, file) {
    const formData = new FormData()
    formData.append('supplier_catalog', supplierCatalog)
    formData.append('file', file)
    return api.post('/catalogs/deduplicate/', formData, {
      responseType: 'blob', // devuelve un Excel descargable
    })
  },

  // ── SUPPLIERS ──
  async getSuppliers(params = {}) {
    const data = await api.get('/suppliers/', { params })
    return data.results
  },

  getSupplier(supplierId) {
    return api.get(`/suppliers/${supplierId}/`)
  },

  getSupplierCatalogsSummary(supplierId, params = {}) {
    return api.get(`/suppliers/${supplierId}/catalogs/`, { params })
  },

  getSupplierTemplates(supplierId, params = {}) {
    return api.get(`/suppliers/${supplierId}/templates/`, { params })
  },

  // ── SUPPLIER CATALOGS ──
  getCatalogs(supplierId, params = {}) {
    return api.get(`/suppliers/${supplierId}/catalogs/`, { params })
  },

  getCatalog(supplierId, catalogId) {
    return api.get(`/suppliers/${supplierId}/catalogs/${catalogId}/`)
  },

  // data: { name, pivot_field_name, columns: [{ source_name }] }
  createCatalog(supplierId, data) {
    return api.post(`/suppliers/${supplierId}/catalogs/`, data)
  },

  updateCatalog(supplierId, catalogId, data) {
    return api.put(`/suppliers/${supplierId}/catalogs/${catalogId}/`, data)
  },

  patchCatalog(supplierId, catalogId, data) {
    return api.patch(`/suppliers/${supplierId}/catalogs/${catalogId}/`, data)
  },

  deleteCatalog(supplierId, catalogId) {
    return api.delete(`/suppliers/${supplierId}/catalogs/${catalogId}/`)
  },

  // ── CATALOG ROWS ──
  getCatalogRows(supplierId, catalogId, params = {}) {
    return api.get(`/suppliers/${supplierId}/catalogs/${catalogId}/rows/`, { params })
  },

  getCatalogRow(supplierId, catalogId, rowId) {
    return api.get(`/suppliers/${supplierId}/catalogs/${catalogId}/rows/${rowId}/`)
  },

  createCatalogRow(supplierId, catalogId, data) {
    return api.post(`/suppliers/${supplierId}/catalogs/${catalogId}/rows/`, data)
  },

  updateCatalogRow(supplierId, catalogId, rowId, data) {
    return api.put(`/suppliers/${supplierId}/catalogs/${catalogId}/rows/${rowId}/`, data)
  },

  patchCatalogRow(supplierId, catalogId, rowId, data) {
    return api.patch(`/suppliers/${supplierId}/catalogs/${catalogId}/rows/${rowId}/`, data)
  },

  deleteCatalogRow(supplierId, catalogId, rowId) {
    return api.delete(`/suppliers/${supplierId}/catalogs/${catalogId}/rows/${rowId}/`)
  },

  uploadCatalogRows(supplierId, catalogId, file) {
    const formData = new FormData()
    formData.append('supplier_catalog', catalogId)
    formData.append('file', file)
    return api.post(
      `/suppliers/${supplierId}/catalogs/${catalogId}/rows/upload/`,
      formData,
    )
  },

}

export default catalogService