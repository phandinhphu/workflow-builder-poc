/**
 * Connector & Action Registry Types
 * Section 7.9, 7.15 - System Action & Integration
 * 
 * Connector abstraction layer for system integration
 */

import type { JSONSchema } from './schema';
import type { ValueBinding } from './workflow';

export type ConnectorType = 
  | 'HTTP'
  | 'DATABASE'
  | 'EMAIL'
  | 'STORAGE'
  | 'MESSAGING'
  | 'CUSTOM';

export type AuthenticationType =
  | 'NONE'
  | 'API_KEY'
  | 'BEARER_TOKEN'
  | 'BASIC_AUTH'
  | 'OAUTH2'
  | 'CUSTOM';

export interface ConnectorDefinition {
  id: string;
  name: string;
  type: ConnectorType;
  description: string;
  version: string;
  icon?: string;
  color?: string;
  configSchema: JSONSchema;
  authType: AuthenticationType;
  actions: ActionDefinition[];
  enabled: boolean;
  createdAt: string;
  updatedAt: string;
  createdBy: string;
}

export interface ActionDefinition {
  id: string;
  connectorId: string;
  name: string;
  actionKey: string;
  description: string;
  inputSchema: JSONSchema;
  outputSchema: JSONSchema;
  retryable: boolean;
  idempotent: boolean;
  sideEffects: 'READ_ONLY' | 'WRITE' | 'DELETE';
  timeoutMs?: number;
  examples?: ActionExample[];
}

export interface ActionExample {
  name: string;
  description: string;
  input: Record<string, unknown>;
  expectedOutput: Record<string, unknown>;
}

// Connector Instance (configured connector)
export interface ConnectorInstance {
  id: string;
  connectorId: string;
  name: string;
  config: Record<string, unknown>;
  credentialId?: string;
  enabled: boolean;
  lastTestedAt?: string;
  lastTestResult?: 'SUCCESS' | 'FAILED';
  createdAt: string;
}

// Retry Policy
export type BackoffStrategy = 'FIXED' | 'EXPONENTIAL' | 'LINEAR';

export interface RetryPolicy {
  maxAttempts: number;
  backoffStrategy: BackoffStrategy;
  backoffDelayMs: number;
  backoffMultiplier?: number; // For exponential
  retryableErrors: string[]; // Error codes or patterns
  retryableHttpCodes?: number[]; // For HTTP connectors
}

// Success Condition
export interface SuccessCondition {
  type: 'HTTP_STATUS' | 'FIELD_VALUE' | 'EXPRESSION';
  httpStatuses?: number[]; // For HTTP: [200, 201]
  fieldPath?: string; // For field check: response.success
  expectedValue?: unknown;
  expression?: string; // For complex: ${response.code} == 0
}

// System Action Configuration (enhanced)
export interface SystemActionConfig {
  connectorId: string;
  connectorInstanceId?: string; // If using configured instance
  actionId: string;
  inputBindings: Record<string, ValueBinding>;
  credentialRef?: string;
  successCondition?: SuccessCondition;
  outputMapping: Record<string, string>; // output.field -> context.path
  retryPolicy: RetryPolicy;
  idempotencyKeyResolver?: ValueBinding;
  errorRoute: 'FAIL' | 'ROUTE_ERROR' | 'IGNORE';
  timeoutMs?: number;
}

// Pre-built connectors
export const BUILTIN_CONNECTORS = {
  HTTP_REQUEST: 'builtin-http',
  DATABASE_QUERY: 'builtin-database',
  SEND_EMAIL: 'builtin-email',
  CREATE_RECORD: 'builtin-create-record',
  UPDATE_RECORD: 'builtin-update-record',
  DELETE_RECORD: 'builtin-delete-record',
  FILE_STORAGE: 'builtin-storage',
  SEND_MESSAGE: 'builtin-messaging',
} as const;
