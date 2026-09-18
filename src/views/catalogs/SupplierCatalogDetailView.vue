<script setup>
import { computed, ref, onMounted } from 'vue'
import { useRoute, useRouter, RouterLink } from 'vue-router'
import catalogService from '../../services/catalogs'
import layoutService from '@/services/layouts'

const route = useRoute()
const router = useRouter()
const supplierId = route.params.supplierId
const catalogId = route.params.catalogId

const catalog = ref(null)
const form = ref({ name: '', pivot_field_name: '', is_active: true })

// ── nuevo: mapeo a layouts ──
const layouts = ref([])
const columnLayoutFields = ref([])

const showMappingForm = ref(false)
const editingMapping = ref(null)
const mappingForm = ref({ layout: '', column: '', layout_field: '' })
const isSavingMapping = ref(false)
const mappingError = ref(null)

const isLoading = ref(true)
const loadError = ref(null)

const isSaving = ref(false)
const saveError = ref(null)
const saveSuccess = ref(false)

const isDeleting = ref(false)
const deleteError = ref(null)
const showDeleteConfirm = ref(false)

async function fetchAll(fetcher) {
  let page = 1
  let all = []
  let hasNext = true
  while (hasNext) {
    const { results, next } = await fetcher({ page })
    all = all.concat(results)
    hasNext = Boolean(next)
    page += 1
  }
  return all
}

async function loadColumnLayoutFields() {
  columnLayoutFields.value = await fetchAll((params) =>
    catalogService.getColumnLayoutFields(supplierId, catalogId, params),
  )
}

// Agrupa los mapeos existentes por layout, para mostrarlos como en
// "Reglas de normalización" de TemplateDetail.
const mappingsByLayout = computed(() => {
  const groups = new Map()
  for (const mapping of columnLayoutFields.value) {
    if (!groups.has(mapping.layout_id)) {
      const layout = layouts.value.find((l) => l.id === mapping.layout_id)
      groups.set(mapping.layout_id, {
        layout_id: mapping.layout_id,
        layout_code: layout ? layout.code : mapping.layout_code,
        mappings: [],
      })
    }
    groups.get(mapping.layout_id).mappings.push(mapping)
  }
  return Array.from(groups.values())
})

// LayoutFields del layout elegido en el form (para no importar todos los
// layouts de una, se piden on-demand al cambiar el select).
const selectedLayoutFields = ref([])

async function handleMappingLayoutChange() {
  mappingForm.value.column = ''
  mappingForm.value.layout_field = ''
  selectedLayoutFields.value = []
  if (!mappingForm.value.layout) return
  const layout = await layoutService.getLayout(mappingForm.value.layout)
  selectedLayoutFields.value = layout.layout_fields || []
}

// Columnas del catálogo que todavía no tienen mapeo para el layout elegido
// (salvo la que se está editando, que debe seguir apareciendo).
const availableColumnsForMapping = computed(() => {
  if (!catalog.value) return []
  const mappedColumnIds = new Set(
    columnLayoutFields.value
      .filter((m) => m.layout_id === Number(mappingForm.value.layout))
      .filter((m) => !editingMapping.value || m.id !== editingMapping.value.id)
      .map((m) => m.column),
  )
  return catalog.value.columns.filter((c) => !mappedColumnIds.has(c.id))
})

async function loadCatalog() {
  isLoading.value = true
  loadError.value = null
  try {
    const [data, layoutsData] = await Promise.all([
      catalogService.getCatalog(supplierId, catalogId),
      fetchAll((params) => layoutService.getLayouts(params)),
    ])
    catalog.value = data
    layouts.value = layoutsData
    form.value = {
      name: data.name,
      pivot_field_name: data.pivot_field_name,
      is_active: data.is_active,
    }
    await loadColumnLayoutFields()
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


function openCreateMapping() {
  mappingError.value = null
  editingMapping.value = null
  mappingForm.value = { layout: '', column: '', layout_field: '' }
  selectedLayoutFields.value = []
  showMappingForm.value = true
}

async function openEditMapping(mapping) {
  mappingError.value = null
  editingMapping.value = mapping
  mappingForm.value = {
    layout: mapping.layout_id,
    column: mapping.column,
    layout_field: mapping.layout_field,
  }
  showMappingForm.value = true
  const layout = await layoutService.getLayout(mapping.layout_id)
  selectedLayoutFields.value = layout.layout_fields || []
}

function closeMappingForm() {
  showMappingForm.value = false
  editingMapping.value = null
  mappingForm.value = { layout: '', column: '', layout_field: '' }
  selectedLayoutFields.value = []
}

async function handleSaveMapping() {
  isSavingMapping.value = true
  mappingError.value = null

  const columnId = Number(mappingForm.value.column)
  const layoutFieldId = Number(mappingForm.value.layout_field)

  if (!mappingForm.value.column || Number.isNaN(columnId)) {
    mappingError.value = { message: 'Selecciona una columna del catálogo.' }
    isSavingMapping.value = false
    return
  }
  if (!mappingForm.value.layout_field || Number.isNaN(layoutFieldId)) {
    mappingError.value = { message: 'Selecciona un campo del layout.' }
    isSavingMapping.value = false
    return
  }

  const data = { column: columnId, layout_field: layoutFieldId }
  console.log('mappingForm al submit:', JSON.stringify(mappingForm.value))
  try {
    if (editingMapping.value) {
      await catalogService.updateColumnLayoutField(
        supplierId, catalogId, editingMapping.value.id, data,
      )
    } else {
      await catalogService.createColumnLayoutField(supplierId, catalogId, data)
    }
    await loadColumnLayoutFields()
    closeMappingForm()
  } catch (err) {
    mappingError.value = err
  } finally {
    isSavingMapping.value = false
  }
}

async function handleDeleteMapping(mapping) {
  mappingError.value = null
  try {
    await catalogService.deleteColumnLayoutField(supplierId, catalogId, mapping.id)
    await loadColumnLayoutFields()
  } catch (err) {
    mappingError.value = err
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

      
      
      <!-- ── MAPEO A LAYOUTS ── -->
      <section class="section">
        <div class="section__header">
          <div>
            <h2 class="section__title">Mapeo a layouts</h2>
            <p class="section__hint">
              Define a qué campo del layout corresponde cada columna de este catálogo.
              Se usa cuando un template pivotea este catálogo para resolver esos campos
              sin extraerlos del documento.
            </p>
          </div>
          <button
            v-if="!showMappingForm"
            class="btn btn--secondary"
            type="button"
            :disabled="catalog.columns.length === 0 || layouts.length === 0"
            @click="openCreateMapping"
          >
            + Agregar mapeo
          </button>
        </div>

        <p v-if="mappingError" class="state state--error">
          {{ mappingError.message }}
          <span v-if="mappingError.type === 'field_errors'">
            — {{ Object.values(mappingError.context).flat().join(' ') }}
          </span>
        </p>

        <p v-if="mappingsByLayout.length === 0 && !showMappingForm" class="state">
          Este catálogo todavía no tiene mapeos a ningún layout.
        </p>

        <div v-for="group in mappingsByLayout" :key="group.layout_id" class="rule-group">
          <h3 class="rule-group__title">{{ group.layout_code }}</h3>
          <ul class="field-list">
            <li v-for="mapping in group.mappings" :key="mapping.id" class="field-row">
              <div class="field-row__content">
                <span class="field-row__name">{{ mapping.layout_field_name }}</span>
                <span class="field-row__source">← columna "{{ mapping.column_source_name }}"</span>
              </div>
              <span class="field-row__actions">
                <button class="icon-btn" type="button" title="Editar" @click="openEditMapping(mapping)">
                  ✎
                </button>
                <button
                  class="icon-btn icon-btn--danger"
                  type="button"
                  title="Quitar mapeo"
                  @click="handleDeleteMapping(mapping)"
                >
                  ✕
                </button>
              </span>
            </li>
          </ul>
        </div>

        <form v-if="showMappingForm" class="field-form" @submit.prevent="handleSaveMapping">
          <div class="field">
            <label class="field__label" for="mapping_layout">Layout</label>
            <select
              id="mapping_layout"
              v-model="mappingForm.layout"
              class="field__input"
              :disabled="Boolean(editingMapping)"
              required
              @change="handleMappingLayoutChange"
            >
              <option disabled value="">Selecciona un layout</option>
              <option v-for="layout in layouts" :key="layout.id" :value="layout.id">
                {{ layout.name }} ({{ layout.code }})
              </option>
            </select>
          </div>

          <div class="field">
            <label class="field__label" for="mapping_column">Columna del catálogo</label>
            <select
              id="mapping_column"
              v-model="mappingForm.column"
              class="field__input"
              :disabled="!mappingForm.layout"
              required
            >
              <option disabled value="">Selecciona una columna</option>
              <option v-for="col in availableColumnsForMapping" :key="col.id" :value="col.id">
                {{ col.source_name }}
              </option>
            </select>
          </div>

          <div class="field">
            <label class="field__label" for="mapping_layout_field">Campo destino</label>
            <select
              id="mapping_layout_field"
              v-model="mappingForm.layout_field"
              class="field__input"
              :disabled="!mappingForm.layout"
              required
            >
              <option disabled value="">Selecciona un campo del layout</option>
              <option v-for="lf in selectedLayoutFields" :key="lf.id" :value="lf.id">
                {{ lf.name }}
              </option>
            </select>
          </div>

          <div class="confirm-row">
            <button class="btn btn--secondary" type="submit" :disabled="isSavingMapping">
              {{ isSavingMapping ? 'Guardando…' : editingMapping ? 'Guardar mapeo' : '+ Agregar mapeo' }}
            </button>
            <button class="btn btn--plain" type="button" @click="closeMappingForm">Cancelar</button>
          </div>
        </form>
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