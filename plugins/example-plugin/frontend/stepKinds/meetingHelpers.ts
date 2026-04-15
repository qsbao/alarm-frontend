import type { StepStatus } from '../../../../frontend/src/lib/workflows/types';
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

export function canEditTailScheduled(entries: MeetingEntries): boolean {
  if (entries.length === 0) return false;
  return entries[entries.length - 1].kind === 'scheduled';
}

export function canEditLatestFailed(entries: MeetingEntries): boolean {
  if (entries.length < 2) return false;
  const tail = entries[entries.length - 1];
  if (tail.kind !== 'scheduled') return false;
  const beforeTail = entries[entries.length - 2];
  return beforeTail.kind === 'failed';
}

export function getLatestFailedIndex(entries: MeetingEntries): number {
  for (let i = entries.length - 1; i >= 0; i--) {
    if (entries[i].kind === 'failed') return i;
  }
  return -1;
}

export type MeetingViewKind = 'empty' | 'ongoing' | 'completed';

export function getMeetingViewKind(status: StepStatus, entries: MeetingEntries): MeetingViewKind {
  const tail = entries.length > 0 ? entries[entries.length - 1] : undefined;
  if (status === 'completed' && tail?.kind === 'passed') return 'completed';
  if (status === 'ongoing' && tail?.kind === 'scheduled') return 'ongoing';
  return 'empty';
}

export function shouldShowSkipLink(canSkip: boolean, entries: MeetingEntries): boolean {
  return canSkip && entries.length === 0;
}

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
