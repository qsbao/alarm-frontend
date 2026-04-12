import { create } from 'zustand';
import type { Alarm, AlarmLabel, HumanRisk, User } from '../types';
import { MOCK_ALARMS } from '../mocks/alarms';
import { alarmLifecycle } from '../lib/alarmLifecycle';
import { mockClock } from '../lib/mockClock';
import { attachAlarm as iaAttach, detachAlarm as iaDetach, getActiveIssueForAlarm } from '../lib/issueAlarms';

interface AlarmStore {
  alarms: Alarm[];
  addAlarm: (alarm: Alarm) => void;
  ackAlarm: (id: string, user: User, comment?: string) => void;
  setAlarmLabel: (id: string, user: User, action: 'add' | 'remove', label: AlarmLabel) => void;
  setAlarmRisk: (id: string, user: User, risk: HumanRisk) => void;
  recoverAlarm: (id: string) => void;
  linkAlarm: (id: string, issueId: string, user: User) => void;
  unlinkAlarm: (id: string, user: User) => void;
  moveAlarm: (id: string, fromIssueId: string, toIssueId: string, user: User) => void;
}

function replaceAlarm(alarms: Alarm[], updated: Alarm): Alarm[] {
  return alarms.map((a) => (a.id === updated.id ? updated : a));
}

function now(): string {
  return new Date(mockClock.now()).toISOString();
}

export const useAlarmStore = create<AlarmStore>()((set, get) => ({
  alarms: MOCK_ALARMS,

  addAlarm(alarm) {
    set({ alarms: [alarm, ...get().alarms] });
  },

  ackAlarm(id, user, comment) {
    const alarm = get().alarms.find((a) => a.id === id);
    if (!alarm) return;
    const { alarm: updated } = alarmLifecycle.ack(alarm, user, now(), comment);
    set({ alarms: replaceAlarm(get().alarms, updated) });
  },

  setAlarmLabel(id, user, action, label) {
    const alarm = get().alarms.find((a) => a.id === id);
    if (!alarm) return;
    const { alarm: updated } = alarmLifecycle.setLabel(alarm, user, action, label, now());
    set({ alarms: replaceAlarm(get().alarms, updated) });
  },

  setAlarmRisk(id, user, risk) {
    const alarm = get().alarms.find((a) => a.id === id);
    if (!alarm) return;
    const { alarm: updated } = alarmLifecycle.setRisk(alarm, user, risk, now());
    set({ alarms: replaceAlarm(get().alarms, updated) });
  },

  recoverAlarm(id) {
    const alarm = get().alarms.find((a) => a.id === id);
    if (!alarm) return;
    const { alarm: updated } = alarmLifecycle.recover(alarm, now());
    set({ alarms: replaceAlarm(get().alarms, updated) });
  },

  linkAlarm(id, issueId, user) {
    const alarm = get().alarms.find((a) => a.id === id);
    if (!alarm) return;
    iaAttach(issueId, id, user.id);
    const { alarm: updated } = alarmLifecycle.link(alarm, issueId, user, now());
    set({ alarms: replaceAlarm(get().alarms, updated) });
  },

  unlinkAlarm(id, user) {
    const alarm = get().alarms.find((a) => a.id === id);
    if (!alarm) return;
    const row = getActiveIssueForAlarm(id);
    if (!row) return;
    iaDetach(row.issueId, id);
    const { alarm: updated } = alarmLifecycle.unlink(alarm, row.issueId, user, now());
    set({ alarms: replaceAlarm(get().alarms, updated) });
  },

  moveAlarm(id, fromIssueId, toIssueId, user) {
    const alarm = get().alarms.find((a) => a.id === id);
    if (!alarm) return;
    const { alarm: updated } = alarmLifecycle.move(alarm, fromIssueId, toIssueId, user, now());
    set({ alarms: replaceAlarm(get().alarms, updated) });
  },
}));
