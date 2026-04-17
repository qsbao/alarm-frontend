import { describe, it, expect } from 'vitest';
import { sortRows, type SortMode } from './alarmRowSort';
import type { EnrichedAlarmRow } from '../../hooks/useDashboardData';
import type { AlarmBucket, AlarmStage } from '../../lib/dashboard/classifyAlarm';

function row(
  id: string,
  bucket: AlarmBucket,
  stage: AlarmStage,
  issueId?: string,
  alarmTime = '2026-04-17T10:00:00Z',
): EnrichedAlarmRow {
  return {
    alarm: { id, alarmTime } as EnrichedAlarmRow['alarm'],
    issue: issueId ? ({ id: issueId } as EnrichedAlarmRow['issue']) : undefined,
    bucket,
    stage,
    meetingBound: false,
  };
}

describe('sortRows (default mode)', () => {
  it('places Un-triaged rows before In-workflow before Done', () => {
    const rows: EnrichedAlarmRow[] = [
      row('done', 'Done', 'done'),
      row('flow', 'In-workflow', 'pre-meeting'),
      row('untri', 'Un-triaged', 'un-triaged'),
    ];
    const sorted = sortRows(rows, 'default');
    expect(sorted.map((r) => r.alarm.id)).toEqual(['untri', 'flow', 'done']);
  });

  it('within In-workflow, orders by stage: pre-meeting -> meeting -> post-meeting', () => {
    const rows: EnrichedAlarmRow[] = [
      row('post', 'In-workflow', 'post-meeting'),
      row('meet', 'In-workflow', 'meeting'),
      row('pre', 'In-workflow', 'pre-meeting'),
    ];
    const sorted = sortRows(rows, 'default');
    expect(sorted.map((r) => r.alarm.id)).toEqual(['pre', 'meet', 'post']);
  });

  it('is stable for rows with identical bucket and stage', () => {
    const rows: EnrichedAlarmRow[] = [
      row('a', 'In-workflow', 'pre-meeting'),
      row('b', 'In-workflow', 'pre-meeting'),
      row('c', 'In-workflow', 'pre-meeting'),
    ];
    const sorted = sortRows(rows, 'default');
    expect(sorted.map((r) => r.alarm.id)).toEqual(['a', 'b', 'c']);
  });

  it('does not mutate the input array', () => {
    const rows: EnrichedAlarmRow[] = [
      row('done', 'Done', 'done'),
      row('untri', 'Un-triaged', 'un-triaged'),
    ];
    const original = [...rows];
    sortRows(rows, 'default');
    expect(rows).toEqual(original);
  });
});

describe('sortRows (by-cause mode)', () => {
  it('groups rows that share an issue id together', () => {
    const rows: EnrichedAlarmRow[] = [
      row('a1', 'In-workflow', 'pre-meeting', 'iss-A'),
      row('b1', 'In-workflow', 'pre-meeting', 'iss-B'),
      row('a2', 'Done', 'done', 'iss-A'),
      row('b2', 'Un-triaged', 'un-triaged', 'iss-B'),
    ];
    const sorted = sortRows(rows, 'by-cause');
    const ids = sorted.map((r) => r.alarm.id);
    const idxA1 = ids.indexOf('a1');
    const idxA2 = ids.indexOf('a2');
    const idxB1 = ids.indexOf('b1');
    const idxB2 = ids.indexOf('b2');
    // a1 and a2 (issue A) must be adjacent; same for b1/b2.
    expect(Math.abs(idxA1 - idxA2)).toBe(1);
    expect(Math.abs(idxB1 - idxB2)).toBe(1);
  });

  it('places larger clusters first', () => {
    const rows: EnrichedAlarmRow[] = [
      row('solo', 'In-workflow', 'pre-meeting', 'iss-solo'),
      row('big-1', 'In-workflow', 'pre-meeting', 'iss-big'),
      row('big-2', 'In-workflow', 'pre-meeting', 'iss-big'),
      row('big-3', 'In-workflow', 'pre-meeting', 'iss-big'),
    ];
    const sorted = sortRows(rows, 'by-cause');
    expect(sorted.slice(0, 3).map((r) => r.alarm.id)).toEqual(['big-1', 'big-2', 'big-3']);
    expect(sorted[3].alarm.id).toBe('solo');
  });

  it('keeps un-linked (no issue) rows together at the end', () => {
    const rows: EnrichedAlarmRow[] = [
      row('orphan-1', 'Un-triaged', 'un-triaged'),
      row('linked-1', 'In-workflow', 'pre-meeting', 'iss-A'),
      row('orphan-2', 'Un-triaged', 'un-triaged'),
      row('linked-2', 'In-workflow', 'pre-meeting', 'iss-A'),
    ];
    const sorted = sortRows(rows, 'by-cause');
    const ids = sorted.map((r) => r.alarm.id);
    expect(ids.slice(0, 2)).toEqual(['linked-1', 'linked-2']);
    expect(ids.slice(2).sort()).toEqual(['orphan-1', 'orphan-2']);
  });
});

describe('sortRows mode type', () => {
  it('accepts the documented modes', () => {
    const modes: SortMode[] = ['default', 'by-cause'];
    expect(modes).toHaveLength(2);
  });
});
