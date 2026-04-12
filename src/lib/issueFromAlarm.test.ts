import { describe, expect, it } from 'vitest';
import { buildIssueFromAlarm } from './issueFromAlarm';
import type { Alarm, User } from '../types';

const now = '2025-06-01T12:00:00.000Z';

function makeAlarm(overrides: Partial<Alarm> = {}): Alarm {
  return {
    id: 'alm-001',
    type: 'TempSpike',
    severity: 'High',
    message: 'Chamber temperature exceeded threshold',
    time: '2025-06-01T11:00:00.000Z',
    machineId: 'LITHO-07',
    product: 'A7-Litho',
    operation: 'Wafer transfer',
    owner: 'H. Tanaka',
    department: 'Litho',
    status: 'Open',
    labels: [],
    activity: [
      { id: 'alm-001-act-1', type: 'created', timestamp: '2025-06-01T11:00:00.000Z', author: 'system' },
    ],
    ...overrides,
  };
}

const currentUser: User = { id: 'user-rossi', name: 'L. Rossi', department: 'Litho' };

describe('buildIssueFromAlarm', () => {
  it('maps all documented fields from alarm to issue draft', () => {
    const alarm = makeAlarm({ humanRisk: 'high' });
    const draft = buildIssueFromAlarm(alarm, currentUser, now);

    expect(draft.title).toBe(alarm.message);
    expect(draft.description).toContain(alarm.message);
    expect(draft.alarmType).toBe(alarm.type);
    expect(draft.riskLevel).toBe('High'); // humanRisk 'high' → 'High'
    expect(draft.status).toBe('Triage');
    expect(draft.issueTime).toBe(alarm.time);
    expect(draft.operation).toBe(alarm.operation);
    expect(draft.product).toBe(alarm.product);
    expect(draft.ownerId).toBe('user-tanaka');
    expect(draft.department).toBe(alarm.department);
    expect(draft.relatedAlarmIds).toEqual([alarm.id]);
    expect(draft.date).toBe(now);
  });

  it('falls back to alarm.severity when humanRisk is unset', () => {
    const alarm = makeAlarm({ humanRisk: undefined, severity: 'Critical' });
    const draft = buildIssueFromAlarm(alarm, currentUser, now);
    expect(draft.riskLevel).toBe('Critical');
  });

  it('maps humanRisk middle to Medium', () => {
    const alarm = makeAlarm({ humanRisk: 'middle' });
    const draft = buildIssueFromAlarm(alarm, currentUser, now);
    expect(draft.riskLevel).toBe('Medium');
  });

  it('maps humanRisk low to Low', () => {
    const alarm = makeAlarm({ humanRisk: 'low' });
    const draft = buildIssueFromAlarm(alarm, currentUser, now);
    expect(draft.riskLevel).toBe('Low');
  });

  it('preserves alarm.id in relatedAlarmIds', () => {
    const alarm = makeAlarm({ id: 'alm-099' });
    const draft = buildIssueFromAlarm(alarm, currentUser, now);
    expect(draft.relatedAlarmIds).toEqual(['alm-099']);
  });
});
