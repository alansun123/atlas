<script setup lang="ts">
import { onMounted, ref } from 'vue'
import { useRoute } from 'vue-router'
import AppShell from '../../components/common/AppShell.vue'
import StateBlock from '../../components/common/StateBlock.vue'
import StatusTag from '../../components/common/StatusTag.vue'
import { approveApproval, fetchApprovalDetailWithFallback, rejectApproval } from '../../api/atlas'
import { formatStatusText } from '../../utils/helpers'

const route = useRoute()
const loading = ref(true)
const acting = ref(false)
const error = ref('')
const actionMessage = ref('')
const detail = ref<any>(null)

const load = async () => {
  loading.value = true
  error.value = ''
  try {
    detail.value = await fetchApprovalDetailWithFallback(String(route.params.id))
  } catch (err) {
    error.value = err instanceof Error ? err.message : '审批详情加载失败'
  } finally {
    loading.value = false
  }
}

const handleApprove = async () => {
  if (!detail.value || detail.value.source !== 'api' || detail.value.status !== 'pending') return
  acting.value = true
  actionMessage.value = ''
  try {
    await approveApproval(String(route.params.id))
    actionMessage.value = '已调用后端审批通过接口。'
    await load()
  } catch (err) {
    error.value = err instanceof Error ? err.message : '审批失败'
  } finally {
    acting.value = false
  }
}

const handleReject = async () => {
  if (!detail.value || detail.value.source !== 'api' || detail.value.status !== 'pending') return
  acting.value = true
  actionMessage.value = ''
  try {
    await rejectApproval(String(route.params.id))
    actionMessage.value = '已调用后端审批驳回接口。'
    await load()
  } catch (err) {
    error.value = err instanceof Error ? err.message : '驳回失败'
  } finally {
    acting.value = false
  }
}

onMounted(load)
</script>

<template>
  <AppShell title="审批详情" subtitle="查看触发规则、班表摘要与审批操作">
    <StateBlock v-if="loading" tone="loading" title="详情加载中" />
    <StateBlock v-else-if="error" tone="error" title="详情加载失败" :description="error" />

    <template v-else-if="detail">
      <section class="card section-gap">
        <div class="section-title-row">
          <h3>{{ detail.storeName }}</h3>
          <StatusTag :type="detail.status === 'pending' ? 'warn' : detail.status === 'approved' ? 'good' : 'danger'">
            {{ formatStatusText(detail.status) }}
          </StatusTag>
        </div>
        <p>{{ detail.weekRange }} · 提交人 {{ detail.applicant }}</p>
        <small>{{ detail.comment }}</small>
      </section>

      <section class="card section-gap">
        <small class="muted">当前数据源：{{ detail.source === 'api' ? '后端 mock API' : '前端本地 mock fallback' }}</small>
      </section>

      <section class="card section-gap">
        <h3>触发规则</h3>
        <ul class="bullet-list">
          <li v-for="item in detail.triggers" :key="item">{{ item }}</li>
        </ul>
      </section>

      <section class="card section-gap">
        <h3>关联班表摘要</h3>
        <ul class="bullet-list">
          <li v-for="item in detail.scheduleOverview" :key="item">{{ item }}</li>
        </ul>
      </section>

      <section class="card section-gap">
        <h3>审批历史 / 意见</h3>
        <ul v-if="detail.history.length" class="bullet-list">
          <li v-for="item in detail.history" :key="item">{{ item }}</li>
        </ul>
        <StateBlock v-else title="暂无审批动作" description="当前仍在待审批状态。" />
      </section>

      <section v-if="actionMessage" class="card section-gap">
        <small>{{ actionMessage }}</small>
      </section>

      <section class="bottom-actions">
        <button class="ghost-btn" :disabled="acting || detail.source !== 'api' || detail.status !== 'pending'" @click="handleReject">驳回</button>
        <button class="primary-btn" :disabled="acting || detail.source !== 'api' || detail.status !== 'pending'" @click="handleApprove">通过</button>
      </section>
    </template>
  </AppShell>
</template>
