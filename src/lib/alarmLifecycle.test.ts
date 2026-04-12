import { describe, expect, it } from 'vitest';
import { alarmLifecycle } from './alarmLifecycle';
import type { Alarm, User } from '../types';

const now = '2025-06-01T12:00:00.000Z';

function makeAlarm(overrides: Partial<Alarm> = {}): Alarm {
  return {
    id: 'alm-001',
    type: 'TempSpike',
    severity: 'High',
    message: 'Chamber temperature exceeded threshold',
    time: '2025-06-01T11:00:00.000Z',
    machineId: 'LITHO-07',
    product: 'A7-Litho',
    operation: 'Wafer transfer',
    owner: 'H. Tanaka',
    department: 'Litho',
    status: 'Open',
    labels: [],
    activity: [
      { id: 'alm-001-act-1', type: 'created', timestamp: '2025-06-01T11:00:00.000Z', author: 'system' },
    ],
    ...overrides,
  };
}

const lithoUser: User = { id: 'user-rossi', name: 'L. Rossi', department: 'Litho' };
const etchUser: User = { id: 'user-chen', name: 'M. Chen', department: 'Etch' };

describe('alarmLifecycle', () => {
  describe('ack', () => {
    it('acks an Open alarm with same-department user', () => {
      const alarm = makeAlarm();
      const result = alarmLifecycle.ack(alarm, lithoUser, now);
      expect(result.alarm.status).toBe('Acked');
      expect(result.activityEntry.type).toBe('acked');
      expect(result.activityEntry.author).toBe('L. Rossi');
      expect(result.activityEntry.timestamp).toBe(now);
    });

    it('ack with comment stores note on activity entry', () => {
      const alarm = makeAlarm();
      const result = alarmLifecycle.ack(alarm, lithoUser, now, 'Checked chamber, looks fine');
      expect(result.activityEntry.note).toBe('Checked chamber, looks fine');
      expect(result.activityEntry.type).toBe('acked');
    });

    it('throws when cross-department user tries to ack', () => {
      const alarm = makeAlarm();
      expect(() => alarmLifecycle.ack(alarm, etchUser, now)).toThrow();
    });

    it('throws on double-ack (already Acked)', () => {
      const alarm = makeAlarm({ status: 'Acked' });
      expect(() => alarmLifecycle.ack(alarm, lithoUser, now)).toThrow();
    });

    it('does not mutate the original alarm', () => {
      const alarm = makeAlarm();
      const result = alarmLifecycle.ack(alarm, lithoUser, now);
      expect(alarm.status).toBe('Open');
      expect(result.alarm).not.toBe(alarm);
    });
  });

  describe('setLabel', () => {
    it('adds a label and writes label_added activity', () => {
      const alarm = makeAlarm();
      const result = alarmLifecycle.setLabel(alarm, lithoUser, 'add', 'Recurring', now);
      expect(result.alarm.labels).toContain('Recurring');
      expect(result.activityEntry.type).toBe('label_added');
      expect(result.activityEntry.label).toBe('Recurring');
    });

    it('removes a label and writes label_removed activity', () => {
      const alarm = makeAlarm({ labels: ['Recurring', 'FalsePositive'] });
      const result = alarmLifecycle.setLabel(alarm, lithoUser, 'remove', 'Recurring', now);
      expect(result.alarm.labels).not.toContain('Recurring');
      expect(result.alarm.labels).toContain('FalsePositive');
      expect(result.activityEntry.type).toBe('label_removed');
      expect(result.activityEntry.label).toBe('Recurring');
    });

    it('does not mutate the original alarm', () => {
      const alarm = makeAlarm();
      alarmLifecycle.setLabel(alarm, lithoUser, 'add', 'Recurring', now);
      expect(alarm.labels).toEqual([]);
    });
  });

  describe('setRisk', () => {
    it('sets risk and records from/to in activity', () => {
      const alarm = makeAlarm();
      const result = alarmLifecycle.setRisk(alarm, lithoUser, 'high', now);
      expect(result.alarm.humanRisk).toBe('high');
      expect(result.activityEntry.type).toBe('risk_changed');
      expect(result.activityEntry.fromRisk).toBeUndefined();
      expect(result.activityEntry.toRisk).toBe('high');
    });

    it('records previous risk as fromRisk', () => {
      const alarm = makeAlarm({ humanRisk: 'low' });
      const result = alarmLifecycle.setRisk(alarm, lithoUser, 'high', now);
      expect(result.activityEntry.fromRisk).toBe('low');
      expect(result.activityEntry.toRisk).toBe('high');
    });

    it('does not mutate the original alarm', () => {
      const alarm = makeAlarm();
      alarmLifecycle.setRisk(alarm, lithoUser, 'high', now);
      expect(alarm.humanRisk).toBeUndefined();
    });
  });

  describe('recover', () => {
    it('sets recoveryTime and writes recovered activity', () => {
      const alarm = makeAlarm();
      const result = alarmLifecycle.recover(alarm, now);
      expect(result.alarm.recoveryTime).toBe(now);
      expect(result.activityEntry.type).toBe('recovered');
      expect(result.activityEntry.author).toBe('system');
    });

    it('throws if alarm already has recoveryTime', () => {
      const alarm = makeAlarm({ recoveryTime: '2025-06-01T11:30:00.000Z' });
      expect(() => alarmLifecycle.recover(alarm, now)).toThrow();
    });

    it('does not mutate the original alarm', () => {
      const alarm = makeAlarm();
      alarmLifecycle.recover(alarm, now);
      expect(alarm.recoveryTime).toBeUndefined();
    });
  });

  describe('link', () => {
    it('auto-acks an Open alarm, writing acked_via_issue and linked as two entries', () => {
      const alarm = makeAlarm({ status: 'Open' });
      const result = alarmLifecycle.link(alarm, 'iss-042', lithoUser, now);
      expect(result.alarm.status).toBe('Acked');
      // Two new activity entries: acked_via_issue then linked
      const newEntries = result.alarm.activity.slice(1); // skip 'created'
      expect(newEntries).toHaveLength(2);
      expect(newEntries[0].type).toBe('acked_via_issue');
      expect(newEntries[0].issueId).toBe('iss-042');
      expect(newEntries[1].type).toBe('linked');
      expect(newEntries[1].issueId).toBe('iss-042');
    });

    it('writes only linked entry when alarm is already Acked', () => {
      const alarm = makeAlarm({ status: 'Acked' });
      const result = alarmLifecycle.link(alarm, 'iss-042', lithoUser, now);
      expect(result.alarm.status).toBe('Acked');
      const newEntries = result.alarm.activity.slice(1);
      expect(newEntries).toHaveLength(1);
      expect(newEntries[0].type).toBe('linked');
      expect(newEntries[0].issueId).toBe('iss-042');
    });

    it('does not mutate the original alarm', () => {
      const alarm = makeAlarm({ status: 'Open' });
      alarmLifecycle.link(alarm, 'iss-042', lithoUser, now);
      expect(alarm.status).toBe('Open');
    });
  });

  describe('unlink', () => {
    it('writes unlinked activity and preserves alarm status', () => {
      const alarm = makeAlarm({ status: 'Acked' });
      const result = alarmLifecycle.unlink(alarm, 'iss-042', lithoUser, now);
      expect(result.alarm.status).toBe('Acked');
      const newEntries = result.alarm.activity.slice(1);
      expect(newEntries).toHaveLength(1);
      expect(newEntries[0].type).toBe('unlinked');
      expect(newEntries[0].issueId).toBe('iss-042');
    });

    it('does not mutate the original alarm', () => {
      const alarm = makeAlarm({ status: 'Acked' });
      alarmLifecycle.unlink(alarm, 'iss-042', lithoUser, now);
      expect(alarm.activity).toHaveLength(1); // only 'created'
    });
  });
});
