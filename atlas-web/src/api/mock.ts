import type { ApprovalItem, DashboardCard, ShiftItem, Shortcut, ValidationIssue } from '../types'

const wait = (ms = 300) => new Promise((resolve) => setTimeout(resolve, ms))

export async function fetchHomeData(role: 'employee' | 'manager' | 'operation') {
  await wait()
  const common = {
    employee: {
      cards: [
        { label: '今日班次', value: '13:00 - 21:00', tone: 'good' },
        { label: '本周上班', value: '5 天' },
        { label: '请假冲突', value: '1 条', tone: 'warn' },
      ] satisfies DashboardCard[],
      shortcuts: [
        { label: '查看我的班表', description: '进入员工周班表', to: '/employee/schedule' },
        { label: '去企微提交请假', description: '演示外跳入口', href: 'https://work.weixin.qq.com/' },
      ] satisfies Shortcut[],
      todos: ['3/14 晚班与已批准请假冲突，请联系店长确认。'],
    },
    manager: {
      cards: [
        { label: '本周状态', value: '待审批', tone: 'warn' },
        { label: '异常条数', value: '3 条', tone: 'danger' },
        { label: '今日请假', value: '2 人' },
      ] satisfies DashboardCard[],
      shortcuts: [
        { label: '进入店长排班', description: '查看本周草稿与校验', to: '/manager/schedule' },
        { label: '查看审批状态', description: '我提交的特殊排班', to: '/approvals?tab=submitted' },
      ] satisfies Shortcut[],
      todos: ['静安寺店本周排班含 2 条需审批例外，提交后可由运营经理处理。'],
    },
    operation: {
      cards: [
        { label: '待审批', value: '2 单', tone: 'warn' },
        { label: '今日关注门店', value: '3 家' },
        { label: '本周已批', value: '5 单', tone: 'good' },
      ] satisfies DashboardCard[],
      shortcuts: [
        { label: '处理特殊排班审批', description: '进入审批列表', to: '/approvals' },
      ] satisfies Shortcut[],
      todos: ['静安寺店与长宁来福士店有新的特殊排班待审批。'],
    },
  }
  return common[role]
}

export async function fetchEmployeeSchedule() {
  await wait()
  return {
    weekRange: '03/09 - 03/15',
    today: {
      title: '今日晚班',
      timeRange: '13:00 - 21:00',
      status: 'conflict',
      note: '已批准请假与该班次冲突',
    },
    shifts: [
      { id: '1', date: '03/10', weekday: '周二', shiftName: '休息', timeRange: '-', storeName: '静安寺店', status: 'rest' },
      { id: '2', date: '03/11', weekday: '周三', shiftName: '早班', timeRange: '09:00 - 17:00', storeName: '静安寺店', status: 'published' },
      { id: '3', date: '03/12', weekday: '周四', shiftName: '晚班', timeRange: '13:00 - 21:00', storeName: '静安寺店', status: 'conflict', note: '请假已通过，需联系店长调整' },
      { id: '4', date: '03/13', weekday: '周五', shiftName: '中班', timeRange: '11:00 - 19:00', storeName: '静安寺店', status: 'published' },
    ] satisfies ShiftItem[],
  }
}

export async function fetchManagerSchedule() {
  await wait()
  return {
    storeName: '静安寺店',
    weekRange: '03/09 - 03/15',
    batchStatus: '待审批',
    summary: [
      { label: '总班次', value: '18' },
      { label: '已排员工', value: '11' },
      { label: '阻断问题', value: '1', tone: 'danger' },
      { label: '需审批', value: '2', tone: 'warn' },
    ] satisfies DashboardCard[],
    days: [
      {
        day: '周四 03/12',
        shifts: [
          { title: '早班 09:00 - 17:00', detail: '最少 2 人 / 当前 1 人', people: ['小吴'], note: '缺 1 人' },
          { title: '晚班 13:00 - 21:00', detail: '最少 3 人 / 当前 3 人', people: ['林小满', '王南', '阿杰'], note: '含请假冲突 1 人' },
        ],
      },
      {
        day: '周五 03/13',
        shifts: [
          { title: '中班 11:00 - 19:00', detail: '最少 2 人 / 当前 2 人', people: ['新员工小周', '王南'], note: '新员工首周上岗' },
        ],
      },
    ],
    issues: [
      { id: 'v1', level: 'blocking', title: '人数低于最小值', shiftLabel: '03/12 早班', people: '小吴', reason: '仍缺 1 人，不能直接发布' },
      { id: 'v2', level: 'approval', title: '请假冲突', shiftLabel: '03/12 晚班', people: '林小满', reason: '员工请假已通过，需审批后调班' },
      { id: 'v3', level: 'approval', title: '新员工首周排班', shiftLabel: '03/13 中班', people: '新员工小周', reason: '命中新员工首周规则' },
    ] satisfies ValidationIssue[],
  }
}

const approvals: ApprovalItem[] = [
  { id: 'ap-101', storeName: '静安寺店', applicant: '周店长', weekRange: '03/09 - 03/15', status: 'pending', reasonSummary: '请假冲突 + 新员工首周排班', issueCount: 2, submittedAt: '今天 09:20', roleView: 'pending' },
  { id: 'ap-102', storeName: '长宁来福士店', applicant: '赵店长', weekRange: '03/09 - 03/15', status: 'approved', reasonSummary: '促销活动临时加班', issueCount: 1, submittedAt: '昨天 18:40', roleView: 'pending' },
  { id: 'ap-103', storeName: '静安寺店', applicant: '周店长', weekRange: '03/02 - 03/08', status: 'rejected', reasonSummary: '人数不足但未补充方案', issueCount: 1, submittedAt: '3/8 15:10', roleView: 'submitted' },
]

export async function fetchApprovals() {
  await wait()
  return approvals
}

export async function fetchApprovalDetail(id: string) {
  await wait()
  const target = approvals.find((item) => item.id === id)
  if (!target) throw new Error('审批单不存在')
  return {
    ...target,
    comment: '周末商场活动叠加 2 人请假，先保营业再补班。',
    triggers: [
      '03/12 晚班：林小满请假已通过，与班次冲突',
      '03/13 中班：新员工小周首周上岗，需运营确认',
    ],
    scheduleOverview: [
      '03/12 早班：小吴（缺 1 人）',
      '03/12 晚班：林小满、王南、阿杰',
      '03/13 中班：新员工小周、王南',
    ],
    history: target.status === 'pending' ? [] : ['运营经理：请补充门店备班方案后重提'],
  }
}
