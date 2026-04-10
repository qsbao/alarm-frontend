import { Plus, X } from 'lucide-react';
import { useEffect, useMemo, useState } from 'react';
import { api } from '../../api/client';
import { isActive } from '../../lib/alarmFiltering';
import { linkAlarmCandidates } from '../../lib/linkAlarmCandidates';
import { useMockClockStore } from '../../stores/mockClockStore';
import type { Alarm, Issue, RiskLevel } from '../../types';

interface AlarmListProps {
  alarms: Alarm[];
  issue: Issue;
  onLink: (alarmId: string) => Promise<void> | void;
  onUnlink: (alarmId: string) => Promise<void> | void;
}

const SEVERITY_DOT: Record<RiskLevel, string> = {
  Critical: 'bg-red-500',
  High: 'bg-orange-500',
  Medium: 'bg-amber-500',
  Low: 'bg-slate-500',
};

const STATUS_PILL: Record<string, string> = {
  Open: 'bg-blue-500/15 text-blue-400 border-blue-500/30',
  Acked: 'bg-emerald-500/15 text-emerald-400 border-emerald-500/30',
};

export function AlarmList({ alarms, issue, onLink, onUnlink }: AlarmListProps) {
  const [pickerOpen, setPickerOpen] = useState(false);
  const [allAlarms, setAllAlarms] = useState<Alarm[]>([]);
  const [loadingAll, setLoadingAll] = useState(false);
  const now = useMockClockStore((s) => s.now);

  useEffect(() => {
    if (!pickerOpen || allAlarms.length > 0) return;
    setLoadingAll(true);
    api
      .listAlarms()
      .then((list) => setAllAlarms(list))
      .finally(() => setLoadingAll(false));
  }, [pickerOpen, allAlarms.length]);

  const candidates = useMemo(
    () => linkAlarmCandidates(allAlarms, issue, { linkedAlarms: alarms }),
    [allAlarms, issue, alarms],
  );

  const handlePick = async (alarmId: string) => {
    await onLink(alarmId);
    setPickerOpen(false);
  };

  const showLinkButton = issue.status !== 'Closed';

  return (
    <div className="card p-5">
      <div className="flex items-center justify-between mb-3">
        <h2 className="text-xs font-semibold uppercase tracking-wide text-theme-muted">
          Related Alarms ({alarms.length})
        </h2>
        {showLinkButton && (
          <button
            onClick={() => setPickerOpen((v) => !v)}
            className="btn-ghost btn-sm"
          >
            <Plus size={13} />
            Link Alarm
          </button>
        )}
      </div>

      {alarms.length === 0 ? (
        <div className="text-xs text-theme-muted py-4 text-center">
          No alarms linked to this issue.
        </div>
      ) : (
        <ul className="flex flex-col gap-1.5">
          {alarms.map((alarm) => {
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
                <span className={`inline-flex items-center px-1.5 py-0.5 rounded text-[10px] font-medium border shrink-0 ${STATUS_PILL[alarm.status]}`}>
                  {alarm.status}
                </span>
                <span className={`inline-flex items-center px-1.5 py-0.5 rounded text-[10px] font-medium border shrink-0 ${
                  active
                    ? 'bg-rose-500/15 text-rose-400 border-rose-500/30'
                    : 'bg-slate-500/15 text-slate-400 border-slate-500/30'
                }`}>
                  {active ? 'Active' : 'Recovered'}
                </span>
                <span className="flex-1" />
                <button
                  onClick={() => onUnlink(alarm.id)}
                  className="btn-ghost p-1 rounded-md shrink-0"
                  title="Unlink alarm"
                >
                  <X size={12} />
                </button>
              </li>
            );
          })}
        </ul>
      )}

      {pickerOpen && (
        <div className="mt-3 p-3 rounded-lg bg-surface-inset border border-border-subtle/40">
          <div className="text-[11px] text-theme-muted mb-2">
            Pick an alarm to link (same machine, +-2h):
          </div>
          {loadingAll ? (
            <div className="text-xs text-theme-muted">Loading...</div>
          ) : candidates.length === 0 ? (
            <div className="text-xs text-theme-muted">No matching alarms found.</div>
          ) : (
            <ul className="max-h-56 overflow-y-auto flex flex-col gap-1">
              {candidates.slice(0, 50).map((alarm) => (
                <li key={alarm.id}>
                  <button
                    onClick={() => handlePick(alarm.id)}
                    className="w-full text-left flex items-center gap-2 px-2 py-1.5 rounded-md hover:bg-surface-overlay/60"
                  >
                    <span
                      className={`w-1.5 h-1.5 rounded-full shrink-0 ${SEVERITY_DOT[alarm.severity]}`}
                    />
                    <span className="text-[11px] text-theme-secondary shrink-0">{alarm.id}</span>
                    <span className="badge text-[10px] shrink-0">{alarm.type}</span>
                    <span className="text-xs text-theme-primary font-mono shrink-0">
                      {alarm.machineId}
                    </span>
                    <span className="text-[10px] text-theme-muted truncate flex-1">
                      {alarm.message}
                    </span>
                  </button>
                </li>
              ))}
            </ul>
          )}
        </div>
      )}
    </div>
  );
}
