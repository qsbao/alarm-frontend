import { describe, expect, it } from 'vitest';
import {
  meetingReducer,
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
});
