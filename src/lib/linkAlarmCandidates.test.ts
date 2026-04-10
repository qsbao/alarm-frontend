import { describe, expect, it } from 'vitest';
import { linkAlarmCandidates } from './linkAlarmCandidates';
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
  owner: 'H. Tanaka',
  department: 'Litho',
  description: 'Test',
  relatedAlarmIds: ['alm-099'],
  activity: [],
};

describe('linkAlarmCandidates', () => {
  it('excludes alarms already linked to any issue', () => {
    const alarms = [
      makeAlarm({ id: 'alm-001', linkedIssueId: 'iss-002' }),
      makeAlarm({ id: 'alm-002' }),
    ];
    const result = linkAlarmCandidates(alarms, baseIssue);
    expect(result.map((a) => a.id)).toEqual(['alm-002']);
  });

  it('excludes alarms already in the issue relatedAlarmIds', () => {
    const issue = { ...baseIssue, relatedAlarmIds: ['alm-001'] };
    const alarms = [
      makeAlarm({ id: 'alm-001' }),
      makeAlarm({ id: 'alm-002' }),
    ];
    const result = linkAlarmCandidates(alarms, issue);
    expect(result.map((a) => a.id)).toEqual(['alm-002']);
  });

  it('filters to same machine by default', () => {
    const alarms = [
      makeAlarm({ id: 'alm-001', machineId: 'LITHO-07' }),
      makeAlarm({ id: 'alm-002', machineId: 'ETCH-03' }),
    ];
    // Issue has no explicit machineId — we derive it from the first related alarm
    // or fall back. For now, the issue uses machineId from the linked alarms.
    // Actually, issues don't have machineId. Let's check...
    // Issues don't store machineId directly. The picker should use the alarms
    // already linked to the issue to determine the machine scope.
    // If no alarms are linked, show all machines.
    const result = linkAlarmCandidates(alarms, baseIssue);
    // No linked alarms to determine machine → show all
    expect(result).toHaveLength(2);
  });

  it('filters to same machine as existing linked alarms', () => {
    const linkedAlarm = makeAlarm({ id: 'alm-099', machineId: 'LITHO-07' });
    const alarms = [
      linkedAlarm,
      makeAlarm({ id: 'alm-001', machineId: 'LITHO-07' }),
      makeAlarm({ id: 'alm-002', machineId: 'ETCH-03' }),
    ];
    // Pass linked alarms so the function can determine machine scope
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
    const alarms = [
      makeAlarm({ id: 'alm-001', linkedIssueId: 'iss-005' }),
    ];
    const result = linkAlarmCandidates(alarms, baseIssue);
    expect(result).toEqual([]);
  });

  it('does not exclude alarms on a Closed issue (filter is on candidates not the issue)', () => {
    const closedIssue = { ...baseIssue, status: 'Closed' as const };
    const alarms = [makeAlarm({ id: 'alm-001', time: '2025-06-01T11:30:00.000Z' })];
    // The function still returns candidates; the UI decides whether to show the picker
    const result = linkAlarmCandidates(alarms, closedIssue);
    expect(result).toHaveLength(1);
  });
});
