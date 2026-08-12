<script setup>
import { ref, onMounted } from 'vue'
import { useRoute, RouterLink } from 'vue-router'
import catalogService from '../../services/catalogs'
import { downloadBlob, filenameFromContentDisposition } from '../../utils/downloadFile'

const route = useRoute()
const supplierId = route.params.supplierId
const catalogId = route.params.catalogId

const catalog = ref(null)
const isLoadingCatalog = ref(true)
const loadError = ref(null)

// ── PASO 1: deduplicar ──
const dedupeFile = ref(null)
const dedupeFileInputRef = ref(null)
const isDeduping = ref(false)
const dedupeError = ref(null)
const dedupeResult = ref(null) // { filename, removed }

// ── PASO 2: cargar (reemplaza filas) ──
const file = ref(null)
const fileInputRef = ref(null)
const confirmedReplace = ref(false)

const isUploading = ref(false)
const uploadError = ref(null)
const uploadResult = ref(null)

async function loadCatalog() {
  isLoadingCatalog.value = true
  loadError.value = null
  try {
    catalog.value = await catalogService.getCatalog(supplierId, catalogId)
  } catch (err) {
    loadError.value = err.message || 'No se pudo cargar el catálogo.'
  } finally {
    isLoadingCatalog.value = false
  }
}

onMounted(loadCatalog)

function handleDedupeFileChange(event) {
  dedupeFile.value = event.target.files[0] || null
  dedupeResult.value = null
  dedupeError.value = null
}

async function handleDeduplicate() {
  if (!dedupeFile.value) return

  isDeduping.value = true
  dedupeError.value = null
  dedupeResult.value = null

  try {
    const response = await catalogService.deduplicateExcel(catalogId, dedupeFile.value)
    const filename = filenameFromContentDisposition(
      response.headers['content-disposition'],
      'catalogo_sin_duplicados.xlsx',
    )
    const removed = Number(response.headers['x-duplicates-removed'] ?? 0)

    downloadBlob(response.data, filename)
    dedupeResult.value = { filename, removed }
  } catch (err) {
    dedupeError.value = errorText(err)
  } finally {
    isDeduping.value = false
  }
}

function handleFileChange(event) {
  file.value = event.target.files[0] || null
  uploadResult.value = null
  uploadError.value = null
}

// Los mensajes de este endpoint a veces llegan anidados en context.detail
// en vez de context directo — probamos ambas formas antes de caer al genérico.
function errorText(err) {
  if (!err) return ''
  const detail = err.context?.detail
  if (Array.isArray(detail)) return detail.join(' ')
  if (typeof detail === 'string') return detail
  if (err.context && typeof err.context === 'object' && Object.keys(err.context).length > 0) {
    return Object.values(err.context).flat().join(' ')
  }
  return err.message || 'No se pudo procesar el archivo.'
}

async function handleUpload() {
  if (!file.value || !confirmedReplace.value) return

  isUploading.value = true
  uploadError.value = null
  uploadResult.value = null

  try {
    const result = await catalogService.uploadCatalogRows(supplierId, catalogId, file.value)
    uploadResult.value = result
    file.value = null
    confirmedReplace.value = false
    if (fileInputRef.value) fileInputRef.value.value = ''
  } catch (err) {
    uploadError.value = errorText(err)
  } finally {
    isUploading.value = false
  }
}
</script>

<template>
  <main class="upload">
    <RouterLink :to="`/proveedores/${supplierId}/catalogos/${catalogId}`" class="back-link">
      ← Volver al catálogo
    </RouterLink>

    <p v-if="isLoadingCatalog" class="state">Cargando…</p>
    <p v-else-if="loadError" class="state state--error">{{ loadError }}</p>

    <template v-else-if="catalog">
      <header class="upload__header">
        <h1 class="upload__title">Cargar filas desde Excel</h1>
        <p class="upload__subtitle">{{ catalog.name }}</p>
      </header>

      <!-- ── PASO 1: DEDUPLICAR ── -->
      <section class="step">
        <div class="step__heading">
          <span class="step__number">1</span>
          <div>
            <h2 class="step__title">Eliminar duplicados (opcional, recomendado)</h2>
            <p class="step__hint">
              Limpia filas vacías y valores repetidos de
              <code>{{ catalog.pivot_field_name }}</code>
              antes de cargar. Se descarga un Excel listo para el paso 2.
            </p>
          </div>
        </div>

        <form class="form" @submit.prevent="handleDeduplicate">
          <div class="field">
            <label class="field__label" for="dedupe-file">Archivo Excel original</label>
            <input
              id="dedupe-file"
              ref="dedupeFileInputRef"
              class="field__file"
              type="file"
              accept=".xlsx,.xls"
              required
              @change="handleDedupeFileChange"
            />
          </div>

          <p v-if="dedupeError" class="state state--error">{{ dedupeError }}</p>
          <p v-if="dedupeResult" class="state state--success">
            {{ dedupeResult.removed }} duplicado{{ dedupeResult.removed === 1 ? '' : 's' }}
            eliminado{{ dedupeResult.removed === 1 ? '' : 's' }}. Se descargó
            <strong>{{ dedupeResult.filename }}</strong> — úsalo en el paso 2.
          </p>

          <button class="btn btn--secondary" type="submit" :disabled="!dedupeFile || isDeduping">
            {{ isDeduping ? 'Procesando…' : 'Eliminar duplicados y descargar' }}
          </button>
        </form>
      </section>

      <!-- ── PASO 2: CARGAR (REEMPLAZA) ── -->
      <section class="step">
        <div class="step__heading">
          <span class="step__number">2</span>
          <div>
            <h2 class="step__title">Cargar archivo final</h2>
            <p class="step__hint">Reemplaza por completo las filas actuales del catálogo.</p>
          </div>
        </div>

        <div class="warning-box">
          <strong>Esta acción reemplaza por completo las filas actuales.</strong>
          Se eliminan todas las filas existentes del catálogo y se insertan las del archivo
          que subas. No se puede deshacer.
        </div>

        <section class="requirements">
          <h2 class="requirements__title">El archivo debe incluir</h2>
          <ul class="requirements__list">
            <li>
              La columna pivote: <code>{{ catalog.pivot_field_name }}</code>, con valores
              únicos.
            </li>
            <li v-if="catalog.columns.length > 0">
              Todas las columnas configuradas:
              <span class="column-chip" v-for="col in catalog.columns" :key="col.id">
                {{ col.source_name }}
              </span>
            </li>
          </ul>
        </section>

        <form class="form" @submit.prevent="handleUpload">
          <div class="field">
            <label class="field__label" for="file">Archivo Excel</label>
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

          <label class="checkbox-field">
            <input v-model="confirmedReplace" type="checkbox" />
            Entiendo que esto reemplaza todas las filas actuales del catálogo.
          </label>

          <p v-if="uploadError" class="state state--error">{{ uploadError }}</p>
          <p v-if="uploadResult" class="state state--success">
            {{ uploadResult.created?.toLocaleString('es-MX') ?? '—' }} filas cargadas
            correctamente.
          </p>

          <button
            class="btn btn--danger"
            type="submit"
            :disabled="!file || !confirmedReplace || isUploading"
          >
            {{ isUploading ? 'Cargando…' : 'Reemplazar filas' }}
          </button>
        </form>
      </section>
    </template>
  </main>
</template>

<style scoped>
.upload {
  max-width: 560px;
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
  color: var(--color-gray-500);
  font-size: var(--text-sm);
  padding: var(--space-4) 0;
}

.state--error {
  color: var(--color-danger);
}

.state--success {
  color: var(--color-navy-700);
}

.upload__header {
  margin-bottom: var(--space-6);
  padding-bottom: var(--space-4);
  border-bottom: var(--border);
}

.upload__title {
  font-size: var(--text-xl);
  font-weight: 600;
  color: var(--color-navy-900);
  margin: 0;
}

.upload__subtitle {
  font-size: var(--text-sm);
  color: var(--color-gray-500);
  margin: var(--space-1) 0 0;
}

.step {
  margin-bottom: var(--space-8);
  padding-bottom: var(--space-8);
  border-bottom: var(--border);
}

.step:last-of-type {
  border-bottom: none;
  padding-bottom: 0;
}

.step__heading {
  display: flex;
  align-items: flex-start;
  gap: var(--space-3);
  margin-bottom: var(--space-4);
}

.step__number {
  flex-shrink: 0;
  display: flex;
  align-items: center;
  justify-content: center;
  width: 24px;
  height: 24px;
  border-radius: 50%;
  background: var(--color-navy-900);
  color: var(--color-white);
  font-size: var(--text-xs);
  font-weight: 600;
}

.step__title {
  font-size: var(--text-base);
  font-weight: 600;
  color: var(--color-navy-900);
  margin: 0 0 var(--space-1);
}

.step__hint {
  font-size: var(--text-sm);
  color: var(--color-gray-500);
  margin: 0;
  line-height: 1.5;
}

.step__hint code {
  font-family: var(--font-mono);
  background: var(--color-navy-50);
  padding: 1px 6px;
  border-radius: var(--radius-sm);
}

.btn--secondary {
  padding: var(--space-2) var(--space-4);
  font-family: var(--font-ui);
  font-size: var(--text-sm);
  font-weight: 500;
  color: var(--color-navy-900);
  background: var(--color-navy-50);
  border: none;
  border-radius: var(--radius-md);
  cursor: pointer;
  align-self: flex-start;
  transition: background var(--transition-fast);
}

.btn--secondary:hover:not(:disabled) {
  background: var(--color-gray-200);
}

.btn--secondary:disabled {
  color: var(--color-gray-500);
  background: var(--color-gray-200);
  cursor: not-allowed;
}

.warning-box {
  font-size: var(--text-sm);
  color: var(--color-danger);
  background: var(--color-danger-bg);
  border-radius: var(--radius-md);
  padding: var(--space-4);
  margin-bottom: var(--space-6);
  line-height: 1.5;
}

.warning-box strong {
  display: block;
  margin-bottom: var(--space-1);
}

.requirements {
  margin-bottom: var(--space-6);
}

.requirements__title {
  font-size: var(--text-sm);
  font-weight: 600;
  color: var(--color-navy-900);
  margin: 0 0 var(--space-2);
}

.requirements__list {
  margin: 0;
  padding-left: var(--space-4);
  font-size: var(--text-sm);
  color: var(--color-gray-900);
  display: flex;
  flex-direction: column;
  gap: var(--space-2);
}

.requirements__list code {
  font-family: var(--font-mono);
  background: var(--color-navy-50);
  padding: 1px 6px;
  border-radius: var(--radius-sm);
}

.column-chip {
  display: inline-block;
  font-family: var(--font-mono);
  font-size: var(--text-xs);
  color: var(--color-gray-900);
  background: var(--color-navy-50);
  border-radius: var(--radius-sm);
  padding: var(--space-1) var(--space-2);
  margin: var(--space-1) var(--space-1) 0 0;
}

.form {
  display: flex;
  flex-direction: column;
  gap: var(--space-4);
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

.field__file {
  font-family: var(--font-ui);
  font-size: var(--text-base);
  padding: var(--space-3);
  border: 1px solid var(--color-gray-300);
  border-radius: var(--radius-md);
  background: var(--color-white);
  color: var(--color-gray-900);
}

.field__file:focus {
  outline: none;
  border-color: var(--color-navy-700);
  box-shadow: 0 0 0 3px var(--color-navy-50);
}

.checkbox-field {
  display: flex;
  align-items: flex-start;
  gap: var(--space-2);
  font-size: var(--text-sm);
  color: var(--color-gray-900);
  cursor: pointer;
  line-height: 1.4;
}

.checkbox-field input {
  margin-top: 3px;
}

.btn--danger {
  padding: var(--space-3) var(--space-4);
  font-family: var(--font-ui);
  font-size: var(--text-base);
  font-weight: 500;
  color: var(--color-white);
  background: var(--color-danger);
  border: none;
  border-radius: var(--radius-md);
  cursor: pointer;
  transition: opacity var(--transition-fast);
}

.btn--danger:hover:not(:disabled) {
  opacity: 0.9;
}

.btn--danger:disabled {
  background: var(--color-gray-300);
  cursor: not-allowed;
}
</style>