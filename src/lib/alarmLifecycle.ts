import type { Alarm, AlarmActivityEntry, AlarmLabel, HumanRisk, User } from '../types';
import { alarmPermissions } from './alarmPermissions';

interface LifecycleResult {
  alarm: Alarm;
  activityEntry: AlarmActivityEntry;
}

let actCounter = 0;
function nextActId(alarmId: string): string {
  actCounter += 1;
  return `${alarmId}-lc-${actCounter}`;
}

export const alarmLifecycle = {
  ack(alarm: Alarm, user: User, timestamp: string, comment?: string): LifecycleResult {
    if (alarm.status === 'Acked') {
      throw new Error(`Alarm ${alarm.id} is already acknowledged`);
    }
    if (!alarmPermissions.canAck(user, alarm)) {
      throw new Error(`User ${user.name} (${user.department}) cannot ack alarm in ${alarm.department}`);
    }

    const activityEntry: AlarmActivityEntry = {
      id: nextActId(alarm.id),
      type: 'acked',
      timestamp,
      author: user.name,
      ...(comment ? { note: comment } : {}),
    };

    return {
      alarm: {
        ...alarm,
        status: 'Acked',
        activity: [...alarm.activity, activityEntry],
      },
      activityEntry,
    };
  },

  setLabel(
    alarm: Alarm,
    user: User,
    action: 'add' | 'remove',
    label: AlarmLabel,
    timestamp: string,
  ): LifecycleResult {
    const activityEntry: AlarmActivityEntry = {
      id: nextActId(alarm.id),
      type: action === 'add' ? 'label_added' : 'label_removed',
      timestamp,
      author: user.name,
      label,
    };

    const labels =
      action === 'add'
        ? [...alarm.labels, label]
        : alarm.labels.filter((l) => l !== label);

    return {
      alarm: {
        ...alarm,
        labels,
        activity: [...alarm.activity, activityEntry],
      },
      activityEntry,
    };
  },

  setRisk(alarm: Alarm, user: User, risk: HumanRisk, timestamp: string): LifecycleResult {
    const activityEntry: AlarmActivityEntry = {
      id: nextActId(alarm.id),
      type: 'risk_changed',
      timestamp,
      author: user.name,
      fromRisk: alarm.humanRisk,
      toRisk: risk,
    };

    return {
      alarm: {
        ...alarm,
        humanRisk: risk,
        activity: [...alarm.activity, activityEntry],
      },
      activityEntry,
    };
  },

  recover(alarm: Alarm, timestamp: string): LifecycleResult {
    if (alarm.recoveryTime) {
      throw new Error(`Alarm ${alarm.id} already has a recoveryTime`);
    }

    const activityEntry: AlarmActivityEntry = {
      id: nextActId(alarm.id),
      type: 'recovered',
      timestamp,
      author: 'system',
    };

    return {
      alarm: {
        ...alarm,
        recoveryTime: timestamp,
        activity: [...alarm.activity, activityEntry],
      },
      activityEntry,
    };
  },
};
