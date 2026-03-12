<script setup lang="ts">
import { onMounted, ref } from 'vue'
import AppShell from '../../components/common/AppShell.vue'
import StateBlock from '../../components/common/StateBlock.vue'
import WeekSwitcher from '../../components/schedule/WeekSwitcher.vue'
import ValidationPanel from '../../components/schedule/ValidationPanel.vue'
import StatusTag from '../../components/common/StatusTag.vue'
import { fetchManagerScheduleWithFallback, publishManagerBatch, revalidateManagerBatch, submitManagerApproval } from '../../api/atlas'

const loading = ref(true)
const submitting = ref(false)
const error = ref('')
const actionMessage = ref('')
const data = ref<any>(null)

const load = async () => {
  loading.value = true
  error.value = ''
  try {
    data.value = await fetchManagerScheduleWithFallback()
  } catch (err) {
    error.value = err instanceof Error ? err.message : '排班页加载失败'
  } finally {
    loading.value = false
  }
}

const validateBatch = async () => {
  if (!data.value?.batchId) return
  submitting.value = true
  actionMessage.value = ''
  try {
    await revalidateManagerBatch(data.value.batchId)
    actionMessage.value = '已重新校验后端排班批次。'
    await load()
  } catch (err) {
    error.value = err instanceof Error ? err.message : '校验失败'
  } finally {
    submitting.value = false
  }
}

const submitApproval = async () => {
  if (!data.value?.batchId) return
  submitting.value = true
  actionMessage.value = ''
  try {
    const result = await submitManagerApproval(data.value.batchId)
    actionMessage.value = `已提交审批，审批单 #${result.approvalId}`
    await load()
  } catch (err) {
    error.value = err instanceof Error ? err.message : '提审失败'
  } finally {
    submitting.value = false
  }
}

const publishBatch = async () => {
  if (!data.value?.batchId) return
  submitting.value = true
  actionMessage.value = ''
  try {
    await publishManagerBatch(data.value.batchId)
    actionMessage.value = '已调用后端发布排班。'
    await load()
  } catch (err) {
    error.value = err instanceof Error ? err.message : '发布失败'
  } finally {
    submitting.value = false
  }
}

onMounted(load)
</script>

<template>
  <AppShell title="店长排班" subtitle="尽量联调后端 mock API 的周排班页">
    <WeekSwitcher v-if="data" :label="data.weekRange" @change="load" />

    <StateBlock v-if="loading" tone="loading" title="排班数据加载中" />
    <StateBlock v-else-if="error" tone="error" title="排班加载失败" :description="error" />

    <template v-else-if="data">
      <section class="card section-gap">
        <div class="section-title-row">
          <h3>{{ data.storeName }}</h3>
          <StatusTag :type="data.batchStatus === 'published' ? 'good' : 'warn'">{{ data.batchStatus }}</StatusTag>
        </div>
        <small class="muted">当前走真实后端链路：<code>/api/stores</code>、<code>/api/stores/:id/shifts</code>、<code>/api/employees</code>、<code>/api/schedules/batches</code>、<code>/validate</code>。若需临时启用前端本地 fallback，必须显式设置 <code>VITE_ENABLE_API_DATA_FALLBACK=true</code>。</small>
        <div class="grid-cards compact-grid">
          <article v-for="card in data.summary" :key="card.label" class="metric-card small-card">
            <small>{{ card.label }}</small>
            <strong>{{ card.value }}</strong>
          </article>
        </div>
      </section>

      <section class="card section-gap">
        <div class="section-title-row">
          <h3>按天排班</h3>
          <small class="muted">当前为后端批次明细只读展示</small>
        </div>
        <div class="stack-list">
          <article v-for="day in data.days" :key="day.day" class="day-card">
            <strong>{{ day.day }}</strong>
            <div class="stack-list nested-list">
              <div v-for="shift in day.shifts" :key="shift.title + shift.people.join(',')" class="sub-card">
                <div class="section-title-row">
                  <strong>{{ shift.title }}</strong>
                  <button class="ghost-btn inline-btn" disabled>编辑人员</button>
                </div>
                <p>{{ shift.detail }}</p>
                <small>{{ shift.people.join('、') || '未排人' }} · {{ shift.note }}</small>
              </div>
            </div>
          </article>
        </div>
      </section>

      <ValidationPanel :issues="data.issues" />

      <section v-if="actionMessage" class="card section-gap">
        <small>{{ actionMessage }}</small>
      </section>

      <section class="bottom-actions">
        <button class="ghost-btn" disabled>保存草稿</button>
        <button class="ghost-btn" :disabled="submitting || !data.batchId || data.source !== 'api'" @click="validateBatch">校验排班</button>
        <button class="primary-btn inline-btn" :disabled="submitting || !data.batchId || data.source !== 'api'" @click="submitApproval">提交审批</button>
        <button class="primary-btn" :disabled="submitting || !data.batchId || data.source !== 'api'" @click="publishBatch">发布排班</button>
      </section>
    </template>
  </AppShell>
</template>
