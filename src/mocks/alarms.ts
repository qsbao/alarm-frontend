import type { Alarm, AlarmType, RiskLevel } from '../types';

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

const SEVERITIES: RiskLevel[] = ['Low', 'Medium', 'High', 'Critical'];

const MACHINES = [
  'LITHO-07',
  'LITHO-12',
  'ETCH-03',
  'ETCH-12',
  'CVD-04',
  'CVD-09',
  'PVD-02',
  'IMP-05',
  'CMP-08',
  'METRO-01',
];

const CHAMBERS = ['A', 'B', 'C', 'D'];

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

// Reference epoch: 2026-04-10T08:00:00Z (matches "today" in the demo).
const EPOCH = Date.parse('2026-04-10T08:00:00Z');

function pad(n: number, w = 3) {
  return String(n).padStart(w, '0');
}

function makeAlarm(i: number): Alarm {
  const type = ALARM_TYPES[i % ALARM_TYPES.length];
  const severity = SEVERITIES[(i * 3 + 1) % SEVERITIES.length];
  const machine = MACHINES[(i * 7) % MACHINES.length];
  const chamber = CHAMBERS[(i * 5) % CHAMBERS.length];
  const meta = MESSAGES[type];
  // Deterministic time: spread alarms across the last 30 days.
  const minutesAgo = (i * 137 + 23) % (60 * 24 * 30);
  const time = new Date(EPOCH - minutesAgo * 60_000).toISOString();
  const value = +(meta.baseValue + ((i * 13) % 30) - 15).toFixed(2);
  return {
    id: `alm-${pad(i + 1)}`,
    type,
    severity,
    time,
    machineId: machine,
    chamberId: chamber,
    message: meta.msg,
    value,
    unit: meta.unit,
  };
}

export const MOCK_ALARMS: Alarm[] = Array.from({ length: 80 }, (_, i) => makeAlarm(i));
