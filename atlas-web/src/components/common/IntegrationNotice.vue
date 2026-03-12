<script setup lang="ts">
defineProps<{
  title: string
  tone?: 'info' | 'warn' | 'danger' | 'good'
  points?: string[]
}>()
</script>

<template>
  <section class="integration-notice" :data-tone="tone || 'info'">
    <strong>{{ title }}</strong>
    <ul v-if="points?.length" class="bullet-list integration-points">
      <li v-for="item in points" :key="item">{{ item }}</li>
    </ul>
    <slot />
  </section>
</template>
