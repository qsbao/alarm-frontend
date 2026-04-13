import { Search, X } from 'lucide-react';
import { useIssueStore } from '../../stores/issueStore';
import { ISSUE_BUILTIN_VIEWS } from '../../lib/issueSavedViews';
import {
  ALL_RISK_LEVELS,
  type IssueStatus,
  type RiskLevel,
} from '../../types';

/** Statuses shown in the dropdown — Merged gets its own chip. */
const DROPDOWN_STATUSES: IssueStatus[] = ['Triage', 'Investigating', 'Resolved', 'Closed'];

export function FilterBar() {
  const search = useIssueStore((s) => s.search);
  const riskFilter = useIssueStore((s) => s.riskFilter);
  const statusFilter = useIssueStore((s) => s.statusFilter);
  const activeViewName = useIssueStore((s) => s.activeViewName);
  const setSearch = useIssueStore((s) => s.setSearch);
  const setRiskFilter = useIssueStore((s) => s.setRiskFilter);
  const setStatusFilter = useIssueStore((s) => s.setStatusFilter);
  const setActiveViewName = useIssueStore((s) => s.setActiveViewName);
  const showMerged = useIssueStore((s) => s.showMerged);
  const setShowMerged = useIssueStore((s) => s.setShowMerged);
  const reset = useIssueStore((s) => s.reset);

  return (
    <div className="space-y-2">
      {/* Row 1: Saved views rail */}
      <div className="flex items-center gap-1.5 flex-wrap">
        {ISSUE_BUILTIN_VIEWS.map((view) => (
          <button
            key={view.name}
            onClick={() =>
              setActiveViewName(activeViewName === view.name ? null : view.name)
            }
            className={`px-2.5 py-1 rounded-md text-[11px] font-medium transition-colors ${
              activeViewName === view.name
                ? 'bg-accent-subtle text-theme-accent border border-theme-accent/30'
                : 'bg-surface-overlay/30 text-theme-secondary border border-border-subtle/40 hover:border-border-default hover:text-theme-primary'
            }`}
          >
            {view.name}
          </button>
        ))}
      </div>

      {/* Row 2: Search + filters */}
      <div className="flex gap-2 flex-wrap items-center">
      <div className="relative flex-1 min-w-[220px] max-w-md">
        <Search
          size={14}
          className="absolute left-2.5 top-1/2 -translate-y-1/2 text-theme-muted pointer-events-none"
        />
        <input
          type="text"
          placeholder="Search title, owner, product, id..."
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          className="input-base pl-8"
        />
      </div>

      <select
        value={riskFilter}
        onChange={(e) => setRiskFilter(e.target.value as RiskLevel | 'all')}
        className="input-base w-auto"
      >
        <option value="all">All risk</option>
        {ALL_RISK_LEVELS.map((r) => (
          <option key={r} value={r}>
            {r}
          </option>
        ))}
      </select>

      <select
        value={statusFilter}
        onChange={(e) => setStatusFilter(e.target.value as IssueStatus | 'all')}
        className="input-base w-auto"
      >
        <option value="all">All status</option>
        {DROPDOWN_STATUSES.map((s) => (
          <option key={s} value={s}>
            {s}
          </option>
        ))}
      </select>

      <button
        onClick={() => setShowMerged(!showMerged)}
        className={`px-2.5 py-1 rounded-md text-[11px] font-medium transition-colors ${
          showMerged
            ? 'bg-purple-500/10 text-purple-400 border border-purple-500/30'
            : 'bg-surface-overlay/30 text-theme-secondary border border-border-subtle/40 hover:border-border-default hover:text-theme-primary'
        }`}
      >
        Merged
      </button>

      <button onClick={reset} className="btn-ghost">
        <X size={14} />
        Clear
      </button>
      </div>
    </div>
  );
}
