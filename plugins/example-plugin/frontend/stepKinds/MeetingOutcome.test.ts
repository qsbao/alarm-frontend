import { describe, expect, it } from 'vitest';
import {
  getLatestFailureContext,
  getTimelineRows,
  type TimelineRow,
} from './meetingHelpers';
import type { MeetingEntries } from './meetingReducer';

const ACTOR = 'user-tanaka';
const NOW = '2026-04-15T10:00:00Z';

describe('getLatestFailureContext', () => {
  it('returns null when there are no failures', () => {
    const entries: MeetingEntries = [
      { kind: 'scheduled', scheduledTime: '2026-04-20T14:00:00Z', recordedBy: ACTOR, recordedAt: NOW },
    ];
    expect(getLatestFailureContext(entries)).toBeNull();
  });

  it('returns latest failure with zero earlier failures when only one failure', () => {
    const entries: MeetingEntries = [
      { kind: 'scheduled', scheduledTime: '2026-04-20T14:00:00Z', recordedBy: ACTOR, recordedAt: NOW },
      { kind: 'failed', actualHeldTime: '2026-04-20T14:30:00Z', failReason: 'Owner unavailable', recordedBy: 'user-smith', recordedAt: NOW },
      { kind: 'scheduled', scheduledTime: '2026-04-25T14:00:00Z', recordedBy: ACTOR, recordedAt: NOW },
    ];
    const ctx = getLatestFailureContext(entries);
    expect(ctx).not.toBeNull();
    expect(ctx!.latestFailure.failReason).toBe('Owner unavailable');
    expect(ctx!.latestFailure.actualHeldTime).toBe('2026-04-20T14:30:00Z');
    expect(ctx!.latestFailure.recordedBy).toBe('user-smith');
    expect(ctx!.earlierFailureCount).toBe(0);
  });

  it('returns latest failure and count of earlier failures when multiple', () => {
    const entries: MeetingEntries = [
      { kind: 'scheduled', scheduledTime: '2026-04-20T14:00:00Z', recordedBy: ACTOR, recordedAt: NOW },
      { kind: 'failed', actualHeldTime: '2026-04-20T14:30:00Z', failReason: 'Reason 1', recordedBy: ACTOR, recordedAt: NOW },
      { kind: 'scheduled', scheduledTime: '2026-04-25T14:00:00Z', recordedBy: ACTOR, recordedAt: NOW },
      { kind: 'failed', actualHeldTime: '2026-04-25T14:30:00Z', failReason: 'Reason 2', recordedBy: ACTOR, recordedAt: NOW },
      { kind: 'scheduled', scheduledTime: '2026-04-28T14:00:00Z', recordedBy: ACTOR, recordedAt: NOW },
      { kind: 'failed', actualHeldTime: '2026-04-28T14:30:00Z', failReason: 'Reason 3', recordedBy: 'user-lee', recordedAt: NOW },
      { kind: 'scheduled', scheduledTime: '2026-04-30T14:00:00Z', recordedBy: ACTOR, recordedAt: NOW },
    ];
    const ctx = getLatestFailureContext(entries);
    expect(ctx!.latestFailure.failReason).toBe('Reason 3');
    expect(ctx!.latestFailure.recordedBy).toBe('user-lee');
    expect(ctx!.earlierFailureCount).toBe(2);
  });
});

describe('getTimelineRows', () => {
  it('returns empty array for empty entries', () => {
    expect(getTimelineRows([])).toEqual([]);
  });

  it('returns a single scheduled row', () => {
    const entries: MeetingEntries = [
      { kind: 'scheduled', scheduledTime: '2026-04-20T14:00:00Z', recordedBy: ACTOR, recordedAt: NOW },
    ];
    const rows = getTimelineRows(entries);
    expect(rows).toHaveLength(1);
    expect(rows[0]).toEqual({
      type: 'scheduled',
      scheduledTime: '2026-04-20T14:00:00Z',
      recordedBy: ACTOR,
      recordedAt: NOW,
    });
  });

  it('merges adjacent failed+scheduled pairs into rescheduled rows', () => {
    const entries: MeetingEntries = [
      { kind: 'scheduled', scheduledTime: '2026-04-20T14:00:00Z', recordedBy: ACTOR, recordedAt: NOW },
      { kind: 'failed', actualHeldTime: '2026-04-20T14:30:00Z', failReason: 'Owner unavailable', recordedBy: ACTOR, recordedAt: NOW },
      { kind: 'scheduled', scheduledTime: '2026-04-25T14:00:00Z', recordedBy: ACTOR, recordedAt: NOW },
    ];
    const rows = getTimelineRows(entries);
    expect(rows).toHaveLength(2);
    expect(rows[0]).toEqual({
      type: 'rescheduled',
      actualHeldTime: '2026-04-20T14:30:00Z',
      failReason: 'Owner unavailable',
      newScheduledTime: '2026-04-25T14:00:00Z',
      recordedBy: ACTOR,
      recordedAt: NOW,
    });
    expect(rows[1]).toEqual({
      type: 'scheduled',
      scheduledTime: '2026-04-20T14:00:00Z',
      recordedBy: ACTOR,
      recordedAt: NOW,
    });
  });

  it('includes a passed row (first in reverse-chronological order)', () => {
    const entries: MeetingEntries = [
      { kind: 'scheduled', scheduledTime: '2026-04-20T14:00:00Z', recordedBy: ACTOR, recordedAt: NOW },
      { kind: 'passed', actualHeldTime: '2026-04-20T14:30:00Z', conclusion: 'Resolved the issue.', recordedBy: ACTOR, recordedAt: NOW },
    ];
    const rows = getTimelineRows(entries);
    expect(rows).toHaveLength(2);
    expect(rows[0]).toEqual({
      type: 'passed',
      actualHeldTime: '2026-04-20T14:30:00Z',
      conclusion: 'Resolved the issue.',
      recordedBy: ACTOR,
      recordedAt: NOW,
    });
  });

  it('renders full lifecycle in reverse-chronological order', () => {
    const entries: MeetingEntries = [
      { kind: 'scheduled', scheduledTime: '2026-04-20T14:00:00Z', recordedBy: ACTOR, recordedAt: '2026-04-15T10:00:00Z' },
      { kind: 'failed', actualHeldTime: '2026-04-20T14:30:00Z', failReason: 'Reason 1', recordedBy: ACTOR, recordedAt: '2026-04-20T15:00:00Z' },
      { kind: 'scheduled', scheduledTime: '2026-04-25T14:00:00Z', recordedBy: ACTOR, recordedAt: '2026-04-20T15:00:00Z' },
      { kind: 'passed', actualHeldTime: '2026-04-25T14:30:00Z', conclusion: 'All clear.', recordedBy: ACTOR, recordedAt: '2026-04-25T15:00:00Z' },
    ];
    const rows = getTimelineRows(entries);
    expect(rows).toHaveLength(3);
    // Reverse chronological
    expect(rows[0].type).toBe('passed');
    expect(rows[1].type).toBe('rescheduled');
    expect(rows[2].type).toBe('scheduled');
  });
});
