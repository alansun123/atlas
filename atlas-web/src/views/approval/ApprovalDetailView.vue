<script setup lang="ts">
import { onMounted, ref } from 'vue'
import { useRoute } from 'vue-router'
import AppShell from '../../components/common/AppShell.vue'
import StateBlock from '../../components/common/StateBlock.vue'
import StatusTag from '../../components/common/StatusTag.vue'
import { fetchApprovalDetail } from '../../api/mock'
import { formatStatusText } from '../../utils/helpers'

const route = useRoute()
const loading = ref(true)
const error = ref('')
const detail = ref<any>(null)

const load = async () => {
  loading.value = true
  error.value = ''
  try {
    detail.value = await fetchApprovalDetail(String(route.params.id))
  } catch (err) {
    error.value = err instanceof Error ? err.message : '审批详情加载失败'
  } finally {
    loading.value = false
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

      <section class="bottom-actions">
        <button class="ghost-btn">驳回</button>
        <button class="primary-btn">通过</button>
      </section>
    </template>
  </AppShell>
</template>
