export interface ScheduledEntry {
  kind: 'scheduled';
  scheduledTime: string;
  recordedBy: string;
  recordedAt: string;
}

export interface FailedEntry {
  kind: 'failed';
  actualHeldTime: string;
  failReason: string;
  recordedBy: string;
  recordedAt: string;
}

export interface PassedEntry {
  kind: 'passed';
  actualHeldTime: string;
  conclusion: string;
  recordedBy: string;
  recordedAt: string;
}

export type MeetingEntry = ScheduledEntry | FailedEntry | PassedEntry;
export type MeetingEntries = MeetingEntry[];

export interface ScheduleAction {
  type: 'schedule';
  scheduledTime: string;
  recordedBy: string;
  recordedAt: string;
}

export interface PassAction {
  type: 'pass';
  actualHeldTime: string;
  conclusion: string;
  recordedBy: string;
  recordedAt: string;
}

export interface RescheduleAction {
  type: 'reschedule';
  actualHeldTime: string;
  failReason: string;
  newScheduledTime: string;
  recordedBy: string;
  recordedAt: string;
}

export interface EditScheduledAction {
  type: 'edit-scheduled';
  entryIndex: number;
  scheduledTime: string;
  recordedBy: string;
  recordedAt: string;
}

export interface EditFailedAction {
  type: 'edit-failed';
  entryIndex: number;
  actualHeldTime: string;
  failReason: string;
  recordedBy: string;
  recordedAt: string;
}

export interface EditPassedAction {
  type: 'edit-passed';
  actualHeldTime: string;
  conclusion: string;
  recordedBy: string;
  recordedAt: string;
}

export type MeetingAction = ScheduleAction | PassAction | RescheduleAction | EditScheduledAction | EditFailedAction | EditPassedAction;

const MIN_CONCLUSION_LENGTH = 10;

export function isValidRescheduleTime(newTime: string, priorScheduledTime: string): boolean {
  return new Date(newTime).getTime() > new Date(priorScheduledTime).getTime();
}

export function getFailedEntries(entries: MeetingEntries): FailedEntry[] {
  return entries.filter((e): e is FailedEntry => e.kind === 'failed');
}

export function getMeetingSummary(entries: MeetingEntries): { totalMeetings: number; rescheduled: number } {
  const failed = getFailedEntries(entries).length;
  const hasPassed = entries.some((e) => e.kind === 'passed');
  return { totalMeetings: failed + (hasPassed ? 1 : 0), rescheduled: failed };
}

function getLastScheduledTime(entries: MeetingEntries): string | undefined {
  for (let i = entries.length - 1; i >= 0; i--) {
    if (entries[i].kind === 'scheduled') return (entries[i] as ScheduledEntry).scheduledTime;
  }
  return undefined;
}

function findLastIndex(entries: MeetingEntries, kind: MeetingEntry['kind']): number {
  for (let i = entries.length - 1; i >= 0; i--) {
    if (entries[i].kind === kind) return i;
  }
  return -1;
}

export function meetingReducer(entries: MeetingEntries, action: MeetingAction): MeetingEntries {
  switch (action.type) {
    case 'schedule': {
      return [
        ...entries,
        {
          kind: 'scheduled',
          scheduledTime: action.scheduledTime,
          recordedBy: action.recordedBy,
          recordedAt: action.recordedAt,
        },
      ];
    }
    case 'pass': {
      if (entries.length === 0) {
        throw new Error('Cannot pass a meeting with no scheduled entries');
      }
      if (action.conclusion.length < MIN_CONCLUSION_LENGTH) {
        throw new Error(`Conclusion must be at least ${MIN_CONCLUSION_LENGTH} characters`);
      }
      return [
        ...entries,
        {
          kind: 'passed',
          actualHeldTime: action.actualHeldTime,
          conclusion: action.conclusion,
          recordedBy: action.recordedBy,
          recordedAt: action.recordedAt,
        },
      ];
    }
    case 'reschedule': {
      if (entries.length === 0) {
        throw new Error('Cannot reschedule with no prior entries');
      }
      const priorTime = getLastScheduledTime(entries);
      if (!priorTime || !isValidRescheduleTime(action.newScheduledTime, priorTime)) {
        throw new Error('New meeting time must be strictly after the prior scheduled time');
      }
      return [
        ...entries,
        {
          kind: 'failed',
          actualHeldTime: action.actualHeldTime,
          failReason: action.failReason,
          recordedBy: action.recordedBy,
          recordedAt: action.recordedAt,
        },
        {
          kind: 'scheduled',
          scheduledTime: action.newScheduledTime,
          recordedBy: action.recordedBy,
          recordedAt: action.recordedAt,
        },
      ];
    }
    case 'edit-scheduled': {
      const tail = entries[entries.length - 1];
      if (!tail || tail.kind !== 'scheduled') {
        throw new Error('Cannot edit scheduled: the last entry is not a scheduled entry');
      }
      const lastScheduledIdx = findLastIndex(entries, 'scheduled');
      if (action.entryIndex !== lastScheduledIdx) {
        throw new Error('Can only edit the latest scheduled entry');
      }
      const copy = [...entries];
      copy[action.entryIndex] = {
        ...copy[action.entryIndex] as ScheduledEntry,
        scheduledTime: action.scheduledTime,
      };
      return copy;
    }
    case 'edit-failed': {
      const target = entries[action.entryIndex];
      if (!target || target.kind !== 'failed') {
        throw new Error('Cannot edit: entry at index is not a failed entry');
      }
      const lastFailedIdx = findLastIndex(entries, 'failed');
      if (action.entryIndex !== lastFailedIdx) {
        throw new Error('Can only edit the latest failed entry');
      }
      const tail2 = entries[entries.length - 1];
      if (!tail2 || tail2.kind !== 'scheduled') {
        throw new Error('Cannot edit failed: the latest failed entry must be immediately before the tail scheduled entry');
      }
      if (lastFailedIdx !== entries.length - 2) {
        throw new Error('Cannot edit failed: the latest failed entry must be immediately before the tail scheduled entry');
      }
      const copy = [...entries];
      copy[action.entryIndex] = {
        ...copy[action.entryIndex] as FailedEntry,
        actualHeldTime: action.actualHeldTime,
        failReason: action.failReason,
      };
      return copy;
    }
    case 'edit-passed': {
      const passedIdx = findLastIndex(entries, 'passed');
      if (passedIdx === -1) {
        throw new Error('Cannot edit passed: no passed entry found');
      }
      if (action.conclusion.length < MIN_CONCLUSION_LENGTH) {
        throw new Error(`Conclusion must be at least ${MIN_CONCLUSION_LENGTH} characters`);
      }
      const copy = [...entries];
      copy[passedIdx] = {
        ...copy[passedIdx] as PassedEntry,
        actualHeldTime: action.actualHeldTime,
        conclusion: action.conclusion,
      };
      return copy;
    }
  }
}
