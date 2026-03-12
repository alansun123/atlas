<script setup lang="ts">
const emit = defineEmits<{ change: [step: number] }>()
defineProps<{ label: string }>()
</script>

<template>
  <div class="week-switcher card">
    <button class="ghost-btn" @click="emit('change', -1)">上一周</button>
    <strong>{{ label }}</strong>
    <button class="ghost-btn" @click="emit('change', 1)">下一周</button>
  </div>
</template>
