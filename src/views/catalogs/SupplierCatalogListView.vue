<script setup>
import { ref, onMounted } from 'vue'
import { useRoute, useRouter, RouterLink } from 'vue-router'
import catalogService from '../../services/catalogs'

const route = useRoute()
const router = useRouter()
const supplierId = route.params.supplierId

const supplier = ref(null)
const catalogs = ref([])

const isLoading = ref(true)
const loadError = ref(null)

const showCreateForm = ref(route.query.crear === '1')

const isCreating = ref(false)
const createError = ref(null)
const newCatalog = ref({ name: '', pivot_field_name: '' })
const newColumns = ref([''])

function addColumnField() {
  newColumns.value.push('')
}

function removeColumnField(index) {
  newColumns.value.splice(index, 1)
}

async function loadData() {
  isLoading.value = true
  loadError.value = null
  try {
    const [supplierData, catalogsData] = await Promise.all([
      catalogService.getSupplier(supplierId),
      catalogService.getCatalogs(supplierId),
    ])
    supplier.value = supplierData
    catalogs.value = catalogsData
  } catch (err) {
    loadError.value = err.message || 'No se pudieron cargar los catálogos.'
  } finally {
    isLoading.value = false
  }
}

onMounted(loadData)

function goToCatalog(catalogId) {
  router.push({ name: 'supplier-catalog-detail', params: { supplierId, catalogId } })
}

async function handleCreate() {
  isCreating.value = true
  createError.value = null
  try {
    const columns = newColumns.value
      .map((name) => name.trim())
      .filter(Boolean)
      .map((source_name) => ({ source_name }))

    await catalogService.createCatalog(supplierId, {
      name: newCatalog.value.name,
      pivot_field_name: newCatalog.value.pivot_field_name,
      columns,
    })

    newCatalog.value = { name: '', pivot_field_name: '' }
    newColumns.value = ['']
    showCreateForm.value = false
    await loadData()
  } catch (err) {
    createError.value = err
  } finally {
    isCreating.value = false
  }
}
</script>

<template>
  <main class="list">
    <RouterLink :to="`/proveedores/${supplierId}`" class="back-link">
      ← Volver al proveedor
    </RouterLink>

    <p v-if="isLoading" class="state">Cargando…</p>
    <p v-else-if="loadError" class="state state--error">{{ loadError }}</p>

    <template v-else>
      <header class="list__header">
        <div>
          <h1 class="list__title">Catálogos</h1>
          <p v-if="supplier" class="list__subtitle">{{ supplier.name }}</p>
        </div>
        <button class="btn btn--primary" type="button" @click="showCreateForm = !showCreateForm">
          {{ showCreateForm ? 'Cancelar' : '+ Nuevo catálogo' }}
        </button>
      </header>

      <div v-if="showCreateForm" class="create-panel">
        <form class="create-form" @submit.prevent="handleCreate">
          <div class="field">
            <label class="field__label" for="name">Nombre</label>
            <input
              id="name"
              v-model="newCatalog.name"
              class="field__input"
              type="text"
              placeholder="Catálogo de Fracciones Suzuki"
              required
            />
          </div>

          <div class="field">
            <label class="field__label" for="pivot">Columna pivote</label>
            <input
              id="pivot"
              v-model="newCatalog.pivot_field_name"
              class="field__input field__input--mono"
              type="text"
              placeholder="PART"
              required
            />
            <p class="field__hint">Nombre de la columna en el archivo fuente usada como llave.</p>
          </div>

          <div class="field">
            <label class="field__label">Columnas a extraer</label>
            <p class="field__hint">
              Solo estas columnas se guardarán al cargar un Excel más adelante — el resto del
              archivo se ignora.
            </p>

            <div class="column-row" v-for="(col, index) in newColumns" :key="index">
              <input
                v-model="newColumns[index]"
                class="field__input field__input--mono"
                type="text"
                placeholder="FraccionTIGIE"
              />
              <button
                v-if="newColumns.length > 1"
                class="column-row__remove"
                type="button"
                title="Quitar columna"
                @click="removeColumnField(index)"
              >
                ✕
              </button>
            </div>

            <button class="btn btn--secondary" type="button" @click="addColumnField">
              + Agregar columna
            </button>
          </div>

          <p v-if="createError" class="state state--error">
            {{ createError.message }}
            <span v-if="createError.type === 'field_errors'">
              — {{ Object.values(createError.context).flat().join(' ') }}
            </span>
          </p>

          <button class="btn btn--primary" type="submit" :disabled="isCreating">
            {{ isCreating ? 'Creando…' : 'Crear catálogo' }}
          </button>
        </form>
      </div>

      <p v-if="catalogs.length === 0" class="state">
        Este proveedor todavía no tiene catálogos.
      </p>

      <ul v-else class="catalog-list">
        <li v-for="catalog in catalogs" :key="catalog.id">
          <button
            class="catalog-card"
            :class="{ 'catalog-card--inactive': !catalog.is_active }"
            type="button"
            @click="goToCatalog(catalog.id)"
          >
            <span class="catalog-card__main">
              <span class="catalog-card__name">{{ catalog.name }}</span>
              <span class="catalog-card__meta">
                pivote: {{ catalog.pivot_field_name }} ·
                {{ catalog.rows_count.toLocaleString('es-MX') }} filas
              </span>
            </span>
            <span
              class="status-badge"
              :class="catalog.is_active ? 'status-badge--active' : 'status-badge--inactive'"
            >
              {{ catalog.is_active ? 'Activo' : 'Inactivo' }}
            </span>
          </button>
        </li>
      </ul>
    </template>
  </main>
</template>

<style scoped>
.list {
  max-width: 640px;
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
  text-align: left;
}

.list__header {
  display: flex;
  align-items: flex-start;
  justify-content: space-between;
  gap: var(--space-4);
  margin-bottom: var(--space-6);
  padding-bottom: var(--space-4);
  border-bottom: var(--border);
}

.list__title {
  font-size: var(--text-xl);
  font-weight: 600;
  color: var(--color-navy-900);
  margin: 0;
}

.list__subtitle {
  font-size: var(--text-sm);
  color: var(--color-gray-500);
  margin: var(--space-1) 0 0;
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
  align-self: flex-start;
}

.btn--secondary:hover {
  background: var(--color-gray-200);
}

.create-panel {
  display: flex;
  flex-direction: column;
  gap: var(--space-4);
  padding: var(--space-4);
  margin-bottom: var(--space-6);
  background: var(--color-navy-50);
  border-radius: var(--radius-md);
}

.column-row {
  display: flex;
  align-items: center;
  gap: var(--space-2);
  margin-bottom: var(--space-2);
}

.column-row .field__input {
  flex: 1;
}

.column-row__remove {
  flex-shrink: 0;
  width: 32px;
  height: 32px;
  display: flex;
  align-items: center;
  justify-content: center;
  background: none;
  border: none;
  color: var(--color-gray-500);
  cursor: pointer;
  border-radius: var(--radius-sm);
}

.column-row__remove:hover {
  color: var(--color-danger);
  background: var(--color-danger-bg);
}

.create-form {
  display: flex;
  flex-direction: column;
  gap: var(--space-4);
}

.field__hint--block {
  background: var(--color-white);
  border-radius: var(--radius-sm);
  padding: var(--space-2) var(--space-3);
  margin: 0;
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
  box-shadow: 0 0 0 3px var(--color-white);
}

.field__hint {
  font-size: var(--text-xs);
  color: var(--color-gray-500);
  margin: 0;
}

.catalog-list {
  list-style: none;
  margin: 0;
  padding: 0;
  display: flex;
  flex-direction: column;
  gap: var(--space-2);
}

.catalog-card {
  width: 100%;
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: var(--space-4);
  padding: var(--space-4);
  background: var(--color-white);
  border: 1px solid var(--color-gray-200);
  border-radius: var(--radius-md);
  cursor: pointer;
  text-align: left;
  font-family: var(--font-ui);
  transition: border-color var(--transition-fast), background var(--transition-fast);
}

.catalog-card:hover {
  border-color: var(--color-navy-700);
  background: var(--color-navy-50);
}

.catalog-card--inactive {
  opacity: 0.6;
}

.catalog-card__main {
  display: flex;
  flex-direction: column;
  gap: 2px;
  min-width: 0;
}

.catalog-card__name {
  font-size: var(--text-base);
  font-weight: 500;
  color: var(--color-gray-900);
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
}

.catalog-card__meta {
  font-family: var(--font-mono);
  font-size: var(--text-xs);
  color: var(--color-gray-500);
}

.status-badge {
  flex-shrink: 0;
  font-size: var(--text-xs);
  font-weight: 500;
  padding: 2px 8px;
  border-radius: var(--radius-sm);
  white-space: nowrap;
}

.status-badge--active {
  color: var(--color-navy-700);
  background: var(--color-navy-50);
}

.status-badge--inactive {
  color: var(--color-gray-500);
  background: var(--color-gray-200);
}
</style>