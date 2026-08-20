/**
 * Organization Directory Types
 * Section 10 - Data Organization & User Resolution
 */

export type UserStatus = 'Active' | 'Inactive' | 'Pending' | 'Suspended';

export interface OrgUser {
  id: string;
  externalId: string;
  displayName: string;
  email: string;
  department: string;
  role: string;
  managerId?: string;
  level: string;
  status: UserStatus;
  jobTitle?: string;
  phone?: string;
  pictureUrl?: string;
  createdAt: string;
  updatedAt: string;
}

export interface OrgDepartment {
  id: string;
  name: string;
  code?: string;
  parentId?: string;
  level: number;
  description?: string;
  userCount: number;
  children?: OrgDepartment[];
  users: OrgUser[];
}

export interface OrgGroup {
  id: string;
  name: string;
  description?: string;
  type: 'DEPARTMENT' | 'TEAM' | 'PROJECT' | 'CUSTOM';
  scope: 'GLOBAL' | 'WORKFLOW' | 'DEPARTMENT';
  users: OrgUser[];
  departments: OrgDepartment[];
  managerId?: string;
  metadata?: Record<string, unknown>;
}

export interface OrgRelationship {
  userId: string;
  managerId: string;
  relationshipType: 'DIRECT' | 'INDIRECT' | 'SKIP';
  level: number;
  isCycle: boolean;
}

export interface OrgSearchFilters {
  department?: string;
  role?: string;
  managerId?: string;
  status?: UserStatus;
  namePattern?: string;
  emailPattern?: string;
  level?: string;
}

export interface OrgSearchResult {
  users: OrgUser[];
  departments: OrgDepartment[];
  groups: OrgGroup[];
  total: number;
  page: number;
  pageSize: number;
  hasMore: boolean;
}

export interface OrgSyncStatus {
  source: 'EXTERNAL_API' | 'HR_SYSTEM' | 'DIRECTORY_SERVICE';
  lastSyncAt: string;
  status: 'SYNCING' | 'SYNCED' | 'FAILED' | 'PENDING';
  recordsProcessed: number;
  recordsCreated: number;
  recordsUpdated: number;
  recordsFailed: number;
  errorMessage?: string;
  syncType: 'FULL' | 'INCREMENTAL';
  schemaVersion: string;
}

export interface SyncResult {
  success: boolean;
  processedRecords: number;
  createdRecords: number;
  updatedRecords: number;
  failedRecords: number;
  duplicateRecords: number;
  errors: SyncError[];
  completedAt: string;
}

export interface SyncError {
  recordId: string;
  recordData: Record<string, unknown>;
  errorMessage: string;
  errorCode?: string;
  retryable: boolean;
}

export interface OrgDirectoryConfig {
  source: 'EXTERNAL_API' | 'HR_SYSTEM' | 'DIRECTORY_SERVICE';
  endpoint?: string;
  apiKey?: string;
  authenticationType?: 'BASIC' | 'OAUTH2' | 'API_KEY';
  syncSchedule?: string; // Cron expression
  userIdField: string;
  externalIdField: string;
  nameField: string;
  emailField: string;
  departmentField: string;
  roleField: string;
  managerField: string;
  statusField: string;
  mapping: Record<string, string>;
  enabled: boolean;
}

export interface ManagerValidationResult {
  hasCycle: boolean;
  selfLoop: boolean;
  validationErrors: string[];
  clean: boolean;
}