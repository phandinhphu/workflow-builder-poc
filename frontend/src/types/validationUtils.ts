/**
 * Validation Utility Types
 * Section 7.16 - Enhanced Validation Rules
 *
 * Helper types for validation logic
 */

import type { ValidationSeverity, ValidationIssue, ValidationRuleCode, ValidationCategory } from './validation';
import { VALIDATION_CODES } from './constants';

export interface ValidationRuleEngineConfig {
  strictMode: boolean;
  severity: ValidationSeverity;
  failFast: boolean;
  skipOnWarning: boolean;
}

export interface ValidationPipeline {
  rules: ValidationRuleCode[];
  parallel: boolean;
  abortOnFirstError: boolean;
}

export interface BatchValidationResult {
  valid: boolean;
  issues: ValidationIssue[];
  summary: {
    totalRules: number;
    passed: number;
    failed: number;
    warnings: number;
  };
}

export interface ValidationRuleMetadata {
  code: ValidationRuleCode;
  name: string;
  description: string;
  category: ValidationCategory;
  severity: ValidationSeverity;
  dependsOn?: ValidationRuleCode[];
  enabledByDefault: boolean;
}

export const ValidationRuleMetadataMap: Record<ValidationRuleCode, ValidationRuleMetadata> = {
  [VALIDATION_CODES.GRAPH_HAS_START]: {
    code: VALIDATION_CODES.GRAPH_HAS_START,
    name: 'Graph Has Start Node',
    description: 'Workflow must have exactly one Start node',
    category: 'GRAPH',
    severity: 'ERROR' as ValidationSeverity,
    enabledByDefault: true,
  },
  [VALIDATION_CODES.GRAPH_HAS_END]: {
    code: VALIDATION_CODES.GRAPH_HAS_END,
    name: 'Graph Has End Node',
    description: 'Workflow must have exactly one End node',
    category: 'GRAPH',
    severity: 'ERROR' as ValidationSeverity,
    enabledByDefault: true,
  },
  [VALIDATION_CODES.GRAPH_NO_CYCLES]: {
    code: VALIDATION_CODES.GRAPH_NO_CYCLES,
    name: 'Graph Has No Cycles',
    description: 'Workflow must not contain cycles (unless explicitly allowed)',
    category: 'GRAPH',
    severity: 'ERROR' as ValidationSeverity,
    enabledByDefault: true,
  },
  [VALIDATION_CODES.GRAPH_ALL_REACHABLE]: {
    code: VALIDATION_CODES.GRAPH_ALL_REACHABLE,
    name: 'All Nodes Reachable',
    description: 'All nodes must be reachable from Start',
    category: 'GRAPH',
    severity: 'WARNING' as ValidationSeverity,
    enabledByDefault: true,
  },
  [VALIDATION_CODES.GRAPH_NO_DANGLING]: {
    code: VALIDATION_CODES.GRAPH_NO_DANGLING,
    name: 'No Dangling Connections',
    description: 'No orphaned connections (source not connected to any node)',
    category: 'GRAPH',
    severity: 'ERROR' as ValidationSeverity,
    enabledByDefault: true,
  },
  [VALIDATION_CODES.NODE_CONFIG_COMPLETE]: {
    code: VALIDATION_CODES.NODE_CONFIG_COMPLETE,
    name: 'Node Configuration Complete',
    description: 'All required node configuration fields must be filled',
    category: 'NODE_CONFIG',
    severity: 'ERROR' as ValidationSeverity,
    enabledByDefault: true,
  },
  [VALIDATION_CODES.NODE_ASSIGNEE_VALID]: {
    code: VALIDATION_CODES.NODE_ASSIGNEE_VALID,
    name: 'Assignee Resolver Valid',
    description: 'Assignee resolver must resolve to at least one user',
    category: 'NODE_CONFIG',
    severity: 'ERROR' as ValidationSeverity,
    enabledByDefault: true,
  },
  [VALIDATION_CODES.NODE_FORM_VALID]: {
    code: VALIDATION_CODES.NODE_FORM_VALID,
    name: 'Form Configuration Valid',
    description: 'Form fields must have unique IDs and valid schema',
    category: 'NODE_CONFIG',
    severity: 'ERROR' as ValidationSeverity,
    enabledByDefault: true,
  },
  [VALIDATION_CODES.NODE_SLA_VALID]: {
    code: VALIDATION_CODES.NODE_SLA_VALID,
    name: 'SLA Configuration Valid',
    description: 'SLA due duration and escalation must be configured',
    category: 'NODE_CONFIG',
    severity: 'WARNING' as ValidationSeverity,
    enabledByDefault: true,
  },
  [VALIDATION_CODES.NODE_INTEGRATION_VALID]: {
    code: VALIDATION_CODES.NODE_INTEGRATION_VALID,
    name: 'System Action Integration Valid',
    description: 'System action connector and action must exist and be enabled',
    category: 'NODE_CONFIG',
    severity: 'ERROR' as ValidationSeverity,
    enabledByDefault: true,
  },
  [VALIDATION_CODES.CONN_HAS_SOURCE_PORT]: {
    code: VALIDATION_CODES.CONN_HAS_SOURCE_PORT,
    name: 'Connection Has Source Port',
    description: 'Connection must reference a source port',
    category: 'CONNECTION',
    severity: 'ERROR' as ValidationSeverity,
    enabledByDefault: true,
  },
  [VALIDATION_CODES.CONN_HAS_TARGET]: {
    code: VALIDATION_CODES.CONN_HAS_TARGET,
    name: 'Connection Has Target',
    description: 'Connection must have a target node',
    category: 'CONNECTION',
    severity: 'ERROR' as ValidationSeverity,
    enabledByDefault: true,
  },
  [VALIDATION_CODES.CONN_CONDITION_VALID]: {
    code: VALIDATION_CODES.CONN_CONDITION_VALID,
    name: 'Connection Condition Valid',
    description: 'Connection condition must reference valid context path and operator',
    category: 'CONNECTION',
    severity: 'WARNING' as ValidationSeverity,
    enabledByDefault: true,
  },
  [VALIDATION_CODES.CONN_PRIORITY_UNIQUE]: {
    code: VALIDATION_CODES.CONN_PRIORITY_UNIQUE,
    name: 'Connection Priorities Must Be Unique',
    description: 'Connections from same source port must have unique priorities',
    category: 'CONNECTION',
    severity: 'WARNING' as ValidationSeverity,
    enabledByDefault: false,
  },
  [VALIDATION_CODES.CONN_HAS_DEFAULT]: {
    code: VALIDATION_CODES.CONN_HAS_DEFAULT,
    name: 'Connection Has Default Route',
    description: 'Connection must have default/fallback route if conditions are not exhaustive',
    category: 'CONNECTION',
    severity: 'WARNING' as ValidationSeverity,
    enabledByDefault: true,
  },
  [VALIDATION_CODES.TRIGGER_REQUIRED]: {
    code: VALIDATION_CODES.TRIGGER_REQUIRED,
    name: 'Trigger Required',
    description: 'Workflow must have a trigger defined',
    category: 'TRIGGER',
    severity: 'ERROR' as ValidationSeverity,
    enabledByDefault: true,
  },
  [VALIDATION_CODES.TRIGGER_SCHEMA_VALID]: {
    code: VALIDATION_CODES.TRIGGER_SCHEMA_VALID,
    name: 'Trigger Schema Valid',
    description: 'Trigger configuration schema must be valid and complete',
    category: 'TRIGGER',
    severity: 'ERROR' as ValidationSeverity,
    enabledByDefault: true,
  },
  [VALIDATION_CODES.TRIGGER_CONFIG_COMPLETE]: {
    code: VALIDATION_CODES.TRIGGER_CONFIG_COMPLETE,
    name: 'Trigger Configuration Complete',
    description: 'Trigger must have all required configuration fields',
    category: 'TRIGGER',
    severity: 'ERROR' as ValidationSeverity,
    enabledByDefault: true,
  },
  [VALIDATION_CODES.SCHEMA_BINDING_EXISTS]: {
    code: VALIDATION_CODES.SCHEMA_BINDING_EXISTS,
    name: 'Schema Binding Exists',
    description: 'All variable bindings must reference existing schema paths',
    category: 'SCHEMA',
    severity: 'ERROR' as ValidationSeverity,
    enabledByDefault: true,
  },
  [VALIDATION_CODES.SCHEMA_TYPE_COMPATIBLE]: {
    code: VALIDATION_CODES.SCHEMA_TYPE_COMPATIBLE,
    name: 'Schema Types Compatible',
    description: 'Binding type must be compatible with target field type',
    category: 'SCHEMA',
    severity: 'ERROR' as ValidationSeverity,
    enabledByDefault: true,
  },
  [VALIDATION_CODES.SCHEMA_NO_CIRCULAR]: {
    code: VALIDATION_CODES.SCHEMA_NO_CIRCULAR,
    name: 'No Circular Schema References',
    description: 'Schema definitions must not contain circular references',
    category: 'SCHEMA',
    severity: 'ERROR' as ValidationSeverity,
    enabledByDefault: true,
  },
  [VALIDATION_CODES.SCHEMA_NAMESPACE_IMMUTABLE]: {
    code: VALIDATION_CODES.SCHEMA_NAMESPACE_IMMUTABLE,
    name: 'Namespace Immutability',
    description: 'Trigger payload namespace must not be modified by nodes',
    category: 'SCHEMA',
    severity: 'WARNING' as ValidationSeverity,
    enabledByDefault: true,
  },
  [VALIDATION_CODES.FORM_FIELD_ID_UNIQUE]: {
    code: VALIDATION_CODES.FORM_FIELD_ID_UNIQUE,
    name: 'Form Field IDs Must Be Unique',
    description: 'All form fields must have unique IDs',
    category: 'FORM',
    severity: 'ERROR' as ValidationSeverity,
    enabledByDefault: true,
  },
  [VALIDATION_CODES.FORM_OUTPUT_NO_CONFLICT]: {
    code: VALIDATION_CODES.FORM_OUTPUT_NO_CONFLICT,
    name: 'Form Output No Conflict',
    description: 'Form output mappings must not conflict with read-only namespaces',
    category: 'FORM',
    severity: 'WARNING' as ValidationSeverity,
    enabledByDefault: true,
  },
  [VALIDATION_CODES.FORM_VALIDATION_VALID]: {
    code: VALIDATION_CODES.FORM_VALIDATION_VALID,
    name: 'Form Validation Valid',
    description: 'Form validation rules must be valid for field types',
    category: 'FORM',
    severity: 'WARNING' as ValidationSeverity,
    enabledByDefault: true,
  },
  [VALIDATION_CODES.CONDITION_PATH_EXISTS]: {
    code: VALIDATION_CODES.CONDITION_PATH_EXISTS,
    name: 'Condition Path Exists',
    description: 'Condition must reference valid context path',
    category: 'CONDITION',
    severity: 'ERROR' as ValidationSeverity,
    enabledByDefault: true,
  },
  [VALIDATION_CODES.CONDITION_OPERATOR_VALID]: {
    code: VALIDATION_CODES.CONDITION_OPERATOR_VALID,
    name: 'Condition Operator Valid',
    description: 'Condition operator must be compatible with field type',
    category: 'CONDITION',
    severity: 'ERROR' as ValidationSeverity,
    enabledByDefault: true,
  },
  [VALIDATION_CODES.CONDITION_TYPE_COMPATIBLE]: {
    code: VALIDATION_CODES.CONDITION_TYPE_COMPATIBLE,
    name: 'Condition Type Compatible',
    description: 'Condition operand types must be compatible',
    category: 'CONDITION',
    severity: 'ERROR' as ValidationSeverity,
    enabledByDefault: true,
  },
  [VALIDATION_CODES.CONDITION_EXHAUSTIVE]: {
    code: VALIDATION_CODES.CONDITION_EXHAUSTIVE,
    name: 'Condition Must Be Exhaustive',
    description: 'If no default route, all possible paths must be covered by conditions',
    category: 'CONDITION',
    severity: 'WARNING' as ValidationSeverity,
    enabledByDefault: true,
  },
  [VALIDATION_CODES.INTEGRATION_CONNECTOR_EXISTS]: {
    code: VALIDATION_CODES.INTEGRATION_CONNECTOR_EXISTS,
    name: 'Integration Connector Exists',
    description: 'System action must reference existing enabled connector',
    category: 'INTEGRATION',
    severity: 'ERROR' as ValidationSeverity,
    enabledByDefault: true,
  },
  [VALIDATION_CODES.INTEGRATION_ACTION_EXISTS]: {
    code: VALIDATION_CODES.INTEGRATION_ACTION_EXISTS,
    name: 'Integration Action Exists',
    description: 'System action must reference existing enabled action',
    category: 'INTEGRATION',
    severity: 'ERROR' as ValidationSeverity,
    enabledByDefault: true,
  },
  [VALIDATION_CODES.INTEGRATION_CREDENTIAL_VALID]: {
    code: VALIDATION_CODES.INTEGRATION_CREDENTIAL_VALID,
    name: 'Integration Credential Valid',
    description: 'System action must have valid credential reference',
    category: 'INTEGRATION',
    severity: 'ERROR' as ValidationSeverity,
    enabledByDefault: true,
  },
  [VALIDATION_CODES.INTEGRATION_INPUT_MAPPED]: {
    code: VALIDATION_CODES.INTEGRATION_INPUT_MAPPED,
    name: 'Integration Input Mapped',
    description: 'All required inputs must be mapped from workflow context',
    category: 'INTEGRATION',
    severity: 'ERROR' as ValidationSeverity,
    enabledByDefault: true,
  },
  [VALIDATION_CODES.INTEGRATION_RETRY_VALID]: {
    code: VALIDATION_CODES.INTEGRATION_RETRY_VALID,
    name: 'Integration Retry Valid',
    description: 'System action retry policy must be valid',
    category: 'INTEGRATION',
    severity: 'WARNING' as ValidationSeverity,
    enabledByDefault: true,
  },
  [VALIDATION_CODES.PARTICIPANT_RESOLVER_VALID]: {
    code: VALIDATION_CODES.PARTICIPANT_RESOLVER_VALID,
    name: 'Participant Resolver Valid',
    description: 'Participant scope must have valid resolver configuration',
    category: 'PARTICIPANT',
    severity: 'ERROR' as ValidationSeverity,
    enabledByDefault: true,
  },
  [VALIDATION_CODES.PARTICIPANT_EMPTY_POLICY]: {
    code: VALIDATION_CODES.PARTICIPANT_EMPTY_POLICY,
    name: 'Empty Participant Policy',
    description: 'Must define policy when participant resolution returns empty set',
    category: 'PARTICIPANT',
    severity: 'WARNING' as ValidationSeverity,
    enabledByDefault: true,
  },
  [VALIDATION_CODES.ASSIGNMENT_CARDINALITY_MODE]: {
    code: VALIDATION_CODES.ASSIGNMENT_CARDINALITY_MODE,
    name: 'Assignment Cardinality vs Mode',
    description: 'Assignment mode must be compatible with resolver cardinality',
    category: 'NODE_CONFIG',    severity: 'ERROR' as ValidationSeverity,
    enabledByDefault: true,
  },
  [VALIDATION_CODES.ASSIGNMENT_COMPLETION_POLICY]: {
    code: VALIDATION_CODES.ASSIGNMENT_COMPLETION_POLICY,
    name: 'Assignment Completion Policy',
    description: 'Completion policy must be valid for task type',
    category: 'NODE_CONFIG',    severity: 'ERROR' as ValidationSeverity,
    enabledByDefault: true,
  },
  [VALIDATION_CODES.ESCALATION_RESOLVER_VALID]: {
    code: VALIDATION_CODES.ESCALATION_RESOLVER_VALID,
    name: 'Escalation Resolver Valid',
    description: 'Escalation must have valid resolver configuration',
    category: 'NODE_CONFIG',    severity: 'ERROR' as ValidationSeverity,
    enabledByDefault: true,
  },
  [VALIDATION_CODES.ESCALATION_ACTION_VALID]: {
    code: VALIDATION_CODES.ESCALATION_ACTION_VALID,
    name: 'Escalation Action Valid',
    description: 'Escalation action must be valid',
    category: 'NODE_CONFIG',    severity: 'ERROR' as ValidationSeverity,
    enabledByDefault: true,
  },
  [VALIDATION_CODES.SECURITY_NO_SECRETS_IN_CONFIG]: {
    code: VALIDATION_CODES.SECURITY_NO_SECRETS_IN_CONFIG,
    name: 'No Secrets in Configuration',
    description: 'Credentials must be referenced, not stored inline',
    category: 'SECURITY',
    severity: 'ERROR' as ValidationSeverity,
    enabledByDefault: true,
  },
  [VALIDATION_CODES.SECURITY_CREDENTIAL_REF_ONLY]: {
    code: VALIDATION_CODES.SECURITY_CREDENTIAL_REF_ONLY,
    name: 'Credential Reference Only',
    description: 'Only credential references allowed in workflow definition',
    category: 'SECURITY',
    severity: 'ERROR' as ValidationSeverity,
    enabledByDefault: true,
  },
};

// Validation Rule Priorities (order of execution)
export const VALIDATION_RULE_PRIORITIES: Record<ValidationRuleCode, number> = {
  [VALIDATION_CODES.GRAPH_HAS_START]: 1,
  [VALIDATION_CODES.GRAPH_HAS_END]: 1,
  [VALIDATION_CODES.GRAPH_NO_CYCLES]: 1,
  [VALIDATION_CODES.GRAPH_ALL_REACHABLE]: 2,
  [VALIDATION_CODES.GRAPH_NO_DANGLING]: 1,
  [VALIDATION_CODES.NODE_CONFIG_COMPLETE]: 1,
  [VALIDATION_CODES.NODE_ASSIGNEE_VALID]: 1,
  [VALIDATION_CODES.NODE_FORM_VALID]: 1,
  [VALIDATION_CODES.NODE_SLA_VALID]: 1,
  [VALIDATION_CODES.NODE_INTEGRATION_VALID]: 1,
  [VALIDATION_CODES.CONN_HAS_SOURCE_PORT]: 1,
  [VALIDATION_CODES.CONN_HAS_TARGET]: 1,
  [VALIDATION_CODES.CONN_CONDITION_VALID]: 1,
  [VALIDATION_CODES.CONN_PRIORITY_UNIQUE]: 2,
  [VALIDATION_CODES.CONN_HAS_DEFAULT]: 1,
  [VALIDATION_CODES.TRIGGER_REQUIRED]: 1,
  [VALIDATION_CODES.TRIGGER_SCHEMA_VALID]: 1,
  [VALIDATION_CODES.TRIGGER_CONFIG_COMPLETE]: 1,
  [VALIDATION_CODES.SCHEMA_BINDING_EXISTS]: 1,
  [VALIDATION_CODES.SCHEMA_TYPE_COMPATIBLE]: 1,
  [VALIDATION_CODES.SCHEMA_NO_CIRCULAR]: 1,
  [VALIDATION_CODES.SCHEMA_NAMESPACE_IMMUTABLE]: 1,
  [VALIDATION_CODES.FORM_FIELD_ID_UNIQUE]: 1,
  [VALIDATION_CODES.FORM_OUTPUT_NO_CONFLICT]: 1,
  [VALIDATION_CODES.FORM_VALIDATION_VALID]: 1,
  [VALIDATION_CODES.CONDITION_PATH_EXISTS]: 1,
  [VALIDATION_CODES.CONDITION_OPERATOR_VALID]: 1,
  [VALIDATION_CODES.CONDITION_TYPE_COMPATIBLE]: 1,
  [VALIDATION_CODES.CONDITION_EXHAUSTIVE]: 1,
  [VALIDATION_CODES.INTEGRATION_CONNECTOR_EXISTS]: 1,
  [VALIDATION_CODES.INTEGRATION_ACTION_EXISTS]: 1,
  [VALIDATION_CODES.INTEGRATION_CREDENTIAL_VALID]: 1,
  [VALIDATION_CODES.INTEGRATION_INPUT_MAPPED]: 1,
  [VALIDATION_CODES.INTEGRATION_RETRY_VALID]: 1,
  [VALIDATION_CODES.PARTICIPANT_RESOLVER_VALID]: 1,
  [VALIDATION_CODES.PARTICIPANT_EMPTY_POLICY]: 1,
  [VALIDATION_CODES.ASSIGNMENT_CARDINALITY_MODE]: 1,
  [VALIDATION_CODES.ASSIGNMENT_COMPLETION_POLICY]: 1,
  [VALIDATION_CODES.ESCALATION_RESOLVER_VALID]: 1,
  [VALIDATION_CODES.ESCALATION_ACTION_VALID]: 1,
  [VALIDATION_CODES.SECURITY_NO_SECRETS_IN_CONFIG]: 1,
  [VALIDATION_CODES.SECURITY_CREDENTIAL_REF_ONLY]: 1,
};