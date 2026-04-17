import type { EnrichedAlarmRow } from '../../hooks/useDashboardData';
import type { MergeSource } from '../issue-detail/MergeDialog';

export function collectCandidateIssues(
  rows: EnrichedAlarmRow[],
  excludeIssueId: string | null,
) {
  const seen = new Map<string, EnrichedAlarmRow['issue']>();
  for (const r of rows) {
    if (!r.issue) continue;
    if (excludeIssueId && r.issue.id === excludeIssueId) continue;
    if (!seen.has(r.issue.id)) seen.set(r.issue.id, r.issue);
  }
  return Array.from(seen.values()).filter((i): i is NonNullable<typeof i> => !!i);
}

export function buildMergeSourceFromRow(
  row: EnrichedAlarmRow,
  allRows: EnrichedAlarmRow[],
): MergeSource | undefined {
  if (!row.issue) return undefined;
  const issueId = row.issue.id;
  const alarms = allRows.filter((r) => r.issue?.id === issueId).map((r) => r.alarm);
  return { issue: row.issue, alarms };
}
