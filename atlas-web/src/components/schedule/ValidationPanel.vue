<script setup lang="ts">
import StatusTag from '../common/StatusTag.vue'
import type { ValidationIssue } from '../../types'

defineProps<{ issues: ValidationIssue[] }>()
</script>

<template>
  <section class="card section-gap">
    <div class="section-title-row">
      <h3>校验结果</h3>
      <StatusTag type="warn">{{ issues.length }} 条</StatusTag>
    </div>
    <div v-if="issues.length" class="stack-list">
      <div v-for="issue in issues" :key="issue.id" class="issue-item">
        <div class="section-title-row">
          <strong>{{ issue.title }}</strong>
          <StatusTag :type="issue.level === 'blocking' ? 'danger' : 'warn'">
            {{ issue.level === 'blocking' ? '阻断' : '需审批' }}
          </StatusTag>
        </div>
        <p>{{ issue.shiftLabel }} · {{ issue.people }}</p>
        <small>{{ issue.reason }}</small>
      </div>
    </div>
    <p v-else class="muted">暂无异常，可直接发布。</p>
  </section>
</template>
