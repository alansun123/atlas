import { reactive } from 'vue'
import type { Role, UserSession } from '../types'
import { fetchMe, loginWithMockRole } from '../api/atlas'

const STORAGE_KEY = 'atlas_demo_session'

export const sessionStore = reactive<{ ready: boolean; session: UserSession | null }>({
  ready: false,
  session: null,
})

export async function bootstrapSession() {
  const raw = localStorage.getItem(STORAGE_KEY)
  sessionStore.session = raw ? JSON.parse(raw) : null

  if (sessionStore.session?.token) {
    try {
      const me = await fetchMe()
      sessionStore.session = {
        token: sessionStore.session.token,
        user: {
          id: me.id,
          name: me.name,
          role: me.role,
          roleLabel: me.roleLabel,
          storeName: me.storeName,
        },
      }
      localStorage.setItem(STORAGE_KEY, JSON.stringify(sessionStore.session))
    } catch {
      // 保留已缓存 session，允许前端 fallback/mock 继续工作
    }
  }

  sessionStore.ready = true
}

export async function loginAs(role: Exclude<Role, 'pending'>) {
  const session = await loginWithMockRole(role)
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
