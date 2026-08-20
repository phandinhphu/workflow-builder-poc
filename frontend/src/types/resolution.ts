/**
 * Resolver Types
 * Section 7.4, 7.9, 10 - User & Participant Resolution
 * 
 * Dynamic user/participant/assignee resolution
 */

import type { JSONSchema } from './schema';
import type { ValueBinding } from './workflow';

export type ResolverType =
  | 'FIXED_USER'
  | 'ROLE'
  | 'GROUP'
  | 'CURRENT_PARTICIPANT'
  | 'PARTICIPANT_MANAGER'
  | 'CREATOR_MANAGER'
  | 'DEPARTMENT_HEAD'
  | 'EXPRESSION'
  | 'EXTERNAL_QUERY';

export interface ResolverDefinition {
  type: ResolverType;
  config: Record<string, unknown>;
  fallback?: ResolverDefinition;
  expectedCardinality?: 'ONE' | 'MANY' | 'OPTIONAL';
}

export interface ResolverResult {
  success: boolean;
  users: UserRef[];
  totalFound: number;
  fromCache: boolean;
  warnings?: string[];
  metadata?: Record<string, unknown>;
}

export interface UserRef {
  id: string;
  externalId?: string;
  displayName: string;
  email?: string;
  department?: string;
  role?: string;
  level?: string;
  status: 'ACTIVE' | 'INACTIVE' | 'PENDING';
  managerId?: string;
  isGroup?: boolean;
}

export interface ResolverConfig {
  resolverType: ResolverType;
  scope: 'INSTANCE' | 'EACH_PARTICIPANT' | 'GLOBAL';
  filter?: JSONSchema;
  sortBy?: 'displayName' | 'department' | 'role' | 'level';
  reverseOrder?: boolean;
}

// Specific resolver configurations

export interface FixedUserResolver {
  type: 'FIXED_USER';
  userId: string;
}

export interface RoleResolver {
  type: 'ROLE';
  roles: string[];
  department?: string;
  includeSubordinates?: boolean;
}

export interface GroupResolver {
  type: 'GROUP';
  groupIds: string[];
  includeInactive?: boolean;
}

export interface CurrentParticipantResolver {
  type: 'CURRENT_PARTICIPANT';
  participantId: string;
  includeManager?: boolean;
  includeChildren?: boolean;
}

export interface ParticipantManagerResolver {
  type: 'PARTICIPANT_MANAGER';
  participantId: string;
  includeSelf?: boolean;
}

export interface CreatorManagerResolver {
  type: 'CREATOR_MANAGER';
}

export interface DepartmentHeadResolver {
  type: 'DEPARTMENT_HEAD';
  departmentId: string;
  includeSelf?: boolean;
}

export interface ExpressionResolver {
  type: 'EXPRESSION';
  expression: ValueBinding;
  fallbackUsers?: string[];
}

export interface ExternalQueryResolver {
  type: 'EXTERNAL_QUERY';
  connectorId: string;
  actionKey: string;
  parameterPath?: string;
  filter?: JSONSchema;
}

// Cardinality

export interface CardinalityDeclaration {
  expected: 'ONE' | 'MANY' | 'OPTIONAL';
  minimum?: number;
  maximum?: number;
  allowDuplicates?: boolean;
  requireUnique?: boolean;
}

// Resolver Fallback Chain
export interface ResolverWithFallback {
  primary: ResolverDefinition;
  fallback?: ResolverWithFallback;
  resolvedResult?: ResolverResult;
  lastResolutionAt?: string;
  resolutionCount: number; // For caching/snapshot
}

// Participant Snapshot
export interface ParticipantSnapshot {
  id: string;
  participantId: string;
  participantScopeKind: 'ALL_ACTIVE' | 'DEPARTMENT' | 'ROLE' | 'FIXED' | 'CONDITION' | 'FROM_TRIGGER' | 'EXTERNAL';
  resolvedUsers: UserRef[];
  resolvedAt: string;
  snapshotPolicy: 'AT_INSTANCE_START' | 'AT_NODE_EXECUTION' | 'LIVE_REFRESH';
  snapshotReason?: string;
}

// Org Directory References
export interface OrgUserRef {
  id: string;
  externalId: string;
  displayName: string;
  email: string;
  department: string;
  role: string;
  managerId?: string;
  level: string;
  status: 'Active' | 'Inactive';
  jobTitle?: string;
}