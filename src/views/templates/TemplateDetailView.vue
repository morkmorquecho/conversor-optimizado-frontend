<script setup>
import { ref, onMounted } from 'vue'
import { useRoute, useRouter, RouterLink } from 'vue-router'
import templateService from '../../services/templates'
import layoutService from '../../services/layouts'

const route = useRoute()
const router = useRouter()
const supplierId = route.params.supplierId
const templateId = route.params.templateId

const template = ref(null)
const layouts = ref([])
const layoutFields = ref([])
const templateFields = ref([])
const form = ref({ name: '', layout: '', document_type: 'xlsx', is_active: true })

const isLoading = ref(true)
const loadError = ref(null)
const isSaving = ref(false)
const saveError = ref(null)
const saveSuccess = ref(false)

const showFieldForm = ref(false)
const editingFieldId = ref(null)
const fieldForm = ref(emptyFieldForm())
const isSavingField = ref(false)
const fieldError = ref(null)

const isDeleting = ref(false)
const deleteError = ref(null)
const showDeleteConfirm = ref(false)

function emptyFieldForm() {
  return {
    layout_field: '',
    source_field: '',
    extraction_type: 'header',
    worksheet: '',
    header_occurrence: '',
  }
}

async function fetchAll(fetcher) {
  let page = 1
  let all = []
  let hasNext = true

  while (hasNext) {
    const data = await fetcher({ page })
    if (Array.isArray(data)) return data

    all = all.concat(data.results || [])
    hasNext = Boolean(data.next)
    page += 1
  }

  return all
}

function fieldPayload() {
  const data = {
    layout_field: Number(fieldForm.value.layout_field),
    source_field: fieldForm.value.source_field.trim(),
    extraction_type: fieldForm.value.extraction_type.trim(),
    worksheet: fieldForm.value.worksheet.trim(),
  }

  if (fieldForm.value.header_occurrence !== '') {
    data.header_occurrence = Number(fieldForm.value.header_occurrence)
  }

  return data
}

async function loadFields() {
  templateFields.value = await fetchAll((params) =>
    templateService.getTemplateFields(supplierId, templateId, params),
  )
}

async function loadTemplate() {
  isLoading.value = true
  loadError.value = null

  try {
    const [data, layoutsData, fieldsData] = await Promise.all([
      templateService.getTemplate(supplierId, templateId),
      fetchAll((params) => layoutService.getLayouts(params)),
      fetchAll((params) => templateService.getTemplateFields(supplierId, templateId, params)),
    ])
    const layout = await layoutService.getLayout(data.layout)

    template.value = data
    layouts.value = layoutsData
    layoutFields.value = layout.layout_fields || []
    templateFields.value = fieldsData
    form.value = {
      name: data.name,
      layout: data.layout,
      document_type: data.document_type,
      is_active: data.is_active,
    }
  } catch (err) {
    loadError.value = err.message || 'No se pudo cargar el template.'
  } finally {
    isLoading.value = false
  }
}

onMounted(loadTemplate)

async function handleSave() {
  isSaving.value = true
  saveError.value = null
  saveSuccess.value = false

  try {
    await templateService.patchTemplate(supplierId, templateId, form.value)
    await loadTemplate()
    saveSuccess.value = true
  } catch (err) {
    saveError.value = err
  } finally {
    isSaving.value = false
  }
}

function openCreateField() {
  fieldError.value = null
  editingFieldId.value = null
  fieldForm.value = emptyFieldForm()
  showFieldForm.value = true
}

function openEditField(field) {
  fieldError.value = null
  editingFieldId.value = field.id
  fieldForm.value = {
    layout_field: field.layout_field,
    source_field: field.source_field || '',
    extraction_type: field.extraction_type || 'header',
    worksheet: field.worksheet || '',
    header_occurrence: field.header_occurrence ?? '',
  }
  showFieldForm.value = true
}

function closeFieldForm() {
  showFieldForm.value = false
  editingFieldId.value = null
  fieldForm.value = emptyFieldForm()
}

async function handleSaveField() {
  isSavingField.value = true
  fieldError.value = null

  try {
    if (editingFieldId.value) {
      await templateService.patchTemplateField(
        supplierId,
        templateId,
        editingFieldId.value,
        fieldPayload(),
      )
    } else {
      await templateService.createTemplateField(supplierId, templateId, fieldPayload())
    }
    await loadFields()
    closeFieldForm()
  } catch (err) {
    fieldError.value = err
  } finally {
    isSavingField.value = false
  }
}

async function handleDeleteField(fieldId) {
  fieldError.value = null

  try {
    await templateService.deleteTemplateField(supplierId, templateId, fieldId)
    await loadFields()
  } catch (err) {
    fieldError.value = err
  }
}

async function handleDelete() {
  isDeleting.value = true
  deleteError.value = null

  try {
    await templateService.deleteTemplate(supplierId, templateId)
    router.push({ name: 'template-list', params: { supplierId } })
  } catch (err) {
    deleteError.value = err.message || 'No se pudo eliminar el template.'
    isDeleting.value = false
  }
}
</script>

<template>
  <main class="detail">
    <RouterLink :to="`/proveedores/${supplierId}/templates`" class="back-link">
      ← Volver a templates
    </RouterLink>

    <p v-if="isLoading" class="state">Cargando…</p>
    <p v-else-if="loadError" class="state state--error">{{ loadError }}</p>

    <template v-else-if="template">
      <header class="detail__header">
        <h1 class="detail__title">{{ template.name }}</h1>
      </header>

      <section class="section">
        <h2 class="section__title">Editar template</h2>

        <form class="form" @submit.prevent="handleSave">
          <div class="field">
            <label class="field__label" for="name">Nombre</label>
            <input id="name" v-model="form.name" class="field__input" type="text" required />
          </div>

          <div class="field">
            <label class="field__label" for="layout">Layout destino</label>
            <select id="layout" v-model="form.layout" class="field__input" required>
              <option v-for="layout in layouts" :key="layout.id" :value="layout.id">
                {{ layout.name }} ({{ layout.code }})
              </option>
            </select>
          </div>

          <div class="field">
            <label class="field__label" for="document_type">Tipo de documento</label>
            <select id="document_type" v-model="form.document_type" class="field__input">
              <option value="xlsx">XLSX</option>
              <option value="xml">XML</option>
            </select>
          </div>

          <label class="checkbox-field">
            <input v-model="form.is_active" type="checkbox" />
            Template activo
          </label>

          <p v-if="saveError" class="state state--error">{{ saveError.message }}</p>
          <p v-if="saveSuccess" class="state state--success">Cambios guardados.</p>

          <button class="btn btn--primary" type="submit" :disabled="isSaving">
            {{ isSaving ? 'Guardando…' : 'Guardar cambios' }}
          </button>
        </form>
      </section>

      <section class="section">
        <div class="section__header">
          <div>
            <h2 class="section__title">Campos mapeados</h2>
            <p class="section__hint">
              Relaciona los campos del layout con las columnas del documento fuente.
            </p>
          </div>
          <button
            v-if="!showFieldForm"
            class="btn btn--secondary"
            type="button"
            @click="openCreateField"
          >
            + Agregar campo
          </button>
        </div>

        <p v-if="fieldError" class="state state--error">
          {{ fieldError.message }}
          <span v-if="fieldError.type === 'field_errors'">
            — {{ Object.values(fieldError.context).flat().join(' ') }}
          </span>
        </p>

        <p v-if="templateFields.length === 0 && !showFieldForm" class="state">
          Este template todavía no tiene campos mapeados.
        </p>

        <ul v-else-if="templateFields.length" class="field-list">
          <li v-for="field in templateFields" :key="field.id" class="field-row">
            <div class="field-row__content">
              <span class="field-row__name">{{ field.layout_field_name }}</span>
              <span class="field-row__source">← {{ field.source_field }}</span>
              <span class="field-row__meta">
                {{ field.extraction_type }}
                <template v-if="field.worksheet"> · {{ field.worksheet }}</template>
                <template v-if="field.header_occurrence"> · #{{ field.header_occurrence }}</template>
              </span>
            </div>
            <span class="field-row__actions">
              <button class="icon-btn" type="button" title="Editar campo" @click="openEditField(field)">
                ✎
              </button>
              <button
                class="icon-btn icon-btn--danger"
                type="button"
                title="Eliminar campo"
                @click="handleDeleteField(field.id)"
              >
                ✕
              </button>
            </span>
          </li>
        </ul>

        <form v-if="showFieldForm" class="field-form" @submit.prevent="handleSaveField">
          <div class="field">
            <label class="field__label" for="layout_field">Campo destino</label>
            <select id="layout_field" v-model="fieldForm.layout_field" class="field__input" required>
              <option disabled value="">Selecciona un campo del layout</option>
              <option v-for="layoutField in layoutFields" :key="layoutField.id" :value="layoutField.id">
                {{ layoutField.name }}
              </option>
            </select>
          </div>

          <div class="field">
            <label class="field__label" for="source_field">Campo origen</label>
            <input
              id="source_field"
              v-model="fieldForm.source_field"
              class="field__input field__input--mono"
              type="text"
              placeholder="Nombre de columna en el archivo"
              required
            />
          </div>

          <div class="field-grid">
            <div class="field">
              <label class="field__label" for="extraction_type">Tipo de extracción</label>
              <input
                id="extraction_type"
                v-model="fieldForm.extraction_type"
                class="field__input field__input--mono"
                type="text"
                placeholder="header"
                required
              />
            </div>
            <div class="field">
              <label class="field__label" for="worksheet">Hoja</label>
              <input id="worksheet" v-model="fieldForm.worksheet" class="field__input" type="text" />
            </div>
          </div>

          <div class="field">
            <label class="field__label" for="header_occurrence">Ocurrencia del encabezado</label>
            <input
              id="header_occurrence"
              v-model="fieldForm.header_occurrence"
              class="field__input"
              type="number"
              min="1"
            />
          </div>

          <div class="confirm-row">
            <button class="btn btn--secondary" type="submit" :disabled="isSavingField">
              {{ isSavingField ? 'Guardando…' : editingFieldId ? 'Guardar campo' : '+ Agregar campo' }}
            </button>
            <button class="btn btn--plain" type="button" @click="closeFieldForm">Cancelar</button>
          </div>
        </form>
      </section>

      <section class="section section--danger">
        <h2 class="section__title">Eliminar template</h2>

        <p v-if="deleteError" class="state state--error">{{ deleteError }}</p>

        <button
          v-if="!showDeleteConfirm"
          class="btn btn--danger"
          type="button"
          @click="showDeleteConfirm = true"
        >
          Eliminar template
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

.back-link:hover { color: var(--color-navy-700); }

.state {
  color: var(--color-gray-500);
  font-size: var(--text-sm);
  padding: var(--space-4) 0;
}

.state--error { color: var(--color-danger); }
.state--success { color: var(--color-navy-700); }

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

.section { margin-bottom: var(--space-8); }

.section--danger {
  padding: var(--space-4);
  border: 1px solid var(--color-danger-bg);
  border-radius: var(--radius-md);
  background: var(--color-danger-bg);
}

.section__header {
  display: flex;
  justify-content: space-between;
  align-items: flex-start;
  gap: var(--space-3);
  margin-bottom: var(--space-4);
}

.section__title {
  font-size: var(--text-base);
  font-weight: 600;
  color: var(--color-navy-900);
  margin: 0 0 var(--space-1);
}

.section--danger .section__title { color: var(--color-danger); }

.section__hint {
  font-size: var(--text-sm);
  color: var(--color-gray-500);
  margin: 0;
}

.form, .field-form {
  display: flex;
  flex-direction: column;
  gap: var(--space-4);
}

.field-form {
  margin-top: var(--space-4);
  padding: var(--space-4);
  border: 1px solid var(--color-gray-200);
  border-radius: var(--radius-md);
  background: var(--color-navy-50);
}

.field-grid {
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: var(--space-3);
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
  box-sizing: border-box;
  width: 100%;
  font-family: var(--font-ui);
  font-size: var(--text-base);
  padding: var(--space-3);
  border: 1px solid var(--color-gray-300);
  border-radius: var(--radius-md);
  background: var(--color-white);
  color: var(--color-gray-900);
}

.field__input--mono { font-family: var(--font-mono); }

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
}

.btn--primary { color: var(--color-white); background: var(--color-navy-900); }
.btn--primary:hover:not(:disabled) { background: var(--color-navy-700); }
.btn--secondary { color: var(--color-navy-900); background: var(--color-navy-50); }
.btn--secondary:hover:not(:disabled) { background: var(--color-gray-200); }
.btn--danger { color: var(--color-white); background: var(--color-danger); }
.btn--danger:hover:not(:disabled) { opacity: 0.9; }
.btn--plain { color: var(--color-gray-500); background: transparent; }
.btn:disabled { opacity: 0.6; cursor: not-allowed; }

.confirm-row {
  display: flex;
  align-items: center;
  gap: var(--space-3);
  flex-wrap: wrap;
}

.confirm-row__text { font-size: var(--text-sm); color: var(--color-danger); }

.field-list {
  list-style: none;
  margin: 0;
  padding: 0;
  display: flex;
  flex-direction: column;
  gap: var(--space-1);
}

.field-row {
  display: flex;
  align-items: center;
  gap: var(--space-3);
  padding: var(--space-2) var(--space-3);
  border: 1px solid var(--color-gray-200);
  border-radius: var(--radius-sm);
}

.field-row__content {
  min-width: 0;
  flex: 1;
  display: flex;
  align-items: baseline;
  gap: var(--space-2);
  flex-wrap: wrap;
}

.field-row__name { font-size: var(--text-sm); color: var(--color-gray-900); }
.field-row__source { font-family: var(--font-mono); font-size: var(--text-xs); color: var(--color-navy-700); }
.field-row__meta { font-size: var(--text-xs); color: var(--color-gray-500); }
.field-row__actions { display: flex; gap: var(--space-1); }

.icon-btn {
  width: 28px;
  height: 28px;
  display: flex;
  align-items: center;
  justify-content: center;
  background: none;
  border: none;
  color: var(--color-gray-500);
  cursor: pointer;
  border-radius: var(--radius-sm);
  font-size: var(--text-sm);
}

.icon-btn:hover { background: var(--color-navy-50); color: var(--color-navy-700); }
.icon-btn--danger:hover { background: var(--color-danger-bg); color: var(--color-danger); }

@media (max-width: 560px) {
  .section__header { flex-direction: column; }
  .field-grid { grid-template-columns: 1fr; }
}
</style>
