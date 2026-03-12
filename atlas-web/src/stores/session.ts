import { reactive } from 'vue'
import type { Role, UserSession } from '../types'

const STORAGE_KEY = 'atlas_demo_session'

const roles: Record<Exclude<Role, 'pending'>, Omit<UserSession, 'token'>> = {
  employee: {
    user: { id: 'u_emp_1', name: '林小满', role: 'employee', roleLabel: '员工', storeName: '静安寺店' },
  },
  manager: {
    user: { id: 'u_mgr_1', name: '周店长', role: 'manager', roleLabel: '店长', storeName: '静安寺店' },
  },
  operation: {
    user: { id: 'u_op_1', name: '陈运营', role: 'operation', roleLabel: '运营经理', storeName: '华东大区' },
  },
}

export const sessionStore = reactive<{ ready: boolean; session: UserSession | null }>({
  ready: false,
  session: null,
})

export function bootstrapSession() {
  const raw = localStorage.getItem(STORAGE_KEY)
  sessionStore.session = raw ? JSON.parse(raw) : null
  sessionStore.ready = true
}

export function loginAs(role: Exclude<Role, 'pending'>) {
  const session: UserSession = { token: `mock-${role}-token`, ...roles[role] }
  sessionStore.session = session
  localStorage.setItem(STORAGE_KEY, JSON.stringify(session))
  return session
}

export function logout() {
  sessionStore.session = null
  localStorage.removeItem(STORAGE_KEY)
}

export function currentRole() {
  return sessionStore.session?.user.role ?? null
}
