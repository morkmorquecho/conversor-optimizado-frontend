import { createRouter, createWebHistory } from 'vue-router'

// Vistas — agrupadas por recurso según el YAML actualizado
const HomeView = () => import('../views/home/HomeView.vue')
const CatalogDeduplicateView = () => import('../views/catalogs/CatalogDeduplicateView.vue')

const SupplierDetailView = () => import('../views/suppliers/SupplierDetailView.vue')

const SupplierCatalogListView = () => import('../views/catalogs/SupplierCatalogListView.vue')
const SupplierCatalogDetailView = () => import('../views/catalogs/SupplierCatalogDetailView.vue')

const CatalogRowListView = () => import('../views/catalogs/CatalogRowListView.vue')
const CatalogRowDetailView = () => import('../views/catalogs/CatalogRowDetailView.vue')
const CatalogRowUploadView = () => import('../views/catalogs/CatalogRowUploadView.vue')

const ExtractionProcessView = () => import('../views/extraction/ExtractionProcessView.vue')

const routes = [
  // --- home: buscador de proveedores (GET /api/v1/catalogs/suppliers/) ---
  {
    path: '/',
    name: 'home',
    component: HomeView,
    meta: { title: 'Buscar proveedor' },
  },
  {
    // alias por si queda algún link viejo apuntando a /proveedores
    path: '/proveedores',
    redirect: { name: 'home' },
  },

  // --- catalog: deduplicate (standalone, no depende de un proveedor en la URL) ---
  {
    // POST /api/v1/catalogs/catalogs/deduplicate/
    path: '/catalogos/deduplicar',
    name: 'catalog-deduplicate',
    component: CatalogDeduplicateView,
    meta: { title: 'Eliminar duplicados de catálogo' },
  },

  // --- suppliers ---
  {
    // GET /api/v1/catalogs/suppliers/{id}/
    // Muestra catálogos (/{id}/catalogs/) y templates (/{id}/templates/) del proveedor
    path: '/proveedores/:supplierId',
    name: 'supplier-detail',
    component: SupplierDetailView,
    props: true,
    meta: { title: 'Detalle de proveedor' },
  },

  // --- supplier catalogs (anidado bajo proveedor) ---
  {
    // GET/POST /api/v1/catalogs/suppliers/{supplier_pk}/catalogs/
    path: '/proveedores/:supplierId/catalogos',
    name: 'supplier-catalog-list',
    component: SupplierCatalogListView,
    props: true,
    meta: { title: 'Catálogos del proveedor' },
  },
  {
    // GET/PUT/PATCH/DELETE /api/v1/catalogs/suppliers/{supplier_pk}/catalogs/{id}/
    path: '/proveedores/:supplierId/catalogos/:catalogId',
    name: 'supplier-catalog-detail',
    component: SupplierCatalogDetailView,
    props: true,
    meta: { title: 'Detalle de catálogo' },
  },

  // --- catalog rows (anidado bajo proveedor + catálogo) ---
  {
    // GET/POST /api/v1/catalogs/suppliers/{supplier_pk}/catalogs/{catalog_pk}/rows/
    path: '/proveedores/:supplierId/catalogos/:catalogId/filas',
    name: 'catalog-row-list',
    component: CatalogRowListView,
    props: true,
    meta: { title: 'Filas del catálogo' },
  },
  {
    // POST /api/v1/catalogs/suppliers/{supplier_pk}/catalogs/{catalog_pk}/rows/upload/
    path: '/proveedores/:supplierId/catalogos/:catalogId/filas/cargar',
    name: 'catalog-row-upload',
    component: CatalogRowUploadView,
    props: true,
    meta: { title: 'Cargar filas desde Excel' },
  },
  {
    // GET/PUT/PATCH/DELETE .../rows/{id}/
    path: '/proveedores/:supplierId/catalogos/:catalogId/filas/:id',
    name: 'catalog-row-detail',
    component: CatalogRowDetailView,
    props: true,
    meta: { title: 'Detalle de fila' },
  },

  // --- extraction ---
  {
    // POST /api/v1/extractions/process-xlsx/
    path: '/extraccion/procesar-xlsx',
    name: 'extraction-process-xlsx',
    component: ExtractionProcessView,
    meta: { title: 'Procesar factura desde Excel' },
  },

  // --- fallback ---
  {
    path: '/:pathMatch(.*)*',
    name: 'not-found',
    component: () => import('@/views/NotFoundView.vue'),
    meta: { title: 'Página no encontrada' },
  },
]

const router = createRouter({
  history: createWebHistory(import.meta.env.BASE_URL),
  routes,
  scrollBehavior() {
    return { top: 0 }
  },
})

router.beforeEach((to) => {
  document.title = to.meta.title ? `${to.meta.title} · Mi API` : 'Mi API'
})

export default router