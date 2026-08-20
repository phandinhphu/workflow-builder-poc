/**
 * Port Model Types
 * Section 5.2 - Workflow Builder Detailed System Specification V2
 * 
 * Explicit port definitions for node routing semantics
 */

export type PortSemantic = 
  | 'SUCCESS'           // COMPLETED, SUCCESS
  | 'BUSINESS_OUTCOME'  // APPROVED, REJECTED, REVIEW_COMPLETED
  | 'DECISION'          // TRUE, FALSE, CASE:value, DEFAULT
  | 'TEMPORAL'          // TIMEOUT, TIMER_FIRED
  | 'TECHNICAL';        // ERROR, RETRY_EXHAUSTED

export interface PortDefinition {
  id: string;
  portKey: string;      // COMPLETED | APPROVED | REJECTED | TRUE | FALSE | TIMEOUT | ERROR | REQUEST_CHANGE
  semantic: PortSemantic;
  label: string;
  description?: string;
  color?: string;       // Visual indicator color
}

// Standard port keys used across node types
export const PORT_KEYS = {
  // Success/Completion
  COMPLETED: 'COMPLETED',
  SUCCESS: 'SUCCESS',
  
  // Business outcomes
  APPROVED: 'APPROVED',
  REJECTED: 'REJECTED',
  REQUEST_CHANGE: 'REQUEST_CHANGE',
  REVIEW_COMPLETED: 'REVIEW_COMPLETED',
  
  // Decisions
  TRUE: 'TRUE',
  FALSE: 'FALSE',
  DEFAULT: 'DEFAULT',
  
  // Temporal
  TIMEOUT: 'TIMEOUT',
  TIMER_FIRED: 'TIMER_FIRED',
  
  // Technical
  ERROR: 'ERROR',
  RETRY_EXHAUSTED: 'RETRY_EXHAUSTED',
  
  // Events
  EVENT_RECEIVED: 'EVENT_RECEIVED',
  
  // Parallel
  BRANCH_1: 'BRANCH_1',
  BRANCH_2: 'BRANCH_2',
  BRANCH_3: 'BRANCH_3',
  JOINED: 'JOINED',
} as const;

export type PortKey = typeof PORT_KEYS[keyof typeof PORT_KEYS];

// Port position for visual rendering
export type PortPosition = 'top' | 'right' | 'bottom' | 'left';

export interface VisualPort {
  id: string;
  portKey: PortKey;
  position: PortPosition;
  offsetX?: number;
  offsetY?: number;
  color: string;
  label?: string;
}

// Port compatibility rules
export interface PortCompatibilityRule {
  sourcePortKey: PortKey;
  compatibleTargetNodes: string[]; // Node type keys
  requiresCondition?: boolean;
}

// Port validation result
export interface PortValidationResult {
  isValid: boolean;
  errors: string[];
  warnings: string[];
}
