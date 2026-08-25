<script setup>
import { computed, ref, onMounted } from 'vue'
import { useRoute, useRouter, RouterLink } from 'vue-router'
import templateService from '../../services/templates'
import layoutService from '../../services/layouts'
import catalogService from '../../services/catalogs'
import normalization from '../../services/normalization'
import XmlXPathPicker from '../../components/XmlXPathPicker.vue'

const route = useRoute()
const router = useRouter()
const supplierId = route.params.supplierId
const templateId = route.params.templateId

const template = ref(null)
const layouts = ref([])
const layoutFields = ref([])
const templateFields = ref([])
const catalogs = ref([])
const pivotMappings = ref([])
const normalizationRules = ref([])
const form = ref({
  layout: '', document_type: 'xlsx', is_active: true,
  pdf_extraction_mode: '', line_pattern_hint: '',
})

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

const showMappingForm = ref(false)
const editingMapping = ref(null)
const mappingForm = ref({ catalog_id: '', pivot_template_field: '' })
const isSavingMapping = ref(false)
const mappingError = ref(null)

const showRuleForm = ref(false)
const editingFieldRule = ref(null)
const fieldRuleForm = ref({ template_field: '', normalization_rule: '', sort_order: 1 })
const isSavingFieldRule = ref(false)
const fieldRuleError = ref(null)
const isReorderingFieldRule = ref(false)

const isDeleting = ref(false)
const deleteError = ref(null)
const showDeleteConfirm = ref(false)

const availableMappingCatalogs = computed(() => {
  const mappedCatalogIds = new Set(pivotMappings.value.map((mapping) => Number(mapping.catalog_id)))
  return catalogs.value.filter((catalog) => !mappedCatalogIds.has(Number(catalog.id)))
})

const isXmlTemplate = computed(() => form.value.document_type === 'xml')
const isPdfTemplate = computed(() => form.value.document_type === 'pdf')

const availableNormalizationRules = computed(() => {
  const field = templateFields.value.find(
    (item) => Number(item.id) === Number(fieldRuleForm.value.template_field),
  )
  const linkedRuleIds = new Set((field?.rules || []).map((rule) => Number(rule.normalization_rule)))
  const currentRuleId = Number(fieldRuleForm.value.normalization_rule)
  return normalizationRules.value.filter(
    (rule) => !linkedRuleIds.has(Number(rule.id)) || Number(rule.id) === currentRuleId,
  )
})

function emptyFieldForm() {
  return {
    layout_field: '',
    source_field: '',
    extraction_type: 'header_name',
    worksheet: '',
    header_occurrence: '',
    scope: 'header',
    anchor_text: '',
    anchor_position: '',
    block_start_anchor: '',
    block_end_anchor: '',
    expected_data_type: '',
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
  if (isPdfTemplate.value) {
    return {
      layout_field: Number(fieldForm.value.layout_field),
      source_field: '',
      extraction_type: 'llm_text',
      worksheet: '',
      header_occurrence: 1,
      scope: fieldForm.value.scope,
      anchor_text: fieldForm.value.scope === 'header' ? fieldForm.value.anchor_text.trim() : '',
      anchor_position: fieldForm.value.scope === 'header' ? fieldForm.value.anchor_position : '',
      block_start_anchor: fieldForm.value.scope === 'line_item'
        ? fieldForm.value.block_start_anchor.trim() : '',
      block_end_anchor: fieldForm.value.scope === 'line_item'
        ? fieldForm.value.block_end_anchor.trim() : '',
      expected_data_type: fieldForm.value.expected_data_type,
    }
  }
  const data = {
    layout_field: Number(fieldForm.value.layout_field),
    source_field: fieldForm.value.source_field.trim(),
    extraction_type: isXmlTemplate.value ? 'xpath' : 'header_name',
    worksheet: isXmlTemplate.value ? '' : fieldForm.value.worksheet.trim(),
    header_occurrence: isXmlTemplate.value ? 1 : Number(fieldForm.value.header_occurrence),
  }
  return data
}

function templateFieldName(fieldId) {
  const field = templateFields.value.find((item) => Number(item.id) === Number(fieldId))
  return field ? field.layout_field_name || field.source_field : `Campo #${fieldId}`
}

function nextRuleSortOrder(fieldId) {
  const field = templateFields.value.find((item) => Number(item.id) === Number(fieldId))
  return (field?.rules || []).length + 1
}

function hasAvailableRules(field) {
  const linkedRuleIds = new Set((field.rules || []).map((rule) => Number(rule.normalization_rule)))
  return normalizationRules.value.some((rule) => !linkedRuleIds.has(Number(rule.id)))
}

async function loadFields() {
  templateFields.value = await fetchAll((params) =>
    templateService.getTemplateFields(supplierId, templateId, params),
  )
}

async function loadPivotMappings(catalogList = catalogs.value) {
  const mappingsByCatalog = await Promise.all(
    catalogList.map(async (catalog) => {
      const mappings = await fetchAll((params) =>
        catalogService.getCatalogPivotMappings(supplierId, catalog.id, params),
      )
      return mappings
        .filter((mapping) => Number(mapping.template) === Number(templateId))
        .map((mapping) => ({ ...mapping, catalog_id: catalog.id, catalog_name: catalog.name }))
    }),
  )
  pivotMappings.value = mappingsByCatalog.flat()
}

async function loadTemplate() {
  isLoading.value = true
  loadError.value = null

  try {
    const [data, layoutsData, fieldsData, catalogsData, rulesData] = await Promise.all([
      templateService.getTemplate(supplierId, templateId),
      fetchAll((params) => layoutService.getLayouts(params)),
      fetchAll((params) => templateService.getTemplateFields(supplierId, templateId, params)),
      fetchAll((params) => catalogService.getCatalogs(supplierId, params)),
      fetchAll((params) => normalization.getRules(params)),
    ])
    const layout = await layoutService.getLayout(data.layout)

    template.value = data
    layouts.value = layoutsData
    layoutFields.value = layout.layout_fields || []
    templateFields.value = fieldsData
    catalogs.value = catalogsData
    normalizationRules.value = rulesData
    form.value = {
      layout: data.layout,
      document_type: data.document_type,
      is_active: data.is_active,
      pdf_extraction_mode: data.pdf_extraction_mode || '',
      line_pattern_hint: data.line_pattern_hint || '',
    }
    await loadPivotMappings(catalogsData)
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
    const payload = { ...form.value }
    delete payload.name
    if (payload.document_type !== 'pdf') {
      delete payload.pdf_extraction_mode
      delete payload.line_pattern_hint
    }
    await templateService.patchTemplate(supplierId, templateId, payload)
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
    extraction_type: field.extraction_type || 'header_name',
    worksheet: field.worksheet || '',
    header_occurrence: field.header_occurrence ?? 1,
    scope: field.scope || 'header',
    anchor_text: field.anchor_text || '',
    anchor_position: field.anchor_position || '',
    block_start_anchor: field.block_start_anchor || '',
    block_end_anchor: field.block_end_anchor || '',
    expected_data_type: field.expected_data_type || '',
  }
  showFieldForm.value = true
}

function closeFieldForm() {
  showFieldForm.value = false
  editingFieldId.value = null
  fieldForm.value = emptyFieldForm()
}

function openCreateMapping(fieldId = '') {
  if (availableMappingCatalogs.value.length === 0) return

  mappingError.value = null
  editingMapping.value = null
  mappingForm.value = { catalog_id: '', pivot_template_field: fieldId }
  showMappingForm.value = true
}

function openEditMapping(mapping) {
  mappingError.value = null
  editingMapping.value = mapping
  mappingForm.value = {
    catalog_id: mapping.catalog_id,
    pivot_template_field: mapping.pivot_template_field,
  }
  showMappingForm.value = true
}

function closeMappingForm() {
  showMappingForm.value = false
  editingMapping.value = null
  mappingForm.value = { catalog_id: '', pivot_template_field: '' }
}

function openCreateFieldRule(fieldId = '') {
  fieldRuleError.value = null
  editingFieldRule.value = null
  fieldRuleForm.value = {
    template_field: fieldId,
    normalization_rule: '',
    sort_order: fieldId ? nextRuleSortOrder(fieldId) : 1,
  }
  showRuleForm.value = true
}

function openEditFieldRule(field, rule) {
  fieldRuleError.value = null
  editingFieldRule.value = { fieldId: field.id, ruleId: rule.id }
  fieldRuleForm.value = {
    template_field: field.id,
    normalization_rule: rule.normalization_rule,
    sort_order: rule.sort_order,
  }
  showRuleForm.value = true
}

function closeFieldRuleForm() {
  showRuleForm.value = false
  editingFieldRule.value = null
  fieldRuleForm.value = { template_field: '', normalization_rule: '', sort_order: 1 }
}

function handleRuleFieldChange() {
  fieldRuleForm.value.normalization_rule = ''
  fieldRuleForm.value.sort_order = nextRuleSortOrder(fieldRuleForm.value.template_field)
}

async function handleSaveField() {
  isSavingField.value = true
  fieldError.value = null

  try {
    // if (
    //   isPdfTemplate.value
    //   && fieldForm.value.scope === 'line_item'
    //   && form.value.pdf_extraction_mode !== 'text_and_tables'
    // ) {
    //   throw new Error('Los campos de partidas requieren el modo “Texto y tablas” en el template PDF.')
    // }
    if (editingFieldId.value) {
      await templateService.patchTemplateField(
        supplierId,
        templateId,
        editingFieldId.value,
        fieldPayload(),
      )
    } else {
      const createdField = await templateService.createTemplateField(
        supplierId,
        templateId,
        fieldPayload(),
      )
      await loadFields()
      closeFieldForm()
      openCreateMapping(createdField.id)
      return
    }
    await loadFields()
    closeFieldForm()
  } catch (err) {
    fieldError.value = err
  } finally {
    isSavingField.value = false
  }
}

async function handleSaveMapping() {
  isSavingMapping.value = true
  mappingError.value = null

  const data = {
    template: Number(templateId),
    pivot_template_field: Number(mappingForm.value.pivot_template_field),
  }

  try {
    if (editingMapping.value) {
      await catalogService.updateCatalogPivotMapping(
        supplierId,
        editingMapping.value.catalog_id,
        editingMapping.value.id,
        data,
      )
    } else {
      await catalogService.createCatalogPivotMapping(
        supplierId,
        Number(mappingForm.value.catalog_id),
        data,
      )
    }
    await loadPivotMappings()
    closeMappingForm()
  } catch (err) {
    mappingError.value = err
  } finally {
    isSavingMapping.value = false
  }
}

async function handleSaveFieldRule() {
  isSavingFieldRule.value = true
  fieldRuleError.value = null

  const data = {
    normalization_rule: Number(fieldRuleForm.value.normalization_rule),
    sort_order: Number(fieldRuleForm.value.sort_order),
  }

  try {
    if (editingFieldRule.value) {
      await templateService.updateTemplateFieldRule(
        supplierId,
        templateId,
        editingFieldRule.value.fieldId,
        editingFieldRule.value.ruleId,
        data,
      )
    } else {
      await templateService.createTemplateFieldRule(
        supplierId,
        templateId,
        Number(fieldRuleForm.value.template_field),
        data,
      )
    }
    await loadFields()
    closeFieldRuleForm()
  } catch (err) {
    fieldRuleError.value = err
  } finally {
    isSavingFieldRule.value = false
  }
}

async function handleDeleteFieldRule(fieldId, ruleId) {
  fieldRuleError.value = null

  try {
    await templateService.deleteTemplateFieldRule(supplierId, templateId, fieldId, ruleId)
    await loadFields()
  } catch (err) {
    fieldRuleError.value = err
  }
}

async function moveFieldRule(field, index, direction) {
  const rules = [...(field.rules || [])]
  const targetIndex = index + direction
  if (targetIndex < 0 || targetIndex >= rules.length) return

  ;[rules[index], rules[targetIndex]] = [rules[targetIndex], rules[index]]
  isReorderingFieldRule.value = true
  fieldRuleError.value = null

  try {
    await templateService.reorderTemplateFieldRules(
      supplierId,
      templateId,
      field.id,
      rules.map((rule) => rule.id),
    )
    await loadFields()
  } catch (err) {
    fieldRuleError.value = err
  } finally {
    isReorderingFieldRule.value = false
  }
}

async function handleDeleteMapping(mapping) {
  mappingError.value = null

  try {
    await catalogService.deleteCatalogPivotMapping(supplierId, mapping.catalog_id, mapping.id)
    await loadPivotMappings()
  } catch (err) {
    mappingError.value = err
  }
}

async function handleDeleteField(fieldId) {
  fieldError.value = null

  try {
    await templateService.deleteTemplateField(supplierId, templateId, fieldId)
    await Promise.all([loadFields(), loadPivotMappings()])
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
              <option value="pdf">PDF (LLM)</option>
            </select>
          </div>

          <template v-if="form.document_type === 'pdf'">
            <div class="field">
              <label class="field__label" for="pdf_extraction_mode">Contenido a extraer</label>
              <select id="pdf_extraction_mode" v-model="form.pdf_extraction_mode" class="field__input" required>
                <option disabled value="">Selecciona un modo</option>
                <option value="text_only">Solo texto</option>
                <option value="text_and_tables">Texto y tablas</option>
              </select>
              <p class="field__hint">Las partidas requieren “Texto y tablas”.</p>
            </div>

            <div class="field">
              <label class="field__label" for="line_pattern_hint">Pista para renglones (opcional)</label>
              <textarea
                id="line_pattern_hint"
                v-model="form.line_pattern_hint"
                class="field__input"
                rows="3"
                placeholder="Ej. Cantidad, precio y descripción, en ese orden."
              />
            </div>
          </template>

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
              <span class="field-row__source">
                ← {{ field.extraction_type === 'llm_text'
                  ? (field.scope === 'line_item' ? `Partidas hasta: ${field.block_end_anchor}` : `Ancla: ${field.anchor_text}`)
                  : field.source_field }}
              </span>
              <span class="field-row__meta">
                {{ field.extraction_type }}
                <template v-if="field.worksheet"> · {{ field.worksheet }}</template>
                <template v-if="field.header_occurrence !== null && field.header_occurrence !== undefined">
                  · #{{ field.header_occurrence }}
                </template>
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

          <div v-if="!isPdfTemplate" class="field">
            <label class="field__label" for="source_field">
              {{ isXmlTemplate ? 'XPath del XML' : 'Campo origen' }}
            </label>
            <input
              id="source_field"
              v-model="fieldForm.source_field"
              class="field__input field__input--mono"
              type="text"
              :placeholder="isXmlTemplate ? 'Selecciona un nodo del XML abajo' : 'Nombre de columna en el archivo'"
              required
            />
          </div>

          <template v-if="isPdfTemplate">
            <div class="field">
              <label class="field__label" for="field_scope">Tipo de dato en el PDF</label>
              <select id="field_scope" v-model="fieldForm.scope" class="field__input">
                <option value="header">Encabezado (un valor por documento)</option>
                <option value="line_item">Partida (un valor por renglón)</option>
              </select>
            </div>

            <template v-if="fieldForm.scope === 'header'">
              <div class="field">
                <label class="field__label" for="anchor_text">Texto ancla</label>
                <input id="anchor_text" v-model="fieldForm.anchor_text" class="field__input" type="text" required />
              </div>
              <div class="field">
                <label class="field__label" for="anchor_position">Ubicación del valor</label>
                <select id="anchor_position" v-model="fieldForm.anchor_position" class="field__input" required>
                  <option disabled value="">Selecciona una posición</option>
                  <option value="after">Después del ancla</option>
                  <option value="before">Antes del ancla</option>
                  <option value="below">Debajo del ancla</option>
                </select>
              </div>
            </template>

            <template v-else>
              <div class="field">
                <label class="field__label" for="block_start_anchor">Inicio de partidas (opcional)</label>
                <input id="block_start_anchor" v-model="fieldForm.block_start_anchor" class="field__input" type="text" />
              </div>
              <div class="field">
                <label class="field__label" for="block_end_anchor">Fin de partidas (opcional)</label>
                <input id="block_end_anchor" v-model="fieldForm.block_end_anchor" class="field__input" type="text" />
                <p class="field__hint">Si lo dejas vacío, el sistema usa cortes genéricos como “Subtotal”, “Total” o “IVA”.</p>
              </div>
            </template>

            <div class="field">
              <label class="field__label" for="expected_data_type">Tipo esperado (opcional)</label>
              <select id="expected_data_type" v-model="fieldForm.expected_data_type" class="field__input">
                <option value="">Sin especificar</option>
                <option value="text">Texto</option>
                <option value="date">Fecha</option>
                <option value="amount">Monto</option>
                <option value="number">Número</option>
              </select>
            </div>
            <p class="field__hint field__hint--info">
              Este campo se solicitará al LLM junto con los demás campos del PDF: se realiza una sola extracción por archivo.
            </p>
          </template>

          <div v-if="!isXmlTemplate && !isPdfTemplate" class="field-grid">
            <div class="field">
              <label class="field__label" for="worksheet">Hoja</label>
              <input id="worksheet" v-model="fieldForm.worksheet" class="field__input" type="text" />
            </div>
          </div>

          <div v-if="!isXmlTemplate && !isPdfTemplate" class="field">
            <label class="field__label" for="header_occurrence">Ocurrencia del encabezado</label>
            <input
              id="header_occurrence"
              v-model="fieldForm.header_occurrence"
              class="field__input"
              type="number"
              min="0"
            />
          </div>

          <XmlXPathPicker
            v-if="isXmlTemplate"
            @select="fieldForm.source_field = $event"
          />

          <div class="confirm-row">
            <button class="btn btn--secondary" type="submit" :disabled="isSavingField">
              {{ isSavingField ? 'Guardando…' : editingFieldId ? 'Guardar campo' : '+ Agregar campo' }}
            </button>
            <button class="btn btn--plain" type="button" @click="closeFieldForm">Cancelar</button>
          </div>
        </form>
      </section>

      <section class="section">
        <div class="section__header">
          <div>
            <h2 class="section__title">Reglas de normalización</h2>
            <p class="section__hint">
              Opcionalmente, aplica reglas a los campos antes de usar su valor.
            </p>
          </div>
          <button
            v-if="!showRuleForm"
            class="btn btn--secondary"
            type="button"
            :disabled="templateFields.length === 0 || !templateFields.some(hasAvailableRules)"
            @click="openCreateFieldRule()"
          >
            + Agregar regla
          </button>
        </div>

        <p v-if="fieldRuleError" class="state state--error">
          {{ fieldRuleError.message }}
          <span v-if="fieldRuleError.type === 'field_errors'">
            — {{ Object.values(fieldRuleError.context).flat().join(' ') }}
          </span>
        </p>

        <p v-if="templateFields.length === 0" class="state">
          Primero agrega un campo mapeado para poder relacionar una regla.
        </p>
        <p v-else-if="normalizationRules.length === 0" class="state">
          No hay reglas de normalización disponibles.
        </p>

        <div v-for="field in templateFields" :key="field.id" class="rule-group">
          <h3 class="rule-group__title">{{ field.layout_field_name }}</h3>
          <p v-if="!(field.rules || []).length" class="rule-group__empty">Sin reglas asignadas.</p>
          <ol v-else class="field-list">
            <li v-for="(rule, index) in field.rules" :key="rule.id" class="field-row">
              <span class="field-row__order">{{ rule.sort_order }}</span>
              <span class="field-row__name">{{ rule.normalization_rule_name }}</span>
              <span class="field-row__actions">
                <button
                  class="icon-btn"
                  type="button"
                  title="Subir"
                  :disabled="index === 0 || isReorderingFieldRule"
                  @click="moveFieldRule(field, index, -1)"
                >
                  ↑
                </button>
                <button
                  class="icon-btn"
                  type="button"
                  title="Bajar"
                  :disabled="index === field.rules.length - 1 || isReorderingFieldRule"
                  @click="moveFieldRule(field, index, 1)"
                >
                  ↓
                </button>
                <button class="icon-btn" type="button" title="Editar" @click="openEditFieldRule(field, rule)">
                  ✎
                </button>
                <button
                  class="icon-btn icon-btn--danger"
                  type="button"
                  title="Quitar regla"
                  @click="handleDeleteFieldRule(field.id, rule.id)"
                >
                  ✕
                </button>
              </span>
            </li>
          </ol>
          <button
            v-if="!showRuleForm && hasAvailableRules(field)"
            class="btn btn--plain btn--small"
            type="button"
            @click="openCreateFieldRule(field.id)"
          >
            + Agregar regla a este campo
          </button>
        </div>

        <form v-if="showRuleForm" class="field-form" @submit.prevent="handleSaveFieldRule">
          <div class="field">
            <label class="field__label" for="rule_template_field">Campo mapeado</label>
            <select
              id="rule_template_field"
              v-model="fieldRuleForm.template_field"
              class="field__input"
              :disabled="Boolean(editingFieldRule)"
              required
              @change="handleRuleFieldChange"
            >
              <option disabled value="">Selecciona un campo</option>
              <option v-for="field in templateFields" :key="field.id" :value="field.id">
                {{ field.layout_field_name }} ← {{ field.source_field }}
              </option>
            </select>
          </div>

          <div class="field">
            <label class="field__label" for="normalization_rule">Regla</label>
            <select id="normalization_rule" v-model="fieldRuleForm.normalization_rule" class="field__input" required>
              <option disabled value="">Selecciona una regla</option>
              <option v-for="rule in availableNormalizationRules" :key="rule.id" :value="rule.id">
                {{ rule.name }}
              </option>
            </select>
          </div>

          <div class="field">
            <label class="field__label" for="rule_sort_order">Orden de ejecución</label>
            <input
              id="rule_sort_order"
              v-model="fieldRuleForm.sort_order"
              class="field__input"
              type="number"
              min="1"
              required
            />
          </div>

          <div class="confirm-row">
            <button class="btn btn--secondary" type="submit" :disabled="isSavingFieldRule">
              {{ isSavingFieldRule ? 'Guardando…' : editingFieldRule ? 'Guardar regla' : '+ Agregar regla' }}
            </button>
            <button class="btn btn--plain" type="button" @click="closeFieldRuleForm">Cancelar</button>
          </div>
        </form>
      </section>

      <section class="section">
        <div class="section__header">
          <div>
            <h2 class="section__title">Relaciones con catálogos</h2>
            <p class="section__hint">
              Define qué campo de este template se usa para buscar coincidencias en cada catálogo.
            </p>
          </div>
          <button
            v-if="!showMappingForm"
            class="btn btn--secondary"
            type="button"
            :disabled="availableMappingCatalogs.length === 0 || templateFields.length === 0"
            @click="openCreateMapping()"
          >
            + Relacionar catálogo
          </button>
        </div>

        <p v-if="mappingError" class="state state--error">
          {{ mappingError.message }}
          <span v-if="mappingError.type === 'field_errors'">
            — {{ Object.values(mappingError.context).flat().join(' ') }}
          </span>
        </p>

        <p v-if="catalogs.length === 0" class="state">
          Este proveedor todavía no tiene catálogos disponibles.
        </p>
        <p v-else-if="pivotMappings.length === 0 && !showMappingForm" class="state">
          Este template todavía no tiene relaciones con catálogos.
        </p>

        <ul v-else-if="pivotMappings.length" class="field-list">
          <li v-for="mapping in pivotMappings" :key="mapping.id" class="field-row">
            <div class="field-row__content">
              <span class="field-row__name">{{ mapping.catalog_name }}</span>
              <span class="field-row__source">← {{ templateFieldName(mapping.pivot_template_field) }}</span>
            </div>
            <span class="field-row__actions">
              <button
                class="icon-btn"
                type="button"
                title="Editar relación"
                @click="openEditMapping(mapping)"
              >
                ✎
              </button>
              <button
                class="icon-btn icon-btn--danger"
                type="button"
                title="Eliminar relación"
                @click="handleDeleteMapping(mapping)"
              >
                ✕
              </button>
            </span>
          </li>
        </ul>

        <form v-if="showMappingForm" class="field-form" @submit.prevent="handleSaveMapping">
          <div class="field">
            <label class="field__label" for="mapping_catalog">Catálogo</label>
            <select
              id="mapping_catalog"
              v-model="mappingForm.catalog_id"
              class="field__input"
              :disabled="Boolean(editingMapping)"
              required
            >
              <option disabled value="">Selecciona un catálogo</option>
              <option
                v-for="catalog in editingMapping ? catalogs : availableMappingCatalogs"
                :key="catalog.id"
                :value="catalog.id"
              >
                {{ catalog.name }}
              </option>
            </select>
          </div>

          <div class="field">
            <label class="field__label" for="pivot_template_field">Campo para hacer match</label>
            <select
              id="pivot_template_field"
              v-model="mappingForm.pivot_template_field"
              class="field__input"
              required
            >
              <option disabled value="">Selecciona un campo del template</option>
              <option v-for="field in templateFields" :key="field.id" :value="field.id">
                {{ field.layout_field_name }} ← {{ field.source_field }}
              </option>
            </select>
          </div>

          <div class="confirm-row">
            <button class="btn btn--secondary" type="submit" :disabled="isSavingMapping">
              {{ isSavingMapping ? 'Guardando…' : editingMapping ? 'Guardar relación' : 'Crear relación' }}
            </button>
            <button class="btn btn--plain" type="button" @click="closeMappingForm">Cancelar</button>
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
.btn--small { padding-left: 0; padding-right: 0; font-size: var(--text-xs); }
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
  min-width: 0;
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

.field-row__order {
  width: 1.5em;
  color: var(--color-gray-500);
  font-family: var(--font-mono);
  font-size: var(--text-xs);
  text-align: right;
}

.field-row__source {
  flex-basis: 100%;
  min-width: 0;
  font-family: var(--font-mono);
  font-size: var(--text-xs);
  color: var(--color-navy-700);
  overflow-wrap: anywhere;
  word-break: break-word;
}

.field-row__meta {
  min-width: 0;
  font-size: var(--text-xs);
  color: var(--color-gray-500);
  overflow-wrap: anywhere;
}

.field-row__actions { display: flex; flex-shrink: 0; gap: var(--space-1); }

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

.rule-group {
  margin-bottom: var(--space-4);
  padding: var(--space-3);
  border: 1px solid var(--color-gray-200);
  border-radius: var(--radius-md);
}

.rule-group__title {
  margin: 0 0 var(--space-2);
  color: var(--color-gray-900);
  font-size: var(--text-sm);
  font-weight: 500;
}

.rule-group__empty {
  margin: 0 0 var(--space-2);
  color: var(--color-gray-500);
  font-size: var(--text-sm);
}

@media (max-width: 560px) {
  .section__header { flex-direction: column; }
  .field-grid { grid-template-columns: 1fr; }
}
</style>
