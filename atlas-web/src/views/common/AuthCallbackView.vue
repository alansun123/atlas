<script setup lang="ts">
import { onMounted, ref } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import AppShell from '../../components/common/AppShell.vue'
import StateBlock from '../../components/common/StateBlock.vue'
import { loginAs } from '../../stores/session'

const route = useRoute()
const router = useRouter()
const error = ref('')

onMounted(async () => {
  const role = String(route.query.role || 'employee') as 'employee' | 'manager' | 'operation'
  const code = route.query.code
  await new Promise((resolve) => setTimeout(resolve, 500))
  if (!code) {
    error.value = '缺少授权 code，当前回调页仅做 mock 演示。'
    return
  }
  loginAs(role)
  router.replace('/home')
})
</script>

<template>
  <AppShell title="正在登录" subtitle="模拟企微回调处理中">
    <StateBlock v-if="!error" tone="loading" title="正在建立会话" description="请稍候，马上进入首页。" />
    <StateBlock v-else tone="error" title="登录失败" :description="error">
      <RouterLink class="primary-btn inline-btn" to="/login">返回登录</RouterLink>
    </StateBlock>
  </AppShell>
</template>
