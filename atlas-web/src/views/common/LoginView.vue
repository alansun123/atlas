<script setup lang="ts">
import { computed, ref } from 'vue'
import { useRouter } from 'vue-router'
import AppShell from '../../components/common/AppShell.vue'
import { fetchWeComAuthUrl, fetchWeComQrUrl, isMockLoginEnabled, isWeComEnvironment } from '../../api/atlas'
import { loginAs, sessionStore } from '../../stores/session'

const router = useRouter()
const loading = ref(false)
const loadingRole = ref('')
const error = ref('')
const inWeCom = computed(() => isWeComEnvironment())
const mockEnabled = isMockLoginEnabled()

if (sessionStore.session?.user.role === 'pending') {
  router.replace('/pending-access')
} else if (sessionStore.session) {
  router.replace('/home')
}

const startWeComLogin = async () => {
  loading.value = true
  error.value = ''
  try {
    const authUrl = await fetchWeComAuthUrl()
    window.location.href = authUrl
  } catch (err) {
    error.value = err instanceof Error ? err.message : '获取企业微信授权地址失败'
    loading.value = false
  }
}

const startWeComQrLogin = async () => {
  loading.value = true
  error.value = ''
  try {
    const qrUrl = await fetchWeComQrUrl()
    // Open QR code page in new window
    window.open(qrUrl, '_blank', 'width=500,height=600')
    loading.value = false
  } catch (err) {
    error.value = err instanceof Error ? err.message : '获取企业微信二维码失败'
    loading.value = false
  }
}

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
  <AppShell title="Atlas" subtitle="门店智能排班系统 · 企业微信登录优先">
    <section class="card section-gap">
      <div class="section-title-row">
        <h3>企业微信登录</h3>
        <small class="muted">{{ inWeCom ? '已检测到企业微信环境' : '当前不是企业微信内打开' }}</small>
      </div>
      <p>
        Sprint 2 起默认走真实企微授权链路。若当前不在企业微信内，建议从企业微信工作台重新打开；测试环境也可先尝试继续授权，若后端未提供授权地址则会显示明确报错。
      </p>
      <button class="primary-btn" :disabled="loading" @click="startWeComLogin">
        {{ loading ? '正在跳转授权…' : '企业微信登录' }}
      </button>
      <button class="secondary-btn" :disabled="loading" @click="startWeComQrLogin">
        {{ loading ? '正在打开…' : '二维码扫码登录' }}
      </button>
      <small v-if="error" style="color:#d33">{{ error }}</small>
      <small class="muted" style="margin-top:8px">扫码后需在企业微信 App 内确认授权</small>
    </section>

    <section v-if="mockEnabled" class="card muted-box section-gap">
      <strong>开发 / 演示兜底</strong>
      <p>以下 mock 登录仅在显式开启 <code>VITE_ENABLE_MOCK_LOGIN=true</code> 时可用，不能作为真实联调验收路径。</p>
      <div class="stack-list">
        <button class="ghost-btn" :disabled="!!loadingRole || loading" @click="quickLogin('employee')">mock：以员工身份进入</button>
        <button class="ghost-btn" :disabled="!!loadingRole || loading" @click="quickLogin('manager')">mock：以店长身份进入</button>
        <button class="ghost-btn" :disabled="!!loadingRole || loading" @click="quickLogin('operation')">mock：以运营经理身份进入</button>
      </div>
    </section>
  </AppShell>
</template>
