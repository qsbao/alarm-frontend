import { describe, it, expect } from 'vitest';
import type { Alarm, AlarmFilters } from '../types';
import { isActive, isMissed, filterAlarms, sortAlarms } from './alarmFiltering';

function makeAlarm(overrides: Partial<Alarm> = {}): Alarm {
  return {
    id: 'alm-001',
    type: 'TempSpike',
    severity: 'High',
    message: 'test',
    time: '2026-01-15T10:00:00Z',
    machineId: 'LITHO-07',
    product: 'A7-Litho',
    operation: 'Wafer transfer',
    owner: 'H. Tanaka',
    department: 'Litho',
    status: 'Open',
    labels: [],
    activity: [],
    ...overrides,
  };
}

describe('isActive', () => {
  const now = new Date('2026-01-15T12:00:00Z').getTime();

  it('returns true when no recoveryTime is set', () => {
    const alarm = makeAlarm();
    expect(isActive(alarm, now)).toBe(true);
  });

  it('returns false when recoveryTime is in the past', () => {
    const alarm = makeAlarm({ recoveryTime: '2026-01-15T11:00:00Z' });
    expect(isActive(alarm, now)).toBe(false);
  });

  it('returns true when recoveryTime is in the future', () => {
    const alarm = makeAlarm({ recoveryTime: '2026-01-15T13:00:00Z' });
    expect(isActive(alarm, now)).toBe(true);
  });

  it('returns false when recoveryTime equals now (boundary)', () => {
    const alarm = makeAlarm({ recoveryTime: '2026-01-15T12:00:00Z' });
    expect(isActive(alarm, now)).toBe(false);
  });
});

describe('isMissed', () => {
  const now = new Date('2026-01-15T12:00:00Z').getTime();

  it('returns true for Open + recovered (missed)', () => {
    const alarm = makeAlarm({ status: 'Open', recoveryTime: '2026-01-15T11:00:00Z' });
    expect(isMissed(alarm, now)).toBe(true);
  });

  it('returns false for Open + active (needs attention)', () => {
    const alarm = makeAlarm({ status: 'Open' });
    expect(isMissed(alarm, now)).toBe(false);
  });

  it('returns false for Acked + recovered (resolved)', () => {
    const alarm = makeAlarm({ status: 'Acked', recoveryTime: '2026-01-15T11:00:00Z' });
    expect(isMissed(alarm, now)).toBe(false);
  });

  it('returns false for Acked + active (in progress)', () => {
    const alarm = makeAlarm({ status: 'Acked' });
    expect(isMissed(alarm, now)).toBe(false);
  });
});

describe('filterAlarms', () => {
  const now = new Date('2026-01-15T12:00:00Z').getTime();

  const alarms: Alarm[] = [
    makeAlarm({ id: 'alm-001', status: 'Open', department: 'Litho', severity: 'High', type: 'TempSpike', owner: 'H. Tanaka', machineId: 'LITHO-07', product: 'A7-Litho', labels: ['Recurring'] }),
    makeAlarm({ id: 'alm-002', status: 'Acked', department: 'Etch', severity: 'Low', type: 'PressureDrop', owner: 'M. Chen', machineId: 'ETCH-03', product: 'B2-Etch', recoveryTime: '2026-01-15T11:00:00Z', labels: [] }),
    makeAlarm({ id: 'alm-003', status: 'Open', department: 'Litho', severity: 'Critical', type: 'ChamberLeak', owner: 'L. Rossi', machineId: 'LITHO-02', product: 'A7-Litho', recoveryTime: '2026-01-15T11:30:00Z', humanRisk: 'high', labels: ['LotImpacting'] }),
    makeAlarm({ id: 'alm-004', status: 'Acked', department: 'Facilities', severity: 'Medium', type: 'VoltageSag', owner: 'K. Müller', machineId: 'FAC-01', product: 'C1-Fac', labels: [] }),
  ];

  it('returns all alarms with empty filters', () => {
    expect(filterAlarms(alarms, {}, now)).toHaveLength(4);
  });

  it('filters by status', () => {
    const result = filterAlarms(alarms, { status: ['Open'] }, now);
    expect(result.map((a) => a.id)).toEqual(['alm-001', 'alm-003']);
  });

  it('filters by department', () => {
    const result = filterAlarms(alarms, { department: ['Litho'] }, now);
    expect(result.map((a) => a.id)).toEqual(['alm-001', 'alm-003']);
  });

  it('filters by severity', () => {
    const result = filterAlarms(alarms, { severity: ['Critical'] }, now);
    expect(result.map((a) => a.id)).toEqual(['alm-003']);
  });

  it('filters by active state', () => {
    const result = filterAlarms(alarms, { active: 'active' }, now);
    expect(result.map((a) => a.id)).toEqual(['alm-001', 'alm-004']);
  });

  it('filters by recovered state', () => {
    const result = filterAlarms(alarms, { active: 'recovered' }, now);
    expect(result.map((a) => a.id)).toEqual(['alm-002', 'alm-003']);
  });

  it('filters by labels (any match)', () => {
    const result = filterAlarms(alarms, { labels: ['Recurring'] }, now);
    expect(result.map((a) => a.id)).toEqual(['alm-001']);
  });

  it('filters by humanRisk', () => {
    const result = filterAlarms(alarms, { humanRisk: ['high'] }, now);
    expect(result.map((a) => a.id)).toEqual(['alm-003']);
  });

  it('filters by search (message)', () => {
    const almsWithMsg = [
      makeAlarm({ id: 'alm-010', message: 'Temperature spike on LITHO-07' }),
      makeAlarm({ id: 'alm-011', message: 'Pressure drop detected' }),
    ];
    const result = filterAlarms(almsWithMsg, { search: 'temperature' }, now);
    expect(result.map((a) => a.id)).toEqual(['alm-010']);
  });

  it('filters by search (alarm id)', () => {
    const result = filterAlarms(alarms, { search: 'alm-003' }, now);
    expect(result.map((a) => a.id)).toEqual(['alm-003']);
  });

  it('combines multiple filters (AND)', () => {
    const result = filterAlarms(alarms, { status: ['Open'], department: ['Litho'], active: 'active' }, now);
    expect(result.map((a) => a.id)).toEqual(['alm-001']);
  });

  it('2×2 cell: needs attention (Open + active)', () => {
    const result = filterAlarms(alarms, { status: ['Open'], active: 'active' }, now);
    expect(result.map((a) => a.id)).toEqual(['alm-001']);
  });

  it('2×2 cell: in progress (Acked + active)', () => {
    const result = filterAlarms(alarms, { status: ['Acked'], active: 'active' }, now);
    expect(result.map((a) => a.id)).toEqual(['alm-004']);
  });

  it('2×2 cell: missed (Open + recovered)', () => {
    const result = filterAlarms(alarms, { status: ['Open'], active: 'recovered' }, now);
    expect(result.map((a) => a.id)).toEqual(['alm-003']);
  });

  it('2×2 cell: resolved (Acked + recovered)', () => {
    const result = filterAlarms(alarms, { status: ['Acked'], active: 'recovered' }, now);
    expect(result.map((a) => a.id)).toEqual(['alm-002']);
  });
});

describe('sortAlarms', () => {
  const alarms: Alarm[] = [
    makeAlarm({ id: 'alm-001', time: '2026-01-15T10:00:00Z', severity: 'High', type: 'TempSpike', department: 'Litho' }),
    makeAlarm({ id: 'alm-002', time: '2026-01-15T08:00:00Z', severity: 'Critical', type: 'PressureDrop', department: 'Etch' }),
    makeAlarm({ id: 'alm-003', time: '2026-01-15T12:00:00Z', severity: 'Low', type: 'ChamberLeak', department: 'Facilities' }),
  ];

  it('sorts by time descending (newest first)', () => {
    const result = sortAlarms(alarms, 'time');
    expect(result.map((a) => a.id)).toEqual(['alm-003', 'alm-001', 'alm-002']);
  });

  it('sorts by severity (Critical first)', () => {
    const result = sortAlarms(alarms, 'severity');
    expect(result.map((a) => a.id)).toEqual(['alm-002', 'alm-001', 'alm-003']);
  });

  it('sorts by type alphabetically', () => {
    const result = sortAlarms(alarms, 'type');
    expect(result.map((a) => a.id)).toEqual(['alm-003', 'alm-002', 'alm-001']);
  });

  it('sorts by department alphabetically', () => {
    const result = sortAlarms(alarms, 'department');
    expect(result.map((a) => a.id)).toEqual(['alm-002', 'alm-003', 'alm-001']);
  });

  it('does not mutate the input array', () => {
    const original = [...alarms];
    sortAlarms(alarms, 'time');
    expect(alarms.map((a) => a.id)).toEqual(original.map((a) => a.id));
  });
});
