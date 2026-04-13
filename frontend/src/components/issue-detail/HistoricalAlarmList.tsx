import { Link } from 'react-router-dom';
import type { Alarm, AlarmLabel, HumanRiskLevel, RiskLevel } from '../../types';

export interface HistoricalAlarmRow {
  alarm: Alarm;
  mergedToIssueId: string;
}

interface HistoricalAlarmListProps {
  rows: HistoricalAlarmRow[];
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

function FieldRow({ label, value }: { label: string; value: React.ReactNode }) {
  if (value == null || value === '') return null;
  return (
    <div className="flex items-baseline gap-1.5">
      <span className="text-[10px] text-theme-muted shrink-0">{label}</span>
      <span className="text-xs text-theme-secondary">{value}</span>
    </div>
  );
}

function HistoricalAlarmCard({
  alarm,
  mergedToIssueId,
}: {
  alarm: Alarm;
  mergedToIssueId: string;
}) {
  const humanRiskLevel = (alarm as any).riskLevel as HumanRiskLevel | undefined;

  return (
    <Link
      to={`/alarms/${alarm.id}`}
      className="block rounded-lg bg-surface-overlay/30 border border-border-subtle/40 p-4 cursor-pointer hover:bg-surface-overlay/50 transition-colors"
    >
      {/* Card Header */}
      <div className="flex items-center gap-2">
        <span className="text-[11px] text-theme-secondary font-mono shrink-0">
          {alarm.id}
        </span>
        <span className="text-xs text-theme-primary truncate flex-1">
          {alarm.message}
        </span>
        <span
          className={`inline-flex items-center px-1.5 py-0.5 rounded text-[10px] font-medium border shrink-0 ${STATUS_PILL[alarm.status]}`}
        >
          {alarm.status}
        </span>
        <Link
          to={`/issues/${mergedToIssueId}`}
          onClick={(e) => e.stopPropagation()}
          className="inline-flex items-center gap-1 px-2 py-0.5 rounded text-[10px] font-medium border bg-purple-500/15 text-purple-400 border-purple-500/30 hover:bg-purple-500/25 transition-colors shrink-0"
        >
          moved to <span className="font-mono">{mergedToIssueId}</span>
        </Link>
      </div>

      {/* 4W Grid */}
      <div className="grid grid-cols-4 gap-4 mt-2">
        {/* What */}
        <div>
          <div className="text-[10px] font-semibold uppercase tracking-wider text-theme-muted mb-1">
            What
          </div>
          <div className="flex flex-col gap-0.5">
            <div className="flex items-center gap-1.5 flex-wrap">
              <span className="badge text-[10px]">{alarm.type}</span>
              <span className="flex items-center gap-1">
                <span className={`w-2 h-2 rounded-full ${SEVERITY_DOT[alarm.severity]}`} />
                <span className="text-xs text-theme-secondary">{alarm.severity}</span>
              </span>
            </div>
            {humanRiskLevel && RISK_LEVEL_BADGE[humanRiskLevel] && (
              <span
                className={`inline-flex items-center self-start px-1.5 py-0.5 rounded text-[10px] font-medium border ${RISK_LEVEL_BADGE[humanRiskLevel]}`}
              >
                {RISK_LEVEL_LABEL[humanRiskLevel]}
              </span>
            )}
            {alarm.value != null && (
              <FieldRow
                label="Value"
                value={`${alarm.value}${alarm.unit ? ` ${alarm.unit}` : ''}`}
              />
            )}
            {alarm.labels.length > 0 && (
              <div className="flex flex-wrap gap-1 mt-0.5">
                {alarm.labels.map((lbl) => (
                  <span
                    key={lbl}
                    className={`inline-flex items-center px-1.5 py-0.5 rounded text-[9px] font-medium border ${LABEL_COLORS[lbl]}`}
                  >
                    {lbl}
                  </span>
                ))}
              </div>
            )}
          </div>
        </div>

        {/* When */}
        <div>
          <div className="text-[10px] font-semibold uppercase tracking-wider text-theme-muted mb-1">
            When
          </div>
          <div className="flex flex-col gap-0.5">
            <FieldRow label="Fired" value={formatDateTime(alarm.alarmTime)} />
            <FieldRow
              label="Recovery"
              value={
                alarm.recoveryTime ? (
                  formatDateTime(alarm.recoveryTime)
                ) : (
                  <span className="text-rose-400 text-xs">Active</span>
                )
              }
            />
          </div>
        </div>

        {/* Where */}
        <div>
          <div className="text-[10px] font-semibold uppercase tracking-wider text-theme-muted mb-1">
            Where
          </div>
          <div className="flex flex-col gap-0.5">
            <FieldRow
              label="Eqp"
              value={`${alarm.eqpId}${alarm.chamberId ? ` / ${alarm.chamberId}` : ''}`}
            />
            <FieldRow label="Product" value={alarm.productId} />
            {(alarm.operName || alarm.operNo) && (
              <FieldRow
                label="Oper"
                value={[alarm.operName, alarm.operNo].filter(Boolean).join(' / ')}
              />
            )}
            {alarm.lotId && (
              <FieldRow
                label="Lot"
                value={`${alarm.lotId}${alarm.waferId ? ` / ${alarm.waferId}` : ''}`}
              />
            )}
            {alarm.recipeId && <FieldRow label="Recipe" value={alarm.recipeId} />}
            {alarm.lotPriority != null && (
              <FieldRow label="Priority" value={String(alarm.lotPriority)} />
            )}
          </div>
        </div>

        {/* Who */}
        <div>
          <div className="text-[10px] font-semibold uppercase tracking-wider text-theme-muted mb-1">
            Who
          </div>
          <div className="flex flex-col gap-0.5">
            <FieldRow label="Owner" value={alarm.owner} />
            <FieldRow label="Dept" value={alarm.department} />
            {alarm.module && <FieldRow label="Module" value={alarm.module} />}
            {alarm.piOwner && <FieldRow label="PI" value={alarm.piOwner} />}
          </div>
        </div>
      </div>
    </Link>
  );
}

export function HistoricalAlarmList({ rows }: HistoricalAlarmListProps) {
  if (rows.length === 0) return null;

  return (
    <div className="card p-5">
      <h2 className="text-xs font-semibold uppercase tracking-wide text-theme-muted mb-3">
        Historical Alarms ({rows.length})
      </h2>
      <div className="flex flex-col gap-2">
        {rows.map(({ alarm, mergedToIssueId }) => (
          <HistoricalAlarmCard
            key={alarm.id}
            alarm={alarm}
            mergedToIssueId={mergedToIssueId}
          />
        ))}
      </div>
    </div>
  );
}
