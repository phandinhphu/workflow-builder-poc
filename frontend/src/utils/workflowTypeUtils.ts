import type { WorkflowTypeResponse } from '../api/client';

export const BACKEND_TO_FRONTEND_NODE_TYPE: Record<string, string> = {
  START: 'start',
  END: 'end',
  APPROVAL: 'approval',
  REVIEW: 'review',
  ASSIGNMENT: 'assignment',
  NOTIFICATION: 'notification',
  CONDITION: 'condition',
  SYSTEM: 'system',
  HTTP: 'http',
  DATA: 'data',
  DATA_TRANSFORM: 'data_transform',
  TIMER: 'timer',
  WAIT_EVENT: 'wait_event',
  PARALLEL_SPLIT: 'parallel_split',
  JOIN: 'join',
  SUBWORKFLOW: 'subworkflow',
};

export const FRONTEND_TO_BACKEND_NODE_TYPE: Record<string, string> = {
  start: 'START',
  end: 'END',
  approval: 'APPROVAL',
  review: 'REVIEW',
  assignment: 'ASSIGNMENT',
  notification: 'NOTIFICATION',
  condition: 'CONDITION',
  system: 'SYSTEM',
  http: 'HTTP',
  data: 'DATA',
  data_transform: 'DATA_TRANSFORM',
  timer: 'TIMER',
  wait_event: 'WAIT_EVENT',
  parallel_split: 'PARALLEL_SPLIT',
  join: 'JOIN',
  subworkflow: 'SUBWORKFLOW',
};

export const NODE_TYPE_LABELS: Record<string, string> = {
  start: 'Bắt đầu (Start)',
  end: 'Kết thúc (End)',
  approval: 'Phê duyệt (Approval)',
  review: 'Kiểm duyệt (Review)',
  assignment: 'Phân bổ / Phân công (Assignment)',
  notification: 'Thông báo (Notification)',
  condition: 'Điều kiện (Condition)',
  system: 'Tác vụ hệ thống (System Action)',
  http: 'HTTP Request',
  data: 'Bảng dữ liệu (Data)',
  data_transform: 'Biến đổi dữ liệu (Transform)',
  timer: 'Bộ hẹn giờ (Timer)',
  wait_event: 'Chờ sự kiện (Wait Event)',
  parallel_split: 'Phân nhánh song song (Parallel Split)',
  join: 'Đồng bộ nhánh (Join)',
  subworkflow: 'Subworkflow',
};

export const FALLBACK_WORKFLOW_TYPES: WorkflowTypeResponse[] = [
  {
    id: 'APPROVAL',
    name: 'Quy trình phê duyệt',
    description: 'Quy trình yêu cầu xét duyệt qua một hoặc nhiều cấp trước khi hoàn tất.',
    isActive: true,
    sortOrder: 1,
    allowedNodes: ['START', 'END', 'APPROVAL', 'ASSIGNMENT', 'NOTIFICATION', 'CONDITION', 'TIMER', 'WAIT_EVENT', 'PARALLEL_SPLIT', 'JOIN', 'SUBWORKFLOW'],
  },
  {
    id: 'NOTIFICATION',
    name: 'Quy trình thông báo',
    description: 'Quy trình chỉ thực hiện gửi thông báo tự động tới người dùng hoặc các kênh liên quan.',
    isActive: true,
    sortOrder: 2,
    allowedNodes: ['START', 'END', 'NOTIFICATION', 'CONDITION', 'TIMER', 'WAIT_EVENT', 'PARALLEL_SPLIT', 'JOIN', 'SUBWORKFLOW'],
  },
  {
    id: 'AUTOMATION',
    name: 'Quy trình tự động hoá',
    description: 'Quy trình tự động thực thi các tác vụ hệ thống, gọi API và biến đổi dữ liệu.',
    isActive: true,
    sortOrder: 3,
    allowedNodes: ['START', 'END', 'SYSTEM', 'HTTP', 'DATA', 'DATA_TRANSFORM', 'NOTIFICATION', 'CONDITION', 'TIMER', 'WAIT_EVENT', 'PARALLEL_SPLIT', 'JOIN', 'SUBWORKFLOW'],
  },
  {
    id: 'REVIEW',
    name: 'Quy trình kiểm duyệt',
    description: 'Quy trình kiểm tra, rà soát và đánh giá nội dung hoặc hồ sơ nghiệp vụ.',
    isActive: true,
    sortOrder: 4,
    allowedNodes: ['START', 'END', 'REVIEW', 'ASSIGNMENT', 'NOTIFICATION', 'CONDITION', 'TIMER', 'WAIT_EVENT', 'PARALLEL_SPLIT', 'JOIN', 'SUBWORKFLOW'],
  },
  {
    id: 'CUSTOM',
    name: 'Quy trình tự do (Tuỳ biến)',
    description: 'Quy trình không bị ràng buộc bởi các khuôn mẫu nghiệp vụ đặc thù, cho phép sử dụng toàn bộ các loại node.',
    isActive: true,
    sortOrder: 5,
    allowedNodes: ['START', 'END', 'APPROVAL', 'REVIEW', 'ASSIGNMENT', 'NOTIFICATION', 'CONDITION', 'SYSTEM', 'DATA', 'HTTP', 'DATA_TRANSFORM', 'TIMER', 'WAIT_EVENT', 'PARALLEL_SPLIT', 'JOIN', 'SUBWORKFLOW'],
  },
];

export function toFrontendNodeType(backendType: string): string {
  const upper = (backendType || '').trim().toUpperCase();
  return BACKEND_TO_FRONTEND_NODE_TYPE[upper] || upper.toLowerCase();
}

export function toBackendNodeType(frontendType: string): string {
  const lower = (frontendType || '').trim().toLowerCase();
  return FRONTEND_TO_BACKEND_NODE_TYPE[lower] || lower.toUpperCase();
}

export function getNodeFriendlyName(nodeType: string): string {
  const key = nodeType.toLowerCase();
  return NODE_TYPE_LABELS[key] || nodeType;
}
