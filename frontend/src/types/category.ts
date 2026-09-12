import type { FormSchema } from './form';

export interface ValidationError {
  nodeId: string;
  nodeName: string;
  requiredField: string;
  mappedFormField?: string;
  expectedType: string;
  actualType?: string;
  errorCode: 'MISSING_FIELD' | 'TYPE_MISMATCH' | string;
  message: string;
}

export interface ValidationWarning {
  nodeId: string;
  nodeName: string;
  warningCode: string;
  message: string;
}

export interface WorkflowFieldInfo {
  field: string;
  fieldType: string;
  nodeId: string;
  nodeName: string;
}

export interface FormFieldInfo {
  key: string;
  label: string;
  type: string;
  required: boolean;
}

export interface CompatibilityValidationResult {
  valid: boolean;
  errors: ValidationError[];
  warnings: ValidationWarning[];
  workflowFields: WorkflowFieldInfo[];
  formFields: FormFieldInfo[];
  effectiveMapping: Record<string, string>;
}

export interface TicketCategorySummary {
  id: string;
  name: string;
  code: string;
  description?: string;
  icon?: string;
  color?: string;
  formVersionId: string;
  formName?: string;
  formVersionNumber?: number;
  workflowExecutableId: string;
  workflowName?: string;
  workflowVersionNo?: string;
  mappedFieldsCount: number;
  isActive: boolean;
  createdBy: string;
  createdByName?: string;
  createdAt: string;
  updatedAt: string;
}

export interface TicketCategoryDetail {
  id: string;
  name: string;
  code: string;
  description?: string;
  icon?: string;
  color?: string;
  formVersionId: string;
  formDefinitionId?: string;
  formName?: string;
  formCode?: string;
  formVersionNumber?: number;
  formSchemaSnapshot?: FormSchema;
  workflowExecutableId: string;
  workflowId?: string;
  workflowName?: string;
  workflowVersionNo?: string;
  fieldMapping: Record<string, string>;
  isActive: boolean;
  createdBy: string;
  createdByName?: string;
  createdAt: string;
  updatedAt: string;
}

export interface CreateTicketCategoryDto {
  name: string;
  code: string;
  description?: string;
  icon?: string;
  color?: string;
  formVersionId: string;
  workflowExecutableId: string;
  fieldMapping?: Record<string, string>;
  isActive?: boolean;
}

export interface UpdateTicketCategoryDto {
  name: string;
  code: string;
  description?: string;
  icon?: string;
  color?: string;
  formVersionId: string;
  workflowExecutableId: string;
  fieldMapping?: Record<string, string>;
  isActive?: boolean;
}

export interface ValidateMappingDto {
  formVersionId: string;
  workflowExecutableId: string;
  fieldMapping?: Record<string, string>;
}
