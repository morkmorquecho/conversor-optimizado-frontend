<script setup>
import { ref, onMounted } from 'vue'
import { useRouter } from 'vue-router'
import normalization from '../../services/normalization'
import NormalizationRuleConfigFields from './NormalizationRuleConfigFields.vue'

const router = useRouter()

const rules = ref([])
const isLoading = ref(true)
const loadError = ref(null)

const showCreateForm = ref(false)
const isCreating = ref(false)
const createError = ref(null)

const RULE_TYPES = [
  { value: 'trim', label: 'Trim (quitar espacios)' },
  { value: 'uppercase', label: 'Uppercase' },
  { value: 'date_format', label: 'Date format' },
  { value: 'value_map', label: 'Value map' },
  { value: 'regex_replace', label: 'Regex replace' },
]

const newRule = ref({ name: '', description: '', rule_type: 'trim' })
const newRuleConfig = ref({})

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

async function loadRules() {
  isLoading.value = true
  loadError.value = null
  try {
    rules.value = await fetchAll((params) => normalization.getRules(params))
  } catch (err) {
    loadError.value = err.message || 'No se pudieron cargar las reglas.'
  } finally {
    isLoading.value = false
  }
}

onMounted(loadRules)

function goToRule(ruleId) {
  router.push({ name: 'normalization-rule-detail', params: { ruleId } })
}

async function handleCreate() {
  isCreating.value = true
  createError.value = null
  try {
    await normalization.createRule({
      name: newRule.value.name,
      description: newRule.value.description,
      rule_type: newRule.value.rule_type,
      config: newRuleConfig.value,
    })
    newRule.value = { name: '', description: '', rule_type: 'trim' }
    newRuleConfig.value = {}
    showCreateForm.value = false
    await loadRules()
  } catch (err) {
    createError.value = err
  } finally {
    isCreating.value = false
  }
}
</script>

<template>
  <main class="list">
    <header class="list__header">
      <h1 class="list__title">Reglas de normalización</h1>
      <button class="btn btn--primary" type="button" @click="showCreateForm = !showCreateForm">
        {{ showCreateForm ? 'Cancelar' : '+ Nueva regla' }}
      </button>
    </header>
    <p class="list__hint">
      Se encadenan a los campos mapeados de un template para limpiar/transformar valores antes
      de escribirlos en el layout de salida.
    </p>

    <form v-if="showCreateForm" class="create-form" @submit.prevent="handleCreate">
      <div class="field">
        <label class="field__label" for="name">Nombre</label>
        <input
          id="name"
          v-model="newRule.name"
          class="field__input"
          type="text"
          placeholder="trim_espacios"
          required
        />
      </div>

      <div class="field">
        <label class="field__label" for="description">Descripción</label>
        <input
          id="description"
          v-model="newRule.description"
          class="field__input"
          type="text"
          placeholder="Quita espacios al inicio/final del valor"
        />
      </div>

      <div class="field">
        <label class="field__label" for="rule_type">Tipo</label>
        <select id="rule_type" v-model="newRule.rule_type" class="field__input">
          <option v-for="t in RULE_TYPES" :key="t.value" :value="t.value">{{ t.label }}</option>
        </select>
      </div>

      <NormalizationRuleConfigFields
        :key="newRule.rule_type"
        v-model="newRuleConfig"
        :rule-type="newRule.rule_type"
      />

      <p v-if="createError" class="state state--error">
        {{ createError.message }}
        <span v-if="createError.type === 'field_errors'">
          — {{ Object.values(createError.context).flat().join(' ') }}
        </span>
      </p>

      <button class="btn btn--primary" type="submit" :disabled="isCreating">
        {{ isCreating ? 'Creando…' : 'Crear regla' }}
      </button>
    </form>

    <p v-if="isLoading" class="state">Cargando…</p>
    <p v-else-if="loadError" class="state state--error">{{ loadError }}</p>
    <p v-else-if="rules.length === 0" class="state">Todavía no hay reglas creadas.</p>

    <ul v-else class="rule-list">
      <li v-for="rule in rules" :key="rule.id">
        <button class="rule-card" type="button" @click="goToRule(rule.id)">
          <span class="rule-card__main">
            <span class="rule-card__name">{{ rule.name }}</span>
            <span class="rule-card__desc">{{ rule.description || '—' }}</span>
          </span>
          <span class="rule-card__type">{{ rule.rule_type }}</span>
        </button>
      </li>
    </ul>
  </main>
</template>

<style scoped>
.list {
  max-width: 640px;
  margin: 0 auto;
  padding: var(--space-8) var(--space-4) var(--space-12);
}

.list__header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: var(--space-4);
  margin-bottom: var(--space-2);
}

.list__title {
  font-size: var(--text-xl);
  font-weight: 600;
  color: var(--color-navy-900);
  margin: 0;
}

.list__hint {
  font-size: var(--text-sm);
  color: var(--color-gray-500);
  margin: 0 0 var(--space-6);
  padding-bottom: var(--space-4);
  border-bottom: var(--border);
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

.rule-list {
  list-style: none;
  margin: 0;
  padding: 0;
  display: flex;
  flex-direction: column;
  gap: var(--space-2);
}

.rule-card {
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

.rule-card:hover {
  border-color: var(--color-navy-700);
  background: var(--color-navy-50);
}

.rule-card__main {
  display: flex;
  flex-direction: column;
  gap: 2px;
  min-width: 0;
}

.rule-card__name {
  font-size: var(--text-base);
  font-weight: 500;
  color: var(--color-gray-900);
}

.rule-card__desc {
  font-size: var(--text-xs);
  color: var(--color-gray-500);
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
}

.rule-card__type {
  flex-shrink: 0;
  font-family: var(--font-mono);
  font-size: var(--text-xs);
  color: var(--color-navy-700);
  background: var(--color-navy-50);
  padding: 2px 8px;
  border-radius: var(--radius-sm);
}
</style>