import type { OrgUser, WorkflowDefinition, WorkflowInstanceSummary } from '../types/workflow';
import type { FormDetail, FormSummary, FormVersion, CreateFormDto, UpdateDraftDto } from '../types/form';
import type {
  TicketCategorySummary,
  TicketCategoryDetail,
  CreateTicketCategoryDto,
  UpdateTicketCategoryDto,
  ValidateMappingDto,
  CompatibilityValidationResult,
} from '../types/category';
import type {
  TicketSummary,
  TicketDetail,
  CreateTicketDto,
  TicketFilterParams,
} from '../types/ticket';

const API_BASE = import.meta.env.VITE_API_BASE_URL ?? '/api/v1';

export class ApiError extends Error {
  status: number;
  code: string;
  constructor(status: number, code: string, message: string) {
    super(message);
    this.status = status;
    this.code = code;
  }
}

async function request<T>(path: string, init: RequestInit = {}): Promise<T> {
  const token = localStorage.getItem('workflow.authToken');
  const userId = localStorage.getItem('workflow.currentUserId');
  const allowDevHeader = import.meta.env.DEV && import.meta.env.VITE_ALLOW_DEV_USER_HEADER === 'true';
  const response = await fetch(`${API_BASE}${path}`, {
    ...init,
    headers: {
      'Content-Type': 'application/json',
      ...(token ? { Authorization: `Bearer ${token}` } : allowDevHeader && userId ? { 'X-User-Id': userId } : {}),
      ...init.headers,
    },
  });
  if (!response.ok) {
    const error = await response.json().catch(() => ({ code: 'HTTP_ERROR', message: response.statusText }));
    throw new ApiError(response.status, error.code ?? 'HTTP_ERROR', error.message ?? response.statusText);
  }
  if (response.status === 204) return undefined as T;
  return response.json() as Promise<T>;
}

export interface OrganizationUnit {
  id: string;
  code: string;
  name: string;
  unitType: string;
  hierarchyLevel: number;
  parentId?: string;
  hierarchyPath: string;
  headUserId?: string;
  headUserName?: string;
  status: string;
  directUserCount: number;
  children?: OrganizationUnit[];
}

export interface SystemRole {
  id: string;
  code: string;
  name: string;
  description?: string;
  builtIn: boolean;
  status: string;
  permissions: { code: string; name: string }[];
}

export const api = {
  auth: {
    login: (username: string, password: string) => request<{ token: string; expiresAt: string; userId: string }>('/auth/login', { method: 'POST', body: JSON.stringify({ username, password }) }),
    me: () => request<Record<string, unknown>>('/auth/me'),
    logout: () => request<void>('/auth/logout', { method: 'POST' }),
  },
  users: {
    list: (search = '') => request<OrgUser[]>(`/users${search ? `?search=${encodeURIComponent(search)}` : ''}`),
    create: (body: Record<string, unknown>) => request<OrgUser>('/users', { method: 'POST', body: JSON.stringify(body) }),
    update: (id: string, body: Record<string, unknown>) => request<OrgUser>(`/users/${id}`, { method: 'PUT', body: JSON.stringify(body) }),
    assignRoles: (id: string, assignments: { roleId: string; organizationScopeId?: string }[]) =>
      request(`/users/${id}/system-roles`, { method: 'PUT', body: JSON.stringify(assignments) }),
  },
  organizations: {
    list: () => request<OrganizationUnit[]>('/organizations'),
    tree: () => request<OrganizationUnit[]>('/organizations/tree'),
    create: (body: Record<string, unknown>) => request<OrganizationUnit>('/organizations', { method: 'POST', body: JSON.stringify(body) }),
  },
  roles: {
    list: () => request<SystemRole[]>('/system-roles'),
    create: (body: Record<string, unknown>) => request<SystemRole>('/system-roles', { method: 'POST', body: JSON.stringify(body) }),
  },
  groups: {
    list: () => request<any[]>('/groups'),
    create: (body: Record<string, unknown>) => request<any>('/groups', { method: 'POST', body: JSON.stringify(body) }),
    update: (id: string, body: Record<string, unknown>) => request<any>(`/groups/${id}`, { method: 'PUT', body: JSON.stringify(body) }),
  },
  connectors: {
    list: () => request<any[]>('/connectors'),
    create: (body: Record<string, unknown>) => request<any>('/connectors', { method: 'POST', body: JSON.stringify(body) }),
    update: (id: string, body: Record<string, unknown>) => request<any>(`/connectors/${id}`, { method: 'PUT', body: JSON.stringify(body) }),
  },
  credentials: {
    list: () => request<any[]>('/credential-references'),
    create: (body: Record<string, unknown>) => request<any>('/credential-references', { method: 'POST', body: JSON.stringify(body) }),
    update: (id: string, body: Record<string, unknown>) => request<any>(`/credential-references/${id}`, { method: 'PUT', body: JSON.stringify(body) }),
  },
  workflows: {
    list: () => request<WorkflowDefinition[]>('/workflows'),
    get: (id: string) => request<WorkflowDefinition & { lockVersion?: number }>(`/workflows/${id}`),
    create: (body: WorkflowDefinition) => request<WorkflowDefinition>('/workflows', { method: 'POST', body: JSON.stringify(body) }),
    update: (id: string, body: WorkflowDefinition) => request<WorkflowDefinition>(`/workflows/${id}`, { method: 'PUT', body: JSON.stringify(body) }),
    validate: (id: string) => request<Record<string, unknown>>(`/workflows/${id}/validate`, { method: 'POST' }),
    publish: (id: string) => request<Record<string, any>>(`/workflows/${id}/publish`, { method: 'POST' }),
    versions: (id: string) => request<Record<string, unknown>[]>(`/workflows/${id}/versions`),
    version: (id: string, versionId: string) => request<Record<string, unknown>>(`/workflows/${id}/versions/${versionId}`),
    members: (id: string) => request<Record<string, unknown>[]>(`/workflows/${id}/members`),
    updateMembers: (id: string, members: Record<string, unknown>[]) => request<Record<string, unknown>[]>(`/workflows/${id}/members`, { method: 'PUT', body: JSON.stringify(members) }),
    changeStatus: (id: string, status: string) => request(`/workflows/${id}/status`, { method: 'PATCH', body: JSON.stringify({ status }) }),
  },
  forms: {
    list: (status?: string, search?: string) => {
      const params = new URLSearchParams();
      if (status) params.set('status', status);
      if (search) params.set('search', search);
      const query = params.toString() ? `?${params.toString()}` : '';
      return request<FormSummary[]>(`/forms${query}`);
    },
    get: (id: string) => request<FormDetail>(`/forms/${id}`),
    create: (body: CreateFormDto) => request<FormDetail>('/forms', { method: 'POST', body: JSON.stringify(body) }),
    updateDraft: (id: string, body: UpdateDraftDto) => request<FormDetail>(`/forms/${id}/draft`, { method: 'PUT', body: JSON.stringify(body) }),
    publish: (id: string) => request<FormVersion>(`/forms/${id}/publish`, { method: 'POST' }),
    versions: (id: string) => request<FormVersion[]>(`/forms/${id}/versions`),
    version: (id: string, versionId: string) => request<FormVersion>(`/forms/${id}/versions/${versionId}`),
    changeStatus: (id: string, status: string) => request<FormDetail>(`/forms/${id}/status`, { method: 'PATCH', body: JSON.stringify({ status }) }),
  },
  ticketCategories: {
    list: (search?: string, activeOnly?: boolean) => {
      const params = new URLSearchParams();
      if (search) params.set('search', search);
      if (activeOnly !== undefined) params.set('activeOnly', String(activeOnly));
      const query = params.toString() ? `?${params.toString()}` : '';
      return request<TicketCategorySummary[]>(`/ticket-categories${query}`);
    },
    get: (id: string) => request<TicketCategoryDetail>(`/ticket-categories/${id}`),
    create: (body: CreateTicketCategoryDto) => request<TicketCategoryDetail>('/ticket-categories', { method: 'POST', body: JSON.stringify(body) }),
    update: (id: string, body: UpdateTicketCategoryDto) => request<TicketCategoryDetail>(`/ticket-categories/${id}`, { method: 'PUT', body: JSON.stringify(body) }),
    delete: (id: string) => request<void>(`/ticket-categories/${id}`, { method: 'DELETE' }),
    toggleActive: (id: string, active: boolean) => request<TicketCategoryDetail>(`/ticket-categories/${id}/active`, { method: 'PATCH', body: JSON.stringify({ active }) }),
    validateMapping: (body: ValidateMappingDto) => request<CompatibilityValidationResult>('/ticket-categories/validate-mapping', { method: 'POST', body: JSON.stringify(body) }),
  },
  tickets: {
    create: (body: CreateTicketDto) => request<TicketDetail>('/tickets', { method: 'POST', body: JSON.stringify(body) }),
    myTickets: (params?: TicketFilterParams) => {
      const sp = new URLSearchParams();
      if (params?.search) sp.set('search', params.search);
      if (params?.status) sp.set('status', params.status);
      if (params?.categoryId) sp.set('categoryId', params.categoryId);
      const query = sp.toString() ? `?${sp.toString()}` : '';
      return request<TicketSummary[]>(`/tickets/my${query}`);
    },
    allTickets: (params?: TicketFilterParams) => {
      const sp = new URLSearchParams();
      if (params?.search) sp.set('search', params.search);
      if (params?.status) sp.set('status', params.status);
      if (params?.categoryId) sp.set('categoryId', params.categoryId);
      const query = sp.toString() ? `?${sp.toString()}` : '';
      return request<TicketSummary[]>(`/tickets${query}`);
    },
    get: (id: string) => request<TicketDetail>(`/tickets/${id}`),
    cancel: (id: string) => request<TicketDetail>(`/tickets/${id}/cancel`, { method: 'POST' }),
  },
  runtime: {
    instances: (workflowId?: string) => request<WorkflowInstanceSummary[]>(`/instances${workflowId ? `?workflowId=${encodeURIComponent(workflowId)}` : ''}`),
    instance: (id: string) => request<Record<string, any>>(`/instances/${id}`),
    cancel: (id: string) => request<Record<string, any>>(`/instances/${id}/cancel`, { method: 'POST' }),
    start: (workflowId: string, body: Record<string, unknown>) => request<Record<string, any>>(`/workflows/${workflowId}/instances`, { method: 'POST', body: JSON.stringify(body) }),
    tasks: () => request<any[]>('/tasks'),
    claim: (id: string) => request<{ success: boolean; message: string }>(`/tasks/${id}/claim`, { method: 'POST' }),
    complete: (id: string, data: Record<string, unknown> = {}, comment?: string) => request<{ success: boolean; message: string }>(`/tasks/${id}/complete`, { method: 'POST', body: JSON.stringify({ data, comment }) }),
    reject: (id: string, comment?: string) => request<{ success: boolean; message: string }>(`/tasks/${id}/reject`, { method: 'POST', body: JSON.stringify({ comment }) }),
    action: (id: string, action: string, data: Record<string, unknown>) => request<Record<string, unknown>>(`/tasks/${id}/actions/${action}`, { method: 'POST', body: JSON.stringify(data) }),
    signal: (eventName: string, correlationKey: string, payload: Record<string, unknown>) => request<Record<string, unknown>>(`/triggers/events/${encodeURIComponent(eventName)}/${encodeURIComponent(correlationKey)}`, { method: 'POST', body: JSON.stringify(payload) }),
    participants: {
      previewImport: async (file: File) => {
        const token = localStorage.getItem('workflow.authToken');
        const formData = new FormData();
        formData.append('file', file);
        const res = await fetch(`${API_BASE}/runtime/participants/preview-import`, {
          method: 'POST',
          headers: token ? { Authorization: `Bearer ${token}` } : {},
          body: formData,
        });
        if (!res.ok) {
          const err = await res.json().catch(() => ({ message: 'Không thể upload file' }));
          throw new Error(err.message || 'Lỗi xử lý file');
        }
        return res.json();
      },
      previewIdentifiers: (identifiers: string[]) => request<any>('/runtime/participants/preview-identifiers', { method: 'POST', body: JSON.stringify({ identifiers }) }),
      downloadTemplateUrl: `${API_BASE}/runtime/participants/template`,
    },
  },
  notifications: {
    list: () => request<any[]>('/notifications'),
    read: (id: string) => request<any>(`/notifications/${id}/read`, { method: 'POST' }),
  },
  audit: {
    list: (query = '') => request<any>(`/audit-logs${query ? `?${query}` : ''}`),
  },
};
