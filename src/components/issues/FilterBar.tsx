import { Search, X } from 'lucide-react';
import { useIssueStore } from '../../stores/issueStore';
import {
  ALL_ALARM_TYPES,
  ALL_ISSUE_STATUSES,
  ALL_RISK_LEVELS,
  type AlarmType,
  type IssueStatus,
  type RiskLevel,
} from '../../types';

export function FilterBar() {
  const search = useIssueStore((s) => s.search);
  const riskFilter = useIssueStore((s) => s.riskFilter);
  const statusFilter = useIssueStore((s) => s.statusFilter);
  const alarmTypeFilter = useIssueStore((s) => s.alarmTypeFilter);
  const setSearch = useIssueStore((s) => s.setSearch);
  const setRiskFilter = useIssueStore((s) => s.setRiskFilter);
  const setStatusFilter = useIssueStore((s) => s.setStatusFilter);
  const setAlarmTypeFilter = useIssueStore((s) => s.setAlarmTypeFilter);
  const reset = useIssueStore((s) => s.reset);

  return (
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
        {ALL_ISSUE_STATUSES.map((s) => (
          <option key={s} value={s}>
            {s}
          </option>
        ))}
      </select>

      <select
        value={alarmTypeFilter}
        onChange={(e) => setAlarmTypeFilter(e.target.value as AlarmType | 'all')}
        className="input-base w-auto"
      >
        <option value="all">All alarm types</option>
        {ALL_ALARM_TYPES.map((t) => (
          <option key={t} value={t}>
            {t}
          </option>
        ))}
      </select>

      <button onClick={reset} className="btn-ghost">
        <X size={14} />
        Clear
      </button>
    </div>
  );
}
