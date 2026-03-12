<script setup lang="ts">
import { computed, onMounted, ref } from 'vue'
import AppShell from '../../components/common/AppShell.vue'
import StateBlock from '../../components/common/StateBlock.vue'
import StatusTag from '../../components/common/StatusTag.vue'
import { fetchHomeData } from '../../api/mock'
import { logout, sessionStore } from '../../stores/session'
import { todayText } from '../../utils/helpers'

const loading = ref(true)
const error = ref('')
const cards = ref<any[]>([])
const shortcuts = ref<any[]>([])
const todos = ref<string[]>([])
const user = computed(() => sessionStore.session?.user)

onMounted(async () => {
  try {
    if (!user.value || user.value.role === 'pending') return
    const data = await fetchHomeData(user.value.role)
    cards.value = data.cards
    shortcuts.value = data.shortcuts
    todos.value = data.todos
  } catch (err) {
    error.value = err instanceof Error ? err.message : '首页加载失败'
  } finally {
    loading.value = false
  }
})
</script>

<template>
  <AppShell :title="`你好，${user?.name || ''}`" :subtitle="`${todayText()} · ${user?.storeName || ''}`">
    <template #header-extra>
      <button class="ghost-btn" @click="logout()">退出</button>
    </template>

    <section class="card section-gap user-overview" v-if="user">
      <span>{{ user.storeName }}</span>
      <StatusTag>{{ user.roleLabel }}</StatusTag>
    </section>

    <StateBlock v-if="loading" tone="loading" title="首页加载中" />
    <StateBlock v-else-if="error" tone="error" title="首页加载失败" :description="error" />

    <template v-else>
      <section class="grid-cards section-gap">
        <article v-for="card in cards" :key="card.label" class="card metric-card">
          <small>{{ card.label }}</small>
          <strong>{{ card.value }}</strong>
        </article>
      </section>

      <section class="card section-gap">
        <h3>快捷入口</h3>
        <div class="stack-list">
          <component
            v-for="shortcut in shortcuts"
            :key="shortcut.label"
            :is="shortcut.to ? 'RouterLink' : 'a'"
            class="shortcut-item"
            :to="shortcut.to"
            :href="shortcut.href"
            target="_blank"
          >
            <strong>{{ shortcut.label }}</strong>
            <small>{{ shortcut.description }}</small>
          </component>
        </div>
      </section>

      <section class="card section-gap">
        <h3>待办提醒</h3>
        <ul class="bullet-list">
          <li v-for="todo in todos" :key="todo">{{ todo }}</li>
        </ul>
      </section>
    </template>
  </AppShell>
</template>
