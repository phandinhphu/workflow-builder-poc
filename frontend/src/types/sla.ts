/**
 * SLA & Escalation Types
 * Section 7.14 - Service Level Agreement Configuration
 */

import type { ResolverDefinition } from './resolution';

export type DurationUnit = 'MINUTES' | 'HOURS' | 'DAYS' | 'BUSINESS_DAYS' | 'WORK_HOURS';

export interface SlaConfig {
  id: string;
  name: string;
  dueDuration: number;
  durationUnit: DurationUnit;
  timezone?: string;
  calendarId?: string; // Business calendar
  reminder?: SlaReminder;
  escalation?: SlaEscalation;
  timeoutAction: SlaTimeoutAction;
  pauseOnSuspend?: boolean;
  resumeOnResume?: boolean;
  metadata?: Record<string, unknown>;
}

export interface SlaReminder {
  enabled: boolean;
  beforeDuration: number;
  beforeUnit: DurationUnit;
  messageTemplate: string;
  channels: ('email' | 'inapp' | 'teams')[];
  recipientResolver?: ResolverDefinition;
}

export type SlaEscalationAction = 'REASSIGN' | 'ADD_WATCHER' | 'NOTIFY' | 'AUTO_REJECT' | 'AUTO_COMPLETE';

export interface SlaEscalation {
  enabled: boolean;
  triggerAfter: number;
  triggerUnit: DurationUnit;
  action: SlaEscalationAction;
  escalationResolver?: ResolverDefinition;
  escalationMessage?: string;
  reassignTo?: ResolverDefinition;
  addWatcherTo?: ResolverDefinition;
  notifyChannels?: ('email' | 'inapp' | 'teams')[];
  notifyRecipientResolver?: ResolverDefinition;
}

export type SlaTimeoutAction = 
  | 'AUTO_REJECT'
  | 'AUTO_COMPLETE' 
  | 'ROUTE_TIMEOUT' 
  | 'FAIL';

export interface SlaEvaluationResult {
  isOverdue: boolean;
  timeRemaining: number;
  dueAt: string;
  remainingDuration: number;
  status: 'ON_TIME' | 'WARNING' | 'OVERDUE';
  timeOfEvaluation: string;
}

export interface EscalationTimelineEntry {
  id: string;
  slaId: string;
  escalationTime: string;
  actionTaken: SlaEscalationAction;
  triggeredBy?: string;
  status: 'PENDING' | 'TRIGGERED' | 'COMPLETED';
  metadata?: Record<string, unknown>;
}

// SLA Configuration in Node Config
export interface NodeSlaConfig {
  enabled: boolean;
  slaId?: string;
  dueDuration?: number;
  durationUnit?: DurationUnit;
  reminders?: SlaReminder[];
  escalation?: SlaEscalation;
  timeoutAction?: SlaTimeoutAction;
}

// Working Calendar
export type BusinessDay = 'MONDAY' | 'TUESDAY' | 'WEDNESDAY' | 'THURSDAY' | 'FRIDAY';

export type HolidayRule = {
  type: 'FIXED_DATE' | 'RECURRING' | 'NEAREST_WEEKDAY';
  month?: number;
  day?: number;
  monthDay?: { month: number; day: number };
  rule?: string;
};

export interface BusinessCalendar {
  name: string;
  timezone: string;
  holidays: string[]; // ISO date strings
  recurringHolidays?: HolidayRule[];
  workingDays: BusinessDay[];
  workingHours: {
    start: string; // HH:MM
    end: string; // HH:MM
    timezone: string;
  };
}