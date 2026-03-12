export const ROLE_HOME: Record<string, string> = {
  employee: '/employee/schedule',
  manager: '/manager/schedule',
  operation: '/approvals',
}

export const formatStatusText = (status: string) => ({
  published: '已发布',
  rest: '休息',
  conflict: '请假冲突',
  adjusting: '调整中',
  pending: '待审批',
  approved: '已通过',
  rejected: '已驳回',
}[status] || status)

export const todayText = () => {
  const now = new Date()
  return now.toLocaleDateString('zh-CN', {
    month: '2-digit',
    day: '2-digit',
    weekday: 'long',
  })
}
