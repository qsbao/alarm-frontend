export type RiskLevel = 'Low' | 'Medium' | 'High' | 'Critical';
export type IssueStatus = 'New' | 'Investigating' | 'Resolved' | 'Closed';
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

export interface Alarm {
  id: string; // "alm-001"
  type: AlarmType;
  severity: RiskLevel;
  time: string; // ISO 8601
  machineId: string; // "LITHO-07"
  chamberId?: string;
  message: string;
  value?: number;
  unit?: string;
}

export type ActivityType =
  | 'created'
  | 'status_change'
  | 'assignment'
  | 'comment'
  | 'alarm_linked'
  | 'alarm_unlinked';

export interface ActivityEntry {
  id: string;
  type: ActivityType;
  timestamp: string; // ISO 8601
  author: string;
  fromStatus?: IssueStatus;
  toStatus?: IssueStatus;
  assignedTo?: string;
  text?: string;
  alarmId?: string;
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
  owner: string; // e.g. "H. Tanaka"
  department: string; // e.g. "Litho"
  // detail-only fields
  description: string;
  relatedAlarmIds: string[];
  activity: ActivityEntry[]; // ascending; render reversed
}

export const ALL_RISK_LEVELS: RiskLevel[] = ['Low', 'Medium', 'High', 'Critical'];
export const ALL_ISSUE_STATUSES: IssueStatus[] = ['New', 'Investigating', 'Resolved', 'Closed'];
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

/** Valid status transitions for the issue workflow stepper. */
export const STATUS_TRANSITIONS: Record<IssueStatus, IssueStatus[]> = {
  New: ['Investigating'],
  Investigating: ['New', 'Resolved'],
  Resolved: ['Investigating', 'Closed'],
  Closed: ['Investigating'],
};
