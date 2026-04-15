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

export type MeetingAction = ScheduleAction | PassAction | RescheduleAction;

const MIN_CONCLUSION_LENGTH = 10;

export function isValidRescheduleTime(newTime: string, priorScheduledTime: string): boolean {
  return new Date(newTime).getTime() > new Date(priorScheduledTime).getTime();
}

function getLastScheduledTime(entries: MeetingEntries): string | undefined {
  for (let i = entries.length - 1; i >= 0; i--) {
    if (entries[i].kind === 'scheduled') return (entries[i] as ScheduledEntry).scheduledTime;
  }
  return undefined;
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
  }
}
