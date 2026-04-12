import { describe, expect, it, beforeEach } from 'vitest';
import {
  attachAlarm,
  detachAlarm,
  getActiveAlarmsForIssue,
  getActiveIssueForAlarm,
  getHistoricalAlarmsForIssue,
  moveAlarm,
  resetIssueAlarms,
  type IssueAlarm,
} from './issueAlarms';

beforeEach(() => {
  resetIssueAlarms();
});

describe('issueAlarms', () => {
  describe('attachAlarm / getActiveAlarmsForIssue round-trip', () => {
    it('attaches an alarm and retrieves it as active', () => {
      const row = attachAlarm('iss-001', 'alm-001', 'user-a');
      expect(row.issueId).toBe('iss-001');
      expect(row.alarmId).toBe('alm-001');
      expect(row.attachedBy).toBe('user-a');
      expect(row.attachedAt).toBeTruthy();
      expect(row.mergedAt).toBeUndefined();

      const active = getActiveAlarmsForIssue('iss-001');
      expect(active).toHaveLength(1);
      expect(active[0].alarmId).toBe('alm-001');
    });

    it('supports multiple alarms on the same issue', () => {
      attachAlarm('iss-001', 'alm-001', 'user-a');
      attachAlarm('iss-001', 'alm-002', 'user-a');
      expect(getActiveAlarmsForIssue('iss-001')).toHaveLength(2);
    });

    it('returns empty array for issue with no alarms', () => {
      expect(getActiveAlarmsForIssue('iss-999')).toEqual([]);
    });

    it('does not duplicate identical attachment', () => {
      attachAlarm('iss-001', 'alm-001', 'user-a');
      attachAlarm('iss-001', 'alm-001', 'user-b');
      expect(getActiveAlarmsForIssue('iss-001')).toHaveLength(1);
    });
  });

  describe('detachAlarm', () => {
    it('removes the active link', () => {
      attachAlarm('iss-001', 'alm-001', 'user-a');
      const removed = detachAlarm('iss-001', 'alm-001');
      expect(removed).toBe(true);
      expect(getActiveAlarmsForIssue('iss-001')).toEqual([]);
    });

    it('returns false when link does not exist', () => {
      const removed = detachAlarm('iss-001', 'alm-999');
      expect(removed).toBe(false);
    });
  });

  describe('getActiveIssueForAlarm', () => {
    it('returns the issue row for a linked alarm', () => {
      attachAlarm('iss-001', 'alm-001', 'user-a');
      const row = getActiveIssueForAlarm('alm-001');
      expect(row).toBeDefined();
      expect(row!.issueId).toBe('iss-001');
    });

    it('returns undefined for an unlinked alarm', () => {
      expect(getActiveIssueForAlarm('alm-999')).toBeUndefined();
    });

    it('returns undefined after detach', () => {
      attachAlarm('iss-001', 'alm-001', 'user-a');
      detachAlarm('iss-001', 'alm-001');
      expect(getActiveIssueForAlarm('alm-001')).toBeUndefined();
    });
  });

  describe('active vs. historical query separation', () => {
    it('historical returns rows with mergedAt set', () => {
      const row = attachAlarm('iss-001', 'alm-001', 'user-a');
      // Simulate merge by setting merge metadata
      row.mergedAt = '2025-06-01T12:00:00Z';
      row.mergedBy = 'user-b';
      row.mergedToIssueId = 'iss-002';

      // Active should not include the merged row
      expect(getActiveAlarmsForIssue('iss-001')).toEqual([]);

      // Historical should include it
      const historical = getHistoricalAlarmsForIssue('iss-001');
      expect(historical).toHaveLength(1);
      expect(historical[0].alarmId).toBe('alm-001');
      expect(historical[0].mergedToIssueId).toBe('iss-002');
    });

    it('historical returns empty when no merged rows exist', () => {
      attachAlarm('iss-001', 'alm-001', 'user-a');
      expect(getHistoricalAlarmsForIssue('iss-001')).toEqual([]);
    });

    it('active excludes historical; historical excludes active', () => {
      const row1 = attachAlarm('iss-001', 'alm-001', 'user-a');
      attachAlarm('iss-001', 'alm-002', 'user-a');
      // Mark alm-001 as merged
      row1.mergedAt = '2025-06-01T12:00:00Z';
      row1.mergedBy = 'user-b';
      row1.mergedToIssueId = 'iss-002';

      expect(getActiveAlarmsForIssue('iss-001').map((r) => r.alarmId)).toEqual(['alm-002']);
      expect(getHistoricalAlarmsForIssue('iss-001').map((r) => r.alarmId)).toEqual(['alm-001']);
    });
  });

  describe('moveAlarm', () => {
    it('atomically reassigns alarm — no transient unlinked state', () => {
      attachAlarm('iss-001', 'alm-001', 'user-a');

      const result = moveAlarm('alm-001', 'iss-002', {
        by: 'user-a',
        sourceDepartment: 'Litho',
        targetDepartment: 'Litho',
        userDepartment: 'Litho',
      });

      expect(result.ok).toBe(true);

      // After move: alarm is active on iss-002, not on iss-001
      expect(getActiveAlarmsForIssue('iss-002')).toHaveLength(1);
      expect(getActiveAlarmsForIssue('iss-002')[0].alarmId).toBe('alm-001');
      expect(getActiveAlarmsForIssue('iss-001')).toHaveLength(0);

      // Historical record exists on iss-001
      const hist = getHistoricalAlarmsForIssue('iss-001');
      expect(hist).toHaveLength(1);
      expect(hist[0].mergedToIssueId).toBe('iss-002');
    });

    it('rejects when source issue is outside user department', () => {
      attachAlarm('iss-001', 'alm-001', 'user-a');

      const result = moveAlarm('alm-001', 'iss-002', {
        by: 'user-a',
        sourceDepartment: 'Etch',
        targetDepartment: 'Litho',
        userDepartment: 'Litho',
      });

      expect(result.ok).toBe(false);
      if (!result.ok) expect(result.reason).toBe('permission_denied');

      // Alarm unchanged
      expect(getActiveAlarmsForIssue('iss-001')).toHaveLength(1);
    });

    it('rejects when target issue is outside user department', () => {
      attachAlarm('iss-001', 'alm-001', 'user-a');

      const result = moveAlarm('alm-001', 'iss-002', {
        by: 'user-a',
        sourceDepartment: 'Litho',
        targetDepartment: 'Etch',
        userDepartment: 'Litho',
      });

      expect(result.ok).toBe(false);
      if (!result.ok) expect(result.reason).toBe('permission_denied');
    });

    it('rejects when alarm has no active link', () => {
      const result = moveAlarm('alm-999', 'iss-002', {
        by: 'user-a',
        sourceDepartment: 'Litho',
        targetDepartment: 'Litho',
        userDepartment: 'Litho',
      });

      expect(result.ok).toBe(false);
      if (!result.ok) expect(result.reason).toBe('not_found');
    });

    it('returns fromIssueId and toIssueId on success', () => {
      attachAlarm('iss-001', 'alm-001', 'user-a');

      const result = moveAlarm('alm-001', 'iss-002', {
        by: 'user-a',
        sourceDepartment: 'Litho',
        targetDepartment: 'Litho',
        userDepartment: 'Litho',
      });

      expect(result.ok).toBe(true);
      if (result.ok) {
        expect(result.fromIssueId).toBe('iss-001');
        expect(result.toIssueId).toBe('iss-002');
      }
    });
  });

  describe('resetIssueAlarms', () => {
    it('clears all rows', () => {
      attachAlarm('iss-001', 'alm-001', 'user-a');
      attachAlarm('iss-002', 'alm-002', 'user-a');
      resetIssueAlarms();
      expect(getActiveAlarmsForIssue('iss-001')).toEqual([]);
      expect(getActiveAlarmsForIssue('iss-002')).toEqual([]);
    });
  });
});
