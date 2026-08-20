/**
 * Schema Store
 * Section 7.5 - Context Schema Management
 * Central schema registry for workflow context
 */

import { create } from 'zustand';
import type { JSONSchema, JSONSchemaType, SchemaManifest, ContextPathInfo } from '../types/schema';
import type { NodeDefinition, WorkflowVariable, TriggerDefinition, ParticipantScope } from '../types/workflow';

interface SchemaState {
  manifest: SchemaManifest;
  flatPaths: ContextPathInfo[];
  isDirty: boolean;
  lastUpdated: string;

  rebuildManifest: (args: {
    trigger?: TriggerDefinition;
    variables: WorkflowVariable[];
    nodes: NodeDefinition[];
    participantScope?: ParticipantScope;
  }) => void;
  getPathInfo: (path: string) => ContextPathInfo | undefined;
  validateBinding: (sourcePath: string, targetType: JSONSchemaType) => { valid: boolean; reason?: string };
  getSchemaForNode: (nodeId: string) => JSONSchema | undefined;
  getTriggerSchema: () => JSONSchema;
  getVariableSchema: (key: string) => JSONSchema | undefined;
}

function buildTriggerSchema(trigger?: TriggerDefinition): JSONSchema {
  if (!trigger) {
    return { type: 'object', properties: {}, required: [] };
  }

  const properties: Record<string, JSONSchema> = {};

  if (trigger.config && typeof trigger.config === 'object') {
    const cfg = trigger.config as Record<string, unknown>;
    if (cfg.fields && Array.isArray(cfg.fields)) {
      for (const field of cfg.fields as Array<Record<string, unknown>>) {
        if (field.name && field.type) {
          properties[field.name as string] = {
            type: (field.type as JSONSchemaType) || 'string',
            description: field.label as string,
          };
        }
      }
    }
  }

  // Always include standard trigger fields
  properties.requesterId = { type: 'string', description: 'User ID who triggered the workflow' };
  properties.timestamp = { type: 'string', format: 'date-time', description: 'Trigger timestamp' };

  return { type: 'object', properties, required: ['requesterId'] };
}

function buildVariableSchema(variables: WorkflowVariable[]): Record<string, JSONSchema> {
  const schemas: Record<string, JSONSchema> = {};

  for (const v of variables) {
    const typeMap: Record<string, JSONSchemaType> = {
      'STRING': 'string',
      'NUMBER': 'number',
      'BOOLEAN': 'boolean',
      'DATE': 'string',
      'OBJECT': 'object',
      'ARRAY': 'array',
      'LIST': 'array',
    };

    schemas[v.key] = {
      type: typeMap[v.dataType] || 'string',
      description: v.description,
      default: v.defaultValue?.kind === 'CONSTANT' ? v.defaultValue.value : undefined,
    };
  }

  return schemas;
}

function buildNodeOutputSchemas(nodes: NodeDefinition[]): Record<string, JSONSchema> {
  const schemas: Record<string, JSONSchema> = {};

  for (const node of nodes) {
    const nodeSchema: Record<string, JSONSchema> = {};

    switch (node.type) {
      case 'APPROVAL':
        nodeSchema.decision = { type: 'string', enum: ['APPROVED', 'REJECTED', 'REQUEST_CHANGE'] };
        nodeSchema.comment = { type: 'string' };
        break;
      case 'REVIEW':
        nodeSchema.result = { type: 'string', enum: ['COMPLETED', 'RETURNED'] };
        nodeSchema.comment = { type: 'string' };
        break;
      case 'ASSIGNMENT':
        nodeSchema.result = { type: 'string' };
        nodeSchema.formData = { type: 'object' };
        break;
      case 'SYSTEM':
        nodeSchema.response = { type: 'object' };
        nodeSchema.statusCode = { type: 'number' };
        break;
      case 'CONDITION':
        nodeSchema.evaluationResult = { type: 'boolean' };
        break;
      case 'TIMER':
        nodeSchema.firedAt = { type: 'string', format: 'date-time' };
        break;
      case 'DATA_TRANSFORM':
        nodeSchema.transformedData = { type: 'object' };
        break;
      default:
        nodeSchema.output = { type: 'object' };
    }

    schemas[node.id] = { type: 'object', properties: nodeSchema };
  }

  return schemas;
}

function buildParticipantSchema(scope?: ParticipantScope): JSONSchema {
  if (!scope || !scope.enabled) {
    return { type: 'object', properties: {} };
  }

  return {
    type: 'object',
    properties: {
      id: { type: 'string', description: 'Participant ID' },
      userId: { type: 'string', description: 'User ID' },
      displayName: { type: 'string' },
      email: { type: 'string', format: 'email' },
      department: { type: 'string' },
      role: { type: 'string' },
      managerId: { type: 'string' },
    },
  };
}

function flattenSchemaPaths(
  schema: JSONSchema,
  prefix: string,
  source: ContextPathInfo['source']
): ContextPathInfo[] {
  const paths: ContextPathInfo[] = [];

  if (schema.type === 'object' && schema.properties) {
    for (const [key, propSchema] of Object.entries(schema.properties)) {
      const fullPath = prefix ? `${prefix}.${key}` : key;
      paths.push({
        path: fullPath,
        type: propSchema.type as JSONSchemaType,
        required: schema.required?.includes(key) || false,
        description: propSchema.description as string,
        source,
        format: propSchema.format as string,
        enum: propSchema.enum as unknown[],
      });

      if (propSchema.type === 'object' && propSchema.properties) {
        paths.push(...flattenSchemaPaths(propSchema, fullPath, source));
      }
    }
  }

  return paths;
}

export const useSchemaStore = create<SchemaState>()((set, get) => ({
  manifest: {
    trigger: { type: 'object', properties: {} },
    variables: {},
    nodes: {},
    participant: undefined,
  },
  flatPaths: [],
  isDirty: false,
  lastUpdated: new Date().toISOString(),

  rebuildManifest: ({ trigger, variables, nodes, participantScope }) => {
    const triggerSchema = buildTriggerSchema(trigger);
    const variableSchemas = buildVariableSchema(variables);
    const nodeSchemas = buildNodeOutputSchemas(nodes);
    const participantSchema = buildParticipantSchema(participantScope);

    const manifest: SchemaManifest = {
      trigger: triggerSchema,
      variables: variableSchemas,
      nodes: nodeSchemas,
      participant: participantSchema,
    };

    // Flatten all paths
    const paths: ContextPathInfo[] = [];
    paths.push(...flattenSchemaPaths(triggerSchema, 'trigger', 'trigger'));
    paths.push(...flattenSchemaPaths(participantSchema, 'participant', 'participant'));

    for (const [key, schema] of Object.entries(variableSchemas)) {
      paths.push({
        path: `variables.${key}`,
        type: schema.type as JSONSchemaType,
        required: false,
        description: schema.description as string,
        source: 'variable',
      });
    }

    for (const [nodeId, schema] of Object.entries(nodeSchemas)) {
      paths.push(...flattenSchemaPaths(schema, `nodes.${nodeId}.output`, 'node'));
    }

    set({ manifest, flatPaths: paths, isDirty: false, lastUpdated: new Date().toISOString() });
  },

  getPathInfo: (path: string) => {
    return get().flatPaths.find(p => p.path === path);
  },

  validateBinding: (sourcePath: string, targetType: JSONSchemaType) => {
    const pathInfo = get().getPathInfo(sourcePath);
    if (!pathInfo) {
      return { valid: false, reason: `Path "${sourcePath}" not found in workflow context` };
    }

    const typeCompatibilityMap: Record<string, JSONSchemaType[]> = {
      string: ['string'],
      number: ['number', 'integer'],
      boolean: ['boolean'],
      object: ['object'],
      array: ['array'],
      integer: ['integer', 'number'],
      null: ['null'],
    };

    const compatible = typeCompatibilityMap[targetType] || [targetType];
    if (compatible.includes(pathInfo.type)) {
      return { valid: true };
    }

    return {
      valid: false,
      reason: `Type mismatch: source is "${pathInfo.type}", target expects "${targetType}"`,
    };
  },

  getSchemaForNode: (nodeId: string) => {
    return get().manifest.nodes[nodeId];
  },

  getTriggerSchema: () => {
    return get().manifest.trigger;
  },

  getVariableSchema: (key: string) => {
    return get().manifest.variables[key];
  },
}));
