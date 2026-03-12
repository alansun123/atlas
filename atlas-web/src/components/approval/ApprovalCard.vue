<script setup lang="ts">
import StatusTag from '../common/StatusTag.vue'
import { formatStatusText } from '../../utils/helpers'
import type { ApprovalItem } from '../../types'

defineProps<{ item: ApprovalItem }>()
</script>

<template>
  <RouterLink class="card approval-card" :to="`/approvals/${item.id}`">
    <div class="section-title-row">
      <strong>{{ item.storeName }}</strong>
      <StatusTag :type="item.status === 'pending' ? 'warn' : item.status === 'approved' ? 'good' : 'danger'">
        {{ formatStatusText(item.status) }}
      </StatusTag>
    </div>
    <p>{{ item.reasonSummary }}</p>
    <small>{{ item.applicant }} · {{ item.weekRange }} · 异常 {{ item.issueCount }} 条</small>
  </RouterLink>
</template>
