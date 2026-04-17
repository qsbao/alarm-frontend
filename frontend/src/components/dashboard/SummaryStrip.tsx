import type { DashboardCounts } from '../../hooks/useDashboardData';
import type { SummaryFilter } from './summaryFilter';

interface SummaryStripProps {
  counts: DashboardCounts;
  activeFilter: SummaryFilter;
  onFilterChange: (filter: SummaryFilter) => void;
}

interface TileDef {
  label: string;
  getValue: (c: DashboardCounts) => number;
  filter: SummaryFilter;
}

const TILES: TileDef[] = [
  { label: 'Un-triaged', getValue: (c) => c.unTriaged, filter: 'Un-triaged' },
  { label: 'In-workflow', getValue: (c) => c.inWorkflow, filter: 'In-workflow' },
  { label: 'Done', getValue: (c) => c.done, filter: 'Done' },
  { label: 'Total', getValue: (c) => c.total, filter: null },
  { label: 'Upcoming meetings', getValue: (c) => c.meetingBound, filter: 'Meetings' },
];

export function SummaryStrip({ counts, activeFilter, onFilterChange }: SummaryStripProps) {
  return (
    <div
      data-testid="dashboard-summary"
      role="toolbar"
      aria-label="Alarm summary filters"
      className="grid grid-cols-5 gap-3"
    >
      {TILES.map((t) => {
        const isActive = activeFilter === t.filter;
        return (
          <button
            key={t.label}
            type="button"
            data-testid={`summary-tile-${t.filter ?? 'all'}`}
            aria-pressed={isActive}
            onClick={() => onFilterChange(isActive ? null : t.filter)}
            className={`text-left rounded-md border p-3 transition-colors ${
              isActive
                ? 'border-theme-accent bg-accent-subtle'
                : 'border-border-subtle bg-surface-overlay/30 hover:bg-surface-overlay/60'
            }`}
          >
            <div className="text-xs text-theme-muted">{t.label}</div>
            <div className="text-2xl font-semibold text-theme-primary mt-1">
              {t.getValue(counts)}
            </div>
          </button>
        );
      })}
    </div>
  );
}
