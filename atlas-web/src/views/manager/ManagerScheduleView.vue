<script setup lang="ts">
import { onMounted, ref } from 'vue'
import AppShell from '../../components/common/AppShell.vue'
import StateBlock from '../../components/common/StateBlock.vue'
import WeekSwitcher from '../../components/schedule/WeekSwitcher.vue'
import ValidationPanel from '../../components/schedule/ValidationPanel.vue'
import StatusTag from '../../components/common/StatusTag.vue'
import { fetchManagerSchedule } from '../../api/mock'

const loading = ref(true)
const error = ref('')
const data = ref<any>(null)

const load = async () => {
  loading.value = true
  error.value = ''
  try {
    data.value = await fetchManagerSchedule()
  } catch (err) {
    error.value = err instanceof Error ? err.message : '排班页加载失败'
  } finally {
    loading.value = false
  }
}

onMounted(load)
</script>

<template>
  <AppShell title="店长排班" subtitle="周排班草稿 / 校验 / 审批演示">
    <WeekSwitcher v-if="data" :label="data.weekRange" @change="load" />

    <StateBlock v-if="loading" tone="loading" title="排班数据加载中" />
    <StateBlock v-else-if="error" tone="error" title="排班加载失败" :description="error" />

    <template v-else-if="data">
      <section class="card section-gap">
        <div class="section-title-row">
          <h3>{{ data.storeName }}</h3>
          <StatusTag type="warn">{{ data.batchStatus }}</StatusTag>
        </div>
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
          <small class="muted">MVP 先用列表卡片，不做拖拽</small>
        </div>
        <div class="stack-list">
          <article v-for="day in data.days" :key="day.day" class="day-card">
            <strong>{{ day.day }}</strong>
            <div class="stack-list nested-list">
              <div v-for="shift in day.shifts" :key="shift.title" class="sub-card">
                <div class="section-title-row">
                  <strong>{{ shift.title }}</strong>
                  <button class="ghost-btn inline-btn">编辑人员</button>
                </div>
                <p>{{ shift.detail }}</p>
                <small>{{ shift.people.join('、') }} · {{ shift.note }}</small>
              </div>
            </div>
          </article>
        </div>
      </section>

      <ValidationPanel :issues="data.issues" />

      <section class="bottom-actions">
        <button class="ghost-btn">保存草稿</button>
        <button class="ghost-btn">校验排班</button>
        <RouterLink class="primary-btn inline-btn" to="/approvals?tab=submitted">提交审批</RouterLink>
        <button class="primary-btn" disabled>发布排班</button>
      </section>
    </template>
  </AppShell>
</template>
