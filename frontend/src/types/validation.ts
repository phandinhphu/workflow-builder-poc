/**
 * Enhanced Validation Types
 * Section 7.16, 10 - Comprehensive validation rules
 * 
 * Type-aware, cross-node, and schema validation
 */

import type { JSONSchemaType } from './schema';

export type ValidationSeverity = 'ERROR' | 'WARNING' | 'INFO';

export type ValidationCategory =
  | 'GRAPH'
  | 'NODE_CONFIG'
  | 'CONNECTION'
  | 'TRIGGER'
  | 'PARTICIPANT'
  | 'FORM'
  | 'CONDITION'
  | 'INTEGRATION'
  | 'SLA'
  | 'SCHEMA'
  | 'SECURITY';

export interface ValidationIssue {
  id: string;
  severity: ValidationSeverity;
  category: ValidationCategory;
  code: string;
  message: string;
  nodeId?: string;
  edgeId?: string;
  fieldPath?: string;
  suggestedFix?: string;
  documentationUrl?: string;
  metadata?: Record<string, unknown>;
}

export interface ValidationResult {
  isValid: boolean;
  errors: ValidationIssue[];
  warnings: ValidationIssue[];
  infos: ValidationIssue[];
  timestamp: string;
  validatedBy: 'USER' | 'AUTO_SAVE' | 'PRE_PUBLISH';
}

// Validation Rules
export interface ValidationRule {
  code: string;
  name: string;
  category: ValidationCategory;
  severity: ValidationSeverity;
  description: string;
  enabled: boolean;
  validate: (context: ValidationContext) => ValidationIssue[];
}

export interface ValidationContext {
  workflowId: string;
  nodes: Map<string, any>;
  edges: Map<string, any>;
  trigger?: any;
  participantScope?: any;
  variables: Map<string, any>;
  forms: Map<string, any>;
  schemaManifest?: any;
  connectors: Map<string, any>;
  credentials: Map<string, any>;
}

// Specific validation types

// Graph Validation
export interface GraphValidationResult {
  hasCycle: boolean;
  cycleNodes?: string[];
  unreachableNodes: string[];
  danglingConnections: string[];
  missingStartNode: boolean;
  missingEndNode: boolean;
  multipleStartNodes: boolean;
}

// Type Validation
export interface TypeValidationResult {
  sourceType: JSONSchemaType;
  targetType: JSONSchemaType;
  isCompatible: boolean;
  requiresCast: boolean;
  castFunction?: string;
  reason?: string;
}

// Cross-Node Validation
export interface CrossNodeValidation {
  nodeId: string;
  dependsOn: string[]; // Other node IDs
  dataFlowIssues: DataFlowIssue[];
  circularDependencies: string[][];
}

export interface DataFlowIssue {
  sourcePath: string;
  targetPath: string;
  issue: 'UNDEFINED' | 'TYPE_MISMATCH' | 'NULLABLE' | 'CIRCULAR';
  suggestion: string;
}

// Port Validation
export interface PortValidationIssue {
  nodeId: string;
  portKey: string;
  issue: 'MISSING_CONNECTION' | 'INCOMPATIBLE_TARGET' | 'AMBIGUOUS_ROUTE' | 'NO_DEFAULT';
  severity: ValidationSeverity;
  message: string;
}

// Validation Rules Registry
export const VALIDATION_RULES = {
  // Graph rules
  GRAPH_HAS_START: 'GRAPH_HAS_START',
  GRAPH_HAS_END: 'GRAPH_HAS_END',
  GRAPH_NO_CYCLES: 'GRAPH_NO_CYCLES',
  GRAPH_ALL_REACHABLE: 'GRAPH_ALL_REACHABLE',
  GRAPH_NO_DANGLING: 'GRAPH_NO_DANGLING',
  
  // Node rules
  NODE_CONFIG_COMPLETE: 'NODE_CONFIG_COMPLETE',
  NODE_ASSIGNEE_VALID: 'NODE_ASSIGNEE_VALID',
  NODE_FORM_VALID: 'NODE_FORM_VALID',
  NODE_SLA_VALID: 'NODE_SLA_VALID',
  NODE_INTEGRATION_VALID: 'NODE_INTEGRATION_VALID',
  
  // Connection rules
  CONN_HAS_SOURCE_PORT: 'CONN_HAS_SOURCE_PORT',
  CONN_HAS_TARGET: 'CONN_HAS_TARGET',
  CONN_CONDITION_VALID: 'CONN_CONDITION_VALID',
  CONN_PRIORITY_UNIQUE: 'CONN_PRIORITY_UNIQUE',
  CONN_HAS_DEFAULT: 'CONN_HAS_DEFAULT',
  
  // Trigger rules
  TRIGGER_REQUIRED: 'TRIGGER_REQUIRED',
  TRIGGER_SCHEMA_VALID: 'TRIGGER_SCHEMA_VALID',
  TRIGGER_CONFIG_COMPLETE: 'TRIGGER_CONFIG_COMPLETE',
  
  // Schema rules
  SCHEMA_BINDING_EXISTS: 'SCHEMA_BINDING_EXISTS',
  SCHEMA_TYPE_COMPATIBLE: 'SCHEMA_TYPE_COMPATIBLE',
  SCHEMA_NO_CIRCULAR: 'SCHEMA_NO_CIRCULAR',
  SCHEMA_NAMESPACE_IMMUTABLE: 'SCHEMA_NAMESPACE_IMMUTABLE',
  
  // Form rules
  FORM_FIELD_ID_UNIQUE: 'FORM_FIELD_ID_UNIQUE',
  FORM_OUTPUT_NO_CONFLICT: 'FORM_OUTPUT_NO_CONFLICT',
  FORM_VALIDATION_VALID: 'FORM_VALIDATION_VALID',
  
  // Condition rules
  CONDITION_PATH_EXISTS: 'CONDITION_PATH_EXISTS',
  CONDITION_OPERATOR_VALID: 'CONDITION_OPERATOR_VALID',
  CONDITION_TYPE_COMPATIBLE: 'CONDITION_TYPE_COMPATIBLE',
  CONDITION_EXHAUSTIVE: 'CONDITION_EXHAUSTIVE',
  
  // Integration rules
  INTEGRATION_CONNECTOR_EXISTS: 'INTEGRATION_CONNECTOR_EXISTS',
  INTEGRATION_ACTION_EXISTS: 'INTEGRATION_ACTION_EXISTS',
  INTEGRATION_CREDENTIAL_VALID: 'INTEGRATION_CREDENTIAL_VALID',
  INTEGRATION_INPUT_MAPPED: 'INTEGRATION_INPUT_MAPPED',
  INTEGRATION_RETRY_VALID: 'INTEGRATION_RETRY_VALID',
  
  // Participant rules
  PARTICIPANT_RESOLVER_VALID: 'PARTICIPANT_RESOLVER_VALID',
  PARTICIPANT_EMPTY_POLICY: 'PARTICIPANT_EMPTY_POLICY',
  
  // Assignment rules
  ASSIGNMENT_CARDINALITY_MODE: 'ASSIGNMENT_CARDINALITY_MODE',
  ASSIGNMENT_COMPLETION_POLICY: 'ASSIGNMENT_COMPLETION_POLICY',
  
  // Escalation rules
  ESCALATION_RESOLVER_VALID: 'ESCALATION_RESOLVER_VALID',
  ESCALATION_ACTION_VALID: 'ESCALATION_ACTION_VALID',
  
  // Security rules
  SECURITY_NO_SECRETS_IN_CONFIG: 'SECURITY_NO_SECRETS_IN_CONFIG',
  SECURITY_CREDENTIAL_REF_ONLY: 'SECURITY_CREDENTIAL_REF_ONLY',
} as const;

export type ValidationRuleCode = typeof VALIDATION_RULES[keyof typeof VALIDATION_RULES];
