<script setup lang="ts">
defineProps<{
  title: string
  description?: string
  tone?: 'empty' | 'loading' | 'error'
}>()
</script>

<template>
  <div class="state-block" :data-tone="tone || 'empty'">
    <strong>{{ title }}</strong>
    <p v-if="description">{{ description }}</p>
    <slot />
  </div>
</template>
