import type { Alarm, User } from '../types';

export const alarmPermissions = {
  canAck(user: User, alarm: Alarm): boolean {
    return user.department !== '' && user.department === alarm.department;
  },
};
