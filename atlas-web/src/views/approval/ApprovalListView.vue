<script setup lang="ts">
import { computed, onMounted, ref } from 'vue'
import { useRoute } from 'vue-router'
import AppShell from '../../components/common/AppShell.vue'
import StateBlock from '../../components/common/StateBlock.vue'
import ApprovalCard from '../../components/approval/ApprovalCard.vue'
import { fetchApprovals } from '../../api/mock'

const route = useRoute()
const loading = ref(true)
const error = ref('')
const items = ref<any[]>([])
const tab = computed(() => String(route.query.tab || 'pending'))

const load = async () => {
  loading.value = true
  error.value = ''
  try {
    items.value = await fetchApprovals()
  } catch (err) {
    error.value = err instanceof Error ? err.message : '审批列表加载失败'
  } finally {
    loading.value = false
  }
}

const filtered = computed(() => {
  if (tab.value === 'submitted') return items.value.filter((item) => item.roleView === 'submitted' || item.applicant === '周店长')
  if (tab.value === 'approved') return items.value.filter((item) => item.status === 'approved')
  if (tab.value === 'rejected') return items.value.filter((item) => item.status === 'rejected')
  return items.value.filter((item) => item.status === 'pending')
})

onMounted(load)
</script>

<template>
  <AppShell title="审批列表" subtitle="特殊排班审批流演示">
    <nav class="tab-row section-gap">
      <RouterLink to="/approvals">待审批</RouterLink>
      <RouterLink to="/approvals?tab=approved">已通过</RouterLink>
      <RouterLink to="/approvals?tab=rejected">已驳回</RouterLink>
      <RouterLink to="/approvals?tab=submitted">我提交的</RouterLink>
    </nav>

    <StateBlock v-if="loading" tone="loading" title="审批列表加载中" />
    <StateBlock v-else-if="error" tone="error" title="审批列表加载失败" :description="error" />
    <StateBlock v-else-if="!filtered.length" title="暂无数据" description="当前筛选条件下没有审批单。" />

    <div v-else class="stack-list">
      <ApprovalCard v-for="item in filtered" :key="item.id" :item="item" />
    </div>
  </AppShell>
</template>
