import type { AlarmActivityEntry, Issue, User } from '../types';
import { mergeAlarmsForIssues } from './issueAlarms';
import { addMergedInto } from './relations/issueRelations';

export type MergeErrorReason =
  | 'source_not_triage'
  | 'permission_denied'
  | 'target_is_source';

export type MergeResult =
  | {
      ok: true;
      sourceIds: string[];
      targetId: string;
      alarmActivities: AlarmActivityEntry[];
    }
  | { ok: false; reason: MergeErrorReason };

let nextAlarmActId = 1;

export function mergeIssues(
  sources: Issue[],
  target: Issue,
  user: User,
  now: string,
): MergeResult {
  // Validation order: sources all Triage, department checks, target ≠ source
  for (const source of sources) {
    if (source.status !== 'Triage') {
      return { ok: false, reason: 'source_not_triage' };
    }
  }

  for (const source of sources) {
    if (source.department !== user.department || target.department !== user.department) {
      return { ok: false, reason: 'permission_denied' };
    }
  }

  for (const source of sources) {
    if (source.id === target.id) {
      return { ok: false, reason: 'target_is_source' };
    }
  }

  // Merge alarms
  const mergeResults = mergeAlarmsForIssues(
    sources.map((s) => s.id),
    target.id,
    user.id,
    now,
  );

  // Write merged_into relations
  for (const source of sources) {
    addMergedInto(source.id, target.id, user.id);
  }

  // Write activity entries and collect alarm activities
  const alarmActivities: AlarmActivityEntry[] = [];

  for (const mr of mergeResults) {
    const source = sources.find((s) => s.id === mr.sourceIssueId)!;

    // Source-side activity
    source.activity.push({
      id: `${source.id}-act-${source.activity.length + 1}`,
      type: 'alarms_merged_out',
      timestamp: now,
      author: user.id,
      toIssueId: target.id,
      alarmIds: mr.alarmIds,
    });

    // Target-side activity
    target.activity.push({
      id: `${target.id}-act-${target.activity.length + 1}`,
      type: 'alarms_merged_in',
      timestamp: now,
      author: user.id,
      fromIssueId: source.id,
      alarmIds: mr.alarmIds,
    });

    // Alarm-level activity
    for (const alarmId of mr.alarmIds) {
      alarmActivities.push({
        id: `merge-alm-act-${nextAlarmActId++}`,
        type: 'merged_to_issue',
        timestamp: now,
        author: user.id,
        fromIssueId: source.id,
        toIssueId: target.id,
      });
    }
  }

  // Flip source statuses to Merged
  for (const source of sources) {
    source.status = 'Merged';
  }

  return {
    ok: true,
    sourceIds: sources.map((s) => s.id),
    targetId: target.id,
    alarmActivities,
  };
}
