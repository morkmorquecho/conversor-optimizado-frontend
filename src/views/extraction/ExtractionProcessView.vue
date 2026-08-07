<script setup>
import { ref, computed, onMounted } from 'vue'
import { useRoute, RouterLink } from 'vue-router'
import catalogService from '../../services/catalogs'
import extractionService from '../../services/extraction'
import { downloadBlob, filenameFromContentDisposition } from '../../utils/downloadFile'

const route = useRoute()
const supplierId = route.params.supplierId
const templateId = route.params.templateId

const template = ref(null)
const catalogs = ref([])
const selectedCatalogId = ref('')
const file = ref(null)
const fileInputRef = ref(null)

const isLoadingContext = ref(true)
const loadError = ref(null)

const isProcessing = ref(false)
const processError = ref(null)
const lastDownloadedFilename = ref(null)

async function loadContext() {
  isLoadingContext.value = true
  loadError.value = null    
  try {
    const [templates, supplierCatalogs] = await Promise.all([
      catalogService.getSupplierTemplates(supplierId),
      catalogService.getSupplierCatalogsSummary(supplierId),
    ])

    template.value = templates.find((t) => String(t.id) === String(templateId)) || null
    catalogs.value = supplierCatalogs.filter((c) => c.is_active)

    if (catalogs.value.length === 1) {
      selectedCatalogId.value = catalogs.value[0].id
    }
  } catch (err) {
    loadError.value = err.message || 'No se pudo cargar la información necesaria.'
  } finally {
    isLoadingContext.value = false
  }
}

onMounted(loadContext)

function handleFileChange(event) {
  file.value = event.target.files[0] || null
}

const canSubmit = computed(
  () => Boolean(file.value) && Boolean(selectedCatalogId.value) && !isProcessing.value,
)

async function handleSubmit() {
  if (!canSubmit.value) return

  isProcessing.value = true
  processError.value = null
  lastDownloadedFilename.value = null

  try {
    const response = await extractionService.processInvoiceXlsx(
      file.value,
      templateId,
      selectedCatalogId.value,
    )

    const filename = filenameFromContentDisposition(
      response.headers['content-disposition'],
      'factura_procesada.xlsx',
    )
    downloadBlob(response.data, filename)
    lastDownloadedFilename.value = filename

    file.value = null
    if (fileInputRef.value) fileInputRef.value.value = ''
  } catch (err) {
    processError.value = err.message || 'No se pudo procesar el archivo.'
  } finally {
    isProcessing.value = false
  }
}
</script>

<template>
  <main class="process">
    <RouterLink :to="`/proveedores/${supplierId}`" class="back-link">
      ← Volver al proveedor
    </RouterLink>

    <p v-if="isLoadingContext" class="state">Cargando…</p>
    <p v-else-if="loadError" class="state state--error">{{ loadError }}</p>

    <template v-else-if="!template">
      <p class="state state--error">No se encontró el template solicitado.</p>
    </template>

    <template v-else>
      <header class="process__header">
        <h1 class="process__title">Procesar factura</h1>
        <p class="process__template">
          Template: <span class="process__template-name">{{ template.name }}</span>
          <span class="process__template-meta">
            {{ template.layout }} · {{ template.document_type.toUpperCase() }}
          </span>
        </p>
      </header>

      <form class="form" @submit.prevent="handleSubmit">
        <div class="field">
          <label class="field__label" for="catalog">Catálogo</label>
          <select id="catalog" v-model="selectedCatalogId" class="field__select" required>
            <option value="" disabled>Selecciona un catálogo</option>
            <option v-for="catalog in catalogs" :key="catalog.id" :value="catalog.id">
              {{ catalog.name }}
            </option>
          </select>
          <p v-if="catalogs.length === 0" class="field__hint field__hint--error">
            Este proveedor no tiene catálogos activos disponibles.
          </p>
        </div>

        <div class="field">
          <label class="field__label" for="file">Archivo de factura (Excel)</label>
          <input
            id="file"
            ref="fileInputRef"
            class="field__file"
            type="file"
            accept=".xlsx,.xls"
            required
            @change="handleFileChange"
          />
        </div>

        <p v-if="processError" class="state state--error">{{ processError }}</p>

        <p v-if="lastDownloadedFilename" class="state state--success">
          Archivo procesado y descargado: {{ lastDownloadedFilename }}
        </p>

        <button class="submit-btn" type="submit" :disabled="!canSubmit">
          {{ isProcessing ? 'Procesando…' : 'Procesar y descargar' }}
        </button>
      </form>
    </template>
  </main>
</template>

<style scoped>
.process {
  max-width: 480px;
  margin: 0 auto;
  padding: var(--space-8) var(--space-4) var(--space-12);
}

.back-link {
  display: inline-block;
  font-size: var(--text-sm);
  color: var(--color-gray-500);
  text-decoration: none;
  margin-bottom: var(--space-6);
}

.back-link:hover {
  color: var(--color-navy-700);
}

.state {
  text-align: center;
  color: var(--color-gray-500);
  font-size: var(--text-sm);
  padding: var(--space-6) 0;
}

.state--error {
  color: var(--color-danger);
}

.state--success {
  color: var(--color-navy-700);
  background: var(--color-navy-50);
  border-radius: var(--radius-sm);
  padding: var(--space-3);
}

.process__header {
  margin-bottom: var(--space-8);
  padding-bottom: var(--space-4);
  border-bottom: var(--border);
}

.process__title {
  font-size: var(--text-xl);
  font-weight: 600;
  color: var(--color-navy-900);
  margin: 0 0 var(--space-2);
}

.process__template {
  font-size: var(--text-sm);
  color: var(--color-gray-500);
  margin: 0;
}

.process__template-name {
  color: var(--color-gray-900);
  font-weight: 500;
}

.process__template-meta {
  font-family: var(--font-mono);
  font-size: var(--text-xs);
  margin-left: var(--space-2);
}

.form {
  display: flex;
  flex-direction: column;
  gap: var(--space-6);
}

.field {
  display: flex;
  flex-direction: column;
  gap: var(--space-2);
}

.field__label {
  font-size: var(--text-sm);
  font-weight: 500;
  color: var(--color-gray-900);
}

.field__select,
.field__file {
  font-family: var(--font-ui);
  font-size: var(--text-base);
  padding: var(--space-3);
  border: 1px solid var(--color-gray-300);
  border-radius: var(--radius-md);
  background: var(--color-white);
  color: var(--color-gray-900);
}

.field__select:focus,
.field__file:focus {
  outline: none;
  border-color: var(--color-navy-700);
  box-shadow: 0 0 0 3px var(--color-navy-50);
}

.field__hint {
  font-size: var(--text-xs);
  color: var(--color-gray-500);
}

.field__hint--error {
  color: var(--color-danger);
}

.submit-btn {
  padding: var(--space-3) var(--space-4);
  font-family: var(--font-ui);
  font-size: var(--text-base);
  font-weight: 500;
  color: var(--color-white);
  background: var(--color-navy-900);
  border: none;
  border-radius: var(--radius-md);
  cursor: pointer;
  transition: background var(--transition-fast);
}

.submit-btn:hover:not(:disabled) {
  background: var(--color-navy-700);
}

.submit-btn:disabled {
  background: var(--color-gray-300);
  cursor: not-allowed;
}
</style>