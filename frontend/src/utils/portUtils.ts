/**
 * Port Utility Functions
 * Section 5.2, 5.3 - Port Model & Connection Rules
 */

import type { PortDefinition, PortKey, PortSemantic } from '../types/ports';
import { PORT_KEYS } from '../types/ports';
import type { NodeType, NodeDefinition } from '../types/workflow';
import { getNodePorts, DEFAULT_CONNECTION_RULES } from '../constants/nodePorts';

export function canConnectToPort(
  sourceNodeType: NodeType,
  sourcePortKey: PortKey,
  targetNodeType: NodeType,
  targetPortKey?: PortKey,
): boolean {
  const ruleKey = `${sourceNodeType.toLowerCase()}-${sourcePortKey}`;
  const rule = DEFAULT_CONNECTION_RULES[ruleKey] || DEFAULT_CONNECTION_RULES[sourceNodeType];

  if (!rule) return true;

  const isCompatibleTarget = rule.compatibleTargetNodes.includes(targetNodeType);
  const targetPorts = getNodePorts(targetNodeType);

  if (targetPortKey) {
    const targetPort = targetPorts.find((p: PortDefinition) => p.portKey === targetPortKey);
    return isCompatibleTarget && !!targetPort;
  }

  return isCompatibleTarget;
}

export function getValidTargetPorts(
  sourceNodeType: NodeType,
  sourcePortKey: PortKey,
  targetNodeType: NodeType,
): PortDefinition[] {
  if (!canConnectToPort(sourceNodeType, sourcePortKey, targetNodeType)) {
    return [];
  }
  return getNodePorts(targetNodeType);
}

export function getDefaultPort(nodeType: NodeType): PortDefinition | undefined {
  const ports = getNodePorts(nodeType);
  return ports.find((p: PortDefinition) => p.portKey === PORT_KEYS.COMPLETED || p.portKey === PORT_KEYS.SUCCESS);
}

export function validateConnectionData(
  sourceNodeType: NodeType,
  sourcePortKey: PortKey,
  targetNodeType: NodeType,
  targetPortKey: PortKey,
): { valid: boolean; errors: string[] } {
  const errors: string[] = [];
  if (!canConnectToPort(sourceNodeType, sourcePortKey, targetNodeType, targetPortKey)) {
    errors.push(`Cannot connect ${sourceNodeType}:${sourcePortKey} to ${targetNodeType}:${targetPortKey}`);
  }
  return { valid: errors.length === 0, errors };
}

export function isDefaultConnection(
  _sourceNodeType: NodeType,
  sourcePortKey: PortKey,
): boolean {
  return sourcePortKey === PORT_KEYS.DEFAULT;
}

export function getPortInfo(
  nodeType: NodeType,
  portKey: PortKey,
): PortDefinition | undefined {
  return getNodePorts(nodeType).find((p: PortDefinition) => p.portKey === portKey);
}

export function getPortColor(semantic: PortSemantic): string {
  const colors: Record<PortSemantic, string> = {
    SUCCESS: '#10B981',
    BUSINESS_OUTCOME: '#3B82F6',
    DECISION: '#8B5CF6',
    TEMPORAL: '#F59E0B',
    TECHNICAL: '#EF4444',
  };
  return colors[semantic] || '#6B7280';
}

export function getPortLabel(portKey: PortKey): string {
  const labels: Record<string, string> = {
    COMPLETED: 'Completed',
    SUCCESS: 'Success',
    APPROVED: 'Approved',
    REJECTED: 'Rejected',
    TRUE: 'True',
    FALSE: 'False',
    DEFAULT: 'Default',
    TIMEOUT: 'Timeout',
    ERROR: 'Error',
    EVENT_RECEIVED: 'Event Received',
  };
  return labels[portKey] || portKey;
}

export function isValidPathSegment(
  nodeType: NodeType,
  portKey: PortKey,
  _allNodes: NodeDefinition[],
  _allEdges: { id: string; sourceNodeId: string; sourcePort: string; targetNodeId: string }[],
): { valid: boolean; reason?: string } {
  const ports = getNodePorts(nodeType);
  const port = ports.find((p: PortDefinition) => p.portKey === portKey);

  if (!port) {
    return { valid: false, reason: `Port ${portKey} not found on node type ${nodeType}` };
  }

  return { valid: true };
}
