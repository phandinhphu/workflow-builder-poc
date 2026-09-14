/**
 * Global Constants & Enums
 * 
 * Centralized constants used across the application
 */

export const DURATION_UNITS = {
  MINUTES: 'MINUTES',
  HOURS: 'HOURS',
  DAYS: 'DAYS',
  BUSINESS_DAYS: 'BUSINESS_DAYS',
  WORK_HOURS: 'WORK_HOURS',
} as const;

export type DurationUnit = typeof DURATION_UNITS[keyof typeof DURATION_UNITS];

export const VALIDATION_SEVERITIES = {
  ERROR: 'ERROR' as const,
  WARNING: 'WARNING' as const,
  INFO: 'INFO' as const,
} as const;

export type ValidationSeverity = typeof VALIDATION_SEVERITIES[keyof typeof VALIDATION_SEVERITIES];

export const TASK_STATUSES = {
  PENDING: 'PENDING' as const,
  CLAIMED: 'CLAIMED' as const,
  IN_PROGRESS: 'IN_PROGRESS' as const,
  COMPLETED: 'COMPLETED' as const,
  REJECTED: 'REJECTED' as const,
  EXPIRED: 'EXPIRED' as const,
  EXPIRING: 'EXPIRING' as const,
} as const;

export type TaskStatus = typeof TASK_STATUSES[keyof typeof TASK_STATUSES];

export const NODE_KINDS = {
  CONTROL: 'CONTROL' as const,
  HUMAN_TASK: 'HUMAN_TASK' as const,
  AUTOMATION: 'AUTOMATION' as const,
  WAIT: 'WAIT' as const,
  TERMINAL: 'TERMINAL' as const,
  COMPOSITION: 'COMPOSITION' as const,
  DATA_PURE: 'DATA_PURE' as const,
} as const;

export type NodeKind = typeof NODE_KINDS[keyof typeof NODE_KINDS];

export const PORT_SEMANTICS = {
  SUCCESS: 'SUCCESS' as const,
  BUSINESS_OUTCOME: 'BUSINESS_OUTCOME' as const,
  DECISION: 'DECISION' as const,
  TEMPORAL: 'TEMPORAL' as const,
  TECHNICAL: 'TECHNICAL' as const,
} as const;

export type PortSemantic = typeof PORT_SEMANTICS[keyof typeof PORT_SEMANTICS];

export const COMPLETION_POLICIES = {
  ALL: 'ALL' as const,
  ANY: 'ANY' as const,
  THRESHOLD: 'THRESHOLD' as const,
  PER_PARTICIPANT: 'PER_PARTICIPANT' as const,
} as const;

export type CompletionPolicy = typeof COMPLETION_POLICIES[keyof typeof COMPLETION_POLICIES];

export const ASSIGNMENT_MODES = {
  DIRECT_ONE: 'DIRECT_ONE' as const,
  DIRECT_ALL: 'DIRECT_ALL' as const,
  CLAIMABLE_POOL: 'CLAIMABLE_POOL' as const,
} as const;

export type AssignmentMode = typeof ASSIGNMENT_MODES[keyof typeof ASSIGNMENT_MODES];

export const TRIGGER_TYPES = {
  MANUAL: 'manual' as const,
  SCHEDULE: 'schedule' as const,
  FORM: 'form' as const,
  WEBHOOK: 'webhook' as const,
} as const;

export type TriggerType = typeof TRIGGER_TYPES[keyof typeof TRIGGER_TYPES];

export const CONNECTOR_TYPES = {
  HTTP: 'HTTP' as const,
  DATABASE: 'DATABASE' as const,
  EMAIL: 'EMAIL' as const,
  STORAGE: 'STORAGE' as const,
  MESSAGING: 'MESSAGING' as const,
  CUSTOM: 'CUSTOM' as const,
} as const;

export type ConnectorType = typeof CONNECTOR_TYPES[keyof typeof CONNECTOR_TYPES];

export const ESCALATION_ACTIONS = {
  REASSIGN: 'REASSIGN' as const,
  ADD_WATCHER: 'ADD_WATCHER' as const,
  NOTIFY: 'NOTIFY' as const,
  AUTO_REJECT: 'AUTO_REJECT' as const,
  AUTO_COMPLETE: 'AUTO_COMPLETE' as const,
  ROUTE_TIMEOUT: 'ROUTE_TIMEOUT' as const,
  FAIL: 'FAIL' as const,
} as const;

export type EscalationAction = typeof ESCALATION_ACTIONS[keyof typeof ESCALATION_ACTIONS];

export const NODE_TYPES = {
  START: 'START' as const,
  END: 'END' as const,
  APPROVAL: 'APPROVAL' as const,
  REVIEW: 'REVIEW' as const,
  ASSIGNMENT: 'ASSIGNMENT' as const,
  NOTIFICATION: 'NOTIFICATION' as const,
  CONDITION: 'CONDITION' as const,
  SYSTEM: 'SYSTEM' as const,
  DATA: 'DATA' as const,
  HTTP: 'HTTP' as const,
  DATA_TRANSFORM: 'DATA_TRANSFORM' as const,
  TIMER: 'TIMER' as const,
  WAIT_EVENT: 'WAIT_EVENT' as const,
  PARALLEL_SPLIT: 'PARALLEL_SPLIT' as const,
  JOIN: 'JOIN' as const,
  SUBWORKFLOW: 'SUBWORKFLOW' as const,
  CODE: 'CODE' as const,
} as const;

export type NodeType = typeof NODE_TYPES[keyof typeof NODE_TYPES];

// Version Constants
export const VERSION_PREFIXES = {
  MAJOR: 'major',
  MINOR: 'minor',
  PATCH: 'patch',
  BUILD: 'build',
} as const;

// Default Values
export const DEFAULTS = {
  RETRY_MAX_ATTEMPTS: 3,
  RETRY_BACKOFF_MS: 1000,
  RETRY_BACKOFF_MULTIPLIER: 2,
  SLA_DEFAULT_DURATION: 24,
  SLA_DEFAULT_UNIT: 'HOURS' as const,
  CONNECTION_PRIORITY_DEFAULT: 0,
  MAX_PARALLEL_BRANCHES: 10,
  MAX_ITERATIONS: 100,
  NULL_POLICY_DEFAULT: 'NULL_AS_FALSE' as const,
} as const;

// Node Color Mapping (for UI)
export const NODE_COLORS = {
  START: '#8B5CF6',      // Indigo
  END: '#EF4444',        // Red
  APPROVAL: '#3B82F6',   // Blue
  REVIEW: '#8B5CF6',     // Purple
  ASSIGNMENT: '#F97316', // Orange
  NOTIFICATION: '#FBBF24', // Yellow
  CONDITION: '#10B981',  // Emerald
  SYSTEM: '#6B7280',     // Gray
  DATA: '#06B6D4',       // Teal
  HTTP: '#EC4899',       // Cyan
  DATA_TRANSFORM: '#84CC16', // Lime
  TIMER: '#EF4444',      // Red
  WAIT_EVENT: '#8B5CF6', // Purple
  PARALLEL_SPLIT: '#F97316', // Orange
  JOIN: '#10B981',       // Emerald
  SUBWORKFLOW: '#EC4899', // Cyan
  CODE: '#6B7280',       // Gray
} as const;

// Node Icon Mapping (for UI)
export const NODE_ICONS = {
  START: 'PlayCircle',
  END: 'StopCircle',
  APPROVAL: 'CheckCircle',
  REVIEW: 'Eye',
  ASSIGNMENT: 'User',
  NOTIFICATION: 'Mail',
  CONDITION: 'AlertTriangle',
  SYSTEM: 'Database',
  DATA: 'Collection',
  HTTP: 'Link',
  DATA_TRANSFORM: 'TrendingUp',
  TIMER: 'Clock',
  WAIT_EVENT: 'RefreshCw',
  PARALLEL_SPLIT: 'ArrowLeftRight',
  JOIN: 'ArrowRightLeft',
  SUBWORKFLOW: 'Layers',
  CODE: 'Code2',
} as const;

// Resolver Type Icons
export const RESOLVER_ICONS = {
  FIXED_USER: 'User',
  ROLE: 'Users',
  GROUP: 'Users',
  INITIATOR: 'UserCheck',
  CREATOR: 'UserCheck',
  CURRENT_PARTICIPANT: 'User',
  PARTICIPANT_MANAGER: 'User',
  CREATOR_MANAGER: 'User',
  DEPARTMENT_HEAD: 'User',
  DYNAMIC: 'Link',
  EXPRESSION: 'Link',
  EXTERNAL_QUERY: 'ExternalLink',
} as const;

// Validation Rule Codes (mapped from constants)
export const VALIDATION_CODES = {
  // Graph
  GRAPH_HAS_START: 'GRAPH_HAS_START',
  GRAPH_HAS_END: 'GRAPH_HAS_END',
  GRAPH_NO_CYCLES: 'GRAPH_NO_CYCLES',
  GRAPH_ALL_REACHABLE: 'GRAPH_ALL_REACHABLE',
  GRAPH_NO_DANGLING: 'GRAPH_NO_DANGLING',
  
  // Node
  NODE_CONFIG_COMPLETE: 'NODE_CONFIG_COMPLETE',
  NODE_ASSIGNEE_VALID: 'NODE_ASSIGNEE_VALID',
  NODE_FORM_VALID: 'NODE_FORM_VALID',
  NODE_SLA_VALID: 'NODE_SLA_VALID',
  NODE_INTEGRATION_VALID: 'NODE_INTEGRATION_VALID',
  
  // Connection
  CONN_HAS_SOURCE_PORT: 'CONN_HAS_SOURCE_PORT',
  CONN_HAS_TARGET: 'CONN_HAS_TARGET',
  CONN_CONDITION_VALID: 'CONN_CONDITION_VALID',
  CONN_PRIORITY_UNIQUE: 'CONN_PRIORITY_UNIQUE',
  CONN_HAS_DEFAULT: 'CONN_HAS_DEFAULT',
  
  // Trigger
  TRIGGER_REQUIRED: 'TRIGGER_REQUIRED',
  TRIGGER_SCHEMA_VALID: 'TRIGGER_SCHEMA_VALID',
  TRIGGER_CONFIG_COMPLETE: 'TRIGGER_CONFIG_COMPLETE',
  
  // Schema
  SCHEMA_BINDING_EXISTS: 'SCHEMA_BINDING_EXISTS',
  SCHEMA_TYPE_COMPATIBLE: 'SCHEMA_TYPE_COMPATIBLE',
  SCHEMA_NO_CIRCULAR: 'SCHEMA_NO_CIRCULAR',
  SCHEMA_NAMESPACE_IMMUTABLE: 'SCHEMA_NAMESPACE_IMMUTABLE',
  
  // Form
  FORM_FIELD_ID_UNIQUE: 'FORM_FIELD_ID_UNIQUE',
  FORM_OUTPUT_NO_CONFLICT: 'FORM_OUTPUT_NO_CONFLICT',
  FORM_VALIDATION_VALID: 'FORM_VALIDATION_VALID',
  
  // Condition
  CONDITION_PATH_EXISTS: 'CONDITION_PATH_EXISTS',
  CONDITION_OPERATOR_VALID: 'CONDITION_OPERATOR_VALID',
  CONDITION_TYPE_COMPATIBLE: 'CONDITION_TYPE_COMPATIBLE',
  CONDITION_EXHAUSTIVE: 'CONDITION_EXHAUSTIVE',
  
  // Integration
  INTEGRATION_CONNECTOR_EXISTS: 'INTEGRATION_CONNECTOR_EXISTS',
  INTEGRATION_ACTION_EXISTS: 'INTEGRATION_ACTION_EXISTS',
  INTEGRATION_CREDENTIAL_VALID: 'INTEGRATION_CREDENTIAL_VALID',
  INTEGRATION_INPUT_MAPPED: 'INTEGRATION_INPUT_MAPPED',
  INTEGRATION_RETRY_VALID: 'INTEGRATION_RETRY_VALID',
  
  // Participant
  PARTICIPANT_RESOLVER_VALID: 'PARTICIPANT_RESOLVER_VALID',
  PARTICIPANT_EMPTY_POLICY: 'PARTICIPANT_EMPTY_POLICY',
  
  // Assignment
  ASSIGNMENT_CARDINALITY_MODE: 'ASSIGNMENT_CARDINALITY_MODE',
  ASSIGNMENT_COMPLETION_POLICY: 'ASSIGNMENT_COMPLETION_POLICY',
  
  // Escalation
  ESCALATION_RESOLVER_VALID: 'ESCALATION_RESOLVER_VALID',
  ESCALATION_ACTION_VALID: 'ESCALATION_ACTION_VALID',
  
  // Security
  SECURITY_NO_SECRETS_IN_CONFIG: 'SECURITY_NO_SECRETS_IN_CONFIG',
  SECURITY_CREDENTIAL_REF_ONLY: 'SECURITY_CREDENTIAL_REF_ONLY',
} as const;