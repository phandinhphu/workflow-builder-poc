export type FormFieldType =
  | 'string'
  | 'textarea'
  | 'number'
  | 'boolean'
  | 'date'
  | 'datetime'
  | 'select'
  | 'multiselect'
  | 'file';

export interface FormFieldOption {
  label: string;
  value: string;
}

export interface FormFieldValidation {
  min?: number;
  max?: number;
  step?: number;
  minLength?: number;
  maxLength?: number;
  pattern?: string;
  allowedFileTypes?: string[];
  maxFileSizeMb?: number;
}

export interface FormField {
  id: string;
  key: string;
  label: string;
  type: FormFieldType;
  required?: boolean;
  defaultValue?: any;
  placeholder?: string;
  helpText?: string;
  options?: FormFieldOption[];
  validation?: FormFieldValidation;
}

export interface FormSchema {
  fields: FormField[];
}

export type FormStatus = 'DRAFT' | 'PUBLISHED' | 'ARCHIVED';

export interface FormSummary {
  id: string;
  name: string;
  code: string;
  description?: string;
  status: FormStatus;
  latestVersion?: number;
  fieldCount: number;
  createdBy: string;
  createdByName?: string;
  createdAt: string;
  updatedAt: string;
}

export interface FormDetail {
  id: string;
  name: string;
  code: string;
  description?: string;
  status: FormStatus;
  latestVersion?: number;
  activeVersionId?: string;
  draftSchema: FormSchema;
  createdBy: string;
  createdByName?: string;
  createdAt: string;
  updatedAt: string;
}

export interface FormVersion {
  id: string;
  formDefinitionId: string;
  versionNumber: number;
  schemaSnapshot: FormSchema;
  checksum: string;
  publishedBy: string;
  publishedByName?: string;
  publishedAt: string;
}

export interface CreateFormDto {
  name: string;
  code: string;
  description?: string;
  draftSchema?: FormSchema;
}

export interface UpdateDraftDto {
  name?: string;
  description?: string;
  draftSchema: FormSchema;
}
