<script setup>
import { ref, computed, onMounted } from 'vue'
import { useRouter } from 'vue-router'
import catalogService from '../../services/catalogs'

const router = useRouter()

const suppliers = ref([])
const query = ref('')
const isLoading = ref(true)
const error = ref(null)

// El endpoint de suppliers no expone parámetro de búsqueda ni paginación
// (devuelve un array plano), así que filtramos en el cliente.
// Si el backend agrega ?search= más adelante, esto se reemplaza por
// una llamada por cada input (con debounce).
async function loadSuppliers() {
  isLoading.value = true
  error.value = null
  try {
    suppliers.value = await catalogService.getSuppliers()
  } catch (err) {
    error.value = err.message || 'No se pudieron cargar los proveedores.'
  } finally {
    isLoading.value = false
  }
}

onMounted(loadSuppliers)

const filteredSuppliers = computed(() => {
  const term = query.value.trim().toLowerCase()
  if (!term) return suppliers.value
  return suppliers.value.filter(
    (s) => s.name.toLowerCase().includes(term) || s.code.toLowerCase().includes(term),
  )
})

function goToSupplier(supplierId) {
  router.push({ name: 'supplier-detail', params: { supplierId } })
}
</script>

<template>
  <main class="home">
    <div class="home__search-block">
      <h1 class="home__title">Buscar proveedor</h1>
      <p class="home__subtitle">Selecciona un proveedor para ver sus catálogos y templates.</p>

      <div class="search-input">
        <svg class="search-input__icon" viewBox="0 0 20 20" fill="none" aria-hidden="true">
          <circle cx="9" cy="9" r="6.5" stroke="currentColor" stroke-width="1.5" />
          <path d="M14 14L18 18" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" />
        </svg>
        <input
          v-model="query"
          type="text"
          placeholder="Buscar por nombre o código…"
          aria-label="Buscar proveedor por nombre o código"
          autofocus
        />
      </div>
    </div>

    <section class="results" aria-live="polite">
      <p v-if="isLoading" class="results__state">Cargando proveedores…</p>

      <p v-else-if="error" class="results__state results__state--error">{{ error }}</p>

      <p v-else-if="filteredSuppliers.length === 0" class="results__state">
        No se encontraron proveedores{{ query ? ` para "${query}"` : '' }}.
      </p>

      <ul v-else class="supplier-list">
        <li v-for="supplier in filteredSuppliers" :key="supplier.id">
          <button class="supplier-card" type="button" @click="goToSupplier(supplier.id)">
            <span class="supplier-card__info">
              <span class="supplier-card__name">{{ supplier.name }}</span>
              <span class="supplier-card__code">{{ supplier.code }}</span>
            </span>
            <svg class="supplier-card__chevron" viewBox="0 0 20 20" fill="none" aria-hidden="true">
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
    </section>
  </main>
</template>

<style scoped>
.home {
  max-width: 640px;
  margin: 0 auto;
  padding: var(--space-12) var(--space-4) var(--space-8);
}

.home__search-block {
  text-align: center;
  margin-bottom: var(--space-8);
}

.home__title {
  font-size: var(--text-2xl);
  font-weight: 600;
  color: var(--color-navy-900);
  margin: 0 0 var(--space-2);
}

.home__subtitle {
  font-size: var(--text-sm);
  color: var(--color-gray-500);
  margin: 0 0 var(--space-6);
}

.search-input {
  position: relative;
  display: flex;
  align-items: center;
}

.search-input__icon {
  position: absolute;
  left: var(--space-3);
  width: 18px;
  height: 18px;
  color: var(--color-gray-500);
  pointer-events: none;
}

.search-input input {
  width: 100%;
  padding: var(--space-3) var(--space-4) var(--space-3) 2.5rem;
  font-size: var(--text-base);
  font-family: var(--font-ui);
  color: var(--color-gray-900);
  background: var(--color-white);
  border: 1px solid var(--color-gray-300);
  border-radius: var(--radius-md);
  transition: border-color var(--transition-fast), box-shadow var(--transition-fast);
}

.search-input input::placeholder {
  color: var(--color-gray-500);
}

.search-input input:focus {
  outline: none;
  border-color: var(--color-navy-700);
  box-shadow: 0 0 0 3px var(--color-navy-50);
}

.results__state {
  text-align: center;
  color: var(--color-gray-500);
  font-size: var(--text-sm);
  padding: var(--space-6) 0;
}

.results__state--error {
  color: var(--color-danger);
}

.supplier-list {
  list-style: none;
  margin: 0;
  padding: 0;
  display: flex;
  flex-direction: column;
  gap: var(--space-2);
}

.supplier-card {
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

.supplier-card:hover {
  border-color: var(--color-navy-700);
  background: var(--color-navy-50);
}

.supplier-card__info {
  display: flex;
  flex-direction: column;
  gap: var(--space-1);
  min-width: 0;
}

.supplier-card__name {
  font-size: var(--text-base);
  font-weight: 500;
  color: var(--color-gray-900);
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
}

.supplier-card__code {
  font-family: var(--font-mono);
  font-size: var(--text-xs);
  color: var(--color-gray-500);
  letter-spacing: 0.02em;
}

.supplier-card__chevron {
  flex-shrink: 0;
  width: 18px;
  height: 18px;
  color: var(--color-gray-500);
  transition: transform var(--transition-fast), color var(--transition-fast);
}

.supplier-card:hover .supplier-card__chevron {
  color: var(--color-navy-700);
  transform: translateX(2px);
}

@media (prefers-reduced-motion: reduce) {
  .search-input input,
  .supplier-card,
  .supplier-card__chevron {
    transition: none;
  }
}
</style>