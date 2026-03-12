<script setup lang="ts">
import { useRouter } from 'vue-router'
import AppShell from '../../components/common/AppShell.vue'
import { loginAs } from '../../stores/session'

const router = useRouter()
const quickLogin = (role: 'employee' | 'manager' | 'operation') => {
  loginAs(role)
  router.push('/home')
}
</script>

<template>
  <AppShell title="Atlas" subtitle="门店智能排班系统 · 演示登录">
    <section class="card section-gap">
      <p>当前为 MVP mock 登录。正式企微 OAuth 接口就绪后，可替换为真实授权跳转。</p>
      <div class="stack-list">
        <button class="primary-btn" @click="quickLogin('employee')">以员工身份进入</button>
        <button class="primary-btn" @click="quickLogin('manager')">以店长身份进入</button>
        <button class="primary-btn" @click="quickLogin('operation')">以运营经理身份进入</button>
      </div>
    </section>
    <section class="card muted-box">
      <strong>测试说明</strong>
      <p>沿用本地 session 持久化，刷新页面不会丢失登录态。</p>
    </section>
  </AppShell>
</template>
