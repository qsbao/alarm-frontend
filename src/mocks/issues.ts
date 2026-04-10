import type { ActivityEntry, AlarmType, Issue, IssueStatus, RiskLevel } from '../types';
import { MOCK_ALARMS } from './alarms';

const ALARM_TYPES: AlarmType[] = [
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

const RISK_LEVELS: RiskLevel[] = ['Low', 'Medium', 'High', 'Critical'];
const STATUSES: IssueStatus[] = ['New', 'Investigating', 'Resolved', 'Closed'];

const PRODUCTS = ['A7-Litho', 'B3-Etch', 'C2-CVD', 'D1-PVD', 'E5-CMP', 'F4-Metro'];
const OWNERS = [
  'H. Tanaka',
  'M. Chen',
  'S. Patel',
  'K. Müller',
  'L. Rossi',
  'J. Smith',
  'A. Kim',
  'R. Garcia',
];
const DEPARTMENTS = ['Litho', 'Etch', 'Diffusion', 'Metrology'];

const OPERATIONS = [
  'Wafer transfer',
  'Chamber pump-down',
  'Recipe step 3',
  'Idle / standby',
  'Lot start',
  'Process clean',
  'Endpoint detect',
  'Vent cycle',
];

const TITLES: Record<AlarmType, string> = {
  TempSpike: 'Temperature spike during process',
  PressureDrop: 'Unexpected pressure drop',
  FlowAnomaly: 'Process gas flow anomaly',
  ChamberLeak: 'Suspected chamber leak',
  VoltageSag: 'DC bias voltage sag',
  ParticleCount: 'Particle count excursion',
  VacuumFault: 'Turbopump fault detected',
  RFMismatch: 'RF mismatch — reflected power high',
  GasFlowDeviation: 'MFC flow deviation',
  EndpointDrift: 'Etch endpoint signal drift',
};

// Reference epoch: 2026-04-10T08:00:00Z (matches "today" in the demo).
const EPOCH = Date.parse('2026-04-10T08:00:00Z');

function pad(n: number, w = 3) {
  return String(n).padStart(w, '0');
}

function makeIssue(i: number): Issue {
  const alarmType = ALARM_TYPES[i % ALARM_TYPES.length];
  const riskLevel = RISK_LEVELS[(i * 2 + 1) % RISK_LEVELS.length];
  const status = STATUSES[Math.floor(i / 10) % STATUSES.length];
  const product = PRODUCTS[(i * 3) % PRODUCTS.length];
  const owner = OWNERS[(i * 5) % OWNERS.length];
  const department = DEPARTMENTS[(i * 7) % DEPARTMENTS.length];
  const operation = OPERATIONS[(i * 11) % OPERATIONS.length];

  // Spread creation dates across the last 30 days, deterministically.
  const minutesAgoCreated = (i * 311 + 47) % (60 * 24 * 30);
  const date = new Date(EPOCH - minutesAgoCreated * 60_000).toISOString();
  // The physical incident a bit before the creation time.
  const issueTime = new Date(
    EPOCH - minutesAgoCreated * 60_000 - ((i * 17) % 180) * 60_000,
  ).toISOString();

  // Pick 0–5 alarms, drawn deterministically from MOCK_ALARMS.
  const linkCount = i % 6;
  const relatedAlarmIds: string[] = [];
  for (let k = 0; k < linkCount; k++) {
    const idx = (i * 13 + k * 29) % MOCK_ALARMS.length;
    const id = MOCK_ALARMS[idx].id;
    if (!relatedAlarmIds.includes(id)) relatedAlarmIds.push(id);
  }

  const id = `iss-${pad(i + 1)}`;
  const seedActivity: ActivityEntry = {
    id: `${id}-act-1`,
    type: 'created',
    timestamp: date,
    author: 'system',
  };

  return {
    id,
    title: `${TITLES[alarmType]} on ${product}`,
    date,
    alarmType,
    riskLevel,
    status,
    issueTime,
    operation,
    product,
    owner,
    department,
    description:
      `Operator observed ${TITLES[alarmType].toLowerCase()} during "${operation}" on ${product}. ` +
      `Department: ${department}. Initial risk assessment: ${riskLevel}. ` +
      `Investigation pending — review related alarms and recent maintenance history.`,
    relatedAlarmIds,
    activity: [seedActivity],
  };
}

export const MOCK_ISSUES: Issue[] = Array.from({ length: 40 }, (_, i) => makeIssue(i));
