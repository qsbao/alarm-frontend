import { Plus, X } from 'lucide-react';
import { useEffect, useMemo, useState } from 'react';
import { api } from '../../api/client';
import type { Alarm, RiskLevel } from '../../types';

interface AlarmListProps {
  alarms: Alarm[];
  onLink: (alarmId: string) => Promise<void> | void;
  onUnlink: (alarmId: string) => Promise<void> | void;
}

const SEVERITY_DOT: Record<RiskLevel, string> = {
  Critical: 'bg-red-500',
  High: 'bg-orange-500',
  Medium: 'bg-amber-500',
  Low: 'bg-slate-500',
};

function formatTime(iso: string): string {
  const d = new Date(iso);
  return `${d.toISOString().slice(0, 10)} ${d.toISOString().slice(11, 16)}`;
}

export function AlarmList({ alarms, onLink, onUnlink }: AlarmListProps) {
  const [pickerOpen, setPickerOpen] = useState(false);
  const [allAlarms, setAllAlarms] = useState<Alarm[]>([]);
  const [loadingAll, setLoadingAll] = useState(false);

  useEffect(() => {
    if (!pickerOpen || allAlarms.length > 0) return;
    setLoadingAll(true);
    api
      .listAlarms()
      .then((list) => setAllAlarms(list))
      .finally(() => setLoadingAll(false));
  }, [pickerOpen, allAlarms.length]);

  const linkedIds = useMemo(() => new Set(alarms.map((a) => a.id)), [alarms]);
  const candidates = useMemo(
    () => allAlarms.filter((a) => !linkedIds.has(a.id)),
    [allAlarms, linkedIds],
  );

  const handlePick = async (alarmId: string) => {
    await onLink(alarmId);
    setPickerOpen(false);
  };

  return (
    <div className="card p-5">
      <div className="flex items-center justify-between mb-3">
        <h2 className="text-xs font-semibold uppercase tracking-wide text-theme-muted">
          Related Alarms ({alarms.length})
        </h2>
        <button
          onClick={() => setPickerOpen((v) => !v)}
          className="btn-ghost btn-sm"
        >
          <Plus size={13} />
          Link Alarm
        </button>
      </div>

      {alarms.length === 0 ? (
        <div className="text-xs text-theme-muted py-4 text-center">
          No alarms linked to this issue.
        </div>
      ) : (
        <ul className="flex flex-col gap-1.5">
          {alarms.map((alarm) => (
            <li
              key={alarm.id}
              className="flex items-center gap-3 px-3 py-2 rounded-lg bg-surface-overlay/30 border border-border-subtle/40"
            >
              <span
                className={`w-2 h-2 rounded-full shrink-0 ${SEVERITY_DOT[alarm.severity]}`}
                title={alarm.severity}
              />
              <span className="badge text-[10px] shrink-0">{alarm.type}</span>
              <span className="text-xs text-theme-primary font-mono shrink-0">
                {alarm.machineId}
                {alarm.chamberId ? `/${alarm.chamberId}` : ''}
              </span>
              <span className="text-xs text-theme-muted truncate flex-1">
                {alarm.message}
              </span>
              <span className="text-[10px] text-theme-muted shrink-0">
                {formatTime(alarm.time)}
              </span>
              <button
                onClick={() => onUnlink(alarm.id)}
                className="btn-ghost p-1 rounded-md"
                title="Unlink alarm"
              >
                <X size={12} />
              </button>
            </li>
          ))}
        </ul>
      )}

      {pickerOpen && (
        <div className="mt-3 p-3 rounded-lg bg-surface-inset border border-border-subtle/40">
          <div className="text-[11px] text-theme-muted mb-2">
            Pick an alarm to link:
          </div>
          {loadingAll ? (
            <div className="text-xs text-theme-muted">Loading...</div>
          ) : candidates.length === 0 ? (
            <div className="text-xs text-theme-muted">All alarms are already linked.</div>
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
