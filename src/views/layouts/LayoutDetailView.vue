<script setup>
import { ref, onMounted } from 'vue'
import { useRoute, useRouter, RouterLink } from 'vue-router'
import layoutService from '../../services/layouts'

const route = useRoute()
const router = useRouter()
const layoutId = route.params.layoutId

const layout = ref(null)
const form = ref({ code: '', name: '' })

const isLoading = ref(true)
const loadError = ref(null)

const isSaving = ref(false)
const saveError = ref(null)
const saveSuccess = ref(false)

const newFieldName = ref('')
const isAddingField = ref(false)
const fieldError = ref(null)

const isReordering = ref(false)

const isDeleting = ref(false)
const deleteError = ref(null)
const showDeleteConfirm = ref(false)

async function loadLayout() {
  isLoading.value = true
  loadError.value = null
  try {
    const data = await layoutService.getLayout(layoutId)
    layout.value = data
    form.value = { code: data.code, name: data.name }
  } catch (err) {
    loadError.value = err.message || 'No se pudo cargar el layout.'
  } finally {
    isLoading.value = false
  }
}

onMounted(loadLayout)

async function handleSave() {
  isSaving.value = true
  saveError.value = null
  saveSuccess.value = false
  try {
    await layoutService.patchLayout(layoutId, form.value)
    await loadLayout()
    saveSuccess.value = true
  } catch (err) {
    saveError.value = err
  } finally {
    isSaving.value = false
  }
}

async function handleAddField() {
  if (!newFieldName.value.trim()) return

  isAddingField.value = true
  fieldError.value = null
  try {
    const nextOrder = layout.value.layout_fields.length + 1
    await layoutService.createLayoutField(layoutId, {
      name: newFieldName.value.trim(),
      sort_order: nextOrder,
    })
    newFieldName.value = ''
    await loadLayout()
  } catch (err) {
    fieldError.value = err
  } finally {
    isAddingField.value = false
  }
}

async function handleDeleteField(fieldId) {
  fieldError.value = null
  try {
    await layoutService.deleteLayoutField(layoutId, fieldId)
    await loadLayout()
  } catch (err) {
    fieldError.value = err
  }
}

async function moveField(index, direction) {
  const fields = [...layout.value.layout_fields]
  const targetIndex = index + direction
  if (targetIndex < 0 || targetIndex >= fields.length) return

  ;[fields[index], fields[targetIndex]] = [fields[targetIndex], fields[index]]

  isReordering.value = true
  fieldError.value = null
  try {
    await layoutService.reorderLayoutFields(
      layoutId,
      fields.map((f) => f.id),
    )
    await loadLayout()
  } catch (err) {
    fieldError.value = err
  } finally {
    isReordering.value = false
  }
}

async function handleDeleteLayout() {
  isDeleting.value = true
  deleteError.value = null
  try {
    await layoutService.deleteLayout(layoutId)
    router.push({ name: 'layout-list' })
  } catch (err) {
    deleteError.value = err.message || 'No se pudo eliminar el layout.'
    isDeleting.value = false
  }
}
</script>

<template>
  <main class="detail">
    <RouterLink to="/layouts" class="back-link">← Volver a layouts</RouterLink>

    <p v-if="isLoading" class="state">Cargando…</p>
    <p v-else-if="loadError" class="state state--error">{{ loadError }}</p>

    <template v-else-if="layout">
      <header class="detail__header">
        <h1 class="detail__title">{{ layout.name }}</h1>
        <span class="detail__code">{{ layout.code }}</span>
      </header>

      <!-- ── EDITAR ── -->
      <section class="section">
        <h2 class="section__title">Editar layout</h2>

        <form class="form" @submit.prevent="handleSave">
          <div class="field">
            <label class="field__label" for="code">Código</label>
            <input
              id="code"
              v-model="form.code"
              class="field__input field__input--mono"
              type="text"
              required
            />
          </div>

          <div class="field">
            <label class="field__label" for="name">Nombre</label>
            <input id="name" v-model="form.name" class="field__input" type="text" required />
          </div>

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

      <!-- ── CAMPOS ── -->
      <section class="section">
        <h2 class="section__title">Campos</h2>
        <p class="section__hint">
          Orden en que se arma la fila de salida. Los templates mapean sus columnas a estos
          campos.
        </p>

        <p v-if="fieldError" class="state state--error">
          {{ fieldError.message }}
          <span v-if="fieldError.type === 'field_errors'">
            — {{ Object.values(fieldError.context).flat().join(' ') }}
          </span>
        </p>

        <p v-if="layout.layout_fields.length === 0" class="state">
          Este layout todavía no tiene campos.
        </p>

        <ol v-else class="field-list">
          <li v-for="(field, index) in layout.layout_fields" :key="field.id" class="field-row">
            <span class="field-row__order">{{ field.sort_order }}</span>
            <span class="field-row__name">{{ field.name }}</span>
            <span class="field-row__actions">
              <button
                class="icon-btn"
                type="button"
                title="Subir"
                :disabled="index === 0 || isReordering"
                @click="moveField(index, -1)"
              >
                ↑
              </button>
              <button
                class="icon-btn"
                type="button"
                title="Bajar"
                :disabled="index === layout.layout_fields.length - 1 || isReordering"
                @click="moveField(index, 1)"
              >
                ↓
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
        </ol>

        <form class="add-field-form" @submit.prevent="handleAddField">
          <input
            v-model="newFieldName"
            class="field__input"
            type="text"
            placeholder="Nombre del campo, ej. invoice_date"
            required
          />
          <button class="btn btn--secondary" type="submit" :disabled="isAddingField">
            {{ isAddingField ? 'Agregando…' : '+ Agregar campo' }}
          </button>
        </form>
      </section>

      <!-- ── ELIMINAR ── -->
      <section class="section section--danger">
        <h2 class="section__title">Eliminar layout</h2>
        <p class="section__hint">
          No se puede eliminar si hay templates activos usando este layout.
        </p>

        <p v-if="deleteError" class="state state--error">{{ deleteError }}</p>

        <button
          v-if="!showDeleteConfirm"
          class="btn btn--danger"
          type="button"
          @click="showDeleteConfirm = true"
        >
          Eliminar layout
        </button>
        <div v-else class="confirm-row">
          <span class="confirm-row__text">¿Seguro?</span>
          <button
            class="btn btn--danger"
            type="button"
            :disabled="isDeleting"
            @click="handleDeleteLayout"
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
  display: flex;
  align-items: baseline;
  gap: var(--space-3);
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

.detail__code {
  font-family: var(--font-mono);
  font-size: var(--text-sm);
  color: var(--color-gray-500);
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
  flex-shrink: 0;
}

.btn--secondary:hover:not(:disabled) {
  background: var(--color-gray-200);
}

.btn--secondary:disabled {
  color: var(--color-gray-500);
  cursor: not-allowed;
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

.field-list {
  list-style: none;
  margin: 0 0 var(--space-4);
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

.field-row__order {
  font-family: var(--font-mono);
  font-size: var(--text-xs);
  color: var(--color-gray-500);
  width: 1.5em;
  text-align: right;
}

.field-row__name {
  flex: 1;
  font-size: var(--text-sm);
  color: var(--color-gray-900);
}

.field-row__actions {
  display: flex;
  gap: var(--space-1);
}

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

.icon-btn:hover:not(:disabled) {
  background: var(--color-navy-50);
  color: var(--color-navy-700);
}

.icon-btn:disabled {
  opacity: 0.3;
  cursor: not-allowed;
}

.icon-btn--danger:hover:not(:disabled) {
  background: var(--color-danger-bg);
  color: var(--color-danger);
}

.add-field-form {
  display: flex;
  gap: var(--space-2);
}

.add-field-form .field__input {
  flex: 1;
}
</style>