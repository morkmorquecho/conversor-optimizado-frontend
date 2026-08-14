    <script setup>
import { ref, onMounted } from 'vue'
import { useRoute, useRouter, RouterLink } from 'vue-router'
import templateService from '../../services/templates'
import layoutService from '../../services/layouts'

const route = useRoute()
const router = useRouter()
const supplierId = route.params.supplierId

const supplier = ref(null)
const templates = ref([])
const layouts = ref([])

const isLoading = ref(true)
const loadError = ref(null)

const showCreateForm = ref(route.query.crear === '1')
const isCreating = ref(false)
const createError = ref(null)
const newTemplate = ref({ name: '', layout: '', document_type: 'xlsx' })

// Trae todas las páginas de un endpoint paginado (PageNumberPagination de DRF).
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

async function loadData() {
  isLoading.value = true
  loadError.value = null
  try {
    const [templatesData, layoutsData] = await Promise.all([
      fetchAll((params) => templateService.getTemplates(supplierId, params)),
      fetchAll((params) => layoutService.getLayouts(params)),
    ])
    templates.value = templatesData
    layouts.value = layoutsData
  } catch (err) {
    loadError.value = err.message || 'No se pudieron cargar los templates.'
  } finally {
    isLoading.value = false
  }
}

onMounted(loadData)

function goToTemplate(templateId) {
  router.push({ name: 'template-detail', params: { supplierId, templateId } })
}

async function handleCreate() {
  isCreating.value = true
  createError.value = null
  try {
    await templateService.createTemplate(supplierId, newTemplate.value)
    newTemplate.value = { name: '', layout: '', document_type: 'xlsx' }
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

    <header class="list__header">
      <h1 class="list__title">Templates</h1>
      <button class="btn btn--primary" type="button" @click="showCreateForm = !showCreateForm">
        {{ showCreateForm ? 'Cancelar' : '+ Nuevo template' }}
      </button>
    </header>

    <form v-if="showCreateForm" class="create-form" @submit.prevent="handleCreate">
      <div class="field">
        <label class="field__label" for="name">Nombre</label>
        <input
          id="name"
          v-model="newTemplate.name"
          class="field__input"
          type="text"
          placeholder="Factura estándar"
          required
        />
      </div>

      <div class="field">
        <label class="field__label" for="layout">Layout destino</label>
        <select id="layout" v-model="newTemplate.layout" class="field__input" required>
          <option value="" disabled>Selecciona un layout</option>
          <option v-for="layout in layouts" :key="layout.id" :value="layout.id">
            {{ layout.name }} ({{ layout.code }})
          </option>
        </select>
        <p v-if="layouts.length === 0" class="field__hint field__hint--error">
          No hay layouts creados todavía —
          <RouterLink to="/layouts">crea uno primero</RouterLink>.
        </p>
      </div>

      <div class="field">
        <label class="field__label" for="document_type">Tipo de documento</label>
        <select id="document_type" v-model="newTemplate.document_type" class="field__input">
          <option value="xlsx">XLSX</option>
          <option value="xml">XML</option>
        </select>
      </div>

      <p v-if="createError" class="state state--error">
        {{ createError.message }}
        <span v-if="createError.type === 'field_errors'">
          — {{ Object.values(createError.context).flat().join(' ') }}
        </span>
      </p>

      <button class="btn btn--primary" type="submit" :disabled="isCreating || layouts.length === 0">
        {{ isCreating ? 'Creando…' : 'Crear template' }}
      </button>
    </form>

    <p v-if="isLoading" class="state">Cargando…</p>
    <p v-else-if="loadError" class="state state--error">{{ loadError }}</p>
    <p v-else-if="templates.length === 0" class="state">
      Este proveedor todavía no tiene templates.
    </p>

    <ul v-else class="template-list">
      <li v-for="template in templates" :key="template.id">
        <button
          class="template-card"
          :class="{ 'template-card--inactive': !template.is_active }"
          type="button"
          @click="goToTemplate(template.id)"
        >
          <span class="template-card__main">
            <span class="template-card__name">{{ template.name }}</span>
            <span class="template-card__meta">
              {{ template.layout_code }} · {{ template.document_type.toUpperCase() }}
            </span>
          </span>
          <span
            class="status-badge"
            :class="template.is_active ? 'status-badge--active' : 'status-badge--inactive'"
          >
            {{ template.is_active ? 'Activo' : 'Inactivo' }}
          </span>
        </button>
      </li>
    </ul>
  </main>
</template>

<style scoped>
.list {
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

.list__header {
  display: flex;
  align-items: center;
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

.create-form {
  display: flex;
  flex-direction: column;
  gap: var(--space-4);
  padding: var(--space-4);
  margin-bottom: var(--space-6);
  background: var(--color-navy-50);
  border-radius: var(--radius-md);
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

.field__hint--error {
  color: var(--color-danger);
}

.field__hint a {
  color: var(--color-navy-700);
}

.template-list {
  list-style: none;
  margin: 0;
  padding: 0;
  display: flex;
  flex-direction: column;
  gap: var(--space-2);
}

.template-card {
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

.template-card:hover {
  border-color: var(--color-navy-700);
  background: var(--color-navy-50);
}

.template-card--inactive {
  opacity: 0.6;
}

.template-card__main {
  display: flex;
  flex-direction: column;
  gap: 2px;
  min-width: 0;
}

.template-card__name {
  font-size: var(--text-base);
  font-weight: 500;
  color: var(--color-gray-900);
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
}

.template-card__meta {
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