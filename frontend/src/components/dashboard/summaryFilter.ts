import type { AlarmBucket } from '../../lib/dashboard/classifyAlarm';
import type { EnrichedAlarmRow } from '../../hooks/useDashboardData';

export type SummaryFilter = AlarmBucket | 'Meetings' | null;

export function filterRowsByBucket(
  rows: EnrichedAlarmRow[],
  filter: SummaryFilter,
): EnrichedAlarmRow[] {
  if (filter === null) return rows;
  if (filter === 'Meetings') return rows.filter((r) => r.meetingBound);
  return rows.filter((r) => r.bucket === filter);
}
