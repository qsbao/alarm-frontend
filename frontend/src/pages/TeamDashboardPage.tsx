import { useMemo, useState } from 'react';
import { useDashboardData } from '../hooks/useDashboardData';
import type { EnrichedAlarmRow } from '../hooks/useDashboardData';
import { SummaryStrip } from '../components/dashboard/SummaryStrip';
import { AlarmRow } from '../components/dashboard/AlarmRow';
import {
  filterRowsByBucket,
  type SummaryFilter,
} from '../components/dashboard/summaryFilter';
import { getOngoingStepLabels } from '../lib/workflows/discovery';
import { getDefinition } from '../lib/workflows/definitions';

function buildClusterSizes(rows: EnrichedAlarmRow[]): Map<string, number> {
  const sizes = new Map<string, number>();
  for (const r of rows) {
    if (!r.issue) continue;
    sizes.set(r.issue.id, (sizes.get(r.issue.id) ?? 0) + 1);
  }
  return sizes;
}

function stepLabelFor(row: EnrichedAlarmRow): string | undefined {
  if (!row.issue) return undefined;
  const labels = getOngoingStepLabels(row.issue, getDefinition);
  return labels[0];
}

export function TeamDashboardPage() {
  const { rows, counts, alarmDate, department, loading } = useDashboardData();
  const [filter, setFilter] = useState<SummaryFilter>(null);

  const clusterSizes = useMemo(() => buildClusterSizes(rows), [rows]);

  const meetingRows = useMemo(() => rows.filter((r) => r.meetingBound), [rows]);

  const [activeCauseId, setActiveCauseId] = useState<string | null>(null);

  const visibleRows = useMemo(() => {
    const byBucket = filterRowsByBucket(rows, filter);
    if (!activeCauseId) return byBucket;
    return byBucket.filter((r) => r.issue?.id === activeCauseId);
  }, [rows, filter, activeCauseId]);

  const handleCauseClick = (issueId: string) => {
    setActiveCauseId((current) => (current === issueId ? null : issueId));
  };

  return (
    <div className="h-full flex flex-col bg-surface-base">
      <div className="header-bar px-6 py-4">
        <h1 className="text-lg font-semibold text-theme-primary">Team Dashboard</h1>
        <p className="text-xs text-theme-muted mt-1">
          {department} · {alarmDate}
        </p>
      </div>

      <div className="flex-1 overflow-y-auto p-6 space-y-6">
        <SummaryStrip counts={counts} activeFilter={filter} onFilterChange={setFilter} />

        {activeCauseId && (
          <div className="text-xs text-theme-muted">
            Filtered by cause:{' '}
            <button
              type="button"
              onClick={() => setActiveCauseId(null)}
              className="underline hover:text-theme-primary"
            >
              clear
            </button>
          </div>
        )}

        <section aria-label="Upcoming meetings" data-testid="dashboard-meetings">
          <h2 className="text-sm font-semibold text-theme-primary mb-2">
            Upcoming meetings ({meetingRows.length})
          </h2>
          {loading ? (
            <div className="text-sm text-theme-muted">Loading…</div>
          ) : meetingRows.length === 0 ? (
            <div className="text-sm text-theme-muted">
              No meeting-bound alarms for this team today.
            </div>
          ) : (
            <AlarmTable
              rows={meetingRows}
              clusterSizes={clusterSizes}
              onCauseClick={handleCauseClick}
            />
          )}
        </section>

        <section aria-label="All alarms" data-testid="dashboard-all-alarms">
          <h2 className="text-sm font-semibold text-theme-primary mb-2">
            All alarms ({visibleRows.length})
          </h2>
          {loading ? (
            <div className="text-sm text-theme-muted">Loading…</div>
          ) : visibleRows.length === 0 ? (
            <div className="text-sm text-theme-muted">
              No alarms match the current filter.
            </div>
          ) : (
            <AlarmTable
              rows={visibleRows}
              clusterSizes={clusterSizes}
              onCauseClick={handleCauseClick}
            />
          )}
        </section>
      </div>
    </div>
  );
}

function AlarmTable({
  rows,
  clusterSizes,
  onCauseClick,
}: {
  rows: EnrichedAlarmRow[];
  clusterSizes: Map<string, number>;
  onCauseClick: (issueId: string) => void;
}) {
  return (
    <table className="w-full text-left border-collapse">
      <thead>
        <tr className="text-[10px] uppercase tracking-wider text-theme-muted border-b border-border-subtle/60">
          <th className="w-6" />
          <th className="px-2 py-1 font-medium">Risk</th>
          <th className="px-2 py-1 font-medium">Alarm</th>
          <th className="px-2 py-1 font-medium">Cause</th>
          <th className="px-2 py-1 font-medium">Stage/Step</th>
          <th className="px-2 py-1 font-medium">Owner</th>
          <th className="w-8" />
        </tr>
      </thead>
      <tbody>
        {rows.map((row) => (
          <AlarmRow
            key={row.alarm.id}
            row={row}
            clusterSize={row.issue ? clusterSizes.get(row.issue.id) ?? 1 : 0}
            stepLabel={stepLabelFor(row)}
            onCauseClick={onCauseClick}
          />
        ))}
      </tbody>
    </table>
  );
}
