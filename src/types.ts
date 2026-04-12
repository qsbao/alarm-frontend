export interface User {
  id: string;
  name: string;
  department: string;
}

export type RiskLevel = 'Low' | 'Medium' | 'High' | 'Critical';
export type IssueStatus = 'Triage' | 'Investigating' | 'Resolved' | 'Closed' | 'Merged';
export type AlarmType =
  | 'TempSpike'
  | 'PressureDrop'
  | 'FlowAnomaly'
  | 'ChamberLeak'
  | 'VoltageSag'
  | 'ParticleCount'
  | 'VacuumFault'
  | 'RFMismatch'
  | 'GasFlowDeviation'
  | 'EndpointDrift';

export type AlarmStatus = 'Open' | 'Acked';
export type HumanRisk = 'high' | 'middle' | 'low';
export type AlarmLabel =
  | 'FalsePositive'
  | 'Recurring'
  | 'LotImpacting'
  | 'NeedsEngReview'
  | 'UnderObservation';

export type AlarmActivityType =
  | 'created'
  | 'acked'
  | 'acked_via_issue'
  | 'recovered'
  | 'linked'
  | 'unlinked'
  | 'label_added'
  | 'label_removed'
  | 'risk_changed'
  | 'moved_between_issues'
  | 'merged_to_issue';

export interface AlarmActivityEntry {
  id: string;
  type: AlarmActivityType;
  timestamp: string; // ISO 8601
  author: string;
  note?: string;
  label?: AlarmLabel;
  fromRisk?: HumanRisk;
  toRisk?: HumanRisk;
  issueId?: string;
  fromIssueId?: string;
  toIssueId?: string;
}

export interface Alarm {
  id: string; // "alm-001"
  // Immutable 4W block
  type: AlarmType;
  severity: RiskLevel;
  message: string;
  value?: number;
  unit?: string;
  time: string; // ISO 8601 — When
  recoveryTime?: string; // ISO 8601 — once set, immutable
  machineId: string; // Where — "LITHO-07"
  chamberId?: string;
  product: string; // Where context
  operation: string; // Where context
  owner: string; // Who — set at fire-time, immutable
  department: string; // Who — set at fire-time, immutable
  chartOwnerId?: string; // UserId — engineer responsible for the SPC chart
  // Mutable triage layer
  status: AlarmStatus;
  humanRisk?: HumanRisk;
  labels: AlarmLabel[];
  activity: AlarmActivityEntry[];
}

export type ActivityType =
  | 'created'
  | 'assignment'
  | 'comment'
  | 'alarm_linked'
  | 'alarm_unlinked'
  | 'alarm_moved_in'
  | 'alarm_moved_out'
  | 'alarms_merged_in'
  | 'alarms_merged_out'
  | 'workflow_transition'
  | 'blocker_added'
  | 'blocker_removed';

export interface ActivityEntry {
  id: string;
  type: ActivityType;
  timestamp: string; // ISO 8601
  author: string;
  assignedTo?: string;
  text?: string;
  alarmId?: string;
  // workflow_transition fields
  workflowDefinitionId?: string;
  workflowStepId?: string;
  workflowAction?: string; // 'attach' | 'complete'
  workflowActorId?: string;
  // blocker fields
  blockerIssueId?: string;
  // move / merge fields
  fromIssueId?: string;
  toIssueId?: string;
  alarmIds?: string[];
}

export interface Issue {
  id: string; // "iss-001"
  title: string;
  date: string; // ISO 8601 — creation date (table column "date")
  alarmType: AlarmType; // table column "alarm_type"
  riskLevel: RiskLevel;
  status: IssueStatus;
  // context columns
  issueTime: string; // when it physically happened
  operation: string; // e.g. "Wafer transfer"
  // dimension columns
  product: string; // e.g. "A7-Litho"
  ownerId: string; // UserId — e.g. "user-tanaka"
  department: string; // e.g. "Litho"
  // detail-only fields
  description: string;
  activity: ActivityEntry[]; // ascending; render reversed
  workflow?: import('./lib/workflows/types').WorkflowInstance;
}

export const ALL_ALARM_STATUSES: AlarmStatus[] = ['Open', 'Acked'];
export const ALL_HUMAN_RISKS: HumanRisk[] = ['high', 'middle', 'low'];
export const ALL_ALARM_LABELS: AlarmLabel[] = [
  'FalsePositive',
  'Recurring',
  'LotImpacting',
  'NeedsEngReview',
  'UnderObservation',
];

export const ALL_RISK_LEVELS: RiskLevel[] = ['Low', 'Medium', 'High', 'Critical'];
export const ALL_ISSUE_STATUSES: IssueStatus[] = ['Triage', 'Investigating', 'Resolved', 'Closed', 'Merged'];
export const ALL_ALARM_TYPES: AlarmType[] = [
  'TempSpike',
  'PressureDrop',
  'FlowAnomaly',
  'ChamberLeak',
  'VoltageSag',
  'ParticleCount',
  'VacuumFault',
  'RFMismatch',
  'GasFlowDeviation',
  'EndpointDrift',
];

export type AlarmSortKey = 'time' | 'severity' | 'type' | 'department';

export interface AlarmFilters {
  search?: string;
  status?: AlarmStatus[];
  department?: string[];
  severity?: RiskLevel[];
  humanRisk?: HumanRisk[];
  alarmType?: AlarmType[];
  owner?: string[];
  machineId?: string[];
  chamberId?: string[];
  product?: string[];
  operation?: string[];
  labels?: AlarmLabel[];
  active?: 'active' | 'recovered';
}
