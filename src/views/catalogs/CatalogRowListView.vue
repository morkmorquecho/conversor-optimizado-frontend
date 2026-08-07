<script setup>
import { ref, computed, onMounted, watch } from 'vue'
import { useRoute, useRouter, RouterLink } from 'vue-router'
import catalogService from '../../services/catalogs'

const route = useRoute()
const router = useRouter()
const supplierId = route.params.supplierId
const catalogId = route.params.catalogId

const catalog = ref(null)
const rows = ref([])
const count = ref(0)
const currentPage = ref(1)
const hasNext = ref(false)
const hasPrevious = ref(false)

const isLoading = ref(true)
const error = ref(null)

// Orden de columnas: pivot_value primero, luego cada source_name configurado.
const columns = computed(() => {
  if (!catalog.value) return []
  return catalog.value.columns.map((c) => c.source_name)
})

const totalPages = computed(() => Math.max(1, Math.ceil(count.value / 20)))

async function loadCatalog() {
  catalog.value = await catalogService.getCatalog(supplierId, catalogId)
}

async function loadRows(page = 1) {
  isLoading.value = true
  error.value = null
  try {
    const result = await catalogService.getCatalogRows(supplierId, catalogId, { page })
    rows.value = result.results
    count.value = result.count
    hasNext.value = Boolean(result.next)
    hasPrevious.value = Boolean(result.previous)
    currentPage.value = page
  } catch (err) {
    error.value = err.message || 'No se pudieron cargar las filas.'
  } finally {
    isLoading.value = false
  }
}

onMounted(async () => {
  isLoading.value = true
  try {
    await loadCatalog()
    await loadRows(1)
  } catch (err) {
    error.value = err.message || 'No se pudo cargar la información del catálogo.'
    isLoading.value = false
  }
})

function goToPage(page) {
  if (page < 1 || page > totalPages.value) return
  loadRows(page)
}

function goToRow(rowId) {
  router.push({
    name: 'catalog-row-detail',
    params: { supplierId, catalogId, id: rowId },
  })
}
</script>

<template>
  <main class="rows-view">
    <RouterLink :to="`/proveedores/${supplierId}/catalogos/${catalogId}`" class="back-link">
      ← Volver al catálogo
    </RouterLink>

    <p v-if="isLoading && rows.length === 0" class="state">Cargando…</p>
    <p v-else-if="error" class="state state--error">{{ error }}</p>

    <template v-else>
      <header class="rows-view__header">
        <div>
          <h1 class="rows-view__title">Filas</h1>
          <p v-if="catalog" class="rows-view__subtitle">
            {{ catalog.name }} · {{ count.toLocaleString('es-MX') }} filas
          </p>
        </div>
        <div class="rows-view__actions">
          <RouterLink
            :to="`/proveedores/${supplierId}/catalogos/${catalogId}/filas/cargar`"
            class="btn btn--secondary"
          >
            Cargar Excel
          </RouterLink>
        </div>
      </header>

      <p v-if="rows.length === 0" class="state">
        Este catálogo todavía no tiene filas cargadas.
      </p>

      <template v-else>
        <div class="table-wrapper">
          <table class="table">
            <thead>
              <tr>
                <th class="table__pivot-col">{{ catalog.pivot_field_name }}</th>
                <th v-for="col in columns" :key="col">{{ col }}</th>
              </tr>
            </thead>
            <tbody>
              <tr v-for="row in rows" :key="row.id" class="table__row" @click="goToRow(row.id)">
                <td class="table__pivot-col table__pivot-value">{{ row.pivot_value }}</td>
                <td v-for="col in columns" :key="col">{{ row.data?.[col] ?? '—' }}</td>
              </tr>
            </tbody>
          </table>
        </div>

        <nav class="pagination">
          <button
            class="btn btn--secondary"
            type="button"
            :disabled="!hasPrevious || isLoading"
            @click="goToPage(currentPage - 1)"
          >
            ← Anterior
          </button>
          <span class="pagination__label">Página {{ currentPage }} de {{ totalPages }}</span>
          <button
            class="btn btn--secondary"
            type="button"
            :disabled="!hasNext || isLoading"
            @click="goToPage(currentPage + 1)"
          >
            Siguiente →
          </button>
        </nav>
      </template>
    </template>
  </main>
</template>

<style scoped>
.rows-view {
  max-width: 1024px;
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
  text-align: center;
  color: var(--color-gray-500);
  font-size: var(--text-sm);
  padding: var(--space-6) 0;
}

.state--error {
  color: var(--color-danger);
}

.rows-view__header {
  display: flex;
  align-items: flex-start;
  justify-content: space-between;
  gap: var(--space-4);
  margin-bottom: var(--space-6);
  padding-bottom: var(--space-4);
  border-bottom: var(--border);
}

.rows-view__title {
  font-size: var(--text-xl);
  font-weight: 600;
  color: var(--color-navy-900);
  margin: 0;
}

.rows-view__subtitle {
  font-size: var(--text-sm);
  color: var(--color-gray-500);
  margin: var(--space-1) 0 0;
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

.btn--secondary {
  color: var(--color-navy-900);
  background: var(--color-navy-50);
}

.btn--secondary:hover:not(:disabled) {
  background: var(--color-gray-200);
}

.btn--secondary:disabled {
  color: var(--color-gray-500);
  background: var(--color-gray-200);
  cursor: not-allowed;
}

.table-wrapper {
  overflow-x: auto;
  border: 1px solid var(--color-gray-200);
  border-radius: var(--radius-md);
}

.table {
  width: 100%;
  border-collapse: collapse;
  font-size: var(--text-sm);
}

.table thead {
  background: var(--color-navy-50);
}

.table th {
  text-align: left;
  font-weight: 600;
  color: var(--color-navy-900);
  padding: var(--space-3);
  white-space: nowrap;
  border-bottom: 1px solid var(--color-gray-200);
}

.table td {
  padding: var(--space-3);
  color: var(--color-gray-900);
  white-space: nowrap;
  border-bottom: 1px solid var(--color-gray-200);
}

.table__row {
  cursor: pointer;
  transition: background var(--transition-fast);
}

.table__row:hover {
  background: var(--color-navy-50);
}

.table__row:last-child td {
  border-bottom: none;
}

.table__pivot-col {
  position: sticky;
  left: 0;
  background: var(--color-white);
}

.table thead .table__pivot-col {
  background: var(--color-navy-50);
}

.table__pivot-value {
  font-family: var(--font-mono);
  font-weight: 500;
}

.pagination {
  display: flex;
  align-items: center;
  justify-content: center;
  gap: var(--space-4);
  margin-top: var(--space-6);
}

.pagination__label {
  font-size: var(--text-sm);
  color: var(--color-gray-500);
}
</style>