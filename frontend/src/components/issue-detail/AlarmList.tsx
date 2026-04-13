import { ArrowRightLeft, Plus, X } from 'lucide-react';
import { useEffect, useMemo, useState } from 'react';
import { backend } from '../../api/backendClient';
import { isActive } from '../../lib/alarmFiltering';
import { linkAlarmCandidates } from '../../lib/linkAlarmCandidates';
import type { Alarm, Issue, RiskLevel } from '../../types';

interface AlarmListProps {
  alarms: Alarm[];
  issue: Issue;
  onLink: (alarmId: string) => Promise<void> | void;
  onUnlink: (alarmId: string) => Promise<void> | void;
  onMove?: (alarmId: string, targetIssueId: string) => Promise<void> | void;
}

const SEVERITY_DOT: Record<RiskLevel, string> = {
  P0: 'bg-red-500',
  P1: 'bg-orange-500',
  P2: 'bg-amber-500',
  P3: 'bg-slate-500',
};

const STATUS_PILL: Record<string, string> = {
  Open: 'bg-blue-500/15 text-blue-400 border-blue-500/30',
  Acked: 'bg-emerald-500/15 text-emerald-400 border-emerald-500/30',
};

interface BackendAlarm {
  id: string;
  type: string;
  severity: string;
  message: string;
  value?: number;
  unit?: string;
  alarmTime: string;
  recoveryTime?: string;
  eqpId: string;
  chamberId?: string;
  productId: string;
  operName?: string;
  owner: string;
  department: string;
  status: string;
  riskLevel?: string;
  labels: string[];
}

function toAlarm(raw: BackendAlarm): Alarm {
  return {
    id: raw.id,
    type: raw.type as Alarm['type'],
    severity: raw.severity as Alarm['severity'],
    message: raw.message,
    value: raw.value,
    unit: raw.unit,
    alarmTime: raw.alarmTime,
    recoveryTime: raw.recoveryTime,
    eqpId: raw.eqpId,
    chamberId: raw.chamberId,
    productId: raw.productId,
    operName: raw.operName,
    owner: raw.owner,
    department: raw.department,
    status: raw.status as Alarm['status'],
    riskLevel: raw.riskLevel as Alarm['riskLevel'],
    labels: (raw.labels ?? []) as Alarm['labels'],
    activity: [],
  };
}

export function AlarmList({ alarms, issue, onLink, onUnlink, onMove }: AlarmListProps) {
  const [pickerOpen, setPickerOpen] = useState(false);
  const [allAlarms, setAllAlarms] = useState<Alarm[]>([]);
  const [loadingAll, setLoadingAll] = useState(false);
  const [moveAlarmId, setMoveAlarmId] = useState<string | null>(null);
  const [moveIssues, setMoveIssues] = useState<Issue[]>([]);
  const [moveLoading, setMoveLoading] = useState(false);
  const now = Date.now();

  useEffect(() => {
    if (!pickerOpen || allAlarms.length > 0) return;
    setLoadingAll(true);
    const from = new Date(Date.now() - 90 * 24 * 60 * 60 * 1000).toISOString();
    const to = new Date().toISOString();
    backend.GET('/api/alarms', { params: { query: { from, to } as any } })
      .then(({ data }) => {
        const raw = (data ?? []) as unknown as BackendAlarm[];
        setAllAlarms(raw.map(toAlarm));
      })
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

  const handleOpenMovePicker = async (alarmId: string) => {
    setMoveAlarmId(alarmId);
    if (moveIssues.length === 0) {
      setMoveLoading(true);
      try {
        const { data } = await backend.GET('/api/issues', { params: { query: {} } });
        const raw = (data ?? []) as unknown as Array<Record<string, any>>;
        setMoveIssues(raw.map((i) => ({
          id: i.id as string,
          title: i.title as string,
          date: i.date as string,
          alarmType: i.alarmType as Issue['alarmType'],
          riskLevel: i.riskLevel as Issue['riskLevel'],
          status: i.status as Issue['status'],
          issueTime: i.issueTime as string,
          operation: i.operation as string,
          product: i.product as string,
          ownerId: i.ownerId as string,
          department: i.department as string,
          description: (i.description ?? '') as string,
          activity: [],
        })));
      } finally {
        setMoveLoading(false);
      }
    }
  };

  const handleMovePick = async (targetIssueId: string) => {
    if (!moveAlarmId || !onMove) return;
    await onMove(moveAlarmId, targetIssueId);
    setMoveAlarmId(null);
  };

  const sameDeptIssues = useMemo(
    () => moveIssues.filter(
      (i) => i.department === issue.department && i.id !== issue.id && i.status !== 'Closed' && i.status !== 'Merged',
    ).sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime()),
    [moveIssues, issue.department, issue.id],
  );

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
                {onMove && (
                  <button
                    onClick={() => handleOpenMovePicker(alarm.id)}
                    className="btn-ghost p-1 rounded-md shrink-0"
                    title="Move to another issue..."
                  >
                    <ArrowRightLeft size={12} />
                  </button>
                )}
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

      {moveAlarmId && (
        <div className="mt-3 p-3 rounded-lg bg-surface-inset border border-border-subtle/40">
          <div className="flex items-center justify-between mb-2">
            <div className="text-[11px] text-theme-muted">
              Move <span className="font-mono">{moveAlarmId}</span> to:
            </div>
            <button onClick={() => setMoveAlarmId(null)} className="btn-ghost btn-sm">
              Cancel
            </button>
          </div>
          {moveLoading ? (
            <div className="text-xs text-theme-muted">Loading issues...</div>
          ) : sameDeptIssues.length === 0 ? (
            <div className="text-xs text-theme-muted">No same-department issues available.</div>
          ) : (
            <ul className="max-h-56 overflow-y-auto flex flex-col gap-1">
              {sameDeptIssues.map((iss) => (
                <li key={iss.id}>
                  <button
                    onClick={() => handleMovePick(iss.id)}
                    className="w-full text-left flex items-center gap-2 px-2 py-1.5 rounded-md hover:bg-surface-overlay/60"
                  >
                    <span className="text-[11px] text-theme-secondary font-mono shrink-0">{iss.id}</span>
                    <span className="badge text-[10px] shrink-0">{iss.status}</span>
                    <span className="text-xs text-theme-primary truncate flex-1">{iss.title}</span>
                  </button>
                </li>
              ))}
            </ul>
          )}
        </div>
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
                      {alarm.eqpId}
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
