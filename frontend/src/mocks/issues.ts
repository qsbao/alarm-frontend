import type { ActivityEntry, AlarmType, Issue, RiskLevel } from '../types';
import { MOCK_ALARMS } from './alarms';
import { PRODUCT_ROUTES } from './routes';
import { loadIssueAlarms, type IssueAlarm } from '../lib/issueAlarms';

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

const PRODUCTS = PRODUCT_ROUTES.map((r) => r.product);
const OWNER_IDS = [
  'user-tanaka',
  'user-chen',
  'user-patel',
  'user-muller',
  'user-rossi',
  'user-smith',
  'user-kim',
  'user-garcia',
];
const DEPARTMENTS = ['Litho', 'Etch', 'Diffusion', 'Metrology'];

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

// Use the first alarm's time as epoch reference (offset-based, always fresh)
const EPOCH = Date.parse(MOCK_ALARMS[0].time) + 10 * 60_000;

function pad(n: number, w = 3) {
  return String(n).padStart(w, '0');
}

function makeIssue(i: number): Issue {
  const alarmType = ALARM_TYPES[i % ALARM_TYPES.length];
  const riskLevel = RISK_LEVELS[(i * 2 + 1) % RISK_LEVELS.length];
  // status is a placeholder; the engine writes the real value during workflow attach
  const status = 'Triage';
  const product = PRODUCTS[(i * 7 + 1) % PRODUCTS.length];
  const ownerId = OWNER_IDS[(i * 5) % OWNER_IDS.length];
  const department = DEPARTMENTS[(i * 7) % DEPARTMENTS.length];
  // Pick operation from the product's actual route so every issue aligns to a real route node.
  const route = PRODUCT_ROUTES.find((r) => r.product === product)!;
  const operation = route.operations[(i * 11) % route.operations.length].name;

  // Spread creation dates across the last 30 days, deterministically.
  const minutesAgoCreated = (i * 311 + 47) % (60 * 24 * 30);
  const date = new Date(EPOCH - minutesAgoCreated * 60_000).toISOString();
  // The physical incident a bit before the creation time.
  const issueTime = new Date(
    EPOCH - minutesAgoCreated * 60_000 - ((i * 17) % 180) * 60_000,
  ).toISOString();

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
    ownerId,
    department,
    description:
      `Operator observed ${TITLES[alarmType].toLowerCase()} during "${operation}" on ${product}. ` +
      `Department: ${department}. Initial risk assessment: ${riskLevel}. ` +
      `Investigation pending — review related alarms and recent maintenance history.`,
    activity: [seedActivity],
  };
}

import { applyCuratedWorkflows } from './curatedWorkflows';

const _issues: Issue[] = Array.from({ length: 40 }, (_, i) => makeIssue(i));
applyCuratedWorkflows(_issues);

export function seedIssueAlarmRows(issueList: Issue[]): void {
  const seed: IssueAlarm[] = [];
  let id = 1;
  for (let i = 0; i < issueList.length; i++) {
    const linkCount = i % 6;
    const seen = new Set<string>();
    for (let k = 0; k < linkCount; k++) {
      const idx = (i * 13 + k * 29) % MOCK_ALARMS.length;
      const alarmId = MOCK_ALARMS[idx].id;
      if (seen.has(alarmId)) continue;
      seen.add(alarmId);
      seed.push({
        id: `ia-${id++}`,
        issueId: issueList[i].id,
        alarmId,
        attachedAt: issueList[i].date,
        attachedBy: 'system',
      });
    }
  }
  loadIssueAlarms(seed);
}

seedIssueAlarmRows(_issues);

export const MOCK_ISSUES: Issue[] = _issues;
