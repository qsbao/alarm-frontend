import { ArrowRightLeft, Building2, Clock, Cpu, Layers, Package, Plus, Timer, User, Wrench, X } from 'lucide-react';
import { useEffect, useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import { backend } from '../../api/backendClient';
import { linkAlarmCandidates } from '../../lib/linkAlarmCandidates';
import type { Alarm, AlarmLabel, HumanRiskLevel, Issue, RiskLevel } from '../../types';

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

const RISK_LEVEL_BADGE: Record<HumanRiskLevel, string> = {
  HIGH_RISK: 'bg-red-500/15 text-red-400 border-red-500/30',
  MIDDLE_RISK: 'bg-amber-500/15 text-amber-400 border-amber-500/30',
  LOW_RISK: 'bg-slate-500/15 text-slate-400 border-slate-500/30',
};

const RISK_LEVEL_LABEL: Record<HumanRiskLevel, string> = {
  HIGH_RISK: 'High',
  MIDDLE_RISK: 'Middle',
  LOW_RISK: 'Low',
};

const LABEL_COLORS: Record<AlarmLabel, string> = {
  FalsePositive: 'bg-slate-500/15 text-slate-400 border-slate-500/30',
  Recurring: 'bg-purple-500/15 text-purple-400 border-purple-500/30',
  LotImpacting: 'bg-red-500/15 text-red-400 border-red-500/30',
  NeedsEngReview: 'bg-amber-500/15 text-amber-400 border-amber-500/30',
  UnderObservation: 'bg-blue-500/15 text-blue-400 border-blue-500/30',
};

function formatDateTime(iso: string): string {
  const d = new Date(iso);
  return d.toISOString().slice(0, 16).replace('T', ' ');
}

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
  operNo?: string;
  lotId?: string;
  lotPriority?: number;
  waferId?: string;
  recipeId?: string;
  module?: string;
  piOwner?: string;
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
    operNo: raw.operNo,
    lotId: raw.lotId,
    lotPriority: raw.lotPriority,
    waferId: raw.waferId,
    recipeId: raw.recipeId,
    module: raw.module as Alarm['module'],
    piOwner: raw.piOwner,
    owner: raw.owner,
    department: raw.department,
    status: raw.status as Alarm['status'],
    riskLevel: raw.riskLevel as Alarm['riskLevel'],
    labels: (raw.labels ?? []) as Alarm['labels'],
    activity: [],
  };
}

function Chip({
  icon: Icon,
  label,
  value,
}: {
  icon: typeof User;
  label: string;
  value: React.ReactNode;
}) {
  if (value == null || value === '') return null;
  return (
    <div className="inline-flex items-center gap-1.5 px-2 py-0.5 rounded-md bg-surface-overlay/40 border border-border-subtle/40">
      <Icon size={11} className="text-theme-muted" />
      <span className="text-[10px] text-theme-muted">{label}</span>
      <span className="text-[11px] text-theme-primary font-medium">{value}</span>
    </div>
  );
}

function AlarmCard({
  alarm,
  onMove,
  onUnlink,
}: {
  alarm: Alarm;
  onMove?: (alarmId: string) => void;
  onUnlink: (alarmId: string) => void;
}) {
  const humanRiskLevel = (alarm as any).riskLevel as HumanRiskLevel | undefined;

  return (
    <Link
      to={`/alarms/${alarm.id}`}
      className="block rounded-lg bg-surface-overlay/30 border border-border-subtle/40 p-3 cursor-pointer hover:bg-surface-overlay/50 transition-colors"
    >
      {/* Title row: id + message + actions */}
      <div className="flex items-start gap-2">
        <div className="min-w-0 flex-1">
          <div className="flex items-center gap-2 flex-wrap">
            <span className="text-sm font-medium text-theme-primary truncate">
              {alarm.message}
            </span>
            <span className="badge font-mono text-[10px]">{alarm.id}</span>
          </div>
        </div>
        <span className="flex items-center gap-1 shrink-0">
          {onMove && (
            <button
              onClick={(e) => {
                e.preventDefault();
                e.stopPropagation();
                onMove(alarm.id);
              }}
              className="btn-ghost p-1 rounded-md"
              title="Move to another issue..."
            >
              <ArrowRightLeft size={12} />
            </button>
          )}
          <button
            onClick={(e) => {
              e.preventDefault();
              e.stopPropagation();
              onUnlink(alarm.id);
            }}
            className="btn-ghost p-1 rounded-md"
            title="Unlink alarm"
          >
            <X size={12} />
          </button>
        </span>
      </div>

      {/* Tag row: severity, status, type, risk, labels */}
      <div className="mt-2 flex items-center gap-1.5 flex-wrap">
        <span className="inline-flex items-center gap-1 px-1.5 py-0.5 rounded text-[10px] font-medium border border-border-subtle/40">
          <span className={`w-1.5 h-1.5 rounded-full ${SEVERITY_DOT[alarm.severity]}`} />
          {alarm.severity}
        </span>
        <span
          className={`inline-flex items-center px-1.5 py-0.5 rounded text-[10px] font-medium border ${STATUS_PILL[alarm.status]}`}
        >
          {alarm.status}
        </span>
        <span className="badge text-[10px]">{alarm.type}</span>
        {humanRiskLevel && RISK_LEVEL_BADGE[humanRiskLevel] && (
          <span
            className={`inline-flex items-center px-1.5 py-0.5 rounded text-[10px] font-medium border ${RISK_LEVEL_BADGE[humanRiskLevel]}`}
          >
            {RISK_LEVEL_LABEL[humanRiskLevel]}
          </span>
        )}
        {alarm.labels.map((lbl) => (
          <span
            key={lbl}
            className={`inline-flex items-center px-1.5 py-0.5 rounded text-[10px] font-medium border ${LABEL_COLORS[lbl]}`}
          >
            {lbl}
          </span>
        ))}
      </div>

      {/* Attribute chips */}
      <div className="mt-2 flex flex-wrap gap-1.5">
        <Chip
          icon={Cpu}
          label="eqp"
          value={`${alarm.eqpId}${alarm.chamberId ? ` / ${alarm.chamberId}` : ''}`}
        />
        <Chip icon={Package} label="product" value={alarm.productId} />
        {(alarm.operName || alarm.operNo) && (
          <Chip
            icon={Wrench}
            label="oper"
            value={[alarm.operName, alarm.operNo].filter(Boolean).join(' / ')}
          />
        )}
        {alarm.lotId && (
          <Chip
            icon={Layers}
            label="lot"
            value={`${alarm.lotId}${alarm.waferId ? ` / ${alarm.waferId}` : ''}`}
          />
        )}
        {alarm.recipeId && <Chip icon={Layers} label="recipe" value={alarm.recipeId} />}
        {alarm.lotPriority != null && (
          <Chip icon={Layers} label="priority" value={String(alarm.lotPriority)} />
        )}
        {alarm.value != null && (
          <Chip
            icon={Layers}
            label="value"
            value={`${alarm.value}${alarm.unit ? ` ${alarm.unit}` : ''}`}
          />
        )}
        <Chip icon={User} label="owner" value={alarm.owner} />
        <Chip icon={Building2} label="dept" value={alarm.department} />
        {alarm.module && <Chip icon={Layers} label="module" value={alarm.module} />}
        {alarm.piOwner && <Chip icon={User} label="pi" value={alarm.piOwner} />}
        <Chip icon={Clock} label="fired" value={formatDateTime(alarm.alarmTime)} />
        <Chip
          icon={Timer}
          label="recovery"
          value={
            alarm.recoveryTime ? (
              formatDateTime(alarm.recoveryTime)
            ) : (
              <span className="text-rose-400">Active</span>
            )
          }
        />
      </div>
    </Link>
  );
}

export function AlarmList({ alarms, issue, onLink, onUnlink, onMove }: AlarmListProps) {
  const [pickerOpen, setPickerOpen] = useState(false);
  const [allAlarms, setAllAlarms] = useState<Alarm[]>([]);
  const [loadingAll, setLoadingAll] = useState(false);
  const [moveAlarmId, setMoveAlarmId] = useState<string | null>(null);
  const [moveIssues, setMoveIssues] = useState<Issue[]>([]);
  const [moveLoading, setMoveLoading] = useState(false);

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
          riskLevel: i.riskLevel as Issue['riskLevel'],
          status: i.status as Issue['status'],
          issueTime: i.issueTime as string,
          operName: i.operName as string | undefined,
          operNo: i.operNo as string | undefined,
          module: i.module as Issue['module'],
          labels: (i.labels ?? []) as Issue['labels'],
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
        <div className="flex flex-col gap-2">
          {alarms.map((alarm) => (
            <AlarmCard
              key={alarm.id}
              alarm={alarm}
              onMove={onMove ? (id) => handleOpenMovePicker(id) : undefined}
              onUnlink={onUnlink}
            />
          ))}
        </div>
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
