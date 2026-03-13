<script setup lang="ts">
import { computed, ref } from 'vue'
import { useRouter } from 'vue-router'
import AppShell from '../../components/common/AppShell.vue'
import StateBlock from '../../components/common/StateBlock.vue'
import { fetchMe } from '../../api/atlas'
import { clearSession, setSession, sessionStore } from '../../stores/session'

const router = useRouter()
const refreshing = ref(false)
const error = ref('')
const hasSessionToken = computed(() => Boolean(sessionStore.session?.token))

const refreshStatus = async () => {
  if (!hasSessionToken.value) {
    error.value = '当前没有可复用的登录态。待管理员开通后，请返回登录页重新发起企业微信登录。'
    return
  }

  refreshing.value = true
  error.value = ''

  try {
    const me = await fetchMe()
    if (me.role === 'pending') {
      error.value = '账号仍待开通，请联系管理员完成角色与门店配置。'
      return
    }

    setSession({
      token: sessionStore.session?.token || '',
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
    <StateBlock
      :title="hasSessionToken ? '请联系管理员开通' : '待开通结果已确认，但当前没有可复用会话'"
      :description="hasSessionToken
        ? '开通后可在此页刷新状态，若登录态已失效请返回登录页重新发起企业微信登录。'
        : '后端对待开通账号不会下发可继续刷新的业务会话。当前页面只能说明本次企微回调结果为待开通，不能当作已登录成功。管理员开通后，请返回登录页重新发起企业微信登录。'"
    >
      <div class="stack-list">
        <button class="primary-btn inline-btn" :disabled="refreshing || !hasSessionToken" @click="refreshStatus">
          {{ refreshing ? '正在刷新…' : '刷新状态' }}
        </button>
        <RouterLink class="ghost-btn inline-btn" to="/login">返回登录</RouterLink>
      </div>
      <small v-if="!hasSessionToken" class="muted">当前为 pending-access 结果页，不代表已建立可继续访问业务页的登录态。</small>
      <small v-if="error" style="color:#d33">{{ error }}</small>
    </StateBlock>
  </AppShell>
</template>
