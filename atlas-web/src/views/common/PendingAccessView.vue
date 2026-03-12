<script setup lang="ts">
import { ref } from 'vue'
import { useRouter } from 'vue-router'
import AppShell from '../../components/common/AppShell.vue'
import StateBlock from '../../components/common/StateBlock.vue'
import { fetchMe } from '../../api/atlas'
import { clearSession, setSession, sessionStore } from '../../stores/session'

const router = useRouter()
const refreshing = ref(false)
const error = ref('')

const refreshStatus = async () => {
  refreshing.value = true
  error.value = ''

  try {
    const me = await fetchMe()
    if (me.role === 'pending') {
      error.value = '账号仍待开通，请联系管理员完成角色与门店配置。'
      return
    }

    if (!sessionStore.session?.token) {
      throw new Error('当前缺少有效登录态，请重新登录。')
    }

    setSession({
      token: sessionStore.session.token,
      user: {
        id: me.id,
        name: me.name,
        role: me.role,
        roleLabel: me.roleLabel,
        storeName: me.storeName,
      },
    })
    router.replace('/home')
  } catch (err) {
    clearSession()
    error.value = err instanceof Error ? err.message : '状态刷新失败，请重新登录。'
  } finally {
    refreshing.value = false
  }
}
</script>

<template>
  <AppShell title="账号待开通" subtitle="已识别企业微信身份，但当前未分配角色/门店权限。">
    <StateBlock title="请联系管理员开通" description="开通后可在此页刷新状态，若登录态已失效请返回登录页重新发起企业微信登录。">
      <div class="stack-list">
        <button class="primary-btn inline-btn" :disabled="refreshing" @click="refreshStatus">
          {{ refreshing ? '正在刷新…' : '刷新状态' }}
        </button>
        <RouterLink class="ghost-btn inline-btn" to="/login">返回登录</RouterLink>
      </div>
      <small v-if="error" style="color:#d33">{{ error }}</small>
    </StateBlock>
  </AppShell>
</template>
