<script setup>
import { ref, onMounted } from 'vue'
import { useRouter } from 'vue-router'
import layoutService from '../../services/layouts'

const router = useRouter()

const layouts = ref([])
const isLoading = ref(true)
const loadError = ref(null)

const showCreateForm = ref(false)
const isCreating = ref(false)
const createError = ref(null)
const newLayout = ref({ code: '', name: '' })

async function loadLayouts() {
  isLoading.value = true
  loadError.value = null
  try {
    let page = 1
    let all = []
    let hasNext = true

    while (hasNext) {
      const { results, next } = await layoutService.getLayouts({ page })
      all = all.concat(results)
      hasNext = Boolean(next)
      page += 1
    }

    layouts.value = all
  } catch (err) {
    loadError.value = err.message || 'No se pudieron cargar los layouts.'
  } finally {
    isLoading.value = false
  }
}

onMounted(loadLayouts)

function goToLayout(layoutId) {
  router.push({ name: 'layout-detail', params: { layoutId } })
}

async function handleCreate() {
  isCreating.value = true
  createError.value = null
  try {
    await layoutService.createLayout(newLayout.value)
    newLayout.value = { code: '', name: '' }
    showCreateForm.value = false
    await loadLayouts()
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
      <h1 class="list__title">Layouts</h1>
      <button class="btn btn--primary" type="button" @click="showCreateForm = !showCreateForm">
        {{ showCreateForm ? 'Cancelar' : '+ Nuevo layout' }}
      </button>
    </header>
    <p class="list__hint">
      Un layout define la estructura destino (campos y orden) a la que se mapean los templates
      de factura de cada proveedor.
    </p>

    <form v-if="showCreateForm" class="create-form" @submit.prevent="handleCreate">
      <div class="field">
        <label class="field__label" for="code">Código</label>
        <input
          id="code"
          v-model="newLayout.code"
          class="field__input field__input--mono"
          type="text"
          placeholder="CASA_AZUL"
          required
        />
        <p class="field__hint">Identificador único, sin espacios.</p>
      </div>

      <div class="field">
        <label class="field__label" for="name">Nombre</label>
        <input
          id="name"
          v-model="newLayout.name"
          class="field__input"
          type="text"
          placeholder="Casa Azul"
          required
        />
      </div>

      <p v-if="createError" class="state state--error">
        {{ createError.message }}
        <span v-if="createError.type === 'field_errors'">
          — {{ Object.values(createError.context).flat().join(' ') }}
        </span>
      </p>

      <button class="btn btn--primary" type="submit" :disabled="isCreating">
        {{ isCreating ? 'Creando…' : 'Crear layout' }}
      </button>
    </form>

    <p v-if="isLoading" class="state">Cargando…</p>
    <p v-else-if="loadError" class="state state--error">{{ loadError }}</p>
    <p v-else-if="layouts.length === 0" class="state">Todavía no hay layouts creados.</p>

    <ul v-else class="layout-list">
      <li v-for="layout in layouts" :key="layout.id">
        <button class="layout-card" type="button" @click="goToLayout(layout.id)">
          <span class="layout-card__main">
            <span class="layout-card__name">{{ layout.name }}</span>
            <span class="layout-card__code">{{ layout.code }}</span>
          </span>
          <svg class="layout-card__chevron" viewBox="0 0 20 20" fill="none" aria-hidden="true">
            <path
              d="M7.5 4.5L13 10L7.5 15.5"
              stroke="currentColor"
              stroke-width="1.5"
              stroke-linecap="round"
              stroke-linejoin="round"
            />
          </svg>
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

.layout-list {
  list-style: none;
  margin: 0;
  padding: 0;
  display: flex;
  flex-direction: column;
  gap: var(--space-2);
}

.layout-card {
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

.layout-card:hover {
  border-color: var(--color-navy-700);
  background: var(--color-navy-50);
}

.layout-card__main {
  display: flex;
  flex-direction: column;
  gap: 2px;
}

.layout-card__name {
  font-size: var(--text-base);
  font-weight: 500;
  color: var(--color-gray-900);
}

.layout-card__code {
  font-family: var(--font-mono);
  font-size: var(--text-xs);
  color: var(--color-gray-500);
}

.layout-card__chevron {
  flex-shrink: 0;
  width: 18px;
  height: 18px;
  color: var(--color-gray-500);
}
</style>