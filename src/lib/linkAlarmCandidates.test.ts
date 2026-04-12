import { describe, expect, it, beforeEach } from 'vitest';
import { linkAlarmCandidates } from './linkAlarmCandidates';
import { attachAlarm, resetIssueAlarms } from './issueAlarms';
import type { Alarm, Issue } from '../types';

const baseAlarm: Alarm = {
  id: 'alm-001',
  type: 'TempSpike',
  severity: 'High',
  message: 'Temp exceeded threshold',
  time: '2025-06-01T11:00:00.000Z',
  machineId: 'LITHO-07',
  product: 'A7-Litho',
  operation: 'Wafer transfer',
  owner: 'H. Tanaka',
  department: 'Litho',
  status: 'Open',
  labels: [],
  activity: [],
};

function makeAlarm(overrides: Partial<Alarm>): Alarm {
  return { ...baseAlarm, ...overrides };
}

const baseIssue: Issue = {
  id: 'iss-001',
  title: 'Test issue',
  date: '2025-06-01T12:00:00.000Z',
  alarmType: 'TempSpike',
  riskLevel: 'High',
  status: 'Investigating',
  issueTime: '2025-06-01T11:00:00.000Z',
  operation: 'Wafer transfer',
  product: 'A7-Litho',
  ownerId: 'user-tanaka',
  department: 'Litho',
  description: 'Test',
  activity: [],
};

beforeEach(() => {
  resetIssueAlarms();
});

describe('linkAlarmCandidates', () => {
  it('excludes alarms already linked to any issue', () => {
    // alm-001 linked to iss-002 via join table
    attachAlarm('iss-002', 'alm-001', 'user-a');
    const alarms = [
      makeAlarm({ id: 'alm-001' }),
      makeAlarm({ id: 'alm-002' }),
    ];
    const result = linkAlarmCandidates(alarms, baseIssue);
    expect(result.map((a) => a.id)).toEqual(['alm-002']);
  });

  it('excludes alarms already linked to this issue', () => {
    attachAlarm('iss-001', 'alm-001', 'user-a');
    const alarms = [
      makeAlarm({ id: 'alm-001' }),
      makeAlarm({ id: 'alm-002' }),
    ];
    const result = linkAlarmCandidates(alarms, baseIssue);
    expect(result.map((a) => a.id)).toEqual(['alm-002']);
  });

  it('filters to same machine by default', () => {
    const alarms = [
      makeAlarm({ id: 'alm-001', machineId: 'LITHO-07' }),
      makeAlarm({ id: 'alm-002', machineId: 'ETCH-03' }),
    ];
    const result = linkAlarmCandidates(alarms, baseIssue);
    // No linked alarms to determine machine → show all
    expect(result).toHaveLength(2);
  });

  it('filters to same machine as existing linked alarms', () => {
    const linkedAlarm = makeAlarm({ id: 'alm-099', machineId: 'LITHO-07' });
    attachAlarm('iss-001', 'alm-099', 'user-a');
    const alarms = [
      linkedAlarm,
      makeAlarm({ id: 'alm-001', machineId: 'LITHO-07' }),
      makeAlarm({ id: 'alm-002', machineId: 'ETCH-03' }),
    ];
    const result = linkAlarmCandidates(alarms, baseIssue, { linkedAlarms: [linkedAlarm] });
    expect(result.map((a) => a.id)).toEqual(['alm-001']);
  });

  it('filters to +-2h of issue creation time', () => {
    const issue = { ...baseIssue, date: '2025-06-01T12:00:00.000Z' };
    const alarms = [
      makeAlarm({ id: 'alm-in', time: '2025-06-01T11:30:00.000Z' }), // 30min before → in range
      makeAlarm({ id: 'alm-out', time: '2025-06-01T08:00:00.000Z' }), // 4h before → out
      makeAlarm({ id: 'alm-after', time: '2025-06-01T13:30:00.000Z' }), // 1.5h after → in range
      makeAlarm({ id: 'alm-late', time: '2025-06-01T15:00:00.000Z' }), // 3h after → out
    ];
    const result = linkAlarmCandidates(alarms, issue);
    expect(result.map((a) => a.id)).toEqual(['alm-in', 'alm-after']);
  });

  it('returns empty when all alarms are already linked', () => {
    attachAlarm('iss-005', 'alm-001', 'user-a');
    const alarms = [
      makeAlarm({ id: 'alm-001' }),
    ];
    const result = linkAlarmCandidates(alarms, baseIssue);
    expect(result).toEqual([]);
  });

  it('does not exclude alarms on a Closed issue (filter is on candidates not the issue)', () => {
    const closedIssue = { ...baseIssue, status: 'Closed' as const };
    const alarms = [makeAlarm({ id: 'alm-001', time: '2025-06-01T11:30:00.000Z' })];
    const result = linkAlarmCandidates(alarms, closedIssue);
    expect(result).toHaveLength(1);
  });
});
