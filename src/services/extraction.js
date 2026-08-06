// src/services/extractionService.js
import api from './api'

const extractionService = {

  // ── PROCESAMIENTO ──
  processInvoiceXlsx(file, templateId, supplierCatalogId) {
    const formData = new FormData()
    formData.append('file', file)
    formData.append('template_id', templateId)
    if (supplierCatalogId) formData.append('supplier_catalog_id', supplierCatalogId)
    return api.post('/extractions/process-xlsx/', formData, {
      responseType: 'blob', // devuelve un Excel descargable
    })
  },

}

export default extractionService