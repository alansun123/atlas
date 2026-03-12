import { reactive } from 'vue'
import type { Role, UserSession } from '../types'
import { fetchMe, isMockLoginEnabled, loginWithMockRole } from '../api/atlas'

const STORAGE_KEY = 'atlas_session'
const LEGACY_STORAGE_KEY = 'atlas_demo_session'

export const sessionStore = reactive<{ ready: boolean; session: UserSession | null }>({
  ready: false,
  session: null,
})

function readStoredSession() {
  const raw = localStorage.getItem(STORAGE_KEY) || localStorage.getItem(LEGACY_STORAGE_KEY)
  if (!raw) return null

  try {
    return JSON.parse(raw) as UserSession
  } catch {
    localStorage.removeItem(STORAGE_KEY)
    localStorage.removeItem(LEGACY_STORAGE_KEY)
    return null
  }
}

export function setSession(session: UserSession) {
  sessionStore.session = session
  localStorage.setItem(STORAGE_KEY, JSON.stringify(session))
  localStorage.removeItem(LEGACY_STORAGE_KEY)
}

export function clearSession() {
  sessionStore.session = null
  localStorage.removeItem(STORAGE_KEY)
  localStorage.removeItem(LEGACY_STORAGE_KEY)
}

export async function bootstrapSession() {
  sessionStore.session = readStoredSession()

  if (sessionStore.session?.token) {
    try {
      const me = await fetchMe()
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
    } catch {
      if (isMockLoginEnabled()) {
        clearSession()
      } else {
        clearSession()
      }
    }
  }

  sessionStore.ready = true
}

export async function loginAs(role: Exclude<Role, 'pending'>) {
  if (!isMockLoginEnabled()) {
    throw new Error('当前环境未启用 mock 登录。请使用企业微信登录。')
  }

  const session = await loginWithMockRole(role)
  setSession(session)
  return session
}

export function logout() {
  clearSession()
}

export function currentRole() {
  return sessionStore.session?.user.role ?? null
}
