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
const form = ref({ name: '', layout: '', document_type: 'xlsx', is_active: true })

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

async function loadTemplate() {
  isLoading.value = true
  loadError.value = null
  try {
    const [data, layoutsData] = await Promise.all([
      templateService.getTemplate(supplierId, templateId),
      fetchAll((params) => layoutService.getLayouts(params)),
    ])
    template.value = data
    layouts.value = layoutsData
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
    const updated = await templateService.patchTemplate(supplierId, templateId, form.value)
    template.value = updated
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

      <!-- ── EDITAR ── -->
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

      <!-- ── CAMPOS MAPEADOS (pendiente) ── -->
      <section class="section">
        <h2 class="section__title">Campos mapeados</h2>
        <p class="section__hint">
          La gestión de campos y reglas de normalización de este template todavía no está
          construida en esta interfaz — por ahora se administra desde el admin.
        </p>
      </section>

      <!-- ── ELIMINAR ── -->
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
  margin: 0;
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
</style>