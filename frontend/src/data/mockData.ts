import type {
  OrgUser,
  WorkflowDefinition,
  WorkflowInstanceSummary,
  WorkflowVersion,
  WorkflowVariable,
  InstanceTimelineEntry,
  InstanceTask,
} from '../types/workflow';

const CURRENT_USER = { id: 'U000', name: 'Nguyễn Văn B', role: 'Admin' };

export function getCurrentUser() {
  return CURRENT_USER;
}

export const orgUsers: OrgUser[] = [
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

export const workflowTemplates = [
  { id: 'T001', name: 'Standard IT Request', description: 'Template cho yêu cầu trang thiết bị/phần mềm IT.', category: 'IT' },
  { id: 'T002', name: 'Leave Application', description: 'Luồng phê duyệt nghỉ phép chuẩn với quản lý và HR.', category: 'HR' },
  { id: 'T003', name: 'Expense Claim', description: 'Luồng hoàn ứng đa cấp phê duyệt theo số tiền.', category: 'Finance' },
];

export const workflows: WorkflowDefinition[] = [
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
      { key: 'threshold', dataType: 'NUMBER', defaultValue: { kind: 'CONSTANT', value: 10000000 }, required: true },
      { key: 'period', dataType: 'STRING', defaultValue: { kind: 'CONSTANT', value: 'Q3-2024' }, required: false },
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
      { key: 'maxLeaveDays', dataType: 'NUMBER', defaultValue: { kind: 'CONSTANT', value: 12 }, required: true },
      { key: 'period', dataType: 'STRING', defaultValue: { kind: 'CONSTANT', value: '2024' }, required: false },
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
    trigger: { type: 'manual', config: {} },
    participantScope: { enabled: true, selectorType: 'fixed', selectorConfig: {}, snapshotPolicy: 'AT_INSTANCE_START' },
    variables: [
      { key: 'period', dataType: 'STRING', defaultValue: { kind: 'CONSTANT', value: 'Q4-2024' }, required: true, description: 'Kỳ đánh giá' },
      { key: 'evaluationValid', dataType: 'BOOLEAN', defaultValue: { kind: 'CONSTANT', value: false }, required: true, description: 'HR xác nhận kết quả đánh giá hợp lệ' },
    ],
    nodes: [
      {
        id: 'n1',
        type: 'ASSIGNMENT',
        name: 'Nhân viên tự đánh giá',
        config: {
          assignee: { type: 'current_participant' },
          formName: 'Phiếu tự đánh giá',
          formFields: [
            { id: 'f1', label: 'Kết quả công việc nổi bật trong kỳ', type: 'textarea', required: true, placeholder: 'Mô tả thành tích chính', outputMapping: 'selfAchievements' },
            { id: 'f2', label: 'Khó khăn gặp phải', type: 'textarea', required: false, placeholder: 'Mô tả khó khăn', outputMapping: 'selfChallenges' },
            { id: 'f3', label: 'Điểm tự đánh giá', type: 'number', required: true, validation: { min: 1, max: 10 }, outputMapping: 'selfScore' },
          ],
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
          formName: 'Phiếu đánh giá của quản lý',
          formFields: [
            { id: 'f0', label: 'Kết quả tự đánh giá của nhân viên', type: 'textarea', required: false, readOnly: true, defaultValue: '${nodes.n1.selfAchievements}', outputMapping: 'displaySelfAchievements' },
            { id: 'f0b', label: 'Điểm nhân viên tự đánh giá', type: 'number', required: false, readOnly: true, defaultValue: '${nodes.n1.selfScore}', outputMapping: 'displaySelfScore' },
            { id: 'f1', label: 'Đánh giá năng lực', type: 'select', required: true, options: [{ value: 'excellent', label: 'Xuất sắc' }, { value: 'good', label: 'Tốt' }, { value: 'fair', label: 'Đạt' }, { value: 'poor', label: 'Cần cải thiện' }], outputMapping: 'managerCompetency' },
            { id: 'f2', label: 'Nhận xét của quản lý', type: 'textarea', required: true, placeholder: 'Nhận xét chi tiết', outputMapping: 'managerComment' },
            { id: 'f3', label: 'Điểm quản lý chấm', type: 'number', required: true, validation: { min: 1, max: 10 }, outputMapping: 'managerScore' },
            { id: 'f4', label: 'Đề xuất mục tiêu kỳ sau', type: 'text', required: false, outputMapping: 'nextPeriodGoals' },
          ],
          message: 'Quản lý ${participant.managerName} xem kết quả tự đánh giá của ${participant.name} (điểm: ${nodes.n1.selfScore}) rồi thực hiện đánh giá',
        },
        position: { x: 300, y: 370 },
      },
      { id: 'n3', type: 'REVIEW', name: 'HR kiểm tra kết quả', config: { assignee: { type: 'fixed', value: 'U001', label: 'Nguyễn Thị Mai' }, message: 'HR kiểm tra tính hợp lệ của kết quả đánh giá' }, position: { x: 300, y: 530 } },
      { id: 'n4', type: 'CONDITION', name: 'Kết quả hợp lệ?', config: { condition: '${trigger.body.evaluationValid} == true' }, position: { x: 300, y: 690 } },
      { id: 'n5', type: 'DATA', name: 'Lưu kết quả đánh giá', config: { message: 'Lưu kết quả đánh giá vào hệ thống HRIS (System Action)' }, position: { x: 520, y: 850 } },
      { id: 'n6', type: 'NOTIFICATION', name: 'Thông báo nhân viên', config: { recipient: 'current_participant', message: 'Kết quả đánh giá của ${participant.name} đã được lưu thành công' }, position: { x: 520, y: 1010 } },
    ],
    connections: [
      { id: 'c1', sourceNodeId: 'n1', targetNodeId: 'n2' },
      { id: 'c2', sourceNodeId: 'n2', targetNodeId: 'n3' },
      { id: 'c3', sourceNodeId: 'n3', targetNodeId: 'n4' },
      { id: 'c4', sourceNodeId: 'n4', sourcePort: 'true', targetNodeId: 'n5', label: 'TRUE' },
      { id: 'c5', sourceNodeId: 'n4', sourcePort: 'false', targetNodeId: 'n2', label: 'FALSE' },
      { id: 'c6', sourceNodeId: 'n5', targetNodeId: 'n6' },
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

export const instances: WorkflowInstanceSummary[] = [
  { id: 'inst-1092', requestCode: 'REQ-1092', workflowId: '2', workflowName: 'Phê duyệt nghỉ phép', workflowVersion: '1.4', creatorId: 'U001', creatorName: 'Nguyễn Thị Mai', status: 'PENDING', currentStepLabels: ['Phê duyệt Cấp 1'], activeAssignees: ['U003'], startedAt: '2024-11-20 09:00', slaStatus: 'ON_TIME' },
  { id: 'inst-1081', requestCode: 'REQ-1081', workflowId: '2', workflowName: 'Phê duyệt nghỉ phép', workflowVersion: '1.4', creatorId: 'U002', creatorName: 'Trần Hoàng Bách', status: 'PENDING', currentStepLabels: ['Phê duyệt Cấp 2'], activeAssignees: ['U005', 'U006'], startedAt: '2024-11-19 14:30', slaStatus: 'OVERDUE' },
  { id: 'inst-1052', requestCode: 'REQ-1052', workflowId: '1', workflowName: 'Phê duyệt mua sắm', workflowVersion: '2.2', creatorId: 'U004', creatorName: 'Phạm Hồng Đăng', status: 'COMPLETED', currentStepLabels: ['Hoàn tất quy trình'], activeAssignees: [], startedAt: '2024-11-18 10:15', slaStatus: 'ON_TIME' },
  { id: 'inst-1049', requestCode: 'REQ-1049', workflowId: '2', workflowName: 'Phê duyệt nghỉ phép', workflowVersion: '1.4', creatorId: 'U008', creatorName: 'Bùi Phương Thảo', status: 'REJECTED', currentStepLabels: ['Phê duyệt Cấp 1'], activeAssignees: ['U003'], startedAt: '2024-11-17 16:45', slaStatus: 'ON_TIME' },
  { id: 'inst-1030', requestCode: 'REQ-1030', workflowId: '1', workflowName: 'Phê duyệt mua sắm', workflowVersion: '2.2', creatorId: 'U007', creatorName: 'Hoàng Quốc Việt', status: 'CANCELLED', currentStepLabels: ['Hủy bỏ'], activeAssignees: ['U007'], startedAt: '2024-11-15 08:20', slaStatus: 'ON_TIME' },
];

export function getInstancesByWorkflow(workflowId?: string): WorkflowInstanceSummary[] {
  if (!workflowId) return instances;
  return instances.filter(i => i.workflowId === workflowId);
}

export function getInstance(id: string): WorkflowInstanceSummary | undefined {
  return instances.find(i => i.id === id || i.requestCode === id);
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
  { key: 'threshold', dataType: 'NUMBER', defaultValue: { kind: 'CONSTANT', value: 10000000 }, required: true },
  { key: 'period', dataType: 'STRING', defaultValue: { kind: 'CONSTANT', value: 'Q3-2024' }, required: false },
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