export type Role = 'employee' | 'manager' | 'operation' | 'pending'

export interface UserSession {
  token: string
  user: {
    id: string
    name: string
    role: Role
    roleLabel: string
    storeName: string
  }
}

export interface DashboardCard {
  label: string
  value: string
  tone?: 'default' | 'good' | 'warn' | 'danger'
}

export interface Shortcut {
  label: string
  description: string
  to?: string
  href?: string
}

export interface ShiftItem {
  id: string
  date: string
  weekday: string
  shiftName: string
  timeRange: string
  storeName: string
  status: 'published' | 'rest' | 'conflict' | 'adjusting'
  note?: string
}

export interface ValidationIssue {
  id: string
  level: 'blocking' | 'approval'
  title: string
  shiftLabel: string
  people: string
  reason: string
}

export interface ApprovalItem {
  id: string
  storeName: string
  applicant: string
  weekRange: string
  status: 'pending' | 'approved' | 'rejected'
  reasonSummary: string
  issueCount: number
  submittedAt: string
  roleView: 'submitted' | 'pending'
}
