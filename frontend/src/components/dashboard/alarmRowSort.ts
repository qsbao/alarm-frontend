import type { EnrichedAlarmRow } from '../../hooks/useDashboardData';
import type { AlarmBucket, AlarmStage } from '../../lib/dashboard/classifyAlarm';

export type SortMode = 'default' | 'by-cause';

const BUCKET_ORDER: Record<AlarmBucket, number> = {
  'Un-triaged': 0,
  'In-workflow': 1,
  Done: 2,
};

const STAGE_ORDER: Record<AlarmStage, number> = {
  'un-triaged': 0,
  'pre-meeting': 1,
  meeting: 2,
  'post-meeting': 3,
  done: 4,
};

export function sortRows(rows: EnrichedAlarmRow[], mode: SortMode): EnrichedAlarmRow[] {
  if (mode === 'by-cause') return sortByCause(rows);
  return sortDefault(rows);
}

function sortDefault(rows: EnrichedAlarmRow[]): EnrichedAlarmRow[] {
  const indexed = rows.map((row, index) => ({ row, index }));
  indexed.sort((a, b) => {
    const bucketDelta = BUCKET_ORDER[a.row.bucket] - BUCKET_ORDER[b.row.bucket];
    if (bucketDelta !== 0) return bucketDelta;
    const stageDelta = STAGE_ORDER[a.row.stage] - STAGE_ORDER[b.row.stage];
    if (stageDelta !== 0) return stageDelta;
    return a.index - b.index;
  });
  return indexed.map((entry) => entry.row);
}

function sortByCause(rows: EnrichedAlarmRow[]): EnrichedAlarmRow[] {
  const clusterSize = new Map<string, number>();
  const firstSeen = new Map<string, number>();
  rows.forEach((row, index) => {
    if (!row.issue) return;
    const id = row.issue.id;
    clusterSize.set(id, (clusterSize.get(id) ?? 0) + 1);
    if (!firstSeen.has(id)) firstSeen.set(id, index);
  });

  const indexed = rows.map((row, index) => ({ row, index }));
  indexed.sort((a, b) => {
    const aOrphan = !a.row.issue;
    const bOrphan = !b.row.issue;
    if (aOrphan !== bOrphan) return aOrphan ? 1 : -1;
    if (aOrphan && bOrphan) return a.index - b.index;
    const aId = a.row.issue!.id;
    const bId = b.row.issue!.id;
    if (aId !== bId) {
      const sizeDelta = (clusterSize.get(bId) ?? 0) - (clusterSize.get(aId) ?? 0);
      if (sizeDelta !== 0) return sizeDelta;
      return (firstSeen.get(aId) ?? 0) - (firstSeen.get(bId) ?? 0);
    }
    return a.index - b.index;
  });
  return indexed.map((entry) => entry.row);
}
