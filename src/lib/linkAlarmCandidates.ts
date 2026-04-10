import type { Alarm, Issue } from '../types';

export interface LinkAlarmCandidateOptions {
  /** Already-linked alarms, used to determine machine scope */
  linkedAlarms?: Alarm[];
}

const TWO_HOURS_MS = 2 * 60 * 60 * 1000;

/**
 * Pure filter: returns alarms eligible for linking to the given issue.
 *
 * Default scope:
 * - Currently unlinked (no linkedIssueId) AND not already in issue.relatedAlarmIds
 * - Same machine as existing linked alarms (if any linked alarms exist)
 * - Within ±2h of issue creation time (issue.date)
 */
export function linkAlarmCandidates(
  allAlarms: Alarm[],
  issue: Issue,
  options: LinkAlarmCandidateOptions = {},
): Alarm[] {
  const { linkedAlarms = [] } = options;
  const alreadyLinkedIds = new Set(issue.relatedAlarmIds);

  // Determine machine scope from existing linked alarms
  const machineScope =
    linkedAlarms.length > 0
      ? new Set(linkedAlarms.map((a) => a.machineId))
      : null;

  const issueCreatedMs = Date.parse(issue.date);

  return allAlarms.filter((alarm) => {
    // Exclude already linked to any issue
    if (alarm.linkedIssueId) return false;
    // Exclude already in this issue's relatedAlarmIds
    if (alreadyLinkedIds.has(alarm.id)) return false;
    // Machine scope: if we have linked alarms, restrict to same machine(s)
    if (machineScope && !machineScope.has(alarm.machineId)) return false;
    // Time window: ±2h of issue creation
    const alarmMs = Date.parse(alarm.time);
    if (Math.abs(alarmMs - issueCreatedMs) > TWO_HOURS_MS) return false;
    return true;
  });
}
