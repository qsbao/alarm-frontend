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

const lithoUser: User = { name: 'L. Rossi', department: 'Litho' };
const etchUser: User = { name: 'M. Chen', department: 'Etch' };

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
});
