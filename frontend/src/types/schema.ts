/**
 * JSON Schema Types for Workflow Builder
 * Section 7.5 - Context Schema Management
 * 
 * Type-aware schema definitions for validation and binding
 */

export type JSONSchemaType = 
  | 'string' 
  | 'number' 
  | 'integer'
  | 'boolean' 
  | 'object' 
  | 'array' 
  | 'null';

export interface JSONSchema {
  type: JSONSchemaType | JSONSchemaType[];
  title?: string;
  description?: string;
  
  // String validation
  minLength?: number;
  maxLength?: number;
  pattern?: string;
  format?: 'date' | 'date-time' | 'time' | 'email' | 'uri' | 'uuid' | 'ipv4' | 'ipv6';
  
  // Number validation
  minimum?: number;
  maximum?: number;
  exclusiveMinimum?: number;
  exclusiveMaximum?: number;
  multipleOf?: number;
  
  // Object validation
  properties?: Record<string, JSONSchema>;
  required?: string[];
  additionalProperties?: boolean | JSONSchema;
  minProperties?: number;
  maxProperties?: number;
  
  // Array validation
  items?: JSONSchema | JSONSchema[];
  minItems?: number;
  maxItems?: number;
  uniqueItems?: boolean;
  
  // Enum
  enum?: unknown[];
  const?: unknown;
  
  // Composition
  allOf?: JSONSchema[];
  anyOf?: JSONSchema[];
  oneOf?: JSONSchema[];
  not?: JSONSchema;
  
  // Default
  default?: unknown;
  
  // Custom extensions
  'x-display'?: string;
  'x-readonly'?: boolean;
  'x-hidden'?: boolean;
  'x-order'?: number;
  
  [key: string]: unknown;
}

// Schema Manifest - known context schema for workflow
export interface SchemaManifest {
  trigger: JSONSchema;
  variables: Record<string, JSONSchema>;
  nodes: Record<string, JSONSchema>; // nodeId -> output schema
  participant?: JSONSchema;
  instance?: JSONSchema;
}

// Schema Field Definition (simplified representation)
export interface SchemaField {
  name: string;
  path: string;
  type: JSONSchemaType;
  required: boolean;
  description?: string;
  format?: string;
  enum?: unknown[];
  children?: SchemaField[]; // For nested objects
}

// Schema Builder Result
export interface SchemaBuilderResult {
  schema: JSONSchema;
  fields: SchemaField[];
  errors: string[];
}

// Type Compatibility Check
export interface TypeCompatibility {
  isCompatible: boolean;
  sourceType: JSONSchemaType;
  targetType: JSONSchemaType;
  conversionNeeded: boolean;
  conversionFunction?: string;
}

// Schema Validation Error
export interface SchemaValidationError {
  path: string;
  keyword: string;
  message: string;
  params?: Record<string, unknown>;
}

// Context Path Info
export interface ContextPathInfo {
  path: string;
  type: JSONSchemaType;
  required: boolean;
  description?: string;
  source: 'trigger' | 'variable' | 'node' | 'participant' | 'instance';
  nodeId?: string;
  format?: string;
  enum?: unknown[];
}

// Schema Registry
export interface SchemaRegistry {
  manifest: SchemaManifest;
  flatPaths: ContextPathInfo[];
  lastUpdated: string;
}
