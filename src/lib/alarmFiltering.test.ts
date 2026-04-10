import { describe, it, expect } from 'vitest';
import type { Alarm } from '../types';
import { isActive } from './alarmFiltering';

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
