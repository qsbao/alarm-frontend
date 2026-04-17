import { describe, it, expect } from 'vitest';
import type { EnrichedAlarmRow } from '../../hooks/useDashboardData';
import type { Alarm, Issue } from '../../types';
import {
  collectCandidateIssues,
  buildMergeSourceFromRow,
} from './triageDrawerHelpers';

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

function makeRow(alarm: Alarm, issue?: Issue): EnrichedAlarmRow {
  return {
    alarm,
    issue,
    bucket: issue ? 'In-workflow' : 'Un-triaged',
    stage: issue ? 'pre-meeting' : 'un-triaged',
    meetingBound: false,
  };
}

describe('collectCandidateIssues', () => {
  it('returns unique issues from rows, excluding rows with no linked issue', () => {
    const issA = makeIssue({ id: 'iss-a' });
    const issB = makeIssue({ id: 'iss-b' });
    const rows: EnrichedAlarmRow[] = [
      makeRow(makeAlarm({ id: 'a1' }), issA),
      makeRow(makeAlarm({ id: 'a2' }), issA),
      makeRow(makeAlarm({ id: 'a3' }), issB),
      makeRow(makeAlarm({ id: 'a4' })),
    ];
    const candidates = collectCandidateIssues(rows, null);
    const ids = candidates.map((i) => i.id).sort();
    expect(ids).toEqual(['iss-a', 'iss-b']);
  });

  it('excludes the issue with the given id (so the alarm being triaged does not match itself)', () => {
    const issA = makeIssue({ id: 'iss-a' });
    const issB = makeIssue({ id: 'iss-b' });
    const rows: EnrichedAlarmRow[] = [
      makeRow(makeAlarm({ id: 'a1' }), issA),
      makeRow(makeAlarm({ id: 'a2' }), issB),
    ];
    expect(collectCandidateIssues(rows, 'iss-a').map((i) => i.id)).toEqual(['iss-b']);
  });
});

describe('buildMergeSourceFromRow', () => {
  it('returns undefined when the row has no linked issue', () => {
    const row = makeRow(makeAlarm({ id: 'a1' }));
    expect(buildMergeSourceFromRow(row, [row])).toBeUndefined();
  });

  it('builds a source with all alarms whose row points at the same issue', () => {
    const issA = makeIssue({ id: 'iss-a' });
    const issB = makeIssue({ id: 'iss-b' });
    const r1 = makeRow(makeAlarm({ id: 'a1' }), issA);
    const r2 = makeRow(makeAlarm({ id: 'a2' }), issA);
    const r3 = makeRow(makeAlarm({ id: 'a3' }), issB);
    const source = buildMergeSourceFromRow(r1, [r1, r2, r3]);
    expect(source?.issue.id).toBe('iss-a');
    expect(source?.alarms.map((a) => a.id).sort()).toEqual(['a1', 'a2']);
  });
});
