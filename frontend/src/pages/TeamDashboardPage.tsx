import { useCallback, useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useDashboardData } from '../hooks/useDashboardData';
import type { EnrichedAlarmRow } from '../hooks/useDashboardData';
import { SummaryStrip } from '../components/dashboard/SummaryStrip';
import { AlarmRow } from '../components/dashboard/AlarmRow';
import { TriageDrawer } from '../components/dashboard/TriageDrawer';
import {
  collectCandidateIssues,
  buildMergeSourceFromRow,
} from '../components/dashboard/triageDrawerHelpers';
import {
  filterRowsByBucket,
  type SummaryFilter,
} from '../components/dashboard/summaryFilter';
import { sortRows, type SortMode } from '../components/dashboard/alarmRowSort';
import { sortMeetingRows, formatMeetingLabel } from '../components/dashboard/meetingSort';
import { getOngoingStepLabels } from '../lib/workflows/discovery';
import { getDefinition } from '../lib/workflows/definitions';
import { MergeDialog, type MergeSource } from '../components/issue-detail/MergeDialog';
import { useCurrentUserStore } from '../stores/currentUserStore';
import { backend } from '../api/backendClient';

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

function todayAlarmDate(): string {
  const now = new Date();
  const yyyy = now.getFullYear();
  const mm = String(now.getMonth() + 1).padStart(2, '0');
  const dd = String(now.getDate()).padStart(2, '0');
  return `${yyyy}-${mm}-${dd}`;
}

export function TeamDashboardPage() {
  const navigate = useNavigate();
  const [selectedDate, setSelectedDate] = useState<string>(todayAlarmDate);
  const { rows, counts, alarmDate, department, loading, refresh } = useDashboardData({
    alarmDate: selectedDate,
  });
  const currentUser = useCurrentUserStore((s) => s.currentUser);
  const [filter, setFilter] = useState<SummaryFilter>(null);
  const [sortMode, setSortMode] = useState<SortMode>('default');
  const [activeCauseId, setActiveCauseId] = useState<string | null>(null);
  const [triagingAlarmId, setTriagingAlarmId] = useState<string | null>(null);
  const [mergeState, setMergeState] = useState<{
    sources: MergeSource[];
    preselectedTargetId?: string;
  } | null>(null);

  const clusterSizes = useMemo(() => buildClusterSizes(rows), [rows]);

  const meetingRows = useMemo(
    () => sortMeetingRows(rows.filter((r) => r.meetingBound)),
    [rows],
  );

  const visibleRows = useMemo(() => {
    const byBucket = filterRowsByBucket(rows, filter);
    const byCause = activeCauseId
      ? byBucket.filter((r) => r.issue?.id === activeCauseId)
      : byBucket;
    return sortRows(byCause, sortMode);
  }, [rows, filter, activeCauseId, sortMode]);

  const triagingRow = useMemo(
    () => (triagingAlarmId ? rows.find((r) => r.alarm.id === triagingAlarmId) : undefined),
    [rows, triagingAlarmId],
  );

  const handleCauseClick = (issueId: string) => {
    setActiveCauseId((current) => (current === issueId ? null : issueId));
  };

  const toggleSortByCause = () => {
    setSortMode((mode) => (mode === 'by-cause' ? 'default' : 'by-cause'));
  };

  const handleRowClick = useCallback(
    (row: EnrichedAlarmRow) => {
      if (row.bucket === 'Un-triaged') {
        setTriagingAlarmId(row.alarm.id);
      }
    },
    [],
  );

  const handleOpenIssue = useCallback(
    (row: EnrichedAlarmRow) => {
      if (row.issue) navigate(`/issues/${row.issue.id}`);
    },
    [navigate],
  );

  const handleMergeRow = useCallback(
    (row: EnrichedAlarmRow) => {
      const source = buildMergeSourceFromRow(row, rows);
      if (source) setMergeState({ sources: [source] });
    },
    [rows],
  );

  const handleTriageStartNew = useCallback(() => {
    setTriagingAlarmId(null);
  }, []);

  const handleTriageMerge = useCallback(
    (preselectedTargetId?: string) => {
      if (!triagingRow) return;
      const source = buildMergeSourceFromRow(triagingRow, rows);
      if (!source) return;
      setMergeState({ sources: [source], preselectedTargetId });
      setTriagingAlarmId(null);
    },
    [triagingRow, rows],
  );

  const handleMergeConfirm = useCallback(
    async (targetId: string) => {
      if (!mergeState) return;
      const sourceIds = mergeState.sources.map((s) => s.issue.id);
      const { error } = await backend.POST('/api/issues/{id}/merge', {
        params: { path: { id: targetId } },
        body: { sourceIds } as any,
      });
      if (!error) {
        setMergeState(null);
        await refresh();
      }
    },
    [mergeState, refresh],
  );

  return (
    <div className="h-full flex flex-col bg-surface-base">
      <div className="header-bar px-6 py-4 flex items-start justify-between gap-4">
        <div>
          <h1 className="text-lg font-semibold text-theme-primary">Team Dashboard</h1>
          <p className="text-xs text-theme-muted mt-1">
            {department} · {alarmDate}
          </p>
        </div>
        <label className="flex items-center gap-2 text-xs text-theme-muted">
          <span>Date</span>
          <input
            type="date"
            data-testid="dashboard-date-picker"
            value={selectedDate}
            max={todayAlarmDate()}
            onChange={(e) => setSelectedDate(e.target.value || todayAlarmDate())}
            className="bg-surface-overlay border border-border-subtle rounded px-2 py-1 text-theme-primary"
          />
          {selectedDate !== todayAlarmDate() && (
            <button
              type="button"
              onClick={() => setSelectedDate(todayAlarmDate())}
              className="underline hover:text-theme-primary"
            >
              Today
            </button>
          )}
        </label>
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
              onRowClick={handleRowClick}
              onOpenIssue={handleOpenIssue}
              onMergeRow={handleMergeRow}
              meetingLabelFor={(row) => formatMeetingLabel(row.meetingTime)}
            />
          )}
        </section>

        <section aria-label="All alarms" data-testid="dashboard-all-alarms">
          <div className="flex items-center justify-between mb-2">
            <h2 className="text-sm font-semibold text-theme-primary">
              All alarms ({visibleRows.length})
            </h2>
            <button
              type="button"
              data-testid="sort-by-cause-toggle"
              aria-pressed={sortMode === 'by-cause'}
              onClick={toggleSortByCause}
              className={`text-xs px-2 py-1 rounded border ${
                sortMode === 'by-cause'
                  ? 'border-sky-500 text-sky-600 bg-sky-500/10'
                  : 'border-border-subtle text-theme-secondary hover:bg-surface-overlay/40'
              }`}
            >
              {sortMode === 'by-cause' ? 'Sorted by cause' : 'Sort by cause'}
            </button>
          </div>
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
              onRowClick={handleRowClick}
              onOpenIssue={handleOpenIssue}
              onMergeRow={handleMergeRow}
            />
          )}
        </section>
      </div>

      {triagingRow && (
        <TriageDrawer
          alarm={triagingRow.alarm}
          candidateIssues={collectCandidateIssues(rows, triagingRow.issue?.id ?? null)}
          onClose={() => setTriagingAlarmId(null)}
          onStartNewWorkflow={handleTriageStartNew}
          onMergeInto={handleTriageMerge}
        />
      )}

      {mergeState && (
        <MergeDialog
          sources={mergeState.sources}
          preselectedTargetId={mergeState.preselectedTargetId}
          onConfirm={handleMergeConfirm}
          onCancel={() => setMergeState(null)}
          currentUserDepartment={currentUser.department}
        />
      )}
    </div>
  );
}

function AlarmTable({
  rows,
  clusterSizes,
  onCauseClick,
  onRowClick,
  onOpenIssue,
  onMergeRow,
  meetingLabelFor,
}: {
  rows: EnrichedAlarmRow[];
  clusterSizes: Map<string, number>;
  onCauseClick: (issueId: string) => void;
  onRowClick: (row: EnrichedAlarmRow) => void;
  onOpenIssue: (row: EnrichedAlarmRow) => void;
  onMergeRow: (row: EnrichedAlarmRow) => void;
  meetingLabelFor?: (row: EnrichedAlarmRow) => string | undefined;
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
            meetingLabel={meetingLabelFor?.(row)}
            onCauseClick={onCauseClick}
            onRowClick={row.bucket === 'Un-triaged' ? onRowClick : undefined}
            onOpenIssue={onOpenIssue}
            onMergeRow={onMergeRow}
          />
        ))}
      </tbody>
    </table>
  );
}
