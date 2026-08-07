<script setup>
import { ref, onMounted } from 'vue'
import { useRoute, useRouter, RouterLink } from 'vue-router'
import catalogService from '../../services/catalogs'

const route = useRoute()
const router = useRouter()
const supplierId = route.params.supplierId
const catalogId = route.params.catalogId
const rowId = route.params.id

const catalog = ref(null)
const form = ref({ pivot_value: '', data: {} })

const isLoading = ref(true)
const loadError = ref(null)

const isSaving = ref(false)
const saveError = ref(null)
const saveSuccess = ref(false)

const isDeleting = ref(false)
const deleteError = ref(null)
const showDeleteConfirm = ref(false)

async function loadRow() {
  isLoading.value = true
  loadError.value = null
  try {
    const [catalogData, rowData] = await Promise.all([
      catalogService.getCatalog(supplierId, catalogId),
      catalogService.getCatalogRow(supplierId, catalogId, rowId),
    ])

    catalog.value = catalogData

    // Aseguramos una key en `data` por cada columna configurada, aunque
    // la fila no la tenga todavía (evita inputs "unbound" en el form).
    const data = {}
    for (const col of catalogData.columns) {
      data[col.source_name] = rowData.data?.[col.source_name] ?? ''
    }

    form.value = {
      pivot_value: rowData.pivot_value,
      data,
    }
  } catch (err) {
    loadError.value = err.message || 'No se pudo cargar la fila.'
  } finally {
    isLoading.value = false
  }
}

onMounted(loadRow)

async function handleSave() {
  isSaving.value = true
  saveError.value = null
  saveSuccess.value = false
  try {
    await catalogService.patchCatalogRow(supplierId, catalogId, rowId, form.value)
    saveSuccess.value = true
  } catch (err) {
    saveError.value = err
  } finally {
    isSaving.value = false
  }
}

async function handleDelete() {
  isDeleting.value = true
  deleteError.value = null
  try {
    await catalogService.deleteCatalogRow(supplierId, catalogId, rowId)
    router.push({ name: 'catalog-row-list', params: { supplierId, catalogId } })
  } catch (err) {
    deleteError.value = err.message || 'No se pudo eliminar la fila.'
    isDeleting.value = false
  }
}
</script>

<template>
  <main class="detail">
    <RouterLink :to="`/proveedores/${supplierId}/catalogos/${catalogId}/filas`" class="back-link">
      ← Volver a filas
    </RouterLink>

    <p v-if="isLoading" class="state">Cargando…</p>
    <p v-else-if="loadError" class="state state--error">{{ loadError }}</p>

    <template v-else-if="catalog">
      <header class="detail__header">
        <h1 class="detail__title">Fila #{{ rowId }}</h1>
        <p class="detail__subtitle">{{ catalog.name }}</p>
      </header>

      <form class="form" @submit.prevent="handleSave">
        <div class="field">
          <label class="field__label" for="pivot_value">
            {{ catalog.pivot_field_name }} (pivote)
          </label>
          <input
            id="pivot_value"
            v-model="form.pivot_value"
            class="field__input field__input--mono"
            type="text"
            required
          />
        </div>

        <div class="field" v-for="col in catalog.columns" :key="col.id">
          <label class="field__label" :for="`col-${col.id}`">{{ col.source_name }}</label>
          <input
            :id="`col-${col.id}`"
            v-model="form.data[col.source_name]"
            class="field__input"
            type="text"
          />
        </div>

        <p v-if="saveError" class="state state--error">
          {{ saveError.message }}
          <span v-if="saveError.type === 'field_errors'">
            — {{ Object.values(saveError.context).flat().join(' ') }}
          </span>
        </p>
        <p v-if="saveSuccess" class="state state--success">Cambios guardados.</p>

        <button class="btn btn--primary" type="submit" :disabled="isSaving">
          {{ isSaving ? 'Guardando…' : 'Guardar cambios' }}
        </button>
      </form>

      <section class="section section--danger">
        <h2 class="section__title">Eliminar fila</h2>
        <p class="section__hint">Esta acción no se puede deshacer.</p>

        <p v-if="deleteError" class="state state--error">{{ deleteError }}</p>

        <button
          v-if="!showDeleteConfirm"
          class="btn btn--danger"
          type="button"
          @click="showDeleteConfirm = true"
        >
          Eliminar fila
        </button>
        <div v-else class="confirm-row">
          <span class="confirm-row__text">¿Seguro?</span>
          <button class="btn btn--danger" type="button" :disabled="isDeleting" @click="handleDelete">
            {{ isDeleting ? 'Eliminando…' : 'Sí, eliminar' }}
          </button>
          <button class="btn btn--secondary" type="button" @click="showDeleteConfirm = false">
            Cancelar
          </button>
        </div>
      </section>
    </template>
  </main>
</template>

<style scoped>
.detail {
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

.detail__header {
  margin-bottom: var(--space-6);
  padding-bottom: var(--space-4);
  border-bottom: var(--border);
}

.detail__title {
  font-size: var(--text-xl);
  font-weight: 600;
  color: var(--color-navy-900);
  margin: 0;
}

.detail__subtitle {
  font-size: var(--text-sm);
  color: var(--color-gray-500);
  margin: var(--space-1) 0 0;
}

.form {
  display: flex;
  flex-direction: column;
  gap: var(--space-4);
  margin-bottom: var(--space-8);
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

.field__input {
  font-family: var(--font-ui);
  font-size: var(--text-base);
  padding: var(--space-3);
  border: 1px solid var(--color-gray-300);
  border-radius: var(--radius-md);
  background: var(--color-white);
  color: var(--color-gray-900);
}

.field__input--mono {
  font-family: var(--font-mono);
}

.field__input:focus {
  outline: none;
  border-color: var(--color-navy-700);
  box-shadow: 0 0 0 3px var(--color-navy-50);
}

.btn {
  padding: var(--space-2) var(--space-4);
  font-family: var(--font-ui);
  font-size: var(--text-sm);
  font-weight: 500;
  border-radius: var(--radius-md);
  border: none;
  cursor: pointer;
  white-space: nowrap;
  transition: background var(--transition-fast);
}

.btn--primary {
  color: var(--color-white);
  background: var(--color-navy-900);
}

.btn--primary:hover:not(:disabled) {
  background: var(--color-navy-700);
}

.btn--primary:disabled {
  background: var(--color-gray-300);
  cursor: not-allowed;
}

.btn--secondary {
  color: var(--color-navy-900);
  background: var(--color-navy-50);
}

.btn--secondary:hover {
  background: var(--color-gray-200);
}

.btn--danger {
  color: var(--color-white);
  background: var(--color-danger);
}

.btn--danger:hover:not(:disabled) {
  opacity: 0.9;
}

.btn--danger:disabled {
  opacity: 0.6;
  cursor: not-allowed;
}

.section--danger {
  padding: var(--space-4);
  border: 1px solid var(--color-danger-bg);
  border-radius: var(--radius-md);
  background: var(--color-danger-bg);
}

.section__title {
  font-size: var(--text-base);
  font-weight: 600;
  color: var(--color-danger);
  margin: 0 0 var(--space-1);
}

.section__hint {
  font-size: var(--text-sm);
  color: var(--color-gray-500);
  margin: 0 0 var(--space-4);
}

.confirm-row {
  display: flex;
  align-items: center;
  gap: var(--space-3);
  flex-wrap: wrap;
}

.confirm-row__text {
  font-size: var(--text-sm);
  color: var(--color-danger);
}
</style>