export interface ScheduledEntry {
  kind: 'scheduled';
  scheduledTime: string;
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

export type MeetingEntry = ScheduledEntry | PassedEntry;
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

export type MeetingAction = ScheduleAction | PassAction;

const MIN_CONCLUSION_LENGTH = 10;

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
  }
}
