/**
 * Schema Store Types
 * Section 7.5 - Context Schema Management
 *
 * Central schema registry for workflow context
 */

import type { JSONSchema, JSONSchemaType } from './schema';
import type { SchemaManifest, ContextPathInfo, SchemaField } from './schema';

export interface SchemaValidationError {
  path: string;
  message: string;
  severity: 'error' | 'warning';
}

export interface SchemaRegistryState {
  manifest: SchemaManifest;
  flatPaths: ContextPathInfo[];
  loadedPaths: Set<string>; // Cached loaded paths
  lastUpdated: string;
  error?: string;
}

export interface SchemaLoadResult {
  success: boolean;
  schema: JSONSchema;
  fields: SchemaField[];
  errors: string[];
}

export interface SchemaValidationResult {
  valid: boolean;
  errors: SchemaValidationError[];
  warnings: string[];
}

export interface SchemaBinding {
  source: 'trigger' | 'variable' | 'node' | 'participant' | 'instance';
  sourceId?: string; // nodeId, variable key, etc.
  path: string; // e.g., 'trigger.body.amount', 'variables.total'
  type: JSONSchemaType;
  required: boolean;
}

export interface SchemaPathResolution {
  path: string;
  resolvedValue: unknown;
  resolvedType: JSONSchemaType;
  nodeId?: string;
  variableKey?: string;
  success: boolean;
  error?: string;
}

export interface SchemaConflict {
  path: string;
  conflictingNodes: string[];
  conflictingVariableKeys: string[];
  resolution: 'FIRST_WRITES' | 'LAST_WRITES' | 'EXPRESSION' | 'ERROR';
}

export interface SchemaVersionInfo {
  version: string;
  manifest: SchemaManifest;
  createdAt: string;
  description?: string;
}

export interface SchemaEditorState {
  currentSchema: JSONSchema | null;
  editingPath: string | null;
  isDirty: boolean;
  validationErrors: string[];
  previewValue?: unknown;
}

// Schema Builder Actions
export type SchemaBuilderAction =
  | { type: 'LOAD_MANIFEST'; manifest: SchemaManifest }
  | { type: 'UPDATE_SCHEMA'; schema: JSONSchema }
  | { type: 'ADD_FIELD'; path: string; field: SchemaField }
  | { type: 'REMOVE_FIELD'; path: string }
  | { type: 'UPDATE_FIELD'; path: string; field: Partial<SchemaField> }
  | { type: 'VALIDATE'; path?: string }
  | { type: 'SET_DIRTY'; isDirty: boolean }
  | { type: 'CLEAR_ERRORS' }
  | { type: 'SET_PREVIEW'; value: unknown };

// Schema Export/Import
export interface SchemaExport {
  manifest: SchemaManifest;
  schemas: Record<string, JSONSchema>; // nodeId -> schema
  variables: Record<string, JSONSchema>;
  exportTime: string;
  version: string;
}

export interface SchemaImportResult {
  success: boolean;
  mergedManifest: SchemaManifest;
  conflicts: SchemaConflict[];
  errors: string[];
  warnings: string[];
}