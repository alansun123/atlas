<script setup lang="ts">
import { computed, onMounted, ref, watch } from 'vue'
import { useRoute } from 'vue-router'
import AppShell from '../../components/common/AppShell.vue'
import StateBlock from '../../components/common/StateBlock.vue'
import ApprovalCard from '../../components/approval/ApprovalCard.vue'
import IntegrationNotice from '../../components/common/IntegrationNotice.vue'
import { fetchApprovalsWithFallback } from '../../api/atlas'

const route = useRoute()
const loading = ref(true)
const error = ref('')
const items = ref<any[]>([])
const source = ref<'api' | 'mock'>('mock')
const noticeTone = ref<'good' | 'warn' | 'danger'>('warn')
const noticePoints = ref<string[]>([])
const tab = computed(() => String(route.query.tab || 'pending'))

const tabLabelMap: Record<string, string> = {
  pending: '待审批',
  approved: '已通过',
  rejected: '已驳回',
  submitted: '我提交的',
}

const load = async () => {
  loading.value = true
  error.value = ''
  try {
    const result = await fetchApprovalsWithFallback()
    items.value = result.items
    source.value = result.source
    noticeTone.value = result.noticeTone
    noticePoints.value = result.noticePoints
  } catch (err) {
    error.value = err instanceof Error ? err.message : '审批列表加载失败'
  } finally {
    loading.value = false
  }
}

const filtered = computed(() => {
  if (tab.value === 'submitted') return items.value.filter((item) => item.roleView === 'submitted')
  if (tab.value === 'approved') return items.value.filter((item) => item.status === 'approved')
  if (tab.value === 'rejected') return items.value.filter((item) => item.status === 'rejected')
  return items.value.filter((item) => item.status === 'pending')
})

const emptyDescription = computed(() => {
  const label = tabLabelMap[tab.value] || '当前筛选'
  if (source.value === 'mock') {
    return `${label} 下当前没有 fallback/mock 审批单；这不代表真实接口中一定没有数据。`
  }
  return `${label} 下当前没有审批单。若刚完成审批操作，可稍后刷新确认最新状态。`
})

onMounted(load)
watch(() => route.query.tab, load)
</script>

<template>
  <AppShell title="审批列表" subtitle="特殊排班审批流演示">
    <div v-if="!loading && !error && source === 'mock'" class="fallback-banner">
      <span class="fallback-badge">⚠️ FALLBACK / MOCK</span>
      <span>当前数据为本地 mock，不代表真实 API 已联通</span>
    </div>
    <nav class="tab-row section-gap">
      <RouterLink to="/approvals">待审批</RouterLink>
      <RouterLink to="/approvals?tab=approved">已通过</RouterLink>
      <RouterLink to="/approvals?tab=rejected">已驳回</RouterLink>
      <RouterLink to="/approvals?tab=submitted">我提交的</RouterLink>
    </nav>

    <IntegrationNotice
      v-if="!loading && !error"
      :tone="noticeTone"
      :title="source === 'api' ? '审批列表当前处于真实接口模式' : '审批列表当前处于 fallback 模式'"
      :points="noticePoints"
    >
      <small v-if="source !== 'api'">当前卡片数据为本地 fallback/mock，请勿据此判断真实接口已联通。</small>
      <small v-else>若审批动作刚完成，建议刷新一次列表，确认最新状态已经回写。</small>
    </IntegrationNotice>

    <StateBlock v-if="loading" tone="loading" title="审批列表加载中" description="正在确认可见审批单与当前筛选结果。" />
    <StateBlock v-else-if="error" tone="error" title="审批列表加载失败" :description="error">
      <div class="section-title-row">
        <button class="primary-btn inline-btn" @click="load">重试</button>
        <RouterLink class="ghost-btn inline-btn" to="/login">返回登录</RouterLink>
      </div>
    </StateBlock>
    <StateBlock v-else-if="!filtered.length" :title="`${tabLabelMap[tab] || '当前筛选'}暂无数据`" :description="emptyDescription">
      <button class="ghost-btn inline-btn" @click="load">刷新列表</button>
    </StateBlock>

    <div v-else class="stack-list">
      <ApprovalCard v-for="item in filtered" :key="item.id" :item="item" />
    </div>
  </AppShell>
</template>
