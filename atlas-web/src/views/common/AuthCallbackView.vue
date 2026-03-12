<script setup lang="ts">
import { onMounted, ref } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import AppShell from '../../components/common/AppShell.vue'
import StateBlock from '../../components/common/StateBlock.vue'
import { exchangeWeComCode } from '../../api/atlas'
import { setSession } from '../../stores/session'

const route = useRoute()
const router = useRouter()
const error = ref('')
const working = ref(true)

async function handleCallback() {
  const code = String(route.query.code || '').trim()
  const state = String(route.query.state || '').trim() || undefined

  if (!code) {
    error.value = '缺少授权 code，请返回登录页重新发起企业微信登录。'
    working.value = false
    return
  }

  try {
    const { session, pendingAccess } = await exchangeWeComCode(code, state)

    if (pendingAccess || session.user.role === 'pending' || !session.token) {
      router.replace('/pending-access')
      return
    }

    setSession(session)
    router.replace('/home')
  } catch (err) {
    error.value = err instanceof Error ? err.message : '登录失败'
    working.value = false
  }
}

onMounted(handleCallback)
</script>

<template>
  <AppShell title="正在登录" subtitle="企业微信回调处理中">
    <StateBlock v-if="working && !error" tone="loading" title="正在建立会话" description="请稍候，正在完成企业微信登录。" />
    <StateBlock v-else tone="error" title="登录失败" :description="error">
      <div class="stack-list">
        <button class="primary-btn inline-btn" @click="handleCallback">重试</button>
        <RouterLink class="ghost-btn inline-btn" to="/login">返回登录</RouterLink>
      </div>
    </StateBlock>
  </AppShell>
</template>
