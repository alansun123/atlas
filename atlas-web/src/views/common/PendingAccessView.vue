<script setup lang="ts">
import AppShell from '../../components/common/AppShell.vue'
import StateBlock from '../../components/common/StateBlock.vue'
</script>

<template>
  <AppShell title="账号待开通" subtitle="已识别企业微信身份，但当前未分配角色/门店权限。">
    <StateBlock title="请联系管理员开通" description="开通后刷新页面即可进入系统。">
      <RouterLink class="primary-btn inline-btn" to="/login">返回登录</RouterLink>
    </StateBlock>
  </AppShell>
</template>
