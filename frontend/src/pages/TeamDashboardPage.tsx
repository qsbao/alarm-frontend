import { useDashboardData } from '../hooks/useDashboardData';

export function TeamDashboardPage() {
  const { rows, counts, alarmDate, department, loading } = useDashboardData();

  const meetingRows = rows.filter((r) => r.meetingBound);

  return (
    <div className="h-full flex flex-col bg-surface-base">
      <div className="header-bar px-6 py-4">
        <h1 className="text-lg font-semibold text-theme-primary">Team Dashboard</h1>
        <p className="text-xs text-theme-muted mt-1">
          {department} · {alarmDate}
        </p>
      </div>

      <div className="flex-1 overflow-y-auto p-6 space-y-6">
        <section
          aria-label="Summary"
          data-testid="dashboard-summary"
          className="grid grid-cols-5 gap-3"
        >
          <SummaryTile label="Total" value={counts.total} />
          <SummaryTile label="Un-triaged" value={counts.unTriaged} />
          <SummaryTile label="In-workflow" value={counts.inWorkflow} />
          <SummaryTile label="Done" value={counts.done} />
          <SummaryTile label="Upcoming meetings" value={counts.meetingBound} />
        </section>

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
            <ul className="text-sm text-theme-secondary space-y-1">
              {meetingRows.map((r) => (
                <li key={r.alarm.id}>
                  {r.alarm.eqpId} — {r.issue?.title ?? r.alarm.message}
                  {r.meetingTime ? ` · ${r.meetingTime}` : ' · Meeting TBD'}
                </li>
              ))}
            </ul>
          )}
        </section>

        <section aria-label="All alarms" data-testid="dashboard-all-alarms">
          <h2 className="text-sm font-semibold text-theme-primary mb-2">
            All alarms ({counts.total})
          </h2>
          {loading ? (
            <div className="text-sm text-theme-muted">Loading…</div>
          ) : rows.length === 0 ? (
            <div className="text-sm text-theme-muted">
              No alarms for this team today.
            </div>
          ) : (
            <ul className="text-sm text-theme-secondary space-y-1">
              {rows.map((r) => (
                <li key={r.alarm.id}>
                  <span className="font-mono">{r.alarm.id}</span> · {r.alarm.eqpId} ·{' '}
                  {r.bucket} · {r.stage}
                </li>
              ))}
            </ul>
          )}
        </section>
      </div>
    </div>
  );
}

function SummaryTile({ label, value }: { label: string; value: number }) {
  return (
    <div className="rounded-md border border-border-subtle bg-surface-overlay/30 p-3">
      <div className="text-xs text-theme-muted">{label}</div>
      <div className="text-2xl font-semibold text-theme-primary mt-1">{value}</div>
    </div>
  );
}
