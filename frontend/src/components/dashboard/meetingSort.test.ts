import { describe, it, expect } from 'vitest';
import { sortMeetingRows, isMeetingTbd, formatMeetingLabel } from './meetingSort';
import type { EnrichedAlarmRow } from '../../hooks/useDashboardData';

function meetingRow(id: string, meetingTime?: string): EnrichedAlarmRow {
  return {
    alarm: { id } as EnrichedAlarmRow['alarm'],
    issue: { id: `iss-${id}` } as EnrichedAlarmRow['issue'],
    bucket: 'In-workflow',
    stage: 'meeting',
    meetingBound: true,
    meetingTime,
  };
}

describe('sortMeetingRows', () => {
  it('orders rows by meetingTime ascending', () => {
    const rows = [
      meetingRow('late', '2026-04-17T17:30:00Z'),
      meetingRow('early', '2026-04-17T15:00:00Z'),
      meetingRow('mid', '2026-04-17T16:30:00Z'),
    ];
    const sorted = sortMeetingRows(rows);
    expect(sorted.map((r) => r.alarm.id)).toEqual(['early', 'mid', 'late']);
  });

  it('sinks rows with no meetingTime to the bottom', () => {
    const rows = [
      meetingRow('tbd-1'),
      meetingRow('scheduled', '2026-04-17T16:00:00Z'),
      meetingRow('tbd-2'),
    ];
    const sorted = sortMeetingRows(rows);
    expect(sorted.map((r) => r.alarm.id)).toEqual(['scheduled', 'tbd-1', 'tbd-2']);
  });

  it('preserves input order among rows that share the same meetingTime', () => {
    const rows = [
      meetingRow('a', '2026-04-17T16:00:00Z'),
      meetingRow('b', '2026-04-17T16:00:00Z'),
      meetingRow('c', '2026-04-17T16:00:00Z'),
    ];
    const sorted = sortMeetingRows(rows);
    expect(sorted.map((r) => r.alarm.id)).toEqual(['a', 'b', 'c']);
  });

  it('preserves input order among rows that all lack a meetingTime', () => {
    const rows = [meetingRow('x'), meetingRow('y'), meetingRow('z')];
    const sorted = sortMeetingRows(rows);
    expect(sorted.map((r) => r.alarm.id)).toEqual(['x', 'y', 'z']);
  });

  it('does not mutate the input array', () => {
    const rows = [
      meetingRow('late', '2026-04-17T17:30:00Z'),
      meetingRow('early', '2026-04-17T15:00:00Z'),
    ];
    const original = [...rows];
    sortMeetingRows(rows);
    expect(rows).toEqual(original);
  });
});

describe('isMeetingTbd', () => {
  it('returns true when row is meetingBound but has no meetingTime', () => {
    expect(isMeetingTbd(meetingRow('tbd'))).toBe(true);
  });

  it('returns false when meetingTime is present', () => {
    expect(isMeetingTbd(meetingRow('scheduled', '2026-04-17T16:00:00Z'))).toBe(false);
  });
});

describe('formatMeetingLabel', () => {
  it('returns "Meeting TBD" when meetingTime is missing', () => {
    expect(formatMeetingLabel(undefined)).toBe('Meeting TBD');
  });

  it('returns yyyy-MM-dd HH:mm for ISO input', () => {
    expect(formatMeetingLabel('2026-04-17T17:00:00Z')).toBe('2026-04-17 17:00');
  });
});
