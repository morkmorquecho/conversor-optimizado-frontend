<script setup>
import { ref, onMounted } from 'vue'
import { useRoute, useRouter, RouterLink } from 'vue-router'
import normalization from '../../services/normalization'

const route = useRoute()
const router = useRouter()
const ruleId = route.params.ruleId

const rule = ref(null)
const form = ref({ name: '', description: '', rule_type: 'trim' })

const isLoading = ref(true)
const loadError = ref(null)

const isSaving = ref(false)
const saveError = ref(null)
const saveSuccess = ref(false)

const isDeleting = ref(false)
const deleteError = ref(null)
const showDeleteConfirm = ref(false)

const RULE_TYPES = [
  { value: 'trim', label: 'Trim (quitar espacios)' },
  { value: 'uppercase', label: 'Uppercase' },
  { value: 'date_format', label: 'Date format' },
  { value: 'value_map', label: 'Value map' },
  { value: 'regex_replace', label: 'Regex replace' },
]

const configState = ref({
  pattern: '',
  replacement: '',
  input_format: '',
  output_format: '',
  mapEntries: [{ key: '', value: '' }],
  caseInsensitive: true,
  defaultValue: '',
  useLookup: false,
  lookup: { app_label: '', model: '', match_field: '', result_field: '' },
})

function addMapEntry() {
  configState.value.mapEntries.push({ key: '', value: '' })
}

function removeMapEntry(index) {
  configState.value.mapEntries.splice(index, 1)
}

// Arma el objeto `config` real que espera el backend, según el rule_type.
function buildConfig(ruleType, state) {
  if (ruleType === 'regex_replace') {
    return { pattern: state.pattern, replacement: state.replacement }
  }
  if (ruleType === 'date_format') {
    return { input_format: state.input_format, output_format: state.output_format }
  }
  if (ruleType === 'value_map') {
    const map = {}
    state.mapEntries.forEach(({ key, value }) => {
      if (key.trim()) map[key.trim()] = value
    })
    const config = { map, case_insensitive: state.caseInsensitive }
    if (state.defaultValue.trim()) config.default = state.defaultValue.trim()
    if (state.useLookup) config.lookup = { ...state.lookup }
    return config
  }
  return {} // trim, uppercase
}

// Puebla configState a partir del config ya guardado, para editar.
function loadConfigIntoState(ruleType, config) {
  config = config || {}
  if (ruleType === 'regex_replace') {
    configState.value.pattern = config.pattern || ''
    configState.value.replacement = config.replacement || ''
  } else if (ruleType === 'date_format') {
    configState.value.input_format = config.input_format || ''
    configState.value.output_format = config.output_format || ''
  } else if (ruleType === 'value_map') {
    const entries = Object.entries(config.map || {}).map(([key, value]) => ({ key, value }))
    configState.value.mapEntries = entries.length ? entries : [{ key: '', value: '' }]
    configState.value.caseInsensitive = config.case_insensitive !== false
    configState.value.defaultValue = config.default || ''
    configState.value.useLookup = Boolean(config.lookup)
    if (config.lookup) {
      configState.value.lookup = { ...configState.value.lookup, ...config.lookup }
    }
  }
}

async function loadRule() {
  isLoading.value = true
  loadError.value = null
  try {
    const data = await normalization.getRule(ruleId)
    rule.value = data
    form.value = {
      name: data.name,
      description: data.description || '',
      rule_type: data.rule_type,
    }
    loadConfigIntoState(data.rule_type, data.config)
  } catch (err) {
    loadError.value = err.message || 'No se pudo cargar la regla.'
  } finally {
    isLoading.value = false
  }
}

onMounted(loadRule)

async function handleSave() {
  isSaving.value = true
  saveError.value = null
  saveSuccess.value = false
  try {
    await normalization.patchRule(ruleId, {
      name: form.value.name,
      description: form.value.description,
      rule_type: form.value.rule_type,
      config: buildConfig(form.value.rule_type, configState.value),
    })
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
    await normalization.deleteRule(ruleId)
    router.push({ name: 'normalization-rule-list' })
  } catch (err) {
    deleteError.value = err.message || 'No se pudo eliminar la regla.'
    isDeleting.value = false
  }
}
</script>

<template>
  <main class="detail">
    <RouterLink to="/reglas" class="back-link">← Volver a reglas</RouterLink>

    <p v-if="isLoading" class="state">Cargando…</p>
    <p v-else-if="loadError" class="state state--error">{{ loadError }}</p>

    <template v-else-if="rule">
      <header class="detail__header">
        <h1 class="detail__title">{{ rule.name }}</h1>
      </header>

      <section class="section">
        <h2 class="section__title">Editar regla</h2>

        <form class="form" @submit.prevent="handleSave">
          <div class="field">
            <label class="field__label" for="name">Nombre</label>
            <input id="name" v-model="form.name" class="field__input" type="text" required />
          </div>

          <div class="field">
            <label class="field__label" for="description">Descripción</label>
            <input id="description" v-model="form.description" class="field__input" type="text" />
          </div>

          <div class="field">
            <label class="field__label" for="rule_type">Tipo</label>
            <select id="rule_type" v-model="form.rule_type" class="field__input">
              <option v-for="t in RULE_TYPES" :key="t.value" :value="t.value">
                {{ t.label }}
              </option>
            </select>
            <p class="field__hint field__hint--error" v-if="form.rule_type !== rule.rule_type">
              Cambiar el tipo reinicia la configuración de abajo.
            </p>
          </div>

          <!-- ── CONFIG SEGÚN TIPO ── -->
          <p
            v-if="form.rule_type === 'trim' || form.rule_type === 'uppercase'"
            class="field__hint"
          >
            Esta regla no necesita configuración adicional.
          </p>

          <template v-else-if="form.rule_type === 'regex_replace'">
            <div class="field">
              <label class="field__label" for="pattern">Patrón (regex)</label>
              <input
                id="pattern"
                v-model="configState.pattern"
                class="field__input field__input--mono"
                type="text"
                required
              />
            </div>
            <div class="field">
              <label class="field__label" for="replacement">Reemplazo</label>
              <input
                id="replacement"
                v-model="configState.replacement"
                class="field__input field__input--mono"
                type="text"
              />
            </div>
          </template>

          <template v-else-if="form.rule_type === 'date_format'">
            <div class="field">
              <label class="field__label" for="input_format">Formato de entrada</label>
              <input
                id="input_format"
                v-model="configState.input_format"
                class="field__input field__input--mono"
                type="text"
                placeholder="%Y%m%d"
                required
              />
            </div>
            <div class="field">
              <label class="field__label" for="output_format">Formato de salida</label>
              <input
                id="output_format"
                v-model="configState.output_format"
                class="field__input field__input--mono"
                type="text"
                placeholder="%d/%m/%Y"
                required
              />
              <p class="field__hint">Códigos de <code>strptime/strftime</code> de Python.</p>
            </div>
          </template>

          <template v-else-if="form.rule_type === 'value_map'">
            <div class="field">
              <label class="field__label">Mapeo de valores</label>
              <div class="map-row" v-for="(entry, index) in configState.mapEntries" :key="index">
                <input
                  v-model="entry.key"
                  class="field__input field__input--mono"
                  type="text"
                  placeholder="DLS"
                />
                <span class="map-row__arrow">→</span>
                <input
                  v-model="entry.value"
                  class="field__input field__input--mono"
                  type="text"
                  placeholder="USA"
                />
                <button
                  v-if="configState.mapEntries.length > 1"
                  class="map-row__remove"
                  type="button"
                  title="Quitar"
                  @click="removeMapEntry(index)"
                >
                  ✕
                </button>
              </div>
              <button class="btn btn--secondary" type="button" @click="addMapEntry">
                + Agregar mapeo
              </button>
            </div>

            <label class="checkbox-field">
              <input v-model="configState.caseInsensitive" type="checkbox" />
              Ignorar mayúsculas/minúsculas
            </label>

            <div class="field">
              <label class="field__label" for="default">Valor por defecto (opcional)</label>
              <input
                id="default"
                v-model="configState.defaultValue"
                class="field__input field__input--mono"
                type="text"
              />
            </div>

            <label class="checkbox-field">
              <input v-model="configState.useLookup" type="checkbox" />
              Buscar el resultado final en otro modelo (lookup)
            </label>

            <div v-if="configState.useLookup" class="lookup-box">
              <div class="field">
                <label class="field__label" for="app_label">App label</label>
                <input
                  id="app_label"
                  v-model="configState.lookup.app_label"
                  class="field__input field__input--mono"
                  type="text"
                />
              </div>
              <div class="field">
                <label class="field__label" for="model">Modelo</label>
                <input
                  id="model"
                  v-model="configState.lookup.model"
                  class="field__input field__input--mono"
                  type="text"
                />
              </div>
              <div class="field">
                <label class="field__label" for="match_field">
                  Campo para buscar (match_field)
                </label>
                <input
                  id="match_field"
                  v-model="configState.lookup.match_field"
                  class="field__input field__input--mono"
                  type="text"
                />
              </div>
              <div class="field">
                <label class="field__label" for="result_field">
                  Campo a devolver (result_field)
                </label>
                <input
                  id="result_field"
                  v-model="configState.lookup.result_field"
                  class="field__input field__input--mono"
                  type="text"
                />
              </div>
            </div>
          </template>

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

      <section class="section section--danger">
        <h2 class="section__title">Eliminar regla</h2>
        <p class="section__hint">
          No se puede eliminar si algún campo de template la sigue usando.
        </p>

        <p v-if="deleteError" class="state state--error">{{ deleteError }}</p>

        <button
          v-if="!showDeleteConfirm"
          class="btn btn--danger"
          type="button"
          @click="showDeleteConfirm = true"
        >
          Eliminar regla
        </button>
        <div v-else class="confirm-row">
          <span class="confirm-row__text">¿Seguro?</span>
          <button
            class="btn btn--danger"
            type="button"
            :disabled="isDeleting"
            @click="handleDelete"
          >
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
  font-size: var(--text-sm);
}

.field__input:focus {
  outline: none;
  border-color: var(--color-navy-700);
  box-shadow: 0 0 0 3px var(--color-navy-50);
}

.field__hint {
  font-size: var(--text-xs);
  color: var(--color-gray-500);
  margin: 0;
}

.field__hint--error {
  color: var(--color-danger);
}

.field__hint code {
  font-family: var(--font-mono);
  background: var(--color-navy-50);
  padding: 1px 4px;
  border-radius: 3px;
}

.checkbox-field {
  display: flex;
  align-items: center;
  gap: var(--space-2);
  font-size: var(--text-sm);
  color: var(--color-gray-900);
  cursor: pointer;
}

.map-row {
  display: flex;
  align-items: center;
  gap: var(--space-2);
  margin-bottom: var(--space-2);
}

.map-row .field__input {
  flex: 1;
}

.map-row__arrow {
  color: var(--color-gray-500);
  flex-shrink: 0;
}

.map-row__remove {
  flex-shrink: 0;
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
}

.map-row__remove:hover {
  color: var(--color-danger);
  background: var(--color-danger-bg);
}

.lookup-box {
  display: flex;
  flex-direction: column;
  gap: var(--space-3);
  padding: var(--space-3);
  background: var(--color-navy-50);
  border: 1px dashed var(--color-gray-300);
  border-radius: var(--radius-md);
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
</style>