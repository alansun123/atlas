<script setup lang="ts">
import { computed, onMounted, ref } from 'vue'
import { useRoute } from 'vue-router'
import AppShell from '../../components/common/AppShell.vue'
import StateBlock from '../../components/common/StateBlock.vue'
import StatusTag from '../../components/common/StatusTag.vue'
import IntegrationNotice from '../../components/common/IntegrationNotice.vue'
import { approveApproval, fetchApprovalDetailWithFallback, rejectApproval } from '../../api/atlas'
import { formatStatusText } from '../../utils/helpers'

const route = useRoute()
const loading = ref(true)
const acting = ref(false)
const loadError = ref('')
const actionError = ref('')
const actionMessage = ref('')
const detail = ref<any>(null)

const actionDisabledReason = computed(() => {
  if (!detail.value) return '详情尚未加载完成。'
  if (detail.value.source !== 'api') return '当前展示的是 fallback/mock 详情，审批按钮保持禁用，避免误判为真实写入成功。'
  if (detail.value.status !== 'pending') return `当前审批单状态为「${formatStatusText(detail.value.status)}」，无需再次操作。`
  if (acting.value) return '正在提交审批动作，请稍候。'
  return ''
})

const load = async () => {
  loading.value = true
  loadError.value = ''
  actionError.value = ''
  try {
    detail.value = await fetchApprovalDetailWithFallback(String(route.params.id))
  } catch (err) {
    detail.value = null
    loadError.value = err instanceof Error ? err.message : '审批详情加载失败'
  } finally {
    loading.value = false
  }
}

const handleApprove = async () => {
  if (!detail.value || detail.value.source !== 'api' || detail.value.status !== 'pending') return
  acting.value = true
  actionMessage.value = ''
  actionError.value = ''
  try {
    await approveApproval(String(route.params.id))
    actionMessage.value = '已调用后端审批通过接口。'
    await load()
  } catch (err) {
    actionError.value = err instanceof Error ? err.message : '审批失败'
  } finally {
    acting.value = false
  }
}

const handleReject = async () => {
  if (!detail.value || detail.value.source !== 'api' || detail.value.status !== 'pending') return
  acting.value = true
  actionMessage.value = ''
  actionError.value = ''
  try {
    await rejectApproval(String(route.params.id))
    actionMessage.value = '已调用后端审批驳回接口。'
    await load()
  } catch (err) {
    actionError.value = err instanceof Error ? err.message : '驳回失败'
  } finally {
    acting.value = false
  }
}

onMounted(load)
</script>

<template>
  <AppShell title="审批详情" subtitle="查看触发规则、班表摘要与审批操作">
    <div v-if="detail && detail.source === 'mock'" class="fallback-banner">
      <span class="fallback-badge">⚠️ FALLBACK / MOCK</span>
      <span>当前详情为本地 mock，审批操作已禁用</span>
    </div>
    <StateBlock v-if="loading" tone="loading" title="详情加载中" description="正在确认审批详情、审批历史与关联班表摘要。" />
    <StateBlock v-else-if="loadError" tone="error" title="详情加载失败" :description="loadError">
      <div class="section-title-row">
        <button class="primary-btn inline-btn" @click="load">重新加载</button>
        <RouterLink class="ghost-btn inline-btn" to="/login">返回登录</RouterLink>
      </div>
    </StateBlock>

    <template v-else-if="detail">
      <section class="card section-gap">
        <div class="section-title-row">
          <h3>{{ detail.storeName }}</h3>
          <StatusTag :type="detail.status === 'pending' ? 'warn' : detail.status === 'approved' ? 'good' : 'danger'">
            {{ formatStatusText(detail.status) }}
          </StatusTag>
        </div>
        <p>{{ detail.weekRange }} · 提交人 {{ detail.applicant }}</p>
        <small>{{ detail.comment || '提交人未填写额外说明。' }}</small>
      </section>

      <IntegrationNotice
        class="section-gap"
        :tone="detail.noticeTone"
        :title="detail.source === 'api' ? '审批详情当前处于真实接口模式' : '审批详情当前处于 fallback 模式'"
        :points="detail.noticePoints"
      >
        <small v-if="detail.source !== 'api'">当前详情与班表摘要为本地 fallback/mock，审批按钮会保持禁用。</small>
      </IntegrationNotice>

      <StateBlock
        v-if="actionError"
        class="section-gap"
        tone="error"
        title="审批动作未完成"
        :description="actionError"
      >
        <button class="ghost-btn inline-btn" :disabled="acting" @click="load">刷新最新状态</button>
      </StateBlock>

      <section class="card section-gap">
        <h3>触发规则</h3>
        <ul v-if="detail.triggers?.length" class="bullet-list">
          <li v-for="item in detail.triggers" :key="item">{{ item }}</li>
        </ul>
        <StateBlock v-else title="暂无触发规则明细" description="后端未返回触发规则列表，请结合审批备注或重试加载确认。" />
      </section>

      <section class="card section-gap">
        <h3>关联班表摘要</h3>
        <ul v-if="detail.scheduleOverview?.length" class="bullet-list">
          <li v-for="item in detail.scheduleOverview" :key="item">{{ item }}</li>
        </ul>
        <StateBlock v-else title="暂无关联班表摘要" description="当前审批详情未返回班表摘要，无法据此判断真实排班结果。" />
      </section>

      <section class="card section-gap">
        <h3>审批历史 / 意见</h3>
        <ul v-if="detail.history?.length" class="bullet-list">
          <li v-for="item in detail.history" :key="item">{{ item }}</li>
        </ul>
        <StateBlock v-else title="暂无审批动作" description="当前仍在待审批状态，或后端尚未返回审批历史。" />
      </section>

      <section v-if="actionMessage" class="card section-gap">
        <small>{{ actionMessage }}</small>
        <small v-if="detail.source !== 'api'" class="muted">fallback 详情页不会触发真实审批写操作。</small>
      </section>

      <IntegrationNotice
        v-if="actionDisabledReason"
        class="section-gap"
        :tone="detail.source === 'api' && detail.status !== 'pending' ? 'good' : 'warn'"
        title="当前审批操作不可用"
        :points="[actionDisabledReason]"
      />

      <section class="bottom-actions">
        <button class="ghost-btn" :disabled="!!actionDisabledReason" @click="handleReject">{{ acting ? '处理中…' : '驳回' }}</button>
        <button class="primary-btn" :disabled="!!actionDisabledReason" @click="handleApprove">{{ acting ? '处理中…' : '通过' }}</button>
      </section>
    </template>
  </AppShell>
</template>
