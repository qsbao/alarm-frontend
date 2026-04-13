export interface User {
  id: string;
  name: string;
  department: string;
}

export type RiskLevel = 'P0' | 'P1' | 'P2' | 'P3';
export type IssueStatus = 'Triage' | 'Investigating' | 'Resolved' | 'Closed' | 'Merged';
export type AlarmType =
  | 'spc_ooc'
  | 'TempSpike'
  | 'ChamberLeak';

export type ChartLevel = 'KIP' | 'ACP';

export interface SpcOocDetails {
  kind: 'spc_ooc';
  chartName: string;
  chartNo: string;
  chartLevel: ChartLevel;
  holdCode: string;
  txDatetime: string; // ISO 8601
  waferCount: number;
  oocCount: number;
}

export interface TempSpikeDetails {
  kind: 'TempSpike';
  currentTemp: number;
  thresholdTemp: number;
  sensorId: string;
  spikeStartTime: string; // ISO 8601
  durationSeconds: number;
}

export type AlarmDetails = SpcOocDetails | TempSpikeDetails;

export type AlarmStatus = 'Open' | 'Acked';
export type HumanRisk = 'high' | 'middle' | 'low';
export type AlarmLabel =
  | 'FalsePositive'
  | 'Recurring'
  | 'LotImpacting'
  | 'NeedsEngReview'
  | 'UnderObservation';

export type Module =
  | 'LITHO'
  | 'ETCH'
  | 'CVD'
  | 'PVD'
  | 'DIFFUSION'
  | 'IMPLANT'
  | 'CMP'
  | 'METROLOGY'
  | 'CLEAN'
  | 'WET'
  | 'TEST';

export type AlarmSource =
  | 'SPC_SYSTEM'
  | 'MES_ALERTS'
  | 'SENSOR_HUB';

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
  fromRisk?: RiskLevel;
  toRisk?: RiskLevel;
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
  alarmTime: string; // ISO 8601 — When
  eventTime?: string; // ISO 8601 — When the event actually occurred
  alarmDate?: string; // ISO 8601 date — Fab shift day
  recoveryTime?: string; // ISO 8601 — once set, immutable
  eqpId: string; // Where — "LITHO-07"
  chamberId?: string;
  productId: string; // Where context
  operName?: string; // Where context
  operNo?: string; // Where context
  technologyId?: string;
  productGroupId?: string;
  processOperName?: string;
  processOperNo?: string;
  lotId?: string;
  lotPriority?: number;
  waferId?: string;
  recipeId?: string;
  routeId?: string;
  module?: Module;
  moduleOwner?: string;
  piOwner?: string;
  owner: string; // Who — set at fire-time, immutable
  department: string; // Who — set at fire-time, immutable
  chartOwnerId?: string; // UserId — engineer responsible for the SPC chart
  // Mutable triage layer
  status: AlarmStatus;
  riskLevel?: RiskLevel;
  labels: AlarmLabel[];
  activity: AlarmActivityEntry[];
  details?: AlarmDetails;
  // External system provenance
  source?: AlarmSource;
  sourceAlarmId?: string;
  sourceAlarmBody?: string;
  externalStatus?: string;
  externalStatusUpdatedAt?: string;
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

export type IssueDraft = Omit<Issue, 'id' | 'activity'>;

export const ALL_ALARM_STATUSES: AlarmStatus[] = ['Open', 'Acked'];
export const ALL_HUMAN_RISKS: HumanRisk[] = ['high', 'middle', 'low'];
export const ALL_ALARM_LABELS: AlarmLabel[] = [
  'FalsePositive',
  'Recurring',
  'LotImpacting',
  'NeedsEngReview',
  'UnderObservation',
];

export const ALL_RISK_LEVELS: RiskLevel[] = ['P0', 'P1', 'P2', 'P3'];
export const ALL_ISSUE_STATUSES: IssueStatus[] = ['Triage', 'Investigating', 'Resolved', 'Closed', 'Merged'];
export const ALL_ALARM_TYPES: AlarmType[] = [
  'spc_ooc',
  'TempSpike',
  'ChamberLeak',
];

export type AlarmSortKey = 'alarmTime' | 'severity' | 'type' | 'department';

export interface AlarmFilters {
  search?: string;
  status?: AlarmStatus[];
  department?: string[];
  severity?: RiskLevel[];
  riskLevel?: RiskLevel[];
  alarmType?: AlarmType[];
  owner?: string[];
  eqpId?: string[];
  chamberId?: string[];
  productId?: string[];
  operName?: string[];
  labels?: AlarmLabel[];
  active?: 'active' | 'recovered';
}
