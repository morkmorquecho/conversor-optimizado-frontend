<script setup>
import { ref, watch } from 'vue'

const props = defineProps({
  ruleType: { type: String, required: true },
  modelValue: { type: Object, required: true },
})
const emit = defineEmits(['update:modelValue'])

// ── regex_replace ──
const pattern = ref(props.modelValue.pattern ?? '')
const replacement = ref(props.modelValue.replacement ?? '')

// ── date_format ──
const inputFormat = ref(props.modelValue.input_format ?? '')
const outputFormat = ref(props.modelValue.output_format ?? '')

// ── value_map ──
const mapRows = ref(
  Object.entries(props.modelValue.map ?? {}).map(([key, value]) => ({ key, value })),
)
if (mapRows.value.length === 0) mapRows.value.push({ key: '', value: '' })
const caseInsensitive = ref(props.modelValue.case_insensitive ?? true)
const defaultValue = ref(props.modelValue.default ?? '')
const useLookup = ref(Boolean(props.modelValue.lookup))
const lookup = ref({
  app_label: props.modelValue.lookup?.app_label ?? '',
  model: props.modelValue.lookup?.model ?? '',
  match_field: props.modelValue.lookup?.match_field ?? '',
  result_field: props.modelValue.lookup?.result_field ?? '',
})

function addMapRow() {
  mapRows.value.push({ key: '', value: '' })
}

function removeMapRow(index) {
  mapRows.value.splice(index, 1)
}

function buildConfig() {
  if (props.ruleType === 'trim' || props.ruleType === 'uppercase') {
    return {}
  }

  if (props.ruleType === 'regex_replace') {
    return { pattern: pattern.value, replacement: replacement.value }
  }

  if (props.ruleType === 'date_format') {
    return { input_format: inputFormat.value, output_format: outputFormat.value }
  }

  if (props.ruleType === 'value_map') {
    const map = {}
    for (const row of mapRows.value) {
      if (row.key.trim()) map[row.key.trim()] = row.value
    }
    const config = { map, case_insensitive: caseInsensitive.value }
    if (defaultValue.value.trim()) config.default = defaultValue.value
    if (useLookup.value) {
      config.lookup = { ...lookup.value }
    }
    return config
  }

  return {}
}

// Emitimos cada vez que algo cambia, en cualquiera de las ramas activas.
watch(
  [pattern, replacement, inputFormat, outputFormat, mapRows, caseInsensitive, defaultValue, useLookup, lookup],
  () => emit('update:modelValue', buildConfig()),
  { deep: true, immediate: true },
)
</script>

<template>
  <div class="config-fields">
    <p v-if="ruleType === 'trim' || ruleType === 'uppercase'" class="config-fields__hint">
      Esta regla no necesita configuración adicional.
    </p>

    <template v-else-if="ruleType === 'regex_replace'">
      <div class="field">
        <label class="field__label">Patrón (regex)</label>
        <input v-model="pattern" class="field__input field__input--mono" type="text" placeholder="[^0-9]" />
      </div>
      <div class="field">
        <label class="field__label">Reemplazo</label>
        <input v-model="replacement" class="field__input field__input--mono" type="text" placeholder="" />
      </div>
    </template>

    <template v-else-if="ruleType === 'date_format'">
      <div class="field">
        <label class="field__label">Formato de entrada</label>
        <input
          v-model="inputFormat"
          class="field__input field__input--mono"
          type="text"
          placeholder="%Y%m%d"
        />
      </div>
      <div class="field">
        <label class="field__label">Formato de salida</label>
        <input
          v-model="outputFormat"
          class="field__input field__input--mono"
          type="text"
          placeholder="%d/%m/%Y"
        />
      </div>
      <p class="config-fields__hint">
        Códigos estándar de <code>strptime/strftime</code>: %Y año, %m mes, %d día.
      </p>
    </template>

    <template v-else-if="ruleType === 'value_map'">
      <div class="field">
        <label class="field__label">Mapeo de valores</label>
        <div class="map-row" v-for="(row, index) in mapRows" :key="index">
          <input v-model="row.key" class="field__input field__input--mono" type="text" placeholder="DLS" />
          <span class="map-row__arrow">→</span>
          <input v-model="row.value" class="field__input field__input--mono" type="text" placeholder="USA" />
          <button
            v-if="mapRows.length > 1"
            class="map-row__remove"
            type="button"
            title="Quitar"
            @click="removeMapRow(index)"
          >
            ✕
          </button>
        </div>
        <button class="btn btn--secondary" type="button" @click="addMapRow">+ Agregar mapeo</button>
      </div>

      <label class="checkbox-field">
        <input v-model="caseInsensitive" type="checkbox" />
        Ignorar mayúsculas/minúsculas al comparar
      </label>

      <div class="field">
        <label class="field__label">Valor por defecto (opcional)</label>
        <input
          v-model="defaultValue"
          class="field__input field__input--mono"
          type="text"
          placeholder="Se deja el valor original si no se llena"
        />
      </div>

      <label class="checkbox-field">
        <input v-model="useLookup" type="checkbox" />
        Buscar el resultado final en otro modelo (lookup en base de datos)
      </label>

      <div v-if="useLookup" class="lookup-box">
        <div class="field">
          <label class="field__label">App label</label>
          <input v-model="lookup.app_label" class="field__input field__input--mono" type="text" placeholder="catalogs" />
        </div>
        <div class="field">
          <label class="field__label">Modelo</label>
          <input v-model="lookup.model" class="field__input field__input--mono" type="text" placeholder="Currency" />
        </div>
        <div class="field">
          <label class="field__label">Campo de búsqueda (match_field)</label>
          <input v-model="lookup.match_field" class="field__input field__input--mono" type="text" placeholder="country" />
        </div>
        <div class="field">
          <label class="field__label">Campo de resultado (result_field)</label>
          <input v-model="lookup.result_field" class="field__input field__input--mono" type="text" placeholder="code" />
        </div>
      </div>
    </template>
  </div>
</template>

<style scoped>
.config-fields {
  display: flex;
  flex-direction: column;
  gap: var(--space-4);
}

.config-fields__hint {
  font-size: var(--text-xs);
  color: var(--color-gray-500);
  margin: 0;
}

.config-fields__hint code {
  font-family: var(--font-mono);
  background: var(--color-white);
  padding: 1px 4px;
  border-radius: 3px;
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

.map-row__remove:hover {
  color: var(--color-danger);
  background: var(--color-danger-bg);
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
}

.btn--secondary:hover {
  background: var(--color-gray-200);
}

.checkbox-field {
  display: flex;
  align-items: center;
  gap: var(--space-2);
  font-size: var(--text-sm);
  color: var(--color-gray-900);
  cursor: pointer;
}

.lookup-box {
  display: flex;
  flex-direction: column;
  gap: var(--space-4);
  padding: var(--space-3);
  background: var(--color-white);
  border-radius: var(--radius-md);
}
</style>