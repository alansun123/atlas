<script setup lang="ts">
defineProps<{ type?: 'default' | 'good' | 'warn' | 'danger' }>()
</script>

<template>
  <span class="status-tag" :data-type="type || 'default'"><slot /></span>
</template>
