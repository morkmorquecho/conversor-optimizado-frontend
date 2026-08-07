<script setup>
import { ref, onMounted } from 'vue'
import { useRoute, useRouter, RouterLink } from 'vue-router'
import catalogService from '../../services/catalogs'

const route = useRoute()
const router = useRouter()
const supplierId = route.params.supplierId
const catalogId = route.params.catalogId

const catalog = ref(null)
const form = ref({ name: '', pivot_field_name: '', is_active: true })

const isLoading = ref(true)
const loadError = ref(null)

const isSaving = ref(false)
const saveError = ref(null)
const saveSuccess = ref(false)

const isDeleting = ref(false)
const deleteError = ref(null)
const showDeleteConfirm = ref(false)

async function loadCatalog() {
  isLoading.value = true
  loadError.value = null
  try {
    const data = await catalogService.getCatalog(supplierId, catalogId)
    catalog.value = data
    form.value = {
      name: data.name,
      pivot_field_name: data.pivot_field_name,
      is_active: data.is_active,
    }
  } catch (err) {
    loadError.value = err.message || 'No se pudo cargar el catálogo.'
  } finally {
    isLoading.value = false
  }
}

onMounted(loadCatalog)

async function handleSave() {
  isSaving.value = true
  saveError.value = null
  saveSuccess.value = false
  try {
    const updated = await catalogService.patchCatalog(supplierId, catalogId, form.value)
    catalog.value = updated
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
    await catalogService.deleteCatalog(supplierId, catalogId)
    router.push({ name: 'supplier-catalog-list', params: { supplierId } })
  } catch (err) {
    deleteError.value = err.message || 'No se pudo eliminar el catálogo.'
    isDeleting.value = false
  }
}
</script>

<template>
  <main class="detail">
    <RouterLink :to="`/proveedores/${supplierId}/catalogos`" class="back-link">
      ← Volver a catálogos
    </RouterLink>

    <p v-if="isLoading" class="state">Cargando…</p>
    <p v-else-if="loadError" class="state state--error">{{ loadError }}</p>

    <template v-else-if="catalog">
      <header class="detail__header">
        <h1 class="detail__title">{{ catalog.name }}</h1>
        <RouterLink
          :to="`/proveedores/${supplierId}/catalogos/${catalogId}/filas`"
          class="btn btn--secondary"
        >
          Ver filas
        </RouterLink>
      </header>

      <!-- ── EDITAR ── -->
      <section class="section">
        <h2 class="section__title">Editar catálogo</h2>

        <form class="form" @submit.prevent="handleSave">
          <div class="field">
            <label class="field__label" for="name">Nombre</label>
            <input id="name" v-model="form.name" class="field__input" type="text" required />
          </div>

          <div class="field">
            <label class="field__label" for="pivot">Columna pivote</label>
            <input
              id="pivot"
              v-model="form.pivot_field_name"
              class="field__input field__input--mono"
              type="text"
              required
            />
          </div>

          <label class="checkbox-field">
            <input v-model="form.is_active" type="checkbox" />
            Catálogo activo
          </label>

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
      </section>

      <!-- ── COLUMNAS (solo lectura) ── -->
      <section class="section">
        <h2 class="section__title">Columnas configuradas</h2>
        <p class="section__hint">
          Se generan automáticamente a partir del archivo cargado en el catálogo.
        </p>

        <p v-if="catalog.columns.length === 0" class="state">
          Este catálogo todavía no tiene columnas configuradas.
        </p>
        <ul v-else class="column-list">
          <li v-for="column in catalog.columns" :key="column.id" class="column-chip">
            {{ column.source_name }}
          </li>
        </ul>
      </section>

      <!-- ── ELIMINAR ── -->
      <section class="section section--danger">
        <h2 class="section__title">Eliminar catálogo</h2>
        <p class="section__hint">
          El catálogo y sus filas dejan de mostrarse en los listados, pero no se borran
          físicamente.
        </p>

        <p v-if="deleteError" class="state state--error">{{ deleteError }}</p>

        <button
          v-if="!showDeleteConfirm"
          class="btn btn--danger"
          type="button"
          @click="showDeleteConfirm = true"
        >
          Eliminar catálogo
        </button>
        <div v-else class="confirm-row">
          <span class="confirm-row__text">¿Seguro? Esta acción no se puede deshacer.</span>
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
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: var(--space-4);
  margin-bottom: var(--space-8);
  padding-bottom: var(--space-4);
  border-bottom: var(--border);
}

.detail__title {
  font-size: var(--text-xl);
  font-weight: 600;
  color: var(--color-navy-900);
  margin: 0;
}

.section {
  margin-bottom: var(--space-8);
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
  color: var(--color-navy-900);
  margin: 0 0 var(--space-1);
}

.section--danger .section__title {
  color: var(--color-danger);
}

.section__hint {
  font-size: var(--text-sm);
  color: var(--color-gray-500);
  margin: 0 0 var(--space-4);
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

.checkbox-field {
  display: flex;
  align-items: center;
  gap: var(--space-2);
  font-size: var(--text-sm);
  color: var(--color-gray-900);
  cursor: pointer;
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
  text-decoration: none;
  display: inline-block;
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

.column-list {
  list-style: none;
  margin: 0;
  padding: 0;
  display: flex;
  flex-wrap: wrap;
  gap: var(--space-2);
}

.column-chip {
  font-family: var(--font-mono);
  font-size: var(--text-xs);
  color: var(--color-gray-900);
  background: var(--color-navy-50);
  border-radius: var(--radius-sm);
  padding: var(--space-1) var(--space-2);
}
</style>