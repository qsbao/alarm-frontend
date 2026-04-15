import { describe, expect, it } from 'vitest';
import {
  meetingReducer,
  isValidRescheduleTime,
  getFailedEntries,
  getMeetingSummary,
  type MeetingEntries,
  type MeetingAction,
} from './meetingReducer';

const ACTOR = 'user-tanaka';
const NOW = '2026-04-15T10:00:00Z';

function schedule(time: string): MeetingAction {
  return { type: 'schedule', scheduledTime: time, recordedBy: ACTOR, recordedAt: NOW };
}

function pass(heldTime: string, conclusion: string): MeetingAction {
  return { type: 'pass', actualHeldTime: heldTime, conclusion, recordedBy: ACTOR, recordedAt: NOW };
}

function reschedule(actualHeldTime: string, failReason: string, newTime: string): MeetingAction {
  return {
    type: 'reschedule',
    actualHeldTime,
    failReason,
    newScheduledTime: newTime,
    recordedBy: ACTOR,
    recordedAt: NOW,
  };
}

describe('meetingReducer', () => {
  describe('schedule from empty', () => {
    it('appends a scheduled entry', () => {
      const entries: MeetingEntries = [];
      const result = meetingReducer(entries, schedule('2026-04-20T14:00:00Z'));
      expect(result).toHaveLength(1);
      expect(result[0]).toEqual({
        kind: 'scheduled',
        scheduledTime: '2026-04-20T14:00:00Z',
        recordedBy: ACTOR,
        recordedAt: NOW,
      });
    });
  });

  describe('pass', () => {
    it('appends a passed entry after a scheduled entry', () => {
      const entries: MeetingEntries = [
        { kind: 'scheduled', scheduledTime: '2026-04-20T14:00:00Z', recordedBy: ACTOR, recordedAt: NOW },
      ];
      const result = meetingReducer(entries, pass('2026-04-20T14:30:00Z', 'Issue root-caused to drift in chamber B.'));
      expect(result).toHaveLength(2);
      expect(result[1]).toEqual({
        kind: 'passed',
        actualHeldTime: '2026-04-20T14:30:00Z',
        conclusion: 'Issue root-caused to drift in chamber B.',
        recordedBy: ACTOR,
        recordedAt: NOW,
      });
    });

    it('rejects pass from empty state', () => {
      expect(() => meetingReducer([], pass('2026-04-20T14:30:00Z', 'Conclusion'))).toThrow();
    });

    it('rejects pass when conclusion is too short', () => {
      const entries: MeetingEntries = [
        { kind: 'scheduled', scheduledTime: '2026-04-20T14:00:00Z', recordedBy: ACTOR, recordedAt: NOW },
      ];
      expect(() => meetingReducer(entries, { ...pass('2026-04-20T14:30:00Z', 'ab'), conclusion: 'ab' })).toThrow();
    });
  });

  describe('reschedule', () => {
    it('appends exactly two entries: failed + scheduled', () => {
      const entries: MeetingEntries = [
        { kind: 'scheduled', scheduledTime: '2026-04-20T14:00:00Z', recordedBy: ACTOR, recordedAt: NOW },
      ];
      const result = meetingReducer(entries, reschedule(
        '2026-04-20T14:30:00Z',
        'Equipment owner unavailable',
        '2026-04-25T14:00:00Z',
      ));
      expect(result).toHaveLength(3);
      expect(result[1]).toEqual({
        kind: 'failed',
        actualHeldTime: '2026-04-20T14:30:00Z',
        failReason: 'Equipment owner unavailable',
        recordedBy: ACTOR,
        recordedAt: NOW,
      });
      expect(result[2]).toEqual({
        kind: 'scheduled',
        scheduledTime: '2026-04-25T14:00:00Z',
        recordedBy: ACTOR,
        recordedAt: NOW,
      });
    });

    it('rejects reschedule on empty entries', () => {
      expect(() => meetingReducer([], reschedule(
        '2026-04-20T14:30:00Z',
        'Some reason',
        '2026-04-25T14:00:00Z',
      ))).toThrow();
    });

    it('rejects reschedule when new time is not after prior scheduledTime', () => {
      const entries: MeetingEntries = [
        { kind: 'scheduled', scheduledTime: '2026-04-20T14:00:00Z', recordedBy: ACTOR, recordedAt: NOW },
      ];
      expect(() => meetingReducer(entries, reschedule(
        '2026-04-20T14:30:00Z',
        'Equipment owner unavailable',
        '2026-04-19T10:00:00Z',
      ))).toThrow();
    });

    it('rejects reschedule when new time equals prior scheduledTime', () => {
      const entries: MeetingEntries = [
        { kind: 'scheduled', scheduledTime: '2026-04-20T14:00:00Z', recordedBy: ACTOR, recordedAt: NOW },
      ];
      expect(() => meetingReducer(entries, reschedule(
        '2026-04-20T14:30:00Z',
        'Equipment owner unavailable',
        '2026-04-20T14:00:00Z',
      ))).toThrow();
    });
  });

  describe('isValidRescheduleTime', () => {
    it('accepts a time strictly after prior scheduledTime', () => {
      expect(isValidRescheduleTime('2026-04-25T14:00:00Z', '2026-04-20T14:00:00Z')).toBe(true);
    });

    it('rejects a time equal to prior scheduledTime', () => {
      expect(isValidRescheduleTime('2026-04-20T14:00:00Z', '2026-04-20T14:00:00Z')).toBe(false);
    });

    it('rejects a time before prior scheduledTime', () => {
      expect(isValidRescheduleTime('2026-04-19T10:00:00Z', '2026-04-20T14:00:00Z')).toBe(false);
    });
  });

  describe('getFailedEntries', () => {
    it('returns empty array when no failures', () => {
      const entries: MeetingEntries = [
        { kind: 'scheduled', scheduledTime: '2026-04-20T14:00:00Z', recordedBy: ACTOR, recordedAt: NOW },
      ];
      expect(getFailedEntries(entries)).toEqual([]);
    });

    it('returns all failed entries', () => {
      const entries: MeetingEntries = [
        { kind: 'scheduled', scheduledTime: '2026-04-20T14:00:00Z', recordedBy: ACTOR, recordedAt: NOW },
        { kind: 'failed', actualHeldTime: '2026-04-20T14:30:00Z', failReason: 'Reason 1', recordedBy: ACTOR, recordedAt: NOW },
        { kind: 'scheduled', scheduledTime: '2026-04-25T14:00:00Z', recordedBy: ACTOR, recordedAt: NOW },
        { kind: 'failed', actualHeldTime: '2026-04-25T14:30:00Z', failReason: 'Reason 2', recordedBy: ACTOR, recordedAt: NOW },
        { kind: 'scheduled', scheduledTime: '2026-04-30T14:00:00Z', recordedBy: ACTOR, recordedAt: NOW },
      ];
      const failed = getFailedEntries(entries);
      expect(failed).toHaveLength(2);
      expect(failed[0].failReason).toBe('Reason 1');
      expect(failed[1].failReason).toBe('Reason 2');
    });
  });

  describe('getMeetingSummary', () => {
    it('returns correct counts for a completed meeting with reschedules', () => {
      const entries: MeetingEntries = [
        { kind: 'scheduled', scheduledTime: '2026-04-20T14:00:00Z', recordedBy: ACTOR, recordedAt: NOW },
        { kind: 'failed', actualHeldTime: '2026-04-20T14:30:00Z', failReason: 'Reason 1', recordedBy: ACTOR, recordedAt: NOW },
        { kind: 'scheduled', scheduledTime: '2026-04-25T14:00:00Z', recordedBy: ACTOR, recordedAt: NOW },
        { kind: 'failed', actualHeldTime: '2026-04-25T14:30:00Z', failReason: 'Reason 2', recordedBy: ACTOR, recordedAt: NOW },
        { kind: 'scheduled', scheduledTime: '2026-04-30T14:00:00Z', recordedBy: ACTOR, recordedAt: NOW },
        { kind: 'passed', actualHeldTime: '2026-04-30T14:30:00Z', conclusion: 'Resolved after third attempt.', recordedBy: ACTOR, recordedAt: NOW },
      ];
      const summary = getMeetingSummary(entries);
      expect(summary).toEqual({ totalMeetings: 3, rescheduled: 2 });
    });

    it('returns correct counts for single meeting with no reschedules', () => {
      const entries: MeetingEntries = [
        { kind: 'scheduled', scheduledTime: '2026-04-20T14:00:00Z', recordedBy: ACTOR, recordedAt: NOW },
        { kind: 'passed', actualHeldTime: '2026-04-20T14:30:00Z', conclusion: 'Resolved on first try.', recordedBy: ACTOR, recordedAt: NOW },
      ];
      const summary = getMeetingSummary(entries);
      expect(summary).toEqual({ totalMeetings: 1, rescheduled: 0 });
    });
  });
});
