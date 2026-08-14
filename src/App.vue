<script setup>
import { RouterLink, RouterView } from 'vue-router'
</script>

<template>
  <div class="app-shell">
    <header class="app-header">
      <RouterLink to="/" class="app-header__brand">Invoice Converter</RouterLink>
      <nav class="app-header__nav">
        <RouterLink to="/layouts" class="app-header__link">Layouts</RouterLink>
      </nav>
    </header>

    <RouterView />
  </div>
</template>

<style scoped>
.app-shell {
  min-height: 100vh;
  display: flex;
  flex-direction: column;
}

.app-header {
  display: flex;
  align-items: center;
  height: 56px;
  padding: 0 var(--space-6);
  background: var(--color-navy-900);
  border-bottom: 1px solid var(--color-navy-900);
}

.app-header__brand {
  color: var(--color-white);
  font-size: var(--text-base);
  font-weight: 600;
  letter-spacing: 0.01em;
  text-decoration: none;
}

.app-header__brand:hover {
  opacity: 0.9;
}

.app-header__nav {
  margin-left: auto;
  display: flex;
  gap: var(--space-4);
}

.app-header__link {
  color: var(--color-white);
  opacity: 0.75;
  font-size: var(--text-sm);
  text-decoration: none;
  transition: opacity var(--transition-fast);
}

.app-header__link:hover {
  opacity: 1;
}
</style>