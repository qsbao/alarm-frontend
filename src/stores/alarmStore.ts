import { create } from 'zustand';
import type { Alarm, AlarmLabel, HumanRisk, User } from '../types';
import { MOCK_ALARMS } from '../mocks/alarms';
import { alarmLifecycle } from '../lib/alarmLifecycle';

interface AlarmStore {
  alarms: Alarm[];
  ackAlarm: (id: string, user: User, comment?: string) => void;
  setAlarmLabel: (id: string, user: User, action: 'add' | 'remove', label: AlarmLabel) => void;
  setAlarmRisk: (id: string, user: User, risk: HumanRisk) => void;
  recoverAlarm: (id: string) => void;
}

function replaceAlarm(alarms: Alarm[], updated: Alarm): Alarm[] {
  return alarms.map((a) => (a.id === updated.id ? updated : a));
}

export const useAlarmStore = create<AlarmStore>()((set, get) => ({
  alarms: MOCK_ALARMS,

  ackAlarm(id, user, comment) {
    const alarm = get().alarms.find((a) => a.id === id);
    if (!alarm) return;
    const { alarm: updated } = alarmLifecycle.ack(alarm, user, new Date().toISOString(), comment);
    set({ alarms: replaceAlarm(get().alarms, updated) });
  },

  setAlarmLabel(id, user, action, label) {
    const alarm = get().alarms.find((a) => a.id === id);
    if (!alarm) return;
    const { alarm: updated } = alarmLifecycle.setLabel(alarm, user, action, label, new Date().toISOString());
    set({ alarms: replaceAlarm(get().alarms, updated) });
  },

  setAlarmRisk(id, user, risk) {
    const alarm = get().alarms.find((a) => a.id === id);
    if (!alarm) return;
    const { alarm: updated } = alarmLifecycle.setRisk(alarm, user, risk, new Date().toISOString());
    set({ alarms: replaceAlarm(get().alarms, updated) });
  },

  recoverAlarm(id) {
    const alarm = get().alarms.find((a) => a.id === id);
    if (!alarm) return;
    const { alarm: updated } = alarmLifecycle.recover(alarm, new Date().toISOString());
    set({ alarms: replaceAlarm(get().alarms, updated) });
  },
}));
