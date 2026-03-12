import { createRouter, createWebHistory } from 'vue-router'
import { currentRole, sessionStore } from '../stores/session'

const router = createRouter({
  history: createWebHistory(),
  routes: [
    { path: '/', redirect: '/home' },
    { path: '/login', component: () => import('../views/common/LoginView.vue') },
    { path: '/auth/callback', component: () => import('../views/common/AuthCallbackView.vue') },
    { path: '/pending-access', component: () => import('../views/common/PendingAccessView.vue') },
    { path: '/home', component: () => import('../views/home/HomeView.vue') },
    { path: '/employee/schedule', component: () => import('../views/employee/EmployeeScheduleView.vue'), meta: { roles: ['employee'] } },
    { path: '/manager/schedule', component: () => import('../views/manager/ManagerScheduleView.vue'), meta: { roles: ['manager'] } },
    { path: '/approvals', component: () => import('../views/approval/ApprovalListView.vue'), meta: { roles: ['manager', 'operation'] } },
    { path: '/approvals/:id', component: () => import('../views/approval/ApprovalDetailView.vue'), meta: { roles: ['manager', 'operation'] } },
  ],
})

router.beforeEach((to) => {
  const role = currentRole()
  const isPublic = ['/login', '/auth/callback', '/pending-access'].includes(to.path)

  if (!sessionStore.ready) return true
  if (!role && !isPublic) return '/login'
  if (role && to.path === '/login') return '/home'
  if (role && to.meta.roles && !(to.meta.roles as string[]).includes(role)) return '/home'
  return true
})

export default router
