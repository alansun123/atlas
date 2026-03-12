<script setup lang="ts">
defineProps<{ title: string; subtitle?: string }>()
</script>

<template>
  <div class="page-shell">
    <header class="page-header">
      <div>
        <h1>{{ title }}</h1>
        <p v-if="subtitle">{{ subtitle }}</p>
      </div>
      <slot name="header-extra" />
    </header>
    <main class="page-content">
      <slot />
    </main>
  </div>
</template>
