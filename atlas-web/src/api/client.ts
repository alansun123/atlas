import { sessionStore } from '../stores/session'

const API_BASE = (import.meta.env.VITE_API_BASE_URL || 'http://127.0.0.1:3100/api').replace(/\/$/, '')

interface ApiEnvelope<T> {
  code: number
  message: string
  data: T
  requestId: string
  timestamp: number
}

export class ApiError extends Error {
  code: number
  status: number
  details: unknown

  constructor(message: string, code = -1, status = 500, details?: unknown) {
    super(message)
    this.name = 'ApiError'
    this.code = code
    this.status = status
    this.details = details
  }
}

export async function apiRequest<T>(path: string, init: RequestInit = {}): Promise<T> {
  const headers = new Headers(init.headers || {})
  headers.set('Accept', 'application/json')

  const bodyIsForm = typeof FormData !== 'undefined' && init.body instanceof FormData
  if (init.body && !headers.has('Content-Type') && !bodyIsForm) {
    headers.set('Content-Type', 'application/json')
  }

  const token = sessionStore.session?.token
  if (token && !headers.has('Authorization')) {
    headers.set('Authorization', `Bearer ${token}`)
  }

  const response = await fetch(`${API_BASE}${path.startsWith('/') ? path : `/${path}`}`, {
    ...init,
    headers,
  })

  const text = await response.text()
  const json = text ? JSON.parse(text) as ApiEnvelope<T> : null

  if (!response.ok) {
    throw new ApiError(json?.message || `请求失败（${response.status}）`, json?.code, response.status, json)
  }

  if (!json) {
    throw new ApiError('接口返回为空')
  }

  if (json.code !== 0) {
    throw new ApiError(json.message || '业务请求失败', json.code, response.status, json)
  }

  return json.data
}

export function getApiBase() {
  return API_BASE
}
