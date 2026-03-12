<script setup lang="ts">
import { onMounted, ref } from 'vue'
import AppShell from '../../components/common/AppShell.vue'
import StateBlock from '../../components/common/StateBlock.vue'
import StatusTag from '../../components/common/StatusTag.vue'
import WeekSwitcher from '../../components/schedule/WeekSwitcher.vue'
import { fetchEmployeeSchedule } from '../../api/mock'
import { formatStatusText } from '../../utils/helpers'

const loading = ref(true)
const error = ref('')
const data = ref<any>(null)

const load = async () => {
  loading.value = true
  error.value = ''
  try {
    data.value = await fetchEmployeeSchedule()
  } catch (err) {
    error.value = err instanceof Error ? err.message : '班表加载失败'
  } finally {
    loading.value = false
  }
}

onMounted(load)
</script>

<template>
  <AppShell title="我的班表" subtitle="员工侧周班表演示">
    <WeekSwitcher v-if="data" :label="data.weekRange" @change="load" />

    <StateBlock v-if="loading" tone="loading" title="班表加载中" />
    <StateBlock v-else-if="error" tone="error" title="班表加载失败" :description="error">
      <button class="primary-btn inline-btn" @click="load">重试</button>
    </StateBlock>

    <template v-else-if="data">
      <section class="card section-gap">
        <div class="section-title-row">
          <h3>{{ data.today.title }}</h3>
          <StatusTag :type="data.today.status === 'conflict' ? 'warn' : 'good'">{{ formatStatusText(data.today.status) }}</StatusTag>
        </div>
        <p>{{ data.today.timeRange }}</p>
        <small>{{ data.today.note }}</small>
      </section>

      <section class="card section-gap">
        <div class="section-title-row">
          <h3>本周班表</h3>
          <a class="ghost-btn inline-btn" href="https://work.weixin.qq.com/" target="_blank">去企微请假</a>
        </div>
        <div v-if="data.shifts.length" class="stack-list">
          <article v-for="shift in data.shifts" :key="shift.id" class="list-row">
            <div>
              <strong>{{ shift.date }} {{ shift.weekday }} · {{ shift.shiftName }}</strong>
              <p>{{ shift.timeRange }} · {{ shift.storeName }}</p>
              <small v-if="shift.note">{{ shift.note }}</small>
            </div>
            <StatusTag :type="shift.status === 'conflict' ? 'warn' : shift.status === 'published' ? 'good' : 'default'">
              {{ formatStatusText(shift.status) }}
            </StatusTag>
          </article>
        </div>
        <StateBlock v-else title="本周暂无已发布班次" description="店长尚未发布本周排班。" />
      </section>
    </template>
  </AppShell>
</template>
