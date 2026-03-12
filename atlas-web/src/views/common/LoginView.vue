<script setup lang="ts">
import { ref } from 'vue'
import { useRouter } from 'vue-router'
import AppShell from '../../components/common/AppShell.vue'
import { loginAs } from '../../stores/session'

const router = useRouter()
const loadingRole = ref<string>('')
const error = ref('')

const quickLogin = async (role: 'employee' | 'manager' | 'operation') => {
  loadingRole.value = role
  error.value = ''
  try {
    await loginAs(role)
    router.push('/home')
  } catch (err) {
    error.value = err instanceof Error ? err.message : '登录失败'
  } finally {
    loadingRole.value = ''
  }
}
</script>

<template>
  <AppShell title="Atlas" subtitle="门店智能排班系统 · 演示登录">
    <section class="card section-gap">
      <p>优先走后端 <code>/api/auth/mock-login</code>；若后端不可用，其他页面仍保留必要前端 fallback/mock。</p>
      <div class="stack-list">
        <button class="primary-btn" :disabled="!!loadingRole" @click="quickLogin('employee')">以员工身份进入</button>
        <button class="primary-btn" :disabled="!!loadingRole" @click="quickLogin('manager')">以店长身份进入</button>
        <button class="primary-btn" :disabled="!!loadingRole" @click="quickLogin('operation')">以运营经理身份进入</button>
      </div>
      <small v-if="error" style="color:#d33">{{ error }}</small>
    </section>
    <section class="card muted-box">
      <strong>测试说明</strong>
      <p>登录态仍存本地 session，但会在启动时尝试调用 <code>/api/auth/me</code> 刷新当前用户信息。</p>
    </section>
  </AppShell>
</template>
