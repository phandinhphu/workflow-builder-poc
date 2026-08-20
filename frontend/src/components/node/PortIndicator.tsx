import type { PortDefinition, PortKey, PortSemantic } from '../../types/ports';
import { PORT_KEYS } from '../../types/ports';
import type { NodeType } from '../../types/workflow';
import { getNodePorts, getPortInfo } from '../../constants/nodePorts';

interface PortIndicatorProps {
  nodeType: NodeType;
  portKey: PortKey;
  isConnected: boolean;
  targetNodeType?: NodeType;
  onConnect?: (portKey: PortKey) => void;
  tooltip?: string;
}

interface UsePortIndicatorResult {
  portDefinitions: PortDefinition[];
  connected: boolean;
  semantic: PortSemantic;
  label: string;
  color: string;
  description: string;
  canConnect: boolean;
  validTargetPorts: PortDefinition[];
}

export function usePortIndicator(
  nodeType: NodeType,
  portKey: PortKey
): UsePortIndicatorResult {
  const portDefinitions = getNodePorts(nodeType);
  const portDef = portDefinitions.find((p: PortDefinition) => p.portKey === portKey);

  if (!portDef) {
    return {
      portDefinitions: [],
      connected: false,
      semantic: 'SUCCESS',
      label: portKey,
      color: '#6B7280',
      description: 'Port not found',
      canConnect: false,
      validTargetPorts: [],
    };
  }

  const info = getPortInfo(portDef.portKey);

  const canConnect = portDef.portKey !== PORT_KEYS.DEFAULT ||
    (portDef.portKey === PORT_KEYS.DEFAULT && portDefinitions.length > 1);

  const validTargetPorts: PortDefinition[] = [];
  const allTargetPorts = getNodePorts('APPROVAL');
  validTargetPorts.push(...allTargetPorts.filter((p: PortDefinition) => p.portKey !== PORT_KEYS.DEFAULT));

  return {
    portDefinitions,
    connected: false,
    semantic: portDef.semantic,
    label: portDef.label,
    color: portDef.color || info.color,
    description: portDef.description || info.description,
    canConnect,
    validTargetPorts,
  };
}

export const PortIndicator: React.FC<PortIndicatorProps> = ({
  nodeType,
  portKey,
  isConnected = false,
  tooltip: tooltipProp,
}) => {
  const result = usePortIndicator(nodeType, portKey);

  const hasOutgoingConnections = result.portDefinitions.length > 0;

  const tooltipContent = tooltipProp || `${result.label} - ${result.semantic} - ${result.description}`;

  if (!hasOutgoingConnections) {
    return null;
  }

  const portToDisplay = result.portDefinitions.find((p: PortDefinition) => p.portKey === portKey) ||
    result.portDefinitions[0];

  if (!portToDisplay) return null;

  return (
    <div
      className="relative group inline-block"
      style={{
        position: 'absolute',
        left: 0,
        top: 0,
        width: '100%',
        height: '100%',
        pointerEvents: 'none',
      }}
    >
      <div
        className="port-dot absolute inset-0 flex items-center justify-center z-10"
        style={{
          width: '12px',
          height: '12px',
          borderRadius: '50%',
          backgroundColor: result.color,
          border: '2px solid white',
          boxShadow: '0 0 4px rgba(0,0,0,0.3)',
          opacity: isConnected ? 1 : 0.8,
          transition: 'opacity 0.2s',
        }}
        title={tooltipContent}
        aria-label={result.label}
      />

      {hasOutgoingConnections && (
        <div
          className="port-label absolute bottom-1 left-1/2 -translate-x-1/2 text-xs font-medium text-white/80 opacity-0 group-hover:opacity-100 transition-opacity duration-200"
          style={{ whiteSpace: 'nowrap' }}
          title={tooltipContent}
          aria-label={result.label}
        >
          {result.label}
        </div>
      )}
    </div>
  );
};

export const PortGroup: React.FC<{
  nodeType: NodeType;
  side: 'top' | 'bottom' | 'left' | 'right';
  selectedPortKey?: PortKey;
  onPortSelect?: (portKey: PortKey) => void;
}> = ({
  nodeType,
  selectedPortKey,
  onPortSelect,
}) => {
  const ports = getNodePorts(nodeType);
  const visiblePorts = ports.filter(() => true);

  if (visiblePorts.length === 0) return null;

  return (
    <div className="flex flex-col items-center gap-1">
      {visiblePorts.map((port: PortDefinition) => (
        <PortIndicator
          key={port.id}
          nodeType={nodeType}
          portKey={port.portKey as PortKey}
          isConnected={selectedPortKey === port.portKey}
          onConnect={() => onPortSelect?.(port.portKey as PortKey)}
          tooltip={port.description}
        />
      ))}
    </div>
  );
};

export const NodePortsCanvas: React.FC<{
  nodeType: NodeType;
  selectedPortKey?: PortKey;
  onPortSelect?: (portKey: PortKey) => void;
  className?: string;
}> = ({
  nodeType,
  selectedPortKey,
  onPortSelect,
  className,
}) => {
  const ports = getNodePorts(nodeType);

  if (ports.length === 0) return null;

  return (
    <div
      className={`flow-node-ports ${className || ''} pointer-events-none`}
      style={{
        position: 'relative',
        width: '100%',
        height: '100%',
      }}
    >
      {ports.map((port: PortDefinition) => (
        <PortIndicator
          key={port.id}
          nodeType={nodeType}
          portKey={port.portKey as PortKey}
          isConnected={selectedPortKey === port.portKey}
          onConnect={() => onPortSelect?.(port.portKey as PortKey)}
        />
      ))}
    </div>
  );
};

export function usePortConnections(
  nodeId: string,
  portKey: PortKey,
  allEdges: { id: string; sourceNodeId: string; sourcePort: string; targetNodeId: string }[]
): boolean {
  return allEdges.some(
    edge => edge.targetNodeId === nodeId && edge.sourcePort === portKey
  );
}

export function useOutgoingConnections(
  nodeId: string,
  portKey: PortKey,
  allEdges: { id: string; sourceNodeId: string; sourcePort: string; targetNodeId: string }[]
): Array<{ id: string; targetNodeId: string; targetPortKey: string }> {
  return allEdges.filter(
    edge => edge.sourceNodeId === nodeId && edge.sourcePort === portKey
  ).map(edge => ({
    id: edge.id,
    targetNodeId: edge.targetNodeId,
    targetPortKey: edge.targetNodeId,
  }));
}
