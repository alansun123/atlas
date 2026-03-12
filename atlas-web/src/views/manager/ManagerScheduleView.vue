<script setup lang="ts">
import { computed, onMounted, ref } from 'vue'
import { RouterLink } from 'vue-router'
import AppShell from '../../components/common/AppShell.vue'
import StateBlock from '../../components/common/StateBlock.vue'
import WeekSwitcher from '../../components/schedule/WeekSwitcher.vue'
import ValidationPanel from '../../components/schedule/ValidationPanel.vue'
import StatusTag from '../../components/common/StatusTag.vue'
import IntegrationNotice from '../../components/common/IntegrationNotice.vue'
import { fetchManagerScheduleWithFallback, publishManagerBatch, revalidateManagerBatch, submitManagerApproval } from '../../api/atlas'

const loading = ref(true)
const submitting = ref(false)
const loadError = ref('')
const actionError = ref('')
const actionMessage = ref('')
const data = ref<any>(null)

const actionDisabledReason = computed(() => {
  if (!data.value?.batchId) return '当前没有可操作的排班批次，无法触发校验、提审或发布。'
  if (data.value.source !== 'api') return '当前展示的是 fallback/mock 排班，校验 / 提审 / 发布按钮保持禁用，避免误判为真实联调成功。'
  if (submitting.value) return '正在提交后端操作，请稍候。'
  return ''
})

const load = async () => {
  loading.value = true
  loadError.value = ''
  actionError.value = ''
  try {
    data.value = await fetchManagerScheduleWithFallback()
  } catch (err) {
    data.value = null
    loadError.value = err instanceof Error ? err.message : '排班页加载失败'
  } finally {
    loading.value = false
  }
}

const validateBatch = async () => {
  if (!data.value?.batchId) return
  submitting.value = true
  actionMessage.value = ''
  actionError.value = ''
  try {
    await revalidateManagerBatch(data.value.batchId)
    actionMessage.value = '已重新校验后端排班批次。'
    await load()
  } catch (err) {
    actionError.value = err instanceof Error ? err.message : '校验失败'
  } finally {
    submitting.value = false
  }
}

const submitApproval = async () => {
  if (!data.value?.batchId) return
  submitting.value = true
  actionMessage.value = ''
  actionError.value = ''
  try {
    const result = await submitManagerApproval(data.value.batchId)
    actionMessage.value = `已提交审批，审批单 #${result.approvalId}`
    await load()
  } catch (err) {
    actionError.value = err instanceof Error ? err.message : '提审失败'
  } finally {
    submitting.value = false
  }
}

const publishBatch = async () => {
  if (!data.value?.batchId) return
  submitting.value = true
  actionMessage.value = ''
  actionError.value = ''
  try {
    await publishManagerBatch(data.value.batchId)
    actionMessage.value = '已调用后端发布排班。'
    await load()
  } catch (err) {
    actionError.value = err instanceof Error ? err.message : '发布失败'
  } finally {
    submitting.value = false
  }
}

onMounted(load)
</script>

<template>
  <AppShell title="店长排班" subtitle="尽量联调后端 mock API 的周排班页">
    <WeekSwitcher v-if="data" :label="data.weekRange" @change="load" />

    <StateBlock v-if="loading" tone="loading" title="排班数据加载中" description="正在确认当前批次、校验结果与可执行操作。" />
    <StateBlock v-else-if="loadError" tone="error" title="排班加载失败" :description="loadError">
      <div class="section-title-row">
        <button class="primary-btn inline-btn" @click="load">重试</button>
        <RouterLink class="ghost-btn inline-btn" to="/login">返回登录</RouterLink>
      </div>
    </StateBlock>

    <template v-else-if="data">
      <IntegrationNotice
        class="section-gap"
        :tone="data.noticeTone"
        :title="data.source === 'api' ? '店长排班当前处于真实接口模式' : '店长排班当前处于 fallback 模式'"
        :points="data.noticePoints"
      />

      <section class="card section-gap">
        <div class="section-title-row">
          <h3>{{ data.storeName }}</h3>
          <StatusTag :type="data.source === 'mock' ? 'danger' : data.batchStatus === 'published' ? 'good' : 'warn'">{{ data.source === 'mock' ? 'FALLBACK / MOCK' : data.batchStatus }}</StatusTag>
        </div>
        <small class="muted">当前走真实后端链路：<code>/api/stores</code>、<code>/api/stores/:id/shifts</code>、<code>/api/employees</code>、<code>/api/schedules/batches</code>、<code>/validate</code>。若需临时启用前端本地 fallback，必须显式设置 <code>VITE_ENABLE_API_DATA_FALLBACK=true</code>。</small>
        <div v-if="data.summary?.length" class="grid-cards compact-grid">
          <article v-for="card in data.summary" :key="card.label" class="metric-card small-card">
            <small>{{ card.label }}</small>
            <strong>{{ card.value }}</strong>
          </article>
        </div>
        <StateBlock v-else title="暂无批次摘要" description="当前批次缺少统计摘要，请刷新或检查后端返回结构。" />
      </section>

      <StateBlock
        v-if="actionError"
        class="section-gap"
        tone="error"
        title="排班操作未完成"
        :description="actionError"
      >
        <button class="ghost-btn inline-btn" :disabled="submitting" @click="load">刷新最新状态</button>
      </StateBlock>

      <section class="card section-gap">
        <div class="section-title-row">
          <h3>按天排班</h3>
          <small class="muted">当前为后端批次明细只读展示</small>
        </div>
        <div v-if="data.days?.length" class="stack-list">
          <article v-for="day in data.days" :key="day.day" class="day-card">
            <strong>{{ day.day }}</strong>
            <div v-if="day.shifts?.length" class="stack-list nested-list">
              <div v-for="shift in day.shifts" :key="shift.title + shift.people.join(',')" class="sub-card">
                <div class="section-title-row">
                  <strong>{{ shift.title }}</strong>
                  <button class="ghost-btn inline-btn" disabled>编辑人员</button>
                </div>
                <p>{{ shift.detail }}</p>
                <small>{{ shift.people.join('、') || '未排人' }} · {{ shift.note }}</small>
              </div>
            </div>
            <StateBlock v-else title="当天暂无班次明细" description="后端未返回该日期的班次分配。" />
          </article>
        </div>
        <StateBlock v-else title="暂无排班明细" description="当前周批次没有返回任何按天排班数据。" />
      </section>

      <ValidationPanel :issues="data.issues || []" />

      <section v-if="actionMessage" class="card section-gap">
        <small>{{ actionMessage }}</small>
      </section>

      <IntegrationNotice v-if="actionDisabledReason" class="section-gap" tone="warn" title="当前排班操作不可用" :points="[actionDisabledReason]" />

      <section class="bottom-actions">
        <button class="ghost-btn" disabled>保存草稿</button>
        <button class="ghost-btn" :disabled="!!actionDisabledReason" @click="validateBatch">{{ submitting ? '处理中…' : '校验排班' }}</button>
        <button class="primary-btn inline-btn" :disabled="!!actionDisabledReason" @click="submitApproval">{{ submitting ? '处理中…' : '提交审批' }}</button>
        <button class="primary-btn" :disabled="!!actionDisabledReason" @click="publishBatch">{{ submitting ? '处理中…' : '发布排班' }}</button>
      </section>
    </template>
  </AppShell>
</template>
