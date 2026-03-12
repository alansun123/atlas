import { apiRequest, ApiError, getApiBase } from './client'
import { fetchApprovalDetail as fetchMockApprovalDetail, fetchApprovals as fetchMockApprovals, fetchEmployeeSchedule as fetchMockEmployeeSchedule, fetchHomeData } from './mock'
import type { ApprovalItem, Role, ShiftItem, UserSession, ValidationIssue } from '../types'

const ROLE_TO_USER_ID: Record<'employee' | 'manager' | 'operation', number> = {
  employee: 102,
  manager: 101,
  operation: 201,
}

const APP_BASE_URL = (import.meta.env.VITE_APP_BASE_URL || window.location.origin).replace(/\/$/, '')
const ENABLE_MOCK_LOGIN = String(import.meta.env.VITE_ENABLE_MOCK_LOGIN || 'false').toLowerCase() === 'true'
const ENABLE_API_DATA_FALLBACK = String(import.meta.env.VITE_ENABLE_API_DATA_FALLBACK || 'false').toLowerCase() === 'true'
const WECOM_CORP_ID = String(import.meta.env.VITE_WECOM_CORP_ID || '').trim()
const WECOM_AGENT_ID = String(import.meta.env.VITE_WECOM_AGENT_ID || '').trim()
const WECOM_REDIRECT_URI = String(import.meta.env.VITE_WECOM_REDIRECT_URI || `${APP_BASE_URL}/auth/callback`).trim()

function startOfWeek(date = new Date()) {
  const current = new Date(date)
  const day = current.getDay()
  const diff = day === 0 ? -6 : 1 - day
  current.setDate(current.getDate() + diff)
  current.setHours(0, 0, 0, 0)
  return current
}

function formatDate(date: Date) {
  return date.toISOString().slice(0, 10)
}

function formatMonthDay(dateText: string) {
  const date = new Date(`${dateText}T00:00:00`)
  return date.toLocaleDateString('zh-CN', { month: '2-digit', day: '2-digit' })
}

function weekdayText(dateText: string) {
  const date = new Date(`${dateText}T00:00:00`)
  return date.toLocaleDateString('zh-CN', { weekday: 'short' }).replace('星期', '周')
}

function weekRangeLabel(startDate: string, endDate: string) {
  return `${formatMonthDay(startDate)} - ${formatMonthDay(endDate)}`
}

export function mapRole(role?: string): Role {
  if (role === 'operation_manager') return 'operation'
  if (role === 'manager') return 'manager'
  if (role === 'employee') return 'employee'
  return 'pending'
}

function mapRoleLabel(role: Role) {
  return {
    employee: '员工',
    manager: '店长',
    operation: '运营经理',
    pending: '待开通',
  }[role]
}

export function normalizeSession(data: any): UserSession {
  const role = mapRole(data.user?.role)
  return {
    token: String(data.accessToken || ''),
    user: {
      id: String(data.user?.id ?? data.user?.weworkUserId ?? ''),
      name: data.user?.name || '未知用户',
      role,
      roleLabel: mapRoleLabel(role),
      storeName: data.user?.store?.name || data.user?.storeName || '未分配门店',
    },
  }
}

export function isPendingAccessPayload(data: any) {
  return Boolean(data?.pendingAccess) || mapRole(data?.user?.role) === 'pending'
}

export function isMockLoginEnabled() {
  return ENABLE_MOCK_LOGIN
}

export function isApiDataFallbackEnabled() {
  return ENABLE_API_DATA_FALLBACK
}

export function isWeComEnvironment(userAgent = navigator.userAgent) {
  return /wxwork|wecom/i.test(userAgent)
}

function buildFrontendWeComAuthUrl() {
  if (!WECOM_CORP_ID || !WECOM_AGENT_ID || !WECOM_REDIRECT_URI) return null

  const redirectUri = encodeURIComponent(WECOM_REDIRECT_URI)
  const state = encodeURIComponent(window.location.pathname === '/login' ? 'atlas_login' : `atlas_${Date.now()}`)
  return `https://open.weixin.qq.com/connect/oauth2/authorize?appid=${encodeURIComponent(WECOM_CORP_ID)}&redirect_uri=${redirectUri}&response_type=code&scope=snsapi_base&state=${state}&agentid=${encodeURIComponent(WECOM_AGENT_ID)}#wechat_redirect`
}

export async function fetchWeComAuthUrl() {
  try {
    const data = await apiRequest<any>('/auth/wework/url')
    const url = data?.url || data?.authUrl || data?.authorizeUrl
    if (url) return String(url)
  } catch (error) {
    if (!(error instanceof ApiError) || error.status !== 404) {
      throw error
    }
  }

  const url = buildFrontendWeComAuthUrl()
  if (!url) {
    throw new Error(`未获取到企业微信授权地址。请优先提供后端 /auth/wework/url，或配置 VITE_WECOM_CORP_ID / VITE_WECOM_AGENT_ID / VITE_WECOM_REDIRECT_URI。当前 API_BASE=${getApiBase()}`)
  }
  return url
}

export async function exchangeWeComCode(code: string, state?: string) {
  const data = await apiRequest<any>('/auth/wework/callback', {
    method: 'POST',
    body: JSON.stringify({ code, state }),
  })

  return {
    data,
    session: normalizeSession(data),
    pendingAccess: isPendingAccessPayload(data),
  }
}

export async function loginWithMockRole(role: 'employee' | 'manager' | 'operation') {
  const data = await apiRequest<any>('/auth/mock-login', {
    method: 'POST',
    body: JSON.stringify({ userId: ROLE_TO_USER_ID[role] }),
  })
  return normalizeSession(data)
}

export async function fetchMe() {
  const data = await apiRequest<any>('/auth/me')
  return {
    id: String(data.id),
    name: data.name,
    role: mapRole(data.role),
    roleLabel: mapRoleLabel(mapRole(data.role)),
    storeName: data.store?.name || '未分配门店',
    raw: data,
  }
}

export async function fetchHomeDataWithFallback(role: 'employee' | 'manager' | 'operation') {
  return fetchHomeData(role)
}

export async function fetchEmployeeScheduleWithFallback() {
  const start = startOfWeek()
  const end = new Date(start)
  end.setDate(start.getDate() + 6)

  try {
    const data = await apiRequest<any>('/schedules/me?startDate=' + formatDate(start) + '&endDate=' + formatDate(end))
    const shifts: ShiftItem[] = (data.list || []).map((item: any) => ({
      id: String(item.scheduleId),
      date: formatMonthDay(item.date),
      weekday: weekdayText(item.date),
      shiftName: item.shiftName || '未命名班次',
      timeRange: item.startTime && item.endTime ? `${item.startTime} - ${item.endTime}` : '-',
      storeName: item.storeName || '-',
      status: item.status === 'draft' ? 'adjusting' : 'published',
      note: item.status === 'draft' ? '后端当前会返回 draft 班次，尚未完全过滤为仅已发布。' : undefined,
    }))
    const today = shifts.find((item) => item.date === formatMonthDay(formatDate(new Date()))) || shifts[0] || {
      title: '今日暂无班次',
      timeRange: '-',
      status: 'rest',
      note: '后端当前未返回今日已排班。',
    }

    return {
      source: 'api' as const,
      weekRange: weekRangeLabel(formatDate(start), formatDate(end)),
      today: {
        title: today.shiftName ? `今日${today.shiftName}` : '今日暂无班次',
        timeRange: today.timeRange,
        status: today.status,
        note: today.note || '来自后端 /api/schedules/me',
      },
      shifts,
    }
  } catch (error) {
    if (!ENABLE_API_DATA_FALLBACK) throw error
    return {
      source: 'mock' as const,
      ...(await fetchMockEmployeeSchedule()),
    }
  }
}

export async function fetchApprovalsWithFallback() {
  try {
    const [pending, all, me] = await Promise.all([
      apiRequest<any>('/approvals/pending?page=1&pageSize=100'),
      apiRequest<any>('/approvals?page=1&pageSize=100'),
      fetchMe(),
    ])

    const pendingIds = new Set((pending.list || []).map((item: any) => Number(item.id)))
    const items: ApprovalItem[] = (all.list || []).map((item: any) => ({
      id: String(item.id),
      storeName: item.storeName || '-',
      applicant: item.submittedByUser?.name || '未知提交人',
      weekRange: item.scheduleBatch ? weekRangeLabel(item.scheduleBatch.weekStartDate, item.scheduleBatch.weekEndDate) : '-',
      status: item.status,
      reasonSummary: (item.triggerReasons || []).join(' / ') || item.comment || '排班例外审批',
      issueCount: Array.isArray(item.triggerReasons) ? item.triggerReasons.length : 0,
      submittedAt: item.createdAt ? new Date(item.createdAt).toLocaleString('zh-CN') : '-',
      roleView: String(item.submittedBy) === me.id ? 'submitted' : (pendingIds.has(Number(item.id)) ? 'pending' : 'submitted'),
    }))
    return { source: 'api' as const, items }
  } catch (error) {
    if (!ENABLE_API_DATA_FALLBACK) throw error
    return { source: 'mock' as const, items: await fetchMockApprovals() }
  }
}

export async function fetchApprovalDetailWithFallback(id: string) {
  try {
    const detail = await apiRequest<any>(`/approvals/${id}`)
    const batchDetail = detail.scheduleBatch?.id ? await apiRequest<any>(`/schedules/batches/${detail.scheduleBatch.id}`) : null
    return {
      source: 'api' as const,
      id: String(detail.id),
      storeName: detail.storeName || '-',
      applicant: detail.submittedByUser?.name || '未知提交人',
      weekRange: detail.scheduleBatch ? weekRangeLabel(detail.scheduleBatch.weekStartDate, detail.scheduleBatch.weekEndDate) : '-',
      status: detail.status,
      comment: detail.comment || '无补充说明',
      triggers: detail.triggerReasons?.length ? detail.triggerReasons : ['后端未返回触发原因明细'],
      scheduleOverview: (batchDetail?.entries || []).map((entry: any) => `${formatMonthDay(entry.scheduleDate)} ${entry.shiftName}：${(entry.employees || []).map((e: any) => e.name).join('、') || '未排人'}`),
      history: [detail.approvedAt ? `已通过：${new Date(detail.approvedAt).toLocaleString('zh-CN')}` : '', detail.rejectedAt ? `已驳回：${new Date(detail.rejectedAt).toLocaleString('zh-CN')}` : ''].filter(Boolean),
    }
  } catch (error) {
    if (!ENABLE_API_DATA_FALLBACK) throw error
    return { source: 'mock' as const, ...(await fetchMockApprovalDetail(id)) }
  }
}

function issueTitle(type: string) {
  return {
    DUPLICATED_ASSIGNMENT: '重复排班',
    UNDER_MIN_STAFF: '人数低于最小值',
    OVER_MAX_STAFF: '人数超过最大值',
    LEAVE_CONFLICT: '请假冲突',
    NEW_EMPLOYEE_FIRST_WEEK: '新员工首周排班',
  }[type] || type
}

function toValidationIssues(issues: any[]): ValidationIssue[] {
  return issues.map((item, index) => ({
    id: `${item.type}-${index}`,
    level: item.level === 'error' ? 'blocking' : 'approval',
    title: issueTitle(item.type),
    shiftLabel: item.scheduleDate || '-',
    people: item.employeeId ? `员工 #${item.employeeId}` : `班次 #${item.shiftId || '-'}`,
    reason: item.message,
  }))
}

const MANAGER_BATCH_KEY = 'atlas_manager_batch_map'

function getBatchMap(): Record<string, number> {
  try {
    return JSON.parse(localStorage.getItem(MANAGER_BATCH_KEY) || '{}')
  } catch {
    return {}
  }
}

function setBatchMap(map: Record<string, number>) {
  localStorage.setItem(MANAGER_BATCH_KEY, JSON.stringify(map))
}

export async function fetchManagerScheduleWithFallback() {
  try {
    const me = await fetchMe()
    const stores = await apiRequest<any[]>('/stores')
    const store = stores.find((item) => item.name === me.storeName) || stores[0]
    if (!store) throw new Error('没有可用门店')

    const shifts = await apiRequest<any[]>(`/stores/${store.id}/shifts`)
    const employeesPage = await apiRequest<any>(`/employees?storeId=${store.id}&page=1&pageSize=100`)
    const employees = (employeesPage.list || []).filter((item: any) => item.role === 'employee')

    const weekStart = startOfWeek()
    const weekEnd = new Date(weekStart)
    weekEnd.setDate(weekStart.getDate() + 6)
    const batchKey = `${store.id}:${formatDate(weekStart)}`
    const batchMap = getBatchMap()
    let batchId = batchMap[batchKey]

    const buildEntries = () => {
      const targetEmployees = employees.slice(0, Math.max(1, Math.min(3, employees.length)))
      return [0, 1, 2].flatMap((offset) => {
        const date = new Date(weekStart)
        date.setDate(weekStart.getDate() + offset)
        return shifts.slice(0, Math.min(2, shifts.length)).map((shift: any, index: number) => ({
          scheduleDate: formatDate(date),
          shiftId: shift.id,
          employeeIds: targetEmployees.slice(0, index === 0 ? 1 : Math.min(2, targetEmployees.length)).map((item: any) => item.id),
          remark: 'frontend auto seed',
        }))
      })
    }

    let batch
    if (batchId) {
      batch = await apiRequest<any>(`/schedules/batches/${batchId}`)
    } else {
      batch = await apiRequest<any>('/schedules/batches', {
        method: 'POST',
        body: JSON.stringify({
          storeId: store.id,
          weekStartDate: formatDate(weekStart),
          weekEndDate: formatDate(weekEnd),
          entries: buildEntries(),
          remark: 'atlas-web frontend integration draft',
        }),
      })
      batchMap[batchKey] = batch.id
      setBatchMap(batchMap)
    }

    const validation = await apiRequest<any>(`/schedules/batches/${batch.id}/validate`, { method: 'POST', body: JSON.stringify({}) })
    const grouped = new Map<string, any[]>()
    ;(batch.entries || []).forEach((entry: any) => {
      const key = entry.scheduleDate
      const list = grouped.get(key) || []
      list.push(entry)
      grouped.set(key, list)
    })

    return {
      source: 'api' as const,
      storeId: String(store.id),
      storeName: store.name,
      weekRange: weekRangeLabel(batch.weekStartDate, batch.weekEndDate),
      batchId: batch.id,
      batchStatus: batch.status,
      summary: [
        { label: '总班次', value: String((batch.entries || []).length) },
        { label: '已排员工', value: String(new Set((batch.entries || []).map((entry: any) => entry.employeeId)).size) },
        { label: '阻断问题', value: String((validation.issues || []).filter((item: any) => item.level === 'error').length), tone: 'danger' },
        { label: '需审批', value: String((validation.issues || []).filter((item: any) => item.level !== 'error').length), tone: 'warn' },
      ],
      days: Array.from(grouped.entries()).map(([date, entries]) => ({
        day: `${weekdayText(date)} ${formatMonthDay(date)}`,
        shifts: entries.map((entry: any) => ({
          title: `${entry.shiftName} ${entry.startTime} - ${entry.endTime}`,
          detail: `状态：${entry.status}`,
          people: (entry.employees || []).map((item: any) => item.name),
          note: entry.remark || '来自后端批次详情',
        })),
      })),
      issues: toValidationIssues(validation.issues || []),
      meta: {
        hasBackendBatch: true,
      },
    }
  } catch (error) {
    if (!ENABLE_API_DATA_FALLBACK) throw error
    return {
      source: 'mock' as const,
      ...(await import('./mock').then((m) => m.fetchManagerSchedule())),
      meta: {
        hasBackendBatch: false,
      },
    }
  }
}

export async function submitManagerApproval(batchId: string | number, comment = '前端发起审批') {
  return apiRequest<any>(`/schedules/batches/${batchId}/submit-approval`, {
    method: 'POST',
    body: JSON.stringify({ comment, triggerReasons: ['前端联调提审'] }),
  })
}

export async function publishManagerBatch(batchId: string | number) {
  return apiRequest<any>(`/schedules/batches/${batchId}/publish`, {
    method: 'POST',
    body: JSON.stringify({ notifyEmployees: false }),
  })
}

export async function revalidateManagerBatch(batchId: string | number) {
  return apiRequest<any>(`/schedules/batches/${batchId}/validate`, {
    method: 'POST',
    body: JSON.stringify({}),
  })
}

export async function approveApproval(id: string, comment = '前端联调审批通过') {
  return apiRequest<any>(`/approvals/${id}/approve`, {
    method: 'POST',
    body: JSON.stringify({ comment }),
  })
}

export async function rejectApproval(id: string, comment = '前端联调驳回') {
  return apiRequest<any>(`/approvals/${id}/reject`, {
    method: 'POST',
    body: JSON.stringify({ comment }),
  })
}
