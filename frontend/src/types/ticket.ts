import type { FormSchema } from './form';

export type TicketStatus =
  | 'SUBMITTED'
  | 'IN_REVIEW'
  | 'APPROVED'
  | 'REJECTED'
  | 'CANCELLED'
  | 'PAID'
  | 'COMPLETED'
  | 'RESOLVED'
  | 'PROCESSING_ERROR'
  | string;

export interface TicketSummary {
  id: string;
  ticketCode: string;
  categoryId: string;
  categoryName?: string;
  categoryCode?: string;
  categoryIcon?: string;
  categoryColor?: string;
  initiatorId: string;
  initiatorName: string;
  initiatorDepartmentId?: string;
  status: TicketStatus;
  currentStepName?: string;
  createdAt: string;
  updatedAt: string;
  resolvedAt?: string;
}

export interface TicketTimelineNode {
  executionOrder?: number;
  nodeId: string;
  nodeName: string;
  nodeType: string;
  state: 'COMPLETED' | 'RUNNING' | 'FAILED' | 'PENDING';
  outcomePort?: string;
  startedAt: string;
  completedAt?: string;
  assigneeId?: string;
  assigneeName?: string;
  action?: string;
  comment?: string;
}

export interface TicketDetail extends TicketSummary {
  formVersionId: string;
  formVersionNumber: number;
  formName?: string;
  formCode?: string;
  formSchemaSnapshot: FormSchema;
  formData: Record<string, any>;
  workflowInstanceId?: string;
  initiatorDepartmentName?: string;
  timeline: TicketTimelineNode[];
}

export interface CreateTicketDto {
  categoryId: string;
  formData: Record<string, any>;
}

export interface TicketFilterParams {
  search?: string;
  status?: string;
  categoryId?: string;
}
