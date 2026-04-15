import type { MeetingEntries, FailedEntry } from './meetingReducer';

export interface LatestFailureContext {
  latestFailure: FailedEntry;
  earlierFailureCount: number;
}

export function getLatestFailureContext(entries: MeetingEntries): LatestFailureContext | null {
  const failures: FailedEntry[] = [];
  for (const e of entries) {
    if (e.kind === 'failed') failures.push(e);
  }
  if (failures.length === 0) return null;
  return {
    latestFailure: failures[failures.length - 1],
    earlierFailureCount: failures.length - 1,
  };
}

export type TimelineRow =
  | { type: 'scheduled'; scheduledTime: string; recordedBy: string; recordedAt: string }
  | { type: 'rescheduled'; actualHeldTime: string; failReason: string; newScheduledTime: string; recordedBy: string; recordedAt: string }
  | { type: 'passed'; actualHeldTime: string; conclusion: string; recordedBy: string; recordedAt: string };

export function getTimelineRows(entries: MeetingEntries): TimelineRow[] {
  const rows: TimelineRow[] = [];
  let i = 0;
  while (i < entries.length) {
    const entry = entries[i];
    if (entry.kind === 'scheduled') {
      rows.push({
        type: 'scheduled',
        scheduledTime: entry.scheduledTime,
        recordedBy: entry.recordedBy,
        recordedAt: entry.recordedAt,
      });
      i++;
    } else if (entry.kind === 'failed' && i + 1 < entries.length && entries[i + 1].kind === 'scheduled') {
      const next = entries[i + 1];
      if (next.kind === 'scheduled') {
        rows.push({
          type: 'rescheduled',
          actualHeldTime: entry.actualHeldTime,
          failReason: entry.failReason,
          newScheduledTime: next.scheduledTime,
          recordedBy: entry.recordedBy,
          recordedAt: entry.recordedAt,
        });
        i += 2;
      }
    } else if (entry.kind === 'passed') {
      rows.push({
        type: 'passed',
        actualHeldTime: entry.actualHeldTime,
        conclusion: entry.conclusion,
        recordedBy: entry.recordedBy,
        recordedAt: entry.recordedAt,
      });
      i++;
    } else {
      i++;
    }
  }
  return rows.reverse();
}
