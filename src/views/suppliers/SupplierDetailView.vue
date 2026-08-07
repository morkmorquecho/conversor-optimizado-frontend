<script setup>
import { ref, onMounted } from 'vue'
import { useRoute, useRouter, RouterLink } from 'vue-router'
import catalogService from '../../services/catalogs'

const route = useRoute()
const router = useRouter()
const supplierId = route.params.supplierId

const supplier = ref(null)
const catalogs = ref([])
const templates = ref([])

const isLoading = ref(true)
const error = ref(null)

async function loadSupplierDetail() {
  isLoading.value = true
  error.value = null
  try {
    const [supplierData, catalogsData, templatesData] = await Promise.all([
      catalogService.getSupplier(supplierId),
      catalogService.getSupplierCatalogsSummary(supplierId),
      catalogService.getSupplierTemplates(supplierId),
    ])

    supplier.value = supplierData
    catalogs.value = catalogsData
    templates.value = templatesData
  } catch (err) {
    error.value = err.message || 'No se pudo cargar la información del proveedor.'
  } finally {
    isLoading.value = false
  }
}

onMounted(loadSupplierDetail)

function goToCatalog(catalogId) {
  router.push({
    name: 'supplier-catalog-detail',
    params: { supplierId, catalogId },
  })
}

function goToTemplate(templateId) {
  router.push({
    name: 'extraction-process',
    params: { supplierId, templateId },
  })
}
</script>

<template>
  <main class="detail">
    <RouterLink to="/" class="back-link">← Volver a proveedores</RouterLink>

    <p v-if="isLoading" class="state">Cargando…</p>
    <p v-else-if="error" class="state state--error">{{ error }}</p>

    <template v-else-if="supplier">
      <header class="detail__header">
        <h1 class="detail__name">{{ supplier.name }}</h1>
        <span class="detail__code">{{ supplier.code }}</span>
      </header>

      <div class="sections">
        <!-- ── CATÁLOGOS ── -->
        <section class="section">
          <div class="section__header">
            <h2 class="section__title">Catálogos</h2>
            <span class="section__count">{{ catalogs.length }}</span>
          </div>

          <p v-if="catalogs.length === 0" class="section__empty">
            Este proveedor no tiene catálogos registrados.
          </p>

          <ul v-else class="item-list">
            <li v-for="catalog in catalogs" :key="catalog.id">
              <button
                class="item-card"
                :class="{ 'item-card--inactive': !catalog.is_active }"
                type="button"
                @click="goToCatalog(catalog.id)"
              >
                <span class="item-card__main">
                  <span class="item-card__name">{{ catalog.name }}</span>
                  <span class="item-card__meta">
                    {{ catalog.rows_count.toLocaleString('es-MX') }} filas
                  </span>
                </span>
                <span class="item-card__side">
                  <span
                    class="status-badge"
                    :class="catalog.is_active ? 'status-badge--active' : 'status-badge--inactive'"
                  >
                    {{ catalog.is_active ? 'Activo' : 'Inactivo' }}
                  </span>
                  <svg class="item-card__chevron" viewBox="0 0 20 20" fill="none" aria-hidden="true">
                    <path
                      d="M7.5 4.5L13 10L7.5 15.5"
                      stroke="currentColor"
                      stroke-width="1.5"
                      stroke-linecap="round"
                      stroke-linejoin="round"
                    />
                  </svg>
                </span>
              </button>
            </li>
          </ul>
        </section>

        <!-- ── TEMPLATES ── -->
        <section class="section">
          <div class="section__header">
            <h2 class="section__title">Templates</h2>
            <span class="section__count">{{ templates.length }}</span>
          </div>

          <p v-if="templates.length === 0" class="section__empty">
            Este proveedor no tiene templates registrados.
          </p>

          <ul v-else class="item-list">
            <li v-for="template in templates" :key="template.id">
              <button
                class="item-card"
                :class="{ 'item-card--inactive': !template.is_active }"
                type="button"
                :disabled="!template.is_active"
                @click="goToTemplate(template.id)"
              >
                <span class="item-card__main">
                  <span class="item-card__name">{{ template.name }}</span>
                  <span class="item-card__meta">
                    {{ template.layout }} · {{ template.document_type.toUpperCase() }}
                  </span>
                </span>
                <span class="item-card__side">
                  <span
                    class="status-badge"
                    :class="template.is_active ? 'status-badge--active' : 'status-badge--inactive'"
                  >
                    {{ template.is_active ? 'Activo' : 'Inactivo' }}
                  </span>
                  <svg
                    v-if="template.is_active"
                    class="item-card__chevron"
                    viewBox="0 0 20 20"
                    fill="none"
                    aria-hidden="true"
                  >
                    <path
                      d="M7.5 4.5L13 10L7.5 15.5"
                      stroke="currentColor"
                      stroke-width="1.5"
                      stroke-linecap="round"
                      stroke-linejoin="round"
                    />
                  </svg>
                </span>
              </button>
            </li>
          </ul>
        </section>
      </div>
    </template>
  </main>
</template>

<style scoped>
.detail {
  max-width: 880px;
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
  padding: var(--space-8) 0;
}

.state--error {
  color: var(--color-danger);
}

.detail__header {
  display: flex;
  align-items: baseline;
  gap: var(--space-3);
  margin-bottom: var(--space-8);
  padding-bottom: var(--space-4);
  border-bottom: var(--border);
}

.detail__name {
  font-size: var(--text-2xl);
  font-weight: 600;
  color: var(--color-navy-900);
  margin: 0;
}

.detail__code {
  font-family: var(--font-mono);
  font-size: var(--text-sm);
  color: var(--color-gray-500);
}

.sections {
  display: grid;
  grid-template-columns: 1fr;
  gap: var(--space-8);
}

@media (min-width: 720px) {
  .sections {
    grid-template-columns: 1fr 1fr;
  }
}

.section__header {
  display: flex;
  align-items: center;
  gap: var(--space-2);
  margin-bottom: var(--space-4);
}

.section__title {
  font-size: var(--text-lg);
  font-weight: 600;
  color: var(--color-navy-900);
  margin: 0;
}

.section__count {
  font-family: var(--font-mono);
  font-size: var(--text-xs);
  color: var(--color-gray-500);
  background: var(--color-navy-50);
  border-radius: var(--radius-sm);
  padding: 2px 8px;
}

.section__empty {
  font-size: var(--text-sm);
  color: var(--color-gray-500);
  padding: var(--space-4);
  border: 1px dashed var(--color-gray-300);
  border-radius: var(--radius-md);
  margin: 0;
}

.item-list {
  list-style: none;
  margin: 0;
  padding: 0;
  display: flex;
  flex-direction: column;
  gap: var(--space-2);
}

.item-card {
  width: 100%;
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: var(--space-3);
  padding: var(--space-3) var(--space-4);
  background: var(--color-white);
  border: 1px solid var(--color-gray-200);
  border-radius: var(--radius-md);
  font-family: var(--font-ui);
  text-align: left;
  cursor: pointer;
  transition: border-color var(--transition-fast), background var(--transition-fast);
}

.item-card--static {
  cursor: default;
}

.item-card:not(.item-card--static):hover {
  border-color: var(--color-navy-700);
  background: var(--color-navy-50);
}

.item-card:disabled {
  cursor: default;
}

.item-card--inactive {
  opacity: 0.6;
}

.item-card__main {
  display: flex;
  flex-direction: column;
  gap: 2px;
  min-width: 0;
}

.item-card__side {
  display: flex;
  align-items: center;
  gap: var(--space-3);
  flex-shrink: 0;
}

.item-card__meta {
  font-size: var(--text-xs);
  color: var(--color-gray-500);
  font-family: var(--font-mono);
}

.status-badge {
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

.item-card__name {
  font-size: var(--text-sm);
  font-weight: 500;
  color: var(--color-gray-900);
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
}

.item-card__chevron {
  flex-shrink: 0;
  width: 16px;
  height: 16px;
  color: var(--color-gray-500);
  transition: transform var(--transition-fast), color var(--transition-fast);
}

.item-card:hover .item-card__chevron {
  color: var(--color-navy-700);
  transform: translateX(2px);
}

@media (prefers-reduced-motion: reduce) {
  .item-card,
  .item-card__chevron {
    transition: none;
  }
}
</style>