/**
 * Validation Engine
 * Section 7.16, 10 - Comprehensive validation rules
 * Type-aware, cross-node, and schema validation
 */

import type { ValidationIssue, ValidationSeverity, ValidationCategory } from '../types/validation';
import { VALIDATION_CODES } from '../types/constants';
import type { NodeType, NodeDefinition, ConnectionDefinition, TriggerDefinition, WorkflowVariable } from '../types/workflow';
import { getNodePorts } from '../constants/nodePorts';

export interface WorkflowValidationInput {
  nodes: NodeDefinition[];
  edges: ConnectionDefinition[];
  trigger?: TriggerDefinition;
  variables: WorkflowVariable[];
  participantScope?: unknown;
  connectors?: Map<string, unknown>;
  credentials?: Map<string, unknown>;
}

let issueIdCounter = 0;
function createIssue(
  severity: ValidationSeverity,
  category: ValidationCategory,
  code: string,
  message: string,
  nodeId?: string,
  edgeId?: string,
  fieldPath?: string,
  suggestedFix?: string
): ValidationIssue {
  return {
    id: `val-${++issueIdCounter}`,
    severity,
    category,
    code,
    message,
    nodeId,
    edgeId,
    fieldPath,
    suggestedFix,
  };
}

export function validateWorkflow(input: WorkflowValidationInput): ValidationIssue[] {
  const issues: ValidationIssue[] = [];

  // 1. Graph validation
  issues.push(...validateGraph(input));

  // 2. Node config validation
  issues.push(...validateNodeConfigs(input));

  // 3. Connection validation
  issues.push(...validateConnections(input));

  // 4. Trigger validation
  issues.push(...validateTrigger(input));

  // 5. Schema/binding validation
  issues.push(...validateBindings(input));

  // 6. Condition validation
  issues.push(...validateConditions(input));

  return issues;
}

function validateGraph(input: WorkflowValidationInput): ValidationIssue[] {
  const issues: ValidationIssue[] = [];
  const { nodes, edges } = input;

  const startNodes = nodes.filter(n => n.type === 'START' as NodeType);
  const endNodes = nodes.filter(n => n.type === 'END' as NodeType);

  // GRAPH_HAS_START
  if (startNodes.length === 0) {
    issues.push(createIssue('ERROR', 'GRAPH', VALIDATION_CODES.GRAPH_HAS_START,
      'Workflow must have a Start node', undefined, undefined, undefined,
      'Add a Start node from the node library'));
  } else if (startNodes.length > 1) {
    issues.push(createIssue('WARNING', 'GRAPH', VALIDATION_CODES.GRAPH_HAS_START,
      `Workflow has ${startNodes.length} Start nodes. Only one is recommended.`, startNodes[0]?.id));
  }

  // GRAPH_HAS_END
  if (endNodes.length === 0) {
    issues.push(createIssue('ERROR', 'GRAPH', VALIDATION_CODES.GRAPH_HAS_END,
      'Workflow must have at least one End node', undefined, undefined, undefined,
      'Add an End node from the node library'));
  }

  // GRAPH_NO_DANGLING - connections reference valid nodes
  const nodeIds = new Set(nodes.map(n => n.id));
  for (const edge of edges) {
    if (!nodeIds.has(edge.sourceNodeId)) {
      issues.push(createIssue('ERROR', 'GRAPH', VALIDATION_CODES.GRAPH_NO_DANGLING,
        `Connection references non-existent source node: ${edge.sourceNodeId}`,
        undefined, edge.id));
    }
    if (!nodeIds.has(edge.targetNodeId)) {
      issues.push(createIssue('ERROR', 'GRAPH', VALIDATION_CODES.GRAPH_NO_DANGLING,
        `Connection references non-existent target node: ${edge.targetNodeId}`,
        undefined, edge.id));
    }
  }

  // GRAPH_NO_CYCLES - detect cycles via DFS
  const adjacencyMap = new Map<string, string[]>();
  for (const node of nodes) {
    adjacencyMap.set(node.id, []);
  }
  for (const edge of edges) {
    const targets = adjacencyMap.get(edge.sourceNodeId);
    if (targets) {
      targets.push(edge.targetNodeId);
    }
  }

  const visited = new Set<string>();
  const recursionStack = new Set<string>();

  function dfs(nodeId: string): boolean {
    visited.add(nodeId);
    recursionStack.add(nodeId);

    const neighbors = adjacencyMap.get(nodeId) || [];
    for (const neighbor of neighbors) {
      if (!visited.has(neighbor)) {
        if (dfs(neighbor)) return true;
      } else if (recursionStack.has(neighbor)) {
        return true;
      }
    }

    recursionStack.delete(nodeId);
    return false;
  }

  for (const node of nodes) {
    if (!visited.has(node.id)) {
      if (dfs(node.id)) {
        issues.push(createIssue('ERROR', 'GRAPH', VALIDATION_CODES.GRAPH_NO_CYCLES,
          'Workflow contains a cycle. Cycles are not supported unless explicitly allowed.',
          node.id, undefined, undefined,
          'Remove connections that create cycles or use a Timer node to break the loop'));
        break;
      }
    }
  }

  // GRAPH_ALL_REACHABLE
  if (startNodes.length > 0) {
    const reachable = new Set<string>();
    const queue = [startNodes[0].id];
    while (queue.length > 0) {
      const current = queue.shift()!;
      if (reachable.has(current)) continue;
      reachable.add(current);
      const neighbors = adjacencyMap.get(current) || [];
      for (const n of neighbors) {
        if (!reachable.has(n)) queue.push(n);
      }
    }

    for (const node of nodes) {
      if (!reachable.has(node.id) && node.type !== 'START') {
        issues.push(createIssue('WARNING', 'GRAPH', VALIDATION_CODES.GRAPH_ALL_REACHABLE,
          `Node "${node.name}" is not reachable from the Start node`,
          node.id, undefined, undefined,
          'Connect this node to the workflow or remove it'));
      }
    }
  }

  return issues;
}

function validateNodeConfigs(input: WorkflowValidationInput): ValidationIssue[] {
  const issues: ValidationIssue[] = [];
  const { nodes } = input;

  for (const node of nodes) {
    // NODE_CONFIG_COMPLETE
    if (!node.name || node.name.trim() === '') {
      issues.push(createIssue('ERROR', 'NODE_CONFIG', VALIDATION_CODES.NODE_CONFIG_COMPLETE,
        `Node has no name`, node.id, undefined, 'name'));
    }

    const config = node.config;

    // Node-specific validation
    switch (node.type) {
      case 'APPROVAL': {
        const cfg = config as Record<string, unknown>;
        if (!cfg.assigneeResolver) {
          issues.push(createIssue('ERROR', 'NODE_CONFIG', VALIDATION_CODES.NODE_ASSIGNEE_VALID,
            'Approval node requires an assignee resolver', node.id, undefined, 'assigneeResolver',
            'Configure an approver resolver'));
        }
        break;
      }
      case 'REVIEW': {
        const cfg = config as Record<string, unknown>;
        if (!cfg.assigneeResolver) {
          issues.push(createIssue('ERROR', 'NODE_CONFIG', VALIDATION_CODES.NODE_ASSIGNEE_VALID,
            'Review node requires an assignee resolver', node.id, undefined, 'assigneeResolver',
            'Configure a reviewer resolver'));
        }
        break;
      }
      case 'ASSIGNMENT': {
        const cfg = config as Record<string, unknown>;
        if (!cfg.assigneeResolver) {
          issues.push(createIssue('ERROR', 'NODE_CONFIG', VALIDATION_CODES.NODE_ASSIGNEE_VALID,
            'Assignment node requires an assignee resolver', node.id, undefined, 'assigneeResolver',
            'Configure an assignee resolver'));
        }
        break;
      }
      case 'NOTIFICATION': {
        const cfg = config as Record<string, unknown>;
        if (!cfg.channels || (cfg.channels as string[]).length === 0) {
          issues.push(createIssue('WARNING', 'NODE_CONFIG', VALIDATION_CODES.NODE_CONFIG_COMPLETE,
            'Notification node has no channels configured', node.id, undefined, 'channels'));
        }
        break;
      }
      case 'CONDITION': {
        const cfg = config as Record<string, unknown>;
        const hasStructuredRules = Array.isArray(cfg.rules) && cfg.rules.length > 0;
        if (!cfg.condition && !cfg.conditionExpression && !hasStructuredRules) {
          issues.push(createIssue('ERROR', 'NODE_CONFIG', VALIDATION_CODES.CONDITION_PATH_EXISTS,
            'Condition node has no condition expression or structured rules', node.id, undefined, 'condition',
            'Add condition rules or an expression'));
        }
        if (hasStructuredRules) {
          const rules = cfg.rules as Array<{ field?: string; operator?: string }>;
          rules.forEach((r, idx) => {
            if (!r.field || !r.field.trim()) {
              issues.push(createIssue('ERROR', 'NODE_CONFIG', VALIDATION_CODES.CONDITION_PATH_EXISTS,
                `Rule ${idx + 1} trong bước điều kiện chưa có tên trường`, node.id, undefined, `rules[${idx}].field`,
                'Nhập hoặc chọn tên trường cho điều kiện'));
            }
            if (!r.operator) {
              issues.push(createIssue('ERROR', 'NODE_CONFIG', VALIDATION_CODES.CONDITION_OPERATOR_VALID,
                `Rule ${idx + 1} trong bước điều kiện chưa có phép toán`, node.id, undefined, `rules[${idx}].operator`,
                'Chọn phép toán cho điều kiện'));
            }
          });
        }
        break;
      }
      case 'SYSTEM': {
        const cfg = config as Record<string, unknown>;
        if (!cfg.connectorId) {
          issues.push(createIssue('ERROR', 'NODE_CONFIG', VALIDATION_CODES.INTEGRATION_CONNECTOR_EXISTS,
            'System Action node has no connector configured', node.id, undefined, 'connectorId',
            'Select a connector'));
        }
        break;
      }
      case 'TIMER': {
        const cfg = config as Record<string, unknown>;
        if (!cfg.duration && !cfg.untilDateTime) {
          issues.push(createIssue('ERROR', 'NODE_CONFIG', VALIDATION_CODES.NODE_SLA_VALID,
            'Timer node has no duration or target datetime configured', node.id, undefined, undefined,
            'Configure timer duration or target datetime'));
        }
        break;
      }
      case 'PARALLEL_SPLIT': {
        const outgoingEdges = input.edges.filter(e => e.sourceNodeId === node.id);
        if (outgoingEdges.length < 2) {
          issues.push(createIssue('ERROR', 'NODE_CONFIG', VALIDATION_CODES.NODE_CONFIG_COMPLETE,
            'Parallel Split node must have at least 2 outgoing branches', node.id, undefined, undefined,
            'Add more outgoing connections'));
        }
        break;
      }
      case 'JOIN': {
        const incomingEdges = input.edges.filter(e => e.targetNodeId === node.id);
        if (incomingEdges.length < 2) {
          issues.push(createIssue('WARNING', 'NODE_CONFIG', VALIDATION_CODES.NODE_CONFIG_COMPLETE,
            'Join node should have at least 2 incoming branches', node.id, undefined, undefined,
            'Add more incoming connections from a Parallel Split'));
        }
        break;
      }
    }
  }

  return issues;
}

function validateConnections(input: WorkflowValidationInput): ValidationIssue[] {
  const issues: ValidationIssue[] = [];
  const { nodes, edges } = input;

  for (const edge of edges) {
    // CONN_HAS_SOURCE_PORT
    if (!edge.sourcePort) {
      issues.push(createIssue('ERROR', 'CONNECTION', VALIDATION_CODES.CONN_HAS_SOURCE_PORT,
        'Connection must reference a source port', edge.sourceNodeId, edge.id, 'sourcePort',
        'Select a source port'));
    }

    // CONN_HAS_TARGET
    if (!edge.targetNodeId) {
      issues.push(createIssue('ERROR', 'CONNECTION', VALIDATION_CODES.CONN_HAS_TARGET,
        'Connection must have a target node', edge.sourceNodeId, edge.id, 'targetNodeId',
        'Select a target node'));
    }

    // Port compatibility
    const sourceNode = nodes.find(n => n.id === edge.sourceNodeId);

    if (sourceNode && edge.sourcePort) {
      const sourcePorts = getNodePorts(sourceNode.type);
      const validPort = sourcePorts.find(p => p.portKey === edge.sourcePort);
      if (!validPort) {
        issues.push(createIssue('ERROR', 'CONNECTION', VALIDATION_CODES.CONN_HAS_SOURCE_PORT,
          `Source port "${edge.sourcePort}" is not valid for node type ${sourceNode.type}`,
          edge.sourceNodeId, edge.id, 'sourcePort'));
      }
    }
  }

  // CONN_HAS_DEFAULT - check if condition nodes have default routes
  const conditionNodes = nodes.filter(n => n.type === 'CONDITION');
  for (const condNode of conditionNodes) {
    const outgoingEdges = edges.filter(e => e.sourceNodeId === condNode.id);
    const hasDefault = outgoingEdges.some(e => e.isDefault);
    if (!hasDefault && outgoingEdges.length > 0) {
      issues.push(createIssue('WARNING', 'CONNECTION', VALIDATION_CODES.CONN_HAS_DEFAULT,
        'Condition node has no default/fallback route', condNode.id, undefined, undefined,
        'Add a default connection or ensure all conditions are exhaustive'));
    }
  }

  return issues;
}

function validateTrigger(input: WorkflowValidationInput): ValidationIssue[] {
  const issues: ValidationIssue[] = [];
  const { trigger } = input;

  // TRIGGER_REQUIRED
  if (!trigger) {
    issues.push(createIssue('ERROR', 'TRIGGER', VALIDATION_CODES.TRIGGER_REQUIRED,
      'Workflow must have a trigger defined', undefined, undefined, 'trigger',
      'Configure a trigger in Workflow Settings'));
    return issues;
  }

  // TRIGGER_CONFIG_COMPLETE
  if (!trigger.type) {
    issues.push(createIssue('ERROR', 'TRIGGER', VALIDATION_CODES.TRIGGER_CONFIG_COMPLETE,
      'Trigger must have a type configured', undefined, undefined, 'trigger.type'));
  }

  if (trigger.type === 'schedule') {
    const config = trigger.config as Record<string, unknown>;
    if (!config.cron && !config.frequency) {
      issues.push(createIssue('ERROR', 'TRIGGER', VALIDATION_CODES.TRIGGER_CONFIG_COMPLETE,
        'Schedule trigger must have a cron expression or frequency configured',
        undefined, undefined, 'trigger.config.cron'));
    }
  }

  return issues;
}

function validateBindings(input: WorkflowValidationInput): ValidationIssue[] {
  const issues: ValidationIssue[] = [];
  const { nodes, variables } = input;

  const knownPaths = new Set<string>();
  knownPaths.add('trigger.');
  knownPaths.add('variables.');
  knownPaths.add('participant.');
  knownPaths.add('instance.');
  knownPaths.add('nodes.');

  for (const v of variables) {
    knownPaths.add(`variables.${v.key}`);
  }

  // Check all node config for reference bindings
  for (const node of nodes) {
    const config = node.config as Record<string, unknown>;
    if (config.expression && typeof config.expression === 'string') {
      const refs = config.expression.match(/\$\{([^}]+)\}/g);
      if (refs) {
        for (const ref of refs) {
          const path = ref.replace(/\$\{|\}/g, '');
          if (!Array.from(knownPaths).some(kp => path.startsWith(kp))) {
            issues.push(createIssue('WARNING', 'SCHEMA', VALIDATION_CODES.SCHEMA_BINDING_EXISTS,
              `Binding reference "${path}" may not exist in the workflow context`,
              node.id, undefined, 'expression'));
          }
        }
      }
    }
  }

  return issues;
}


function validateConditions(input: WorkflowValidationInput): ValidationIssue[] {
  const issues: ValidationIssue[] = [];
  const { nodes } = input;

  for (const node of nodes) {
    if (node.type === 'CONDITION') {
      const config = node.config as Record<string, unknown>;
      const conditionExpression = (config.condition || config.conditionExpression) as string;

      if (conditionExpression) {
        // CONDITION_PATH_EXISTS - basic check
        const refs = conditionExpression.match(/\$\{([^}]+)\}/g);
        if (refs) {
          for (const ref of refs) {
            const path = ref.replace(/\$\{|\}/g, '');
            issues.push(createIssue('INFO', 'CONDITION', VALIDATION_CODES.CONDITION_PATH_EXISTS,
              `Verify that path "${path}" exists in context`, node.id, undefined, 'condition'));
          }
        }
      }
    }
  }

  return issues;
}

export function getValidationSummary(issues: ValidationIssue[]): {
  total: number;
  errors: number;
  warnings: number;
  infos: number;
  isValid: boolean;
} {
  const errors = issues.filter(i => i.severity === 'ERROR').length;
  const warnings = issues.filter(i => i.severity === 'WARNING').length;
  const infos = issues.filter(i => i.severity === 'INFO').length;

  return {
    total: issues.length,
    errors,
    warnings,
    infos,
    isValid: errors === 0,
  };
}

export function groupIssuesByCategory(issues: ValidationIssue[]): Map<ValidationCategory, ValidationIssue[]> {
  const map = new Map<ValidationCategory, ValidationIssue[]>();
  for (const issue of issues) {
    const group = map.get(issue.category) || [];
    group.push(issue);
    map.set(issue.category, group);
  }
  return map;
}
