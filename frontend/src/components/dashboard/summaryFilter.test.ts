import { describe, it, expect } from 'vitest';
import { filterRowsByBucket } from './summaryFilter';
import type { EnrichedAlarmRow } from '../../hooks/useDashboardData';

function row(id: string, bucket: EnrichedAlarmRow['bucket'], meetingBound = false): EnrichedAlarmRow {
  return {
    alarm: { id } as EnrichedAlarmRow['alarm'],
    bucket,
    stage: bucket === 'Un-triaged' ? 'un-triaged' : bucket === 'Done' ? 'done' : 'pre-meeting',
    meetingBound,
  };
}

describe('filterRowsByBucket', () => {
  const rows: EnrichedAlarmRow[] = [
    row('a1', 'Un-triaged'),
    row('a2', 'In-workflow'),
    row('a3', 'In-workflow', true),
    row('a4', 'Done'),
  ];

  it('returns all rows when filter is null / "All"', () => {
    expect(filterRowsByBucket(rows, null).map((r) => r.alarm.id)).toEqual(['a1', 'a2', 'a3', 'a4']);
  });

  it('filters to Un-triaged rows only', () => {
    expect(filterRowsByBucket(rows, 'Un-triaged').map((r) => r.alarm.id)).toEqual(['a1']);
  });

  it('filters to In-workflow rows only', () => {
    expect(filterRowsByBucket(rows, 'In-workflow').map((r) => r.alarm.id)).toEqual(['a2', 'a3']);
  });

  it('filters to Done rows only', () => {
    expect(filterRowsByBucket(rows, 'Done').map((r) => r.alarm.id)).toEqual(['a4']);
  });

  it('filters to meeting-bound rows when filter is "Meetings"', () => {
    expect(filterRowsByBucket(rows, 'Meetings').map((r) => r.alarm.id)).toEqual(['a3']);
  });
});
