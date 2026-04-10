import {
  ArrowLeft,
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
import { useAlarmStore } from '../stores/alarmStore';
import { useCurrentUserStore } from '../stores/currentUserStore';
import { alarmPermissions } from '../lib/alarmPermissions';
import { isActive } from '../lib/alarmFiltering';
import { useMockClockStore } from '../stores/mockClockStore';
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

function relativeTime(iso: string): string {
  const diff = Math.max(0, Date.now() - Date.parse(iso));
  const mins = Math.floor(diff / 60_000);
  if (mins < 1) return 'just now';
  if (mins < 60) return `${mins}m ago`;
  const hours = Math.floor(mins / 60);
  if (hours < 24) return `${hours}h ago`;
  const days = Math.floor(hours / 24);
  if (days < 30) return `${days}d ago`;
  return new Date(iso).toISOString().slice(0, 10);
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

// --- Activity Timeline for Alarms ---

const ACT_ICON_MAP: Record<AlarmActivityType, typeof Plus> = {
  created: Plus,
  acked: Check,
  acked_via_issue: Check,
  recovered: ShieldAlert,
  linked: LinkIcon,
  unlinked: Unlink,
  label_added: Tag,
  label_removed: Minus,
  risk_changed: Gauge,
};

function describeActivity(entry: AlarmActivityEntry): React.ReactNode {
  switch (entry.type) {
    case 'created':
      return <>Alarm created</>;
    case 'acked':
      return (
        <>
          <span className="text-theme-primary font-medium">{entry.author}</span> acknowledged
          {entry.note && (
            <span className="text-theme-secondary"> — "{entry.note}"</span>
          )}
        </>
      );
    case 'acked_via_issue':
      return (
        <>
          Auto-acknowledged via issue{' '}
          <span className="font-mono text-theme-secondary">{entry.issueId}</span>
        </>
      );
    case 'recovered':
      return <>Alarm recovered (system)</>;
    case 'linked':
      return (
        <>
          Linked to issue{' '}
          <span className="font-mono text-theme-secondary">{entry.issueId}</span>
        </>
      );
    case 'unlinked':
      return (
        <>
          Unlinked from issue{' '}
          <span className="font-mono text-theme-secondary">{entry.issueId}</span>
        </>
      );
    case 'label_added':
      return (
        <>
          <span className="text-theme-primary font-medium">{entry.author}</span> added label{' '}
          <span className="badge text-[10px]">{entry.label}</span>
        </>
      );
    case 'label_removed':
      return (
        <>
          <span className="text-theme-primary font-medium">{entry.author}</span> removed label{' '}
          <span className="badge text-[10px]">{entry.label}</span>
        </>
      );
    case 'risk_changed':
      return (
        <>
          <span className="text-theme-primary font-medium">{entry.author}</span> changed risk{' '}
          {entry.fromRisk ? (
            <>
              <span className="text-theme-secondary">{entry.fromRisk}</span> →{' '}
            </>
          ) : (
            <>from none → </>
          )}
          <span className="text-theme-accent font-medium">{entry.toRisk}</span>
        </>
      );
  }
}

function AlarmActivityTimeline({ activity }: { activity: AlarmActivityEntry[] }) {
  const reversed = [...activity].reverse();
  return (
    <div className="card p-5">
      <h2 className="text-xs font-semibold uppercase tracking-wide text-theme-muted mb-3">
        Activity
      </h2>
      <ul className="flex flex-col gap-3">
        {reversed.map((entry) => {
          const Icon = ACT_ICON_MAP[entry.type];
          return (
            <li key={entry.id} className="flex items-start gap-3">
              <div className="w-7 h-7 shrink-0 rounded-full bg-surface-overlay/60 border border-border-subtle/40 flex items-center justify-center text-theme-muted">
                <Icon size={13} />
              </div>
              <div className="min-w-0 flex-1">
                <div className="text-xs leading-relaxed">{describeActivity(entry)}</div>
                <div className="text-[10px] text-theme-muted mt-0.5">
                  {relativeTime(entry.timestamp)}
                </div>
              </div>
            </li>
          );
        })}
      </ul>
    </div>
  );
}

// --- Action Panel ---

function ActionPanel({ alarm }: { alarm: Alarm }) {
  const currentUser = useCurrentUserStore((s) => s.currentUser);
  const { ackAlarm, setAlarmLabel, setAlarmRisk } = useAlarmStore();
  const [comment, setComment] = useState('');
  const canAck = alarmPermissions.canAck(currentUser, alarm);

  const handleAck = () => {
    ackAlarm(alarm.id, currentUser, comment || undefined);
    setComment('');
  };

  const handleLabelToggle = (label: AlarmLabel) => {
    const action = alarm.labels.includes(label) ? 'remove' : 'add';
    setAlarmLabel(alarm.id, currentUser, action, label);
  };

  const handleRiskChange = (risk: HumanRisk) => {
    setAlarmRisk(alarm.id, currentUser, risk);
  };

  return (
    <div className="card p-5 flex flex-col gap-4">
      <h2 className="text-xs font-semibold uppercase tracking-wide text-theme-muted">Actions</h2>

      {alarm.status === 'Open' && (
        <div className="flex flex-col gap-2">
          <textarea
            value={comment}
            onChange={(e) => setComment(e.target.value)}
            placeholder="Add a comment (optional)..."
            className="input-base text-xs resize-none"
            rows={2}
          />
          <div className="relative group inline-block">
            <button
              onClick={handleAck}
              disabled={!canAck}
              className="btn-primary btn-sm w-full"
            >
              <Check size={13} />
              Acknowledge
            </button>
            {!canAck && (
              <div className="absolute bottom-full left-1/2 -translate-x-1/2 mb-2 px-2 py-1 bg-surface-raised border border-border-default rounded text-[10px] text-theme-secondary whitespace-nowrap opacity-0 group-hover:opacity-100 transition-opacity z-50">
                You must be in the {alarm.department} department to acknowledge this alarm
              </div>
            )}
          </div>
        </div>
      )}

      {alarm.status === 'Acked' && (
        <div className="text-xs text-theme-muted italic">This alarm has been acknowledged.</div>
      )}

      <div>
        <h3 className="text-[10px] font-semibold uppercase tracking-wider text-theme-muted mb-2">Labels</h3>
        <div className="flex flex-wrap gap-1.5">
          {ALL_ALARM_LABELS.map((label) => {
            const active = alarm.labels.includes(label);
            return (
              <button
                key={label}
                onClick={() => handleLabelToggle(label)}
                className={`px-2 py-0.5 rounded text-[10px] font-medium border transition-colors ${
                  active
                    ? 'bg-accent-subtle text-theme-accent border-theme-accent/30'
                    : 'bg-surface-overlay/40 text-theme-muted border-border-subtle/40 hover:text-theme-secondary'
                }`}
              >
                {label}
              </button>
            );
          })}
        </div>
      </div>

      <div>
        <h3 className="text-[10px] font-semibold uppercase tracking-wider text-theme-muted mb-2">Human Risk</h3>
        <div className="flex gap-1.5">
          {ALL_HUMAN_RISKS.map((risk) => {
            const active = alarm.humanRisk === risk;
            return (
              <button
                key={risk}
                onClick={() => handleRiskChange(risk)}
                className={`px-2.5 py-1 rounded text-[10px] font-medium border transition-colors ${
                  active
                    ? RISK_COLOR[risk]
                    : 'bg-surface-overlay/40 text-theme-muted border-border-subtle/40 hover:text-theme-secondary'
                }`}
              >
                {RISK_LABELS[risk]}
              </button>
            );
          })}
        </div>
      </div>
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

// --- Main Page ---

export function AlarmDetailPage() {
  const { id } = useParams<{ id: string }>();
  const alarm = useAlarmStore((s) => s.alarms.find((a) => a.id === id));
  const { linkAlarm, unlinkAlarm } = useAlarmStore();
  const currentUser = useCurrentUserStore((s) => s.currentUser);
  const now = useMockClockStore((s) => s.now);

  const [showModal, setShowModal] = useState(false);
  const [showIssuePicker, setShowIssuePicker] = useState(false);
  const [linkedIssue, setLinkedIssue] = useState<Issue | undefined>(undefined);
  const [issueLoading, setIssueLoading] = useState(false);
  const [allIssues, setAllIssues] = useState<Issue[]>([]);
  const [issuesLoading, setIssuesLoading] = useState(false);

  const fetchLinkedIssue = useCallback(async (issueId: string | undefined) => {
    if (!issueId) {
      setLinkedIssue(undefined);
      return;
    }
    setIssueLoading(true);
    try {
      const found = await api.getIssue(issueId);
      setLinkedIssue(found);
    } finally {
      setIssueLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchLinkedIssue(alarm?.linkedIssueId);
  }, [alarm?.linkedIssueId, fetchLinkedIssue]);

  const handleCreateIssue = async (draft: IssueDraft) => {
    if (!alarm) return;
    const created = await api.createIssue(draft);
    linkAlarm(alarm.id, created.id, currentUser);
    setLinkedIssue(created);
    setShowModal(false);
  };

  const handleOpenIssuePicker = async () => {
    setShowIssuePicker(true);
    if (allIssues.length === 0) {
      setIssuesLoading(true);
      try {
        const list = await api.listIssues();
        setAllIssues(list);
      } finally {
        setIssuesLoading(false);
      }
    }
  };

  const handleLinkToIssue = async (issueId: string) => {
    if (!alarm) return;
    linkAlarm(alarm.id, issueId, currentUser);
    await api.linkAlarm(issueId, alarm.id);
    const found = await api.getIssue(issueId);
    setLinkedIssue(found);
    setShowIssuePicker(false);
  };

  const handleUnlink = () => {
    if (!alarm || !alarm.linkedIssueId) return;
    const issueId = alarm.linkedIssueId;
    unlinkAlarm(alarm.id, currentUser);
    // Also remove from issue's relatedAlarmIds
    api.unlinkAlarm(issueId, alarm.id);
    setLinkedIssue(undefined);
  };

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
            <ActionPanel alarm={alarm} />
          </div>

          <div className="flex flex-col gap-5">
            <LinkedIssueCard
              issue={linkedIssue}
              loading={issueLoading}
              onUnlink={handleUnlink}
              onCreateIssue={() => setShowModal(true)}
              onLinkExisting={handleOpenIssuePicker}
            />

            {showIssuePicker && !alarm.linkedIssueId && (
              <div className="card p-5">
                <div className="flex items-center justify-between mb-3">
                  <h2 className="text-xs font-semibold uppercase tracking-wide text-theme-muted">
                    Select Issue
                  </h2>
                  <button
                    onClick={() => setShowIssuePicker(false)}
                    className="btn-ghost btn-sm"
                  >
                    Cancel
                  </button>
                </div>
                {issuesLoading ? (
                  <div className="text-xs text-theme-muted">Loading issues...</div>
                ) : (
                  <ul className="max-h-56 overflow-y-auto flex flex-col gap-1">
                    {allIssues
                      .filter((i) => i.status !== 'Closed')
                      .map((iss) => (
                        <li key={iss.id}>
                          <button
                            onClick={() => handleLinkToIssue(iss.id)}
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
            <AlarmActivityTimeline activity={alarm.activity} />
          </div>
        </div>
      </div>

      {showModal && (
        <CreateIssueFromAlarmModal
          alarm={alarm}
          currentUser={currentUser}
          onSubmit={handleCreateIssue}
          onClose={() => setShowModal(false)}
        />
      )}
    </div>
  );
}
