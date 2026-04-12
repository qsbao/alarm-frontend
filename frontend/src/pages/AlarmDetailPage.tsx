import {
  ArrowLeft,
  ArrowRightLeft,
  Bell,
  Building2,
  Calendar,
  Check,
  Clock,
  Cpu,
  Gauge,
  Link as LinkIcon,
  MessageSquare,
  Minus,
  Package,
  Plus,
  ShieldAlert,
  Tag,
  Unlink,
  User,
  Wrench,
} from 'lucide-react';
import { useCallback, useEffect, useState } from 'react';
import { Link, useParams } from 'react-router-dom';
import type { Alarm, AlarmActivityEntry, AlarmActivityType, AlarmLabel, HumanRisk, Issue } from '../types';
import { ALL_ALARM_LABELS, ALL_HUMAN_RISKS } from '../types';
import { useCurrentUserStore } from '../stores/currentUserStore';
import { alarmPermissions } from '../lib/alarmPermissions';
import { isActive } from '../lib/alarmFiltering';
import { useAlarm } from '../hooks/useAlarms';
import { api } from '../api/client';
import type { IssueDraft } from '../lib/issueFromAlarm';
import { LinkedIssueCard } from '../components/alarms/LinkedIssueCard';
import { CreateIssueFromAlarmModal } from '../components/alarms/CreateIssueFromAlarmModal';

const SEVERITY_COLOR: Record<string, string> = {
  Critical: 'bg-red-500/15 text-red-400 border-red-500/30',
  High: 'bg-orange-500/15 text-orange-400 border-orange-500/30',
  Medium: 'bg-amber-500/15 text-amber-400 border-amber-500/30',
  Low: 'bg-slate-500/15 text-slate-400 border-slate-500/30',
};

const STATUS_COLOR: Record<string, string> = {
  Open: 'bg-blue-500/15 text-blue-400 border-blue-500/30',
  Acked: 'bg-emerald-500/15 text-emerald-400 border-emerald-500/30',
};

const RISK_LABELS: Record<HumanRisk, string> = {
  high: 'High',
  middle: 'Middle',
  low: 'Low',
};

const RISK_COLOR: Record<HumanRisk, string> = {
  high: 'bg-red-500/15 text-red-400 border-red-500/30',
  middle: 'bg-amber-500/15 text-amber-400 border-amber-500/30',
  low: 'bg-slate-500/15 text-slate-400 border-slate-500/30',
};

function formatDateTime(iso: string): string {
  const d = new Date(iso);
  return `${d.toISOString().slice(0, 10)} ${d.toISOString().slice(11, 16)}`;
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
  return (
    <div className="flex items-center gap-2 px-3 py-1.5 rounded-lg bg-surface-overlay/40 border border-border-subtle/40">
      <Icon size={13} className="text-theme-muted" />
      <span className="text-xs text-theme-muted">{label}</span>
      <span className="text-xs text-theme-primary font-medium">{value}</span>
    </div>
  );
}

// --- 4W Panels ---

function FourWPanels({ alarm, now }: { alarm: Alarm; now: number }) {
  const active = isActive(alarm, now);

  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
      <div className="card p-4">
        <h3 className="text-[10px] font-semibold uppercase tracking-wider text-theme-muted mb-2">What</h3>
        <div className="text-sm text-theme-primary font-medium mb-1">{alarm.message}</div>
        <div className="flex items-center gap-2 flex-wrap">
          <span className="badge text-[10px]">{alarm.type}</span>
          <span className={`inline-flex items-center px-1.5 py-0.5 rounded text-[10px] font-medium border ${SEVERITY_COLOR[alarm.severity]}`}>
            {alarm.severity}
          </span>
          {alarm.value != null && (
            <span className="text-xs text-theme-secondary">
              {alarm.value} {alarm.unit}
            </span>
          )}
        </div>
      </div>

      <div className="card p-4">
        <h3 className="text-[10px] font-semibold uppercase tracking-wider text-theme-muted mb-2">When</h3>
        <div className="text-xs text-theme-secondary space-y-1">
          <div><span className="text-theme-muted">Fired:</span> {formatDateTime(alarm.time)}</div>
          {alarm.recoveryTime && (
            <div><span className="text-theme-muted">Recovered:</span> {formatDateTime(alarm.recoveryTime)}</div>
          )}
          <div className={`inline-flex items-center px-1.5 py-0.5 rounded text-[10px] font-medium border ${
            active
              ? 'bg-rose-500/15 text-rose-400 border-rose-500/30'
              : 'bg-slate-500/15 text-slate-400 border-slate-500/30'
          }`}>
            {active ? 'Active' : 'Recovered'}
          </div>
        </div>
      </div>

      <div className="card p-4">
        <h3 className="text-[10px] font-semibold uppercase tracking-wider text-theme-muted mb-2">Where</h3>
        <div className="text-xs text-theme-secondary space-y-1">
          <div><span className="text-theme-muted">Machine:</span> <span className="font-mono">{alarm.machineId}</span>{alarm.chamberId && ` / ${alarm.chamberId}`}</div>
          <div><span className="text-theme-muted">Product:</span> {alarm.product}</div>
          <div><span className="text-theme-muted">Operation:</span> {alarm.operation}</div>
        </div>
      </div>

      <div className="card p-4">
        <h3 className="text-[10px] font-semibold uppercase tracking-wider text-theme-muted mb-2">Who</h3>
        <div className="text-xs text-theme-secondary space-y-1">
          <div><span className="text-theme-muted">Owner:</span> {alarm.owner}</div>
          <div><span className="text-theme-muted">Department:</span> {alarm.department}</div>
        </div>
      </div>
    </div>
  );
}

// --- Action Panel (read-only for now; mutations in future slice) ---

function ActionPanel({ alarm }: { alarm: Alarm }) {
  return (
    <div className="card p-5 flex flex-col gap-4">
      <h2 className="text-xs font-semibold uppercase tracking-wide text-theme-muted">Info</h2>

      <div>
        <span className={`inline-flex items-center px-1.5 py-0.5 rounded text-[10px] font-medium border ${STATUS_COLOR[alarm.status]}`}>
          {alarm.status}
        </span>
      </div>

      {alarm.labels.length > 0 && (
        <div>
          <h3 className="text-[10px] font-semibold uppercase tracking-wider text-theme-muted mb-2">Labels</h3>
          <div className="flex flex-wrap gap-1.5">
            {alarm.labels.map((label) => (
              <span
                key={label}
                className="px-2 py-0.5 rounded text-[10px] font-medium border bg-accent-subtle text-theme-accent border-theme-accent/30"
              >
                {label}
              </span>
            ))}
          </div>
        </div>
      )}

      {alarm.humanRisk && (
        <div>
          <h3 className="text-[10px] font-semibold uppercase tracking-wider text-theme-muted mb-2">Human Risk</h3>
          <span className={`inline-flex items-center px-2.5 py-1 rounded text-[10px] font-medium border ${RISK_COLOR[alarm.humanRisk]}`}>
            {RISK_LABELS[alarm.humanRisk]}
          </span>
        </div>
      )}
    </div>
  );
}

// --- Main Page ---

export function AlarmDetailPage() {
  const { id } = useParams<{ id: string }>();
  const { alarm, loading } = useAlarm(id);
  const currentUser = useCurrentUserStore((s) => s.currentUser);
  const now = Date.now();

  if (loading) {
    return (
      <div className="h-full flex flex-col items-center justify-center gap-3">
        <div className="text-sm text-theme-muted">Loading alarm...</div>
      </div>
    );
  }

  if (!alarm) {
    return (
      <div className="h-full flex flex-col items-center justify-center gap-3">
        <div className="text-sm text-theme-muted">Alarm not found.</div>
        <Link to="/alarms" className="btn-secondary btn-sm">
          Back to Alarms
        </Link>
      </div>
    );
  }

  return (
    <div className="h-full overflow-y-auto bg-surface-base">
      <div className="max-w-6xl mx-auto p-6 flex flex-col gap-5">
        {/* Header */}
        <div className="card p-5">
          <Link
            to="/alarms"
            className="inline-flex items-center gap-1.5 text-xs text-theme-muted hover:text-theme-primary mb-3"
          >
            <ArrowLeft size={13} />
            Alarms
          </Link>

          <div className="flex items-start justify-between gap-4 flex-wrap">
            <div className="min-w-0 flex-1">
              <div className="flex items-center gap-2 flex-wrap">
                <h1 className="text-xl font-semibold text-theme-primary">{alarm.message}</h1>
                <span className="badge font-mono text-[10px]">{alarm.id}</span>
              </div>
              <div className="mt-2 flex items-center gap-2 flex-wrap">
                <span className={`inline-flex items-center px-1.5 py-0.5 rounded text-[10px] font-medium border ${SEVERITY_COLOR[alarm.severity]}`}>
                  {alarm.severity}
                </span>
                <span className={`inline-flex items-center px-1.5 py-0.5 rounded text-[10px] font-medium border ${STATUS_COLOR[alarm.status]}`}>
                  {alarm.status}
                </span>
                <span className="badge text-[10px]">{alarm.type}</span>
                {alarm.humanRisk && (
                  <span className={`inline-flex items-center px-1.5 py-0.5 rounded text-[10px] font-medium border ${RISK_COLOR[alarm.humanRisk]}`}>
                    Risk: {RISK_LABELS[alarm.humanRisk]}
                  </span>
                )}
              </div>
            </div>
          </div>

          <div className="mt-4 flex flex-wrap gap-2">
            <Chip icon={Package} label="product" value={alarm.product} />
            <Chip icon={User} label="owner" value={alarm.owner} />
            <Chip icon={Building2} label="department" value={alarm.department} />
            <Chip icon={Clock} label="fired" value={formatDateTime(alarm.time)} />
            <Chip icon={Wrench} label="operation" value={alarm.operation} />
            <Chip icon={Cpu} label="machine" value={`${alarm.machineId}${alarm.chamberId ? ` / ${alarm.chamberId}` : ''}`} />
          </div>
        </div>

        {/* Grid: main + sidebar */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-5">
          <div className="lg:col-span-2 flex flex-col gap-5">
            <FourWPanels alarm={alarm} now={now} />
          </div>

          <div className="flex flex-col gap-5">
            <ActionPanel alarm={alarm} />
          </div>
        </div>
      </div>
    </div>
  );
}
