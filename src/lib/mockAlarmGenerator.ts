import type {
  Alarm,
  AlarmActivityEntry,
  AlarmLabel,
  AlarmStatus,
  AlarmType,
  HumanRisk,
  RiskLevel,
} from '../types';
import { alarmRouting } from './alarmRouting';

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

// Severity distribution target: 1:2:4:3 (Critical:High:Medium:Low)
// Weighted pool of 10 slots
const SEVERITY_POOL: RiskLevel[] = [
  'Critical',
  'High', 'High',
  'Medium', 'Medium', 'Medium', 'Medium',
  'Low', 'Low', 'Low',
];

const MACHINES = [
  'LITHO-07', 'LITHO-12', 'ETCH-03', 'ETCH-12', 'CVD-04',
  'CVD-09', 'PVD-02', 'IMP-05', 'CMP-08', 'METRO-01',
];

const CHAMBERS = ['A', 'B', 'C', 'D'];

const PRODUCTS = ['A7-Litho', 'B3-Etch', 'C2-CVD', 'D1-PVD', 'E5-CMP', 'F4-Metro'];
const OPERATIONS = [
  'Wafer transfer', 'Chamber pump-down', 'Recipe step 3', 'Idle / standby',
  'Lot start', 'Process clean', 'Endpoint detect', 'Vent cycle',
];

const MESSAGES: Record<AlarmType, { msg: string; unit: string; baseValue: number }> = {
  TempSpike: { msg: 'Chamber temperature exceeded threshold', unit: '°C', baseValue: 240 },
  PressureDrop: { msg: 'Chamber pressure below setpoint', unit: 'mTorr', baseValue: 12 },
  FlowAnomaly: { msg: 'Process gas flow out of range', unit: 'sccm', baseValue: 85 },
  ChamberLeak: { msg: 'Vacuum leak rate above tolerance', unit: 'sccm', baseValue: 0.4 },
  VoltageSag: { msg: 'DC bias voltage sag detected', unit: 'V', baseValue: 380 },
  ParticleCount: { msg: 'In-situ particle count spike', unit: 'cnt', baseValue: 18 },
  VacuumFault: { msg: 'Turbopump speed deviation', unit: 'Hz', baseValue: 920 },
  RFMismatch: { msg: 'RF reflected power threshold exceeded', unit: 'W', baseValue: 45 },
  GasFlowDeviation: { msg: 'MFC gas flow deviation', unit: 'sccm', baseValue: 60 },
  EndpointDrift: { msg: 'Etch endpoint signal drift', unit: '%', baseValue: 7 },
};

const HUMAN_RISKS: HumanRisk[] = ['high', 'middle', 'low'];
const LABELS: AlarmLabel[] = [
  'FalsePositive', 'Recurring', 'LotImpacting', 'NeedsEngReview', 'UnderObservation',
];

function pad(n: number, w = 3): string {
  return String(n).padStart(w, '0');
}

// The first 20 alarms are a deliberate scenario block.
// Layout: indices 0–4 = Needs attention (Open, active)
//         indices 5–9 = In progress (Acked, active)
//         indices 10–14 = Missed (Open, recovered)
//         indices 15–19 = Resolved (Acked, recovered)
interface ScenarioSlot {
  status: AlarmStatus;
  recovered: boolean;
}

const SCENARIO: ScenarioSlot[] = [
  // Needs attention (Open + active) — 5
  { status: 'Open', recovered: false },
  { status: 'Open', recovered: false },
  { status: 'Open', recovered: false },
  { status: 'Open', recovered: false },
  { status: 'Open', recovered: false },
  // In progress (Acked + active) — 5
  { status: 'Acked', recovered: false },
  { status: 'Acked', recovered: false },
  { status: 'Acked', recovered: false },
  { status: 'Acked', recovered: false },
  { status: 'Acked', recovered: false },
  // Missed (Open + recovered) — 5
  { status: 'Open', recovered: true },
  { status: 'Open', recovered: true },
  { status: 'Open', recovered: true },
  { status: 'Open', recovered: true },
  { status: 'Open', recovered: true },
  // Resolved (Acked + recovered) — 5
  { status: 'Acked', recovered: true },
  { status: 'Acked', recovered: true },
  { status: 'Acked', recovered: true },
  { status: 'Acked', recovered: true },
  { status: 'Acked', recovered: true },
];

function makeDeliberateAlarm(i: number, now: number): Alarm {
  const slot = SCENARIO[i];
  // Spread alarm types to ensure department coverage:
  // i=0: TempSpike (Litho), i=1: PressureDrop (Etch), i=2: ChamberLeak (Facilities), ...
  const typeOrder: AlarmType[] = [
    'TempSpike', 'PressureDrop', 'ChamberLeak', 'VoltageSag', 'FlowAnomaly',
    'ParticleCount', 'VacuumFault', 'RFMismatch', 'GasFlowDeviation', 'EndpointDrift',
    'TempSpike', 'PressureDrop', 'ChamberLeak', 'VoltageSag', 'FlowAnomaly',
    'ParticleCount', 'VacuumFault', 'RFMismatch', 'GasFlowDeviation', 'EndpointDrift',
  ];
  const type = typeOrder[i];
  const severity = SEVERITY_POOL[i % SEVERITY_POOL.length];
  const machine = MACHINES[i % MACHINES.length];
  const chamber = CHAMBERS[i % CHAMBERS.length];
  const product = PRODUCTS[i % PRODUCTS.length];
  const operation = OPERATIONS[i % OPERATIONS.length];
  const meta = MESSAGES[type];
  const routing = alarmRouting.route(type);

  // Offset-based: alarm fired 10–500 minutes ago
  const minutesAgo = 10 + i * 25;
  const time = new Date(now - minutesAgo * 60_000).toISOString();

  let recoveryTime: string | undefined;
  if (slot.recovered) {
    // Recovered 5–50 minutes after firing, but before now
    const recoveryOffset = 5 + i * 3;
    recoveryTime = new Date(now - minutesAgo * 60_000 + recoveryOffset * 60_000).toISOString();
  }

  const value = +(meta.baseValue + ((i * 13) % 30) - 15).toFixed(2);

  // humanRisk: ~40% = 8 of 20
  const humanRisk: HumanRisk | undefined = i % 5 < 2 ? HUMAN_RISKS[i % 3] : undefined;

  // labels: ~30% = 6 of 20
  const labels: AlarmLabel[] = i % 10 < 3 ? [LABELS[i % LABELS.length]] : [];

  const activity: AlarmActivityEntry[] = [
    {
      id: `alm-${pad(i + 1)}-act-1`,
      type: 'created',
      timestamp: time,
      author: 'system',
    },
  ];

  if (slot.status === 'Acked') {
    activity.push({
      id: `alm-${pad(i + 1)}-act-2`,
      type: 'acked',
      timestamp: new Date(Date.parse(time) + 5 * 60_000).toISOString(),
      author: routing.owner,
    });
  }

  if (slot.recovered && recoveryTime) {
    activity.push({
      id: `alm-${pad(i + 1)}-act-${activity.length + 1}`,
      type: 'recovered',
      timestamp: recoveryTime,
      author: 'system',
    });
  }

  return {
    id: `alm-${pad(i + 1)}`,
    type,
    severity,
    message: meta.msg,
    value,
    unit: meta.unit,
    time,
    recoveryTime,
    machineId: machine,
    chamberId: chamber,
    product,
    operation,
    owner: routing.owner,
    department: routing.department,
    status: slot.status,
    humanRisk,
    labels,
    activity,
  };
}

function makeVarietyAlarm(i: number, now: number): Alarm {
  const type = ALARM_TYPES[i % ALARM_TYPES.length];
  const severity = SEVERITY_POOL[(i * 3 + 1) % SEVERITY_POOL.length];
  const machine = MACHINES[(i * 7) % MACHINES.length];
  const chamber = CHAMBERS[(i * 5) % CHAMBERS.length];
  const product = PRODUCTS[(i * 3) % PRODUCTS.length];
  const operation = OPERATIONS[(i * 11) % OPERATIONS.length];
  const meta = MESSAGES[type];
  const routing = alarmRouting.route(type);

  const minutesAgo = (i * 137 + 23) % (60 * 24 * 30);
  const time = new Date(now - minutesAgo * 60_000).toISOString();

  // ~50% recovered
  const recovered = i % 2 === 0;
  let recoveryTime: string | undefined;
  if (recovered) {
    const recoveryOffset = 5 + (i * 7) % 60;
    recoveryTime = new Date(now - minutesAgo * 60_000 + recoveryOffset * 60_000).toISOString();
  }

  // ~40% Acked
  const status: AlarmStatus = i % 5 < 2 ? 'Acked' : 'Open';
  const value = +(meta.baseValue + ((i * 13) % 30) - 15).toFixed(2);

  const humanRisk: HumanRisk | undefined = i % 5 === 0 ? HUMAN_RISKS[i % 3] : undefined;
  const labels: AlarmLabel[] = i % 7 === 0 ? [LABELS[i % LABELS.length]] : [];

  const activity: AlarmActivityEntry[] = [
    {
      id: `alm-${pad(i + 1)}-act-1`,
      type: 'created',
      timestamp: time,
      author: 'system',
    },
  ];

  if (status === 'Acked') {
    activity.push({
      id: `alm-${pad(i + 1)}-act-2`,
      type: 'acked',
      timestamp: new Date(Date.parse(time) + 5 * 60_000).toISOString(),
      author: routing.owner,
    });
  }

  if (recovered && recoveryTime) {
    activity.push({
      id: `alm-${pad(i + 1)}-act-${activity.length + 1}`,
      type: 'recovered',
      timestamp: recoveryTime,
      author: 'system',
    });
  }

  return {
    id: `alm-${pad(i + 1)}`,
    type,
    severity,
    message: meta.msg,
    value,
    unit: meta.unit,
    time,
    recoveryTime,
    machineId: machine,
    chamberId: chamber,
    product,
    operation,
    owner: routing.owner,
    department: routing.department,
    status,
    humanRisk,
    labels,
    activity,
  };
}

export function generateAlarms(now: number): Alarm[] {
  const deliberate = Array.from({ length: 20 }, (_, i) => makeDeliberateAlarm(i, now));
  const variety = Array.from({ length: 60 }, (_, i) => makeVarietyAlarm(i + 20, now));
  return [...deliberate, ...variety];
}
