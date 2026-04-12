import { Link } from 'react-router-dom';
import { useMockClockStore } from '../../stores/mockClockStore';
import { isActive } from '../../lib/alarmFiltering';
import type { Alarm, RiskLevel } from '../../types';

export interface HistoricalAlarmRow {
  alarm: Alarm;
  mergedToIssueId: string;
}

interface HistoricalAlarmListProps {
  rows: HistoricalAlarmRow[];
}

const SEVERITY_DOT: Record<RiskLevel, string> = {
  Critical: 'bg-red-500',
  High: 'bg-orange-500',
  Medium: 'bg-amber-500',
  Low: 'bg-slate-500',
};

export function HistoricalAlarmList({ rows }: HistoricalAlarmListProps) {
  const now = useMockClockStore((s) => s.now);

  if (rows.length === 0) return null;

  return (
    <div className="card p-5">
      <h2 className="text-xs font-semibold uppercase tracking-wide text-theme-muted mb-3">
        Historical Alarms ({rows.length})
      </h2>
      <ul className="flex flex-col gap-1.5">
        {rows.map(({ alarm, mergedToIssueId }) => {
          const active = isActive(alarm, now);
          return (
            <li
              key={alarm.id}
              className="flex items-center gap-2 px-3 py-2 rounded-lg bg-surface-overlay/30 border border-border-subtle/40"
            >
              <span className="text-[10px] text-theme-secondary font-mono shrink-0">
                {alarm.id}
              </span>
              <span
                className={`w-2 h-2 rounded-full shrink-0 ${SEVERITY_DOT[alarm.severity]}`}
                title={alarm.severity}
              />
              <span className="badge text-[10px] shrink-0">{alarm.type}</span>
              <span className={`inline-flex items-center px-1.5 py-0.5 rounded text-[10px] font-medium border shrink-0 ${
                active
                  ? 'bg-rose-500/15 text-rose-400 border-rose-500/30'
                  : 'bg-slate-500/15 text-slate-400 border-slate-500/30'
              }`}>
                {active ? 'Active' : 'Recovered'}
              </span>
              <span className="flex-1" />
              <Link
                to={`/issues/${mergedToIssueId}`}
                className="inline-flex items-center gap-1 px-2 py-0.5 rounded text-[10px] font-medium border bg-purple-500/15 text-purple-400 border-purple-500/30 hover:bg-purple-500/25 transition-colors"
              >
                moved to <span className="font-mono">{mergedToIssueId}</span>
              </Link>
            </li>
          );
        })}
      </ul>
    </div>
  );
}
