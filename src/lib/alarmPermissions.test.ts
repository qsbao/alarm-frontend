import { describe, expect, it } from 'vitest';
import { alarmPermissions } from './alarmPermissions';
import type { Alarm, User } from '../types';

const baseAlarm: Alarm = {
  id: 'alm-001',
  type: 'TempSpike',
  severity: 'High',
  message: 'Chamber temperature exceeded threshold',
  time: '2025-01-01T00:00:00.000Z',
  machineId: 'LITHO-07',
  product: 'A7-Litho',
  operation: 'Wafer transfer',
  owner: 'H. Tanaka',
  department: 'Litho',
  status: 'Open',
  labels: [],
  activity: [],
};

describe('alarmPermissions', () => {
  describe('canAck', () => {
    it('returns true when user department matches alarm department', () => {
      const user: User = { name: 'L. Rossi', department: 'Litho' };
      expect(alarmPermissions.canAck(user, baseAlarm)).toBe(true);
    });

    it('returns false when user department differs from alarm department', () => {
      const user: User = { name: 'M. Chen', department: 'Etch' };
      expect(alarmPermissions.canAck(user, baseAlarm)).toBe(false);
    });

    it('returns false for unknown user (no department)', () => {
      const user: User = { name: 'Unknown', department: '' };
      expect(alarmPermissions.canAck(user, baseAlarm)).toBe(false);
    });

    it('allows same-department ack even if user is not the alarm owner', () => {
      const user: User = { name: 'R. Garcia', department: 'Litho' };
      expect(alarmPermissions.canAck(user, baseAlarm)).toBe(true);
    });

    it('denies cross-department even if names match', () => {
      const user: User = { name: 'H. Tanaka', department: 'Etch' };
      expect(alarmPermissions.canAck(user, baseAlarm)).toBe(false);
    });
  });
});
