import { describe, it, expect } from 'vitest';
import { buildDashboardData } from './useDashboardData';
import type { Alarm, Issue, ActivityEntry } from '../types';
import { getDefinition } from '../lib/workflows/definitions';

function makeAlarm(overrides: Partial<Alarm> = {}): Alarm {
  return {
    id: 'alm-001',
    type: 'spc_ooc',
    severity: 'P1',
    message: 'test',
    alarmTime: '2026-04-17T10:00:00Z',
    alarmDate: '2026-04-17',
    eqpId: 'LITHO-07',
    productId: 'A7-Litho',
    owner: 'user-tanaka',
    department: 'Litho',
    status: 'Open',
    labels: [],
    activity: [],
    ...overrides,
  };
}

function makeIssue(overrides: Partial<Issue> = {}): Issue {
  return {
    id: 'iss-001',
    title: 'Test cause',
    date: '2026-04-17T10:00:00Z',
    riskLevel: 'HIGH_RISK',
    status: 'Triage',
    issueTime: '2026-04-17T09:55:00Z',
    labels: [],
    product: 'A7-Litho',
    ownerId: 'user-tanaka',
    department: 'Litho',
    description: 'test',
    activity: [],
    ...overrides,
  };
}

function createdOnly(): ActivityEntry[] {
  return [
    { id: 'act-0', type: 'created', timestamp: '2026-04-17T09:55:00Z', author: 'system' },
  ];
}

function withComment(): ActivityEntry[] {
  return [
    ...createdOnly(),
    { id: 'act-1', type: 'comment', timestamp: '2026-04-17T10:00:00Z', author: 'user-tanaka', text: 'looking' },
  ];
}

describe('buildDashboardData', () => {
  it('returns empty rows and zero counts when no alarms', () => {
    const data = buildDashboardData([], new Map(), new Map(), getDefinition);
    expect(data.rows).toEqual([]);
    expect(data.counts).toEqual({
      total: 0,
      unTriaged: 0,
      inWorkflow: 0,
      done: 0,
      meetingBound: 0,
    });
  });

  it('classifies an alarm with an un-triaged (activity-free) issue as Un-triaged', () => {
    const alarm = makeAlarm({ id: 'alm-1' });
    const issue = makeIssue({ id: 'iss-1', activity: createdOnly() });
    const data = buildDashboardData(
      [alarm],
      new Map([[issue.id, issue]]),
      new Map([[alarm.id, issue.id]]),
      getDefinition,
    );
    expect(data.rows).toHaveLength(1);
    expect(data.rows[0].alarm).toBe(alarm);
    expect(data.rows[0].issue).toBe(issue);
    expect(data.rows[0].bucket).toBe('Un-triaged');
    expect(data.rows[0].stage).toBe('un-triaged');
    expect(data.rows[0].meetingBound).toBe(false);
    expect(data.counts).toEqual({
      total: 1,
      unTriaged: 1,
      inWorkflow: 0,
      done: 0,
      meetingBound: 0,
    });
  });

  it('treats an alarm with no linked issue as Un-triaged', () => {
    const alarm = makeAlarm({ id: 'alm-orphan' });
    const data = buildDashboardData([alarm], new Map(), new Map(), getDefinition);
    expect(data.rows).toHaveLength(1);
    expect(data.rows[0].issue).toBeUndefined();
    expect(data.rows[0].bucket).toBe('Un-triaged');
    expect(data.rows[0].stage).toBe('un-triaged');
    expect(data.counts.unTriaged).toBe(1);
  });

  it('aggregates mixed buckets and counts meetingBound separately from bucket counts', () => {
    const a1 = makeAlarm({ id: 'alm-1' });
    const a2 = makeAlarm({ id: 'alm-2' });
    const a3 = makeAlarm({ id: 'alm-3' });
    const a4 = makeAlarm({ id: 'alm-4' });

    const issUntriaged = makeIssue({ id: 'iss-u', activity: createdOnly() });
    const issPreMeeting = makeIssue({
      id: 'iss-pm',
      status: 'Investigating',
      activity: withComment(),
      workflow: {
        definitionId: 'spc_ooc_branching_v1',
        stepStates: {
          chart_owner_comment: { status: 'ongoing' },
          l5_review: { status: 'pending' },
          l4_review: { status: 'pending' },
          pi_comment: { status: 'pending' },
          attach_report: { status: 'pending' },
          verify_calibration: { status: 'pending' },
          meeting: { status: 'pending' },
          lot_disposition: { status: 'pending' },
          resolved: { status: 'pending' },
          closed: { status: 'pending' },
        },
        actors: [],
      },
    });
    const issMeeting = makeIssue({
      id: 'iss-m',
      status: 'Investigating',
      activity: withComment(),
      workflow: {
        definitionId: 'spc_ooc_branching_v1',
        stepStates: {
          chart_owner_comment: { status: 'completed', completedAt: '2026-04-17T10:05:00Z', completedBy: 'user-tanaka' },
          l5_review: { status: 'completed', completedAt: '2026-04-17T10:10:00Z', completedBy: 'user-tanaka' },
          l4_review: { status: 'completed', completedAt: '2026-04-17T10:15:00Z', completedBy: 'user-tanaka' },
          pi_comment: { status: 'completed', completedAt: '2026-04-17T10:20:00Z', completedBy: 'user-tanaka' },
          attach_report: { status: 'skipped', skippedAt: '2026-04-17T10:16:00Z', skippedBy: 'user-tanaka' },
          verify_calibration: { status: 'skipped', skippedAt: '2026-04-17T10:17:00Z', skippedBy: 'user-tanaka' },
          meeting: {
            status: 'ongoing',
            payload: {
              entries: [
                {
                  kind: 'scheduled',
                  scheduledTime: '2026-04-17T17:00:00Z',
                  recordedBy: 'user-tanaka',
                  recordedAt: '2026-04-17T10:21:00Z',
                },
              ],
            },
          },
          lot_disposition: { status: 'pending' },
          resolved: { status: 'pending' },
          closed: { status: 'pending' },
        },
        actors: [],
      },
    });
    const issDone = makeIssue({ id: 'iss-d', status: 'Closed', activity: withComment() });

    const data = buildDashboardData(
      [a1, a2, a3, a4],
      new Map([
        [issUntriaged.id, issUntriaged],
        [issPreMeeting.id, issPreMeeting],
        [issMeeting.id, issMeeting],
        [issDone.id, issDone],
      ]),
      new Map([
        [a1.id, issUntriaged.id],
        [a2.id, issPreMeeting.id],
        [a3.id, issMeeting.id],
        [a4.id, issDone.id],
      ]),
      getDefinition,
    );

    expect(data.counts).toEqual({
      total: 4,
      unTriaged: 1,
      inWorkflow: 2,
      done: 1,
      meetingBound: 1,
    });

    const meetingRow = data.rows.find((r) => r.alarm.id === 'alm-3');
    expect(meetingRow?.meetingBound).toBe(true);
    expect(meetingRow?.meetingTime).toBe('2026-04-17T17:00:00Z');
    expect(meetingRow?.stage).toBe('meeting');

    const preMeetingRow = data.rows.find((r) => r.alarm.id === 'alm-2');
    expect(preMeetingRow?.bucket).toBe('In-workflow');
    expect(preMeetingRow?.stage).toBe('pre-meeting');
  });
});
