import type {
  OrgUser,
  WorkflowDefinition,
  WorkflowInstanceSummary,
  WorkflowVersion,
  WorkflowVariable,
  InstanceTimelineEntry,
  InstanceTask,
  ParticipantScope,
} from '../types/workflow';
import { useAuthStore } from '../stores/authStore';

/**
 * Returns the current authenticated user from authStore.
 * Returns null if not authenticated — callers should redirect to login in that case.
 */
export function getCurrentUser() {
  return useAuthStore.getState().currentUser;
}

export let orgUsers: OrgUser[] = [
  { id: 'U001', externalId: 'EXT-001', displayName: 'Nguyễn Thị Mai', email: 'mai.nt@company.com', department: 'Phòng Nhân sự', role: 'HR Specialist', level: 'Staff', status: 'Active', managerId: 'U003' },
  { id: 'U002', externalId: 'EXT-002', displayName: 'Trần Hoàng Bách', email: 'bach.th@company.com', department: 'Phòng Công nghệ', role: 'Backend Engineer', level: 'Staff', status: 'Active', managerId: 'U004' },
  { id: 'U003', externalId: 'EXT-003', displayName: 'Lê Minh Tâm', email: 'tam.lm@company.com', department: 'Phòng Kinh doanh', role: 'Sales Lead', level: 'Manager', status: 'Active', managerId: 'U006' },
  { id: 'U004', externalId: 'EXT-004', displayName: 'Phạm Hồng Đăng', email: 'dang.ph@company.com', department: 'Phòng Tài chính', role: 'Chief Accountant', level: 'Manager', status: 'Active', managerId: 'U006' },
  { id: 'U005', externalId: 'EXT-005', displayName: 'Vũ Ngọc Trinh', email: 'trinh.vn@company.com', department: 'Phòng Marketing', role: 'Marketing Director', level: 'Director', status: 'Active', managerId: 'U006' },
  { id: 'U006', externalId: 'EXT-006', displayName: 'Đỗ Hữu Châu', email: 'chau.dh@company.com', department: 'Ban Giám đốc', role: 'Chief Executive Officer', level: 'C-Level', status: 'Active' },
  { id: 'U007', externalId: 'EXT-007', displayName: 'Hoàng Quốc Việt', email: 'viet.hq@company.com', department: 'Phòng Công nghệ', role: 'DevOps Specialist', level: 'Staff', status: 'Inactive', managerId: 'U004' },
  { id: 'U008', externalId: 'EXT-008', displayName: 'Bùi Phương Thảo', email: 'thao.bp@company.com', department: 'Phòng Pháp chế', role: 'Legal Counsel', level: 'Staff', status: 'Active', managerId: 'U006' },
];

export function findUser(id: string): OrgUser | undefined {
  return orgUsers.find(u => u.id === id);
}

export function userDisplayName(id: string): string {
  return findUser(id)?.displayName ?? id;
}

export function resolveParticipantScope(scope?: ParticipantScope | null): OrgUser[] {
  if (!scope?.enabled) return [];
  const cfg = scope.selectorConfig ?? {};
  switch (scope.scopeKind) {
    case 'department':
      return orgUsers.filter(u => cfg.department ? u.department === cfg.department : false);
    case 'role':
      return orgUsers.filter(u => cfg.role ? u.role === cfg.role : false);
    case 'fixed_users':
      return orgUsers.filter(u => cfg.userIds?.includes(u.id) ?? false);
    case 'condition': {
      const rule = (cfg.rule ?? '').toLowerCase();
      if (rule.includes('active')) return orgUsers.filter(u => u.status === 'Active');
      const dept = orgUsers.find(u => rule.includes(u.department.toLowerCase()));
      if (dept) return orgUsers.filter(u => u.department === dept.department);
      const role = orgUsers.find(u => rule.includes(u.role.toLowerCase()));
      if (role) return orgUsers.filter(u => u.role === role.role);
      return orgUsers.filter(u => u.status === 'Active');
    }
    case 'from_trigger':
    case 'all_active':
    default:
      return orgUsers.filter(u => u.status === 'Active');
  }
}

export function scopeDescription(scope?: ParticipantScope | null): string {
  if (!scope?.enabled) return 'Không bật';
  switch (scope.scopeKind) {
    case 'department': return `Phòng ban: ${scope.selectorConfig.department ?? '—'}`;
    case 'role': return `Vai trò: ${scope.selectorConfig.role ?? '—'}`;
    case 'fixed_users': return `Chọn ${scope.selectorConfig.userIds?.length ?? 0} người cụ thể`;
    case 'condition': return scope.selectorConfig.rule ?? 'Điều kiện động';
    case 'from_trigger': return `Từ dữ liệu Trigger: ${scope.selectorConfig.triggerField ?? '—'}`;
    case 'all_active':
    default: return 'Tất cả nhân viên đang hoạt động';
  }
}

export const workflowTemplates = [
  { id: 'T001', name: 'Standard IT Request', description: 'Template cho yêu cầu trang thiết bị/phần mềm IT.', category: 'IT' },
  { id: 'T002', name: 'Leave Application', description: 'Luồng phê duyệt nghỉ phép chuẩn với quản lý và HR.', category: 'HR' },
  { id: 'T003', name: 'Expense Claim', description: 'Luồng hoàn ứng đa cấp phê duyệt theo số tiền.', category: 'Finance' },
];

export let workflows: WorkflowDefinition[] = [
  {
    id: '1',
    name: 'Phê duyệt mua sắm',
    description: 'Quy trình phê duyệt yêu cầu mua sắm trang thiết bị',
    type: 'Approval',
    module: 'Operations',
    ownerId: 'U000',
    status: 'PUBLISHED',
    draftVersion: '2.2',
    createdAt: '2024-11-01',
    updatedAt: '2024-12-08 16:15',
    trigger: { type: 'manual', config: {} },
    variables: [
      { key: 'threshold', dataType: 'NUMBER', defaultValue: { kind: 'CONSTANT', value: 10000000 }, required: true, mutationPolicy: 'READ_ONLY' as const },
      { key: 'period', dataType: 'STRING', defaultValue: { kind: 'CONSTANT', value: 'Q3-2024' }, required: false, mutationPolicy: 'READ_ONLY' as const },
    ],
    nodes: [],
    connections: [],
  },
  {
    id: '2',
    name: 'Phê duyệt nghỉ phép',
    description: 'Quy trình phê duyệt nghỉ phép năm cho nhân viên',
    type: 'Approval',
    module: 'Operations',
    ownerId: 'U000',
    status: 'PUBLISHED',
    draftVersion: '1.4',
    createdAt: '2024-10-15',
    updatedAt: '2024-12-08 16:15',
    trigger: { type: 'manual', config: {} },
    variables: [
      { key: 'maxLeaveDays', dataType: 'NUMBER', defaultValue: { kind: 'CONSTANT', value: 12 }, required: true, mutationPolicy: 'READ_ONLY' as const },
      { key: 'period', dataType: 'STRING', defaultValue: { kind: 'CONSTANT', value: '2024' }, required: false, mutationPolicy: 'READ_ONLY' as const },
    ],
    nodes: [],
    connections: [],
  },
  {
    id: '3',
    name: 'Phê duyệt hợp đồng',
    description: 'Quy trình phê duyệt hợp đồng trước khi ký',
    type: 'Review',
    module: 'Finance',
    ownerId: 'U004',
    status: 'SUSPENDED',
    draftVersion: '3.0',
    createdAt: '2024-09-20',
    updatedAt: '2024-11-15 10:30',
    trigger: { type: 'form', config: {} },
    variables: [],
    nodes: [],
    connections: [],
  },
  {
    id: '4',
    name: 'Review tài liệu kỹ thuật',
    description: 'Quy trình review tài liệu kỹ thuật trước khi xuất bản',
    type: 'Review',
    module: 'Operations',
    ownerId: 'U002',
    status: 'SUSPENDED',
    draftVersion: '1.2',
    createdAt: '2024-08-11',
    updatedAt: '2024-10-02 09:00',
    trigger: { type: 'webhook', config: {} },
    variables: [],
    nodes: [],
    connections: [],
  },
  {
    id: '5',
    name: 'Phê duyệt chi phí',
    description: 'Quy trình phê duyệt chi phí nội bộ',
    type: 'Approval',
    module: 'Finance',
    ownerId: 'U005',
    status: 'DRAFT',
    draftVersion: '2.0',
    createdAt: '2024-11-20',
    updatedAt: '2024-11-28 14:20',
    trigger: undefined,
    variables: [],
    nodes: [],
    connections: [],
  },
  {
    id: '6',
    name: 'Đánh giá hiệu quả công việc',
    description: 'Quy trình đánh giá hiệu quả công việc định kỳ: nhân viên tự đánh giá, quản lý trực tiếp đánh giá, HR kiểm tra, lưu và thông báo kết quả',
    type: 'Review',
    module: 'HR',
    ownerId: 'U000',
    status: 'PUBLISHED',
    draftVersion: '1.0',
    createdAt: '2024-12-10',
    updatedAt: '2024-12-10 09:00',
    trigger: { type: 'schedule', config: { cron: '0 8 1 * *', label: '08:00 ngày 01 hàng tháng' } },
    participantScope: { enabled: true, source: 'ORGANIZATION_DIRECTORY', scopeKind: 'all_active', selectorType: 'fixed', selectorConfig: { rule: 'employee.status == ACTIVE' }, snapshotPolicy: 'AT_INSTANCE_START' },
    participantNotification: {
      enabled: true,
      channels: ['inapp', 'email'],
      titleTemplate: 'Đợt đánh giá {{workflow.period}} đã bắt đầu',
      bodyTemplate: 'Bạn là người tham gia đợt đánh giá {{workflow.period}}. Thời gian hoàn thành: {{workflow.dueDate}}',
    },
    variables: [
      { key: 'period', dataType: 'STRING', defaultValue: { kind: 'CONSTANT', value: 'Q4-2024' }, required: true, description: 'Kỳ đánh giá', mutationPolicy: 'MUTABLE' as const },
      { key: 'evaluationValid', dataType: 'BOOLEAN', defaultValue: { kind: 'CONSTANT', value: false }, required: true, description: 'HR xác nhận kết quả đánh giá hợp lệ', mutationPolicy: 'MUTABLE' as const },
    ],
    nodes: [
      {
        id: 'n1',
        type: 'ASSIGNMENT',
        name: 'Nhân viên tự đánh giá',
        config: {
          assignee: { type: 'current_participant' },
          assigneeType: 'assignee',
          title: 'Phiếu tự đánh giá - ${variables.period}',
          description: 'Vui lòng hoàn thành phiếu tự đánh giá cho kỳ này.',
          formName: 'Phiếu tự đánh giá',
          formFields: [
            { id: 'f1', label: 'Kết quả công việc nổi bật trong kỳ', type: 'textarea', required: true, placeholder: 'Mô tả thành tích chính', outputMapping: 'selfAchievements' },
            { id: 'f2', label: 'Khó khăn gặp phải', type: 'textarea', required: false, placeholder: 'Mô tả khó khăn', outputMapping: 'selfChallenges' },
            { id: 'f3', label: 'Điểm tự đánh giá', type: 'number', required: true, validation: { min: 1, max: 10 }, outputMapping: 'selfScore' },
          ],
          executionMode: 'single',
          slaDue: '5 ngày',
          slaAction: 'Nhắc nhở',
          dueReminderMessage: 'Nhắc nhở: Phiếu tự đánh giá của bạn đã đến hạn, vui lòng hoàn thành.',
          channels: ['email', 'inapp'],
          message: 'Nhân viên ${participant.name} hoàn thành phiếu tự đánh giá cho kỳ ${variables.period}',
        },
        position: { x: 300, y: 210 },
      },
      {
        id: 'n2',
        type: 'ASSIGNMENT',
        name: 'Quản lý trực tiếp đánh giá',
        config: {
          assignee: { type: 'participant_manager' },
          title: 'Đánh giá của quản lý trực tiếp - ${variables.period}',
          description: 'Quản lý trực tiếp cần xem xét kết quả tự đánh giá và đưu ra nhận định.',
          formName: 'Phiếu đánh giá của quản lý',
          formFields: [
            { id: 'f0', label: 'Kết quả tự đánh giá của nhân viên', type: 'textarea', required: false, readOnly: true, defaultValue: '${nodes.n1.selfAchievements}', outputMapping: 'displaySelfAchievements' },
            { id: 'f0b', label: 'Điểm nhân viên tự đánh giá', type: 'number', required: false, readOnly: true, defaultValue: '${nodes.n1.selfScore}', outputMapping: 'displaySelfScore' },
            { id: 'f1', label: 'Đánh giá năng lực', type: 'select', required: true, options: [{ value: 'excellent', label: 'Xuất sắc' }, { value: 'good', label: 'Tốt' }, { value: 'fair', label: 'Đạt' }, { value: 'poor', label: 'Cần cải thiện' }], outputMapping: 'managerCompetency' },
            { id: 'f2', label: 'Nhận xét của quản lý', type: 'textarea', required: true, placeholder: 'Nhận xét chi tiết', outputMapping: 'managerComment' },
            { id: 'f3', label: 'Điểm quản lý chấm', type: 'number', required: true, validation: { min: 1, max: 10 }, outputMapping: 'managerScore' },
            { id: 'f4', label: 'Đề xuất mục tiêu kỳ sau', type: 'text', required: false, outputMapping: 'nextPeriodGoals' },
          ],
          executionMode: 'single',
          slaDue: '5 ngày',
          slaAction: 'Nhắc nhở',
          dueReminderMessage: 'Nhắc nhở: Phiếu đánh giá của bạn dành cho nhân viên đã đến hạn.',
          channels: ['email', 'inapp'],
          message: 'Quản lý ${participant.managerName} xem kết quả tự đánh giá của ${participant.name} (điểm: ${nodes.n1.selfScore}) rồi thực hiện đánh giá',
        },
        position: { x: 300, y: 370 },
      },
      {
        id: 'n3',
        type: 'REVIEW',
        name: 'HR kiểm tra kết quả',
        config: {
          assignee: { type: 'fixed', value: 'U001', label: 'Nguyễn Thị Mai' },
          assigneeType: 'assignee',
          title: 'HR kiểm tra kết quả đánh giá - ${variables.period}',
          description: 'HR xác nhận tính đầy đủ và hợp lệ của kết quả đánh giá từ nhân viên và quản lý.',
          formName: 'Phiếu kiểm tra HR',
          formFields: [
            { id: 'f0a', label: 'Kết quả tự đánh giá của nhân viên', type: 'textarea', required: false, readOnly: true, defaultValue: '${nodes.n1.selfAchievements}', outputMapping: 'reviewSelfAchievements' },
            { id: 'f0b', label: 'Điểm nhân viên tự đánh giá', type: 'number', required: false, readOnly: true, defaultValue: '${nodes.n1.selfScore}', outputMapping: 'reviewSelfScore' },
            { id: 'f0c', label: 'Điểm quản lý chấm', type: 'number', required: false, readOnly: true, defaultValue: '${nodes.n2.managerScore}', outputMapping: 'reviewMgrScore' },
            { id: 'f0d', label: 'Nhận xét của quản lý', type: 'textarea', required: false, readOnly: true, defaultValue: '${nodes.n2.managerComment}', outputMapping: 'reviewMgrComment' },
            { id: 'f1', label: 'Xác nhận độ đầy đủ', type: 'checkbox', required: true, outputMapping: 'hrCompleteCheck' },
            { id: 'f2', label: 'Ghi chú HR', type: 'textarea', required: false, outputMapping: 'hrNote' },
            { id: 'f3', label: 'Kết quả cuối cùng hợp lệ?', type: 'checkbox', required: true, outputMapping: 'evaluationValid' },
          ],
          executionMode: 'single',
          slaDue: '3 ngày',
          slaAction: 'Nhắc nhở',
          dueReminderMessage: 'Nhắc nhở: Công việc kiểm tra HR đã đến hạn.',
          channels: ['email', 'inapp'],
          message: 'HR kiểm tra tính hợp lệ của kết quả đánh giá'
        },
        position: { x: 300, y: 530 }
      },
      { id: 'n4', type: 'CONDITION', name: 'Kết quả hợp lệ?', config: { condition: '${nodes.n3.evaluationValid} == true' }, position: { x: 300, y: 690 } },
      { id: 'n5', type: 'SYSTEM', name: 'Lưu kết quả đánh giá', config: { action: 'Gọi API nội bộ', endpoint: 'HRIS v2 - Lưu kết quả đánh giá', inputMapping: '{ "participantId": "${participant.id}", "period": "${variables.period}", "selfScore": "${nodes.n1.selfScore}", "managerScore": "${nodes.n2.managerScore}", "managerCompetency": "${nodes.n2.managerCompetency}", "evaluationValid": "${nodes.n3.evaluationValid}" }', outputMapping: '{ "evalResultId": "${result.body.id}", "evalResultStatus": "${result.body.status}" }', message: 'Lưu kết quả đánh giá vào hệ thống HRIS (System Action)' }, position: { x: 520, y: 850 } },
      {
        id: 'n6',
        type: 'NOTIFICATION',
        name: 'Thông báo nhân viên',
        config: {
          assignee: { type: 'current_participant' },
          assigneeType: 'recipient',
          message: 'Kết quả đánh giá của ${participant.name} đã được lưu thành công. Điểm tổng hợp: ${nodes.n2.managerScore}. Kết quả hợp lệ: ${nodes.n3.evaluationValid}',
          channels: ['email', 'inapp', 'teams'],
          title: 'Kết quả đánh giá - ${variables.period}',
          bodyTemplate: 'Chào ${participant.name}. Kết quả đánh giá của bạn cho kỳ ${variables.period} đã được lưu. Điểm tự đánh giá: ${nodes.n1.selfScore}, điểm quản lý: ${nodes.n2.managerScore}. Trân trọng, HR Team',
        },
        position: { x: 520, y: 1010 },
      },
    ],
    connections: [
      { id: 'c1', sourceNodeId: 'n1', sourcePort: 'SUCCESS', targetNodeId: 'n2' },
      { id: 'c2', sourceNodeId: 'n2', sourcePort: 'APPROVED', targetNodeId: 'n3' },
      { id: 'c3', sourceNodeId: 'n3', sourcePort: 'REVIEW_COMPLETED', targetNodeId: 'n4' },
      { id: 'c4', sourceNodeId: 'n4', sourcePort: 'true', targetNodeId: 'n5', label: 'TRUE' },
      { id: 'c5', sourceNodeId: 'n4', sourcePort: 'false', targetNodeId: 'n2', label: 'FALSE' },
      { id: 'c6', sourceNodeId: 'n5', sourcePort: 'SUCCESS', targetNodeId: 'n6' },
    ],
  },
];

export function getWorkflow(id: string): WorkflowDefinition | undefined {
  return workflows.find(w => w.id === id);
}

export const workflowVersions: WorkflowVersion[] = [
  { id: 'v2', versionNo: '2.0', status: 'DRAFT', author: 'Nguyễn Văn B', createdAt: '2024-12-08 16:15', changes: ['Đổi người phê duyệt Cấp 1 từ Lê Văn C thành Lê Minh Tâm'] },
  { id: 'v1.1', versionNo: '1.1', status: 'PUBLISHED', author: 'Nguyễn Thị Mai', createdAt: '2024-11-20 09:30', changes: ['Thêm bước đánh giá rủi ro an ninh cho trang thiết bị CNTT'] },
  { id: 'v1.0', versionNo: '1.0', status: 'PUBLISHED', author: 'Nguyễn Văn B', createdAt: '2024-11-01 10:00', changes: ['Cập nhật hạn mức phê duyệt Cấp 1 lên mức 50.000.000 VND', 'Khởi tạo quy trình mua sắm'] },
];

export function addVersionEntry(versionNo: string, authorId: string, changes: string[]) {
  workflowVersions.unshift({
    id: `v-${Date.now()}`,
    versionNo,
    status: 'PUBLISHED',
    author: userDisplayName(authorId),
    createdAt: new Date().toISOString().slice(0, 16).replace('T', ' '),
    changes,
  });
}

export let instances: WorkflowInstanceSummary[] = [
  { id: 'inst-1092', requestCode: 'REQ-1092', workflowId: '2', workflowName: 'Phê duyệt nghỉ phép', workflowVersion: '1.4', creatorId: 'U001', creatorName: 'Nguyễn Thị Mai', status: 'PENDING', currentStepLabels: ['Phê duyệt Cấp 1'], activeAssignees: ['U003'], startedAt: '2024-11-20 09:00', slaStatus: 'ON_TIME' },
  { id: 'inst-1081', requestCode: 'REQ-1081', workflowId: '2', workflowName: 'Phê duyệt nghỉ phép', workflowVersion: '1.4', creatorId: 'U002', creatorName: 'Trần Hoàng Bách', status: 'PENDING', currentStepLabels: ['Phê duyệt Cấp 2'], activeAssignees: ['U005', 'U006'], startedAt: '2024-11-19 14:30', slaStatus: 'OVERDUE' },
  { id: 'inst-1052', requestCode: 'REQ-1052', workflowId: '1', workflowName: 'Phê duyệt mua sắm', workflowVersion: '2.2', creatorId: 'U004', creatorName: 'Phạm Hồng Đăng', status: 'COMPLETED', currentStepLabels: ['Hoàn tất quy trình'], activeAssignees: [], startedAt: '2024-11-18 10:15', slaStatus: 'ON_TIME' },
  { id: 'inst-1049', requestCode: 'REQ-1049', workflowId: '2', workflowName: 'Phê duyệt nghỉ phép', workflowVersion: '1.4', creatorId: 'U008', creatorName: 'Bùi Phương Thảo', status: 'REJECTED', currentStepLabels: ['Phê duyệt Cấp 1'], activeAssignees: ['U003'], startedAt: '2024-11-17 16:45', slaStatus: 'ON_TIME' },
  { id: 'inst-1030', requestCode: 'REQ-1030', workflowId: '1', workflowName: 'Phê duyệt mua sắm', workflowVersion: '2.2', creatorId: 'U007', creatorName: 'Hoàng Quốc Việt', status: 'CANCELLED', currentStepLabels: ['Hủy bỏ'], activeAssignees: ['U007'], startedAt: '2024-11-15 08:20', slaStatus: 'ON_TIME' },
  { id: 'inst-1100', requestCode: 'EVAL-0806', workflowId: '6', workflowName: 'Đánh giá hiệu quả công việc', workflowVersion: '1.0', creatorId: 'U000', creatorName: 'Nguyễn Văn B', status: 'RUNNING', currentStepLabels: ['Tự đánh giá', 'Quản lý đánh giá', 'HR kiểm tra'], activeAssignees: ['U001', 'U002', 'U005'], startedAt: '2026-08-01 08:00', slaStatus: 'ON_TIME', period: '08/2026', participantCount: 100, participants: [
    { id: 'p-1', userId: 'U001', displayName: 'Nguyễn Thị Mai', department: 'Phòng Nhân sự', currentStepLabel: 'HR kiểm tra', currentAssignee: 'Nguyễn Thị Mai', status: 'IN_PROGRESS', startedAt: '2026-08-01 08:00' },
    { id: 'p-2', userId: 'U002', displayName: 'Trần Hoàng Bách', department: 'Phòng Công nghệ', currentStepLabel: 'Quản lý đánh giá', currentAssignee: 'Phạm Hồng Đăng', status: 'IN_PROGRESS', startedAt: '2026-08-01 08:00' },
    { id: 'p-3', userId: 'U003', displayName: 'Lê Minh Tâm', department: 'Phòng Kinh doanh', currentStepLabel: 'Hoàn tất', currentAssignee: '', status: 'COMPLETED', startedAt: '2026-08-01 08:00', completedAt: '2026-08-05 15:30' },
    { id: 'p-4', userId: 'U004', displayName: 'Phạm Hồng Đăng', department: 'Phòng Tài chính', currentStepLabel: 'Tự đánh giá', currentAssignee: 'Phạm Hồng Đăng', status: 'NOT_STARTED', startedAt: '2026-08-01 08:00' },
    { id: 'p-5', userId: 'U005', displayName: 'Vũ Ngọc Trinh', department: 'Phòng Marketing', currentStepLabel: 'HR kiểm tra', currentAssignee: 'Nguyễn Thị Mai', status: 'IN_PROGRESS', startedAt: '2026-08-01 08:00' },
  ] },
];

export function getInstancesByWorkflow(workflowId?: string): WorkflowInstanceSummary[] {
  if (!workflowId) return instances;
  return instances.filter(i => i.workflowId === workflowId);
}

export function getInstance(id: string): WorkflowInstanceSummary | undefined {
  return instances.find(i => i.id === id || i.requestCode === id);
}

export function replaceBackendData(data: {
  users?: OrgUser[];
  workflowDefinitions?: WorkflowDefinition[];
  workflowInstances?: WorkflowInstanceSummary[];
}) {
  if (data.users) orgUsers = data.users;
  if (data.workflowDefinitions) workflows = data.workflowDefinitions;
  if (data.workflowInstances) instances = data.workflowInstances;
}

export function hasRunningInstances(workflowId: string): boolean {
  return instances.some(i => i.workflowId === workflowId && (i.status === 'PENDING' || i.status === 'RUNNING'));
}

export const instanceTimeline: InstanceTimelineEntry[] = [
  { id: 't1', time: '2024-11-20 09:00:00', title: 'Khởi tạo quy trình', description: 'Được tạo bởi Nguyễn Thị Mai qua biểu mẫu yêu cầu', state: 'success' },
  { id: 't2', time: '2024-11-20 09:00:02', title: 'Bắt đầu', description: 'Hệ thống ghi nhận bắt đầu luồng dữ liệu', state: 'success' },
  { id: 't3', time: '2024-11-20 09:00:05', title: 'Phê duyệt Cấp 1', description: 'Tác vụ đang chờ Lê Minh Tâm phê duyệt', state: 'running' },
  { id: 't4', time: '', title: 'Kết thúc', description: 'Workflow hoàn thành sau khi phê duyệt', state: 'default' },
];

export const instanceTasks: InstanceTask[] = [
  { id: 'TASK-001', assignee: 'Lê Minh Tâm', status: 'PENDING', dueAt: '2024-11-21 09:00:00', participantId: 'U003' },
  { id: 'TASK-002', assignee: 'Vũ Ngọc Trinh', status: 'OVERDUE', dueAt: '2024-11-20 09:00:00', participantId: 'U004' },
];

export const defaultVariables: WorkflowVariable[] = [
  { key: 'threshold', dataType: 'NUMBER', defaultValue: { kind: 'CONSTANT', value: 10000000 }, required: true, mutationPolicy: 'READ_ONLY' as const },
  { key: 'period', dataType: 'STRING', defaultValue: { kind: 'CONSTANT', value: 'Q3-2024' }, required: false, mutationPolicy: 'READ_ONLY' as const },
];

export const mockContext = {
  trigger: {
    body: {
      requesterId: 'U001',
      leaveType: 'Annual',
      startDate: '2024-12-01',
      endDate: '2024-12-05',
      reason: 'Nghỉ phép cá nhân',
      amount: 5000000,
    },
  },
  variables: { threshold: 10000000, period: 'Q3-2024' },
  participant: {
    id: 'U003',
    name: 'Lê Minh Tâm',
    departmentId: 'DEPT001',
    managerId: 'U004',
    managerName: 'Phạm Hồng Đăng',
    email: 'tam.lm@company.com',
  },
  currentUser: { id: 'U000' },
};

export function getWorkflowTypeOptions() {
  return ['Approval', 'Review', 'Assignment'];
}

export function getModuleOptions() {
  return ['Operations', 'HR', 'Finance'];
}

export interface SyncLogEntry {
  id: string;
  time: string;
  mode: 'Full' | 'Incremental';
  recordsUpserted: number;
  recordsInactivated: number;
  errors: number;
  status: 'SUCCESS' | 'ERROR' | 'RUNNING';
  detail?: string;
}

export const syncLogs: SyncLogEntry[] = [
  { id: 'sl-1', time: '2024-12-10 08:30', mode: 'Incremental', recordsUpserted: 3, recordsInactivated: 1, errors: 0, status: 'SUCCESS', detail: 'Cập nhật managerId cho 2 user; vô hiệu hóa 1 user (Hoàng Quốc Việt) theo nguồn.' },
  { id: 'sl-2', time: '2024-12-09 08:30', mode: 'Full', recordsUpserted: 8, recordsInactivated: 0, errors: 0, status: 'SUCCESS', detail: 'Đồng bộ đầy đủ directory theo external id.' },
  { id: 'sl-3', time: '2024-12-08 08:30', mode: 'Incremental', recordsUpserted: 0, recordsInactivated: 0, errors: 2, status: 'ERROR', detail: '2 record thiếu external id — bỏ qua và ghi audit.' },
  { id: 'sl-4', time: '2024-12-07 08:30', mode: 'Full', recordsUpserted: 8, recordsInactivated: 0, errors: 0, status: 'SUCCESS', detail: 'Đồng bộ đầy đủ directory theo external id.' },
];

export interface ConnectorDefinition {
  id: string;
  name: string;
  type: 'HR Source' | 'Webhook' | 'Email' | 'Legacy';
  baseUrl: string;
  auth: 'OAuth 2.0' | 'API Key' | 'Basic Auth';
  status: 'CONNECTED' | 'DISABLED';
  lastChecked: string;
}

export const connectors: ConnectorDefinition[] = [
  { id: 'conn-1', name: 'SAP SuccessFactors', type: 'HR Source', baseUrl: 'https://api.successfactors.example.com', auth: 'OAuth 2.0', status: 'CONNECTED', lastChecked: '2024-12-10 08:30' },
  { id: 'conn-2', name: 'Webhook Inbound', type: 'Webhook', baseUrl: 'https://api.workflow-builder.local/webhooks', auth: 'API Key', status: 'CONNECTED', lastChecked: '2024-12-10 08:31' },
  { id: 'conn-3', name: 'Email Gateway', type: 'Email', baseUrl: 'smtp://mail.company.com', auth: 'Basic Auth', status: 'DISABLED', lastChecked: '2024-11-28 14:20' },
  { id: 'conn-4', name: 'HRIS v2 (Legacy)', type: 'Legacy', baseUrl: 'https://hris-legacy.company.com/api', auth: 'API Key', status: 'DISABLED', lastChecked: '2024-10-02 09:00' },
];

// ===== NEW MOCK DATA FOR CONNECTORS (Extended) =====
export function loadMockConnectors() {
  return [
    { id: 'conn-http', name: 'HTTP Connector', type: 'HTTP', description: 'Gọi API HTTP/REST', version: '1.0', icon: 'Link', color: '#EC4899', authType: 'NONE' as const, enabled: true, createdAt: '2024-01-01T00:00:00Z', updatedAt: '2024-01-01T00:00:00Z', createdBy: 'admin', actions: [
      { id: 'act-get', connectorId: 'conn-http', name: 'GET Request', actionKey: 'GET', description: 'HTTP GET', inputSchema: { type: 'object', properties: { url: { type: 'string' }, headers: { type: 'object' } } } as any, outputSchema: { type: 'object', properties: { statusCode: { type: 'number' }, body: { type: 'object' } } } as any, retryable: true, idempotent: true, sideEffects: 'READ_ONLY' as const },
      { id: 'act-post', connectorId: 'conn-http', name: 'POST Request', actionKey: 'POST', description: 'HTTP POST', inputSchema: { type: 'object', properties: { url: { type: 'string' }, body: { type: 'object' } } } as any, outputSchema: { type: 'object', properties: { statusCode: { type: 'number' }, body: { type: 'object' } } } as any, retryable: true, idempotent: false, sideEffects: 'WRITE' as const },
    ], configSchema: { type: 'object' } as any },
    { id: 'conn-db', name: 'Database Connector', type: 'DATABASE', description: 'Truy vấn database', version: '1.0', icon: 'Database', color: '#06B6D4', authType: 'BASIC_AUTH' as const, enabled: true, createdAt: '2024-01-01T00:00:00Z', updatedAt: '2024-01-01T00:00:00Z', createdBy: 'admin', actions: [
      { id: 'act-query', connectorId: 'conn-db', name: 'Execute Query', actionKey: 'QUERY', description: 'Run SQL query', inputSchema: { type: 'object', properties: { query: { type: 'string' } } } as any, outputSchema: { type: 'object', properties: { rows: { type: 'array' } } } as any, retryable: false, idempotent: true, sideEffects: 'READ_ONLY' as const },
      { id: 'act-insert', connectorId: 'conn-db', name: 'Insert Record', actionKey: 'INSERT', description: 'Insert a record', inputSchema: { type: 'object', properties: { table: { type: 'string' }, data: { type: 'object' } } } as any, outputSchema: { type: 'object', properties: { id: { type: 'string' } } } as any, retryable: false, idempotent: false, sideEffects: 'WRITE' as const },
    ], configSchema: { type: 'object' } as any },
    { id: 'conn-email', name: 'Email Connector', type: 'EMAIL', description: 'Gửi email', version: '1.0', icon: 'Mail', color: '#FBBF24', authType: 'BASIC_AUTH' as const, enabled: true, createdAt: '2024-01-01T00:00:00Z', updatedAt: '2024-01-01T00:00:00Z', createdBy: 'admin', actions: [
      { id: 'act-send-email', connectorId: 'conn-email', name: 'Send Email', actionKey: 'SEND', description: 'Send an email', inputSchema: { type: 'object', properties: { to: { type: 'string' }, subject: { type: 'string' }, body: { type: 'string' } } } as any, outputSchema: { type: 'object', properties: { messageId: { type: 'string' } } } as any, retryable: true, idempotent: true, sideEffects: 'WRITE' as const },
    ], configSchema: { type: 'object' } as any },
  ];
}

// ===== NEW MOCK DATA FOR CREDENTIALS =====
export function loadMockCredentials() {
  return [
    { id: 'cred-1', name: 'API Key - Production', type: 'API_KEY' as const, scope: 'GLOBAL' as const, encryptedData: 'enc-***', metadata: { connectorTypes: ['HTTP'] }, createdAt: '2024-01-01T00:00:00Z', updatedAt: '2024-01-01T00:00:00Z', createdBy: 'admin' },
    { id: 'cred-2', name: 'Database Credentials', type: 'BASIC_AUTH' as const, scope: 'GLOBAL' as const, encryptedData: 'enc-***', metadata: { connectorTypes: ['DATABASE'] }, createdAt: '2024-01-01T00:00:00Z', updatedAt: '2024-01-01T00:00:00Z', createdBy: 'admin' },
    { id: 'cred-3', name: 'OAuth Token - SAP', type: 'OAUTH2' as const, scope: 'GLOBAL' as const, encryptedData: 'enc-***', metadata: { connectorTypes: ['HTTP', 'DATABASE'] }, createdAt: '2024-01-01T00:00:00Z', updatedAt: '2024-01-01T00:00:00Z', createdBy: 'admin' },
  ];
}

// ===== NEW MOCK DATA FOR MY TASKS =====
export function loadMockTasks(filters?: any) {
  const tasks = [
    { id: 'task-1', workflowId: 'WF-001', taskType: 'APPROVAL' as const, title: 'Phê duyệt yêu cầu mua sắm #1234', description: 'Yêu cầu mua laptop mới cho nhân viên IT', assignee: { id: 'U001', displayName: 'Nguyễn Thị Mai' } as any, status: 'PENDING' as const, priority: 'HIGH' as const, dueAt: '2026-08-22T09:00:00Z', executionScope: 'INSTANCE' as const, completionPolicy: { policy: 'ALL' as const }, allowedActions: ['COMPLETE' as const, 'REJECT' as const], formRef: undefined, slaConfig: undefined, createdAt: '2026-08-19T10:00:00Z', createdBy: 'system' },
    { id: 'task-2', workflowId: 'WF-001', taskType: 'REVIEW' as const, title: 'Kiểm duyệt hợp đồng thuê nhà', description: 'Kiểm tra các điều khoản trong hợp đồng', assignee: { id: 'U003', displayName: 'Lê Minh Tâm' } as any, status: 'COMPLETED' as const, priority: 'NORMAL' as const, dueAt: '2026-08-21T17:00:00Z', executionScope: 'INSTANCE' as const, completionPolicy: { policy: 'ALL' as const }, allowedActions: ['COMPLETE' as const, 'REQUEST_CHANGE' as const], formRef: undefined, slaConfig: undefined, createdAt: '2026-08-18T14:00:00Z', createdBy: 'system' },
    { id: 'task-3', workflowId: 'WF-002', taskType: 'ASSIGNMENT' as const, title: 'Cập nhật báo cáo tài chính Q3', description: 'Hoàn thành báo cáo tài chính quý 3', assignee: { id: 'U004', displayName: 'Phạm Hồng Đăng' } as any, status: 'PENDING' as const, priority: 'URGENT' as const, dueAt: '2026-08-20T12:00:00Z', executionScope: 'EACH_PARTICIPANT' as const, completionPolicy: { policy: 'ALL' as const }, allowedActions: ['COMPLETE' as const], formRef: undefined, slaConfig: undefined, createdAt: '2026-08-17T08:00:00Z', createdBy: 'system' },
    { id: 'task-4', workflowId: 'WF-003', taskType: 'APPROVAL' as const, title: 'Phê duyệt đơn nghỉ phép', description: 'Đơn nghỉ phép 5 ngày từ Vũ Ngọc Trinh', assignee: { id: 'U005', displayName: 'Vũ Ngọc Trinh' } as any, status: 'REJECTED' as const, priority: 'NORMAL' as const, dueAt: '2026-08-19T17:00:00Z', executionScope: 'INSTANCE' as const, completionPolicy: { policy: 'ALL' as const }, allowedActions: ['COMPLETE' as const, 'REJECT' as const], formRef: undefined, slaConfig: undefined, createdAt: '2026-08-16T09:00:00Z', createdBy: 'system' },
  ];

  let filtered = [...tasks];

  if (filters?.status) {
    if (Array.isArray(filters.status)) {
      filtered = filtered.filter(t => filters.status.includes(t.status));
    } else {
      filtered = filtered.filter(t => t.status === filters.status);
    }
  }
  if (filters?.priority) {
    filtered = filtered.filter(t => t.priority === filters.priority);
  }
  if (filters?.workflowId) {
    filtered = filtered.filter(t => t.workflowId === filters.workflowId);
  }
  if (filters?.searchQuery) {
    const q = filters.searchQuery.toLowerCase();
    filtered = filtered.filter(t => t.title.toLowerCase().includes(q) || (t.description && t.description.toLowerCase().includes(q)));
  }

  return { tasks: filtered, total: filtered.length };
}
