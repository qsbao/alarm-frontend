import {
  ArrowLeft,
  ArrowRightLeft,
  Bell,
  Building2,
  Calendar,
  Check,
  ChevronDown,
  ChevronUp,
  Clock,
  Cpu,
  ExternalLink,
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
import { Link, useNavigate, useParams } from 'react-router-dom';
import type { Alarm, AlarmLabel, RiskLevel, Issue, IssueDraft } from '../types';
import { ALL_ALARM_LABELS, ALL_RISK_LEVELS } from '../types';
import { useCurrentUserStore } from '../stores/currentUserStore';
import { isActive } from '../lib/alarmFiltering';
import { useAlarm, useAlarmActions } from '../hooks/useAlarms';
import { backend } from '../api/backendClient';
import { LinkedIssueCard } from '../components/alarms/LinkedIssueCard';
import { CreateIssueFromAlarmModal } from '../components/alarms/CreateIssueFromAlarmModal';
import { AlarmDetailsPanel } from '../components/alarms/AlarmDetailsPanel';
import { getAlarmSourceUrl, getAlarmSourceLabel } from '../lib/external-systems/alarmSources';

const SEVERITY_COLOR: Record<string, string> = {
  P0: 'bg-red-500/15 text-red-400 border-red-500/30',
  P1: 'bg-orange-500/15 text-orange-400 border-orange-500/30',
  P2: 'bg-amber-500/15 text-amber-400 border-amber-500/30',
  P3: 'bg-slate-500/15 text-slate-400 border-slate-500/30',
};

const STATUS_COLOR: Record<string, string> = {
  Open: 'bg-blue-500/15 text-blue-400 border-blue-500/30',
  Acked: 'bg-emerald-500/15 text-emerald-400 border-emerald-500/30',
};

const RISK_LABELS: Record<RiskLevel, string> = {
  P0: 'P0',
  P1: 'P1',
  P2: 'P2',
  P3: 'P3',
};

const RISK_COLOR: Record<RiskLevel, string> = {
  P0: 'bg-red-500/15 text-red-400 border-red-500/30',
  P1: 'bg-orange-500/15 text-orange-400 border-orange-500/30',
  P2: 'bg-amber-500/15 text-amber-400 border-amber-500/30',
  P3: 'bg-slate-500/15 text-slate-400 border-slate-500/30',
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
          <div><span className="text-theme-muted">Fired:</span> {formatDateTime(alarm.alarmTime)}</div>
          {alarm.eventTime && (
            <div><span className="text-theme-muted">Event:</span> {formatDateTime(alarm.eventTime)}</div>
          )}
          {alarm.alarmDate && (
            <div><span className="text-theme-muted">Alarm Date:</span> {alarm.alarmDate}</div>
          )}
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
          <div><span className="text-theme-muted">Equipment:</span> <span className="font-mono">{alarm.eqpId}</span>{alarm.chamberId && ` / ${alarm.chamberId}`}</div>
          <div><span className="text-theme-muted">Product:</span> {alarm.productId}</div>
          {alarm.operName && <div><span className="text-theme-muted">Operation:</span> {alarm.operName}</div>}
          {alarm.operNo && <div><span className="text-theme-muted">Oper No:</span> {alarm.operNo}</div>}
          {alarm.technologyId && <div><span className="text-theme-muted">Tech:</span> {alarm.technologyId}</div>}
          {alarm.productGroupId && <div><span className="text-theme-muted">Product Group:</span> {alarm.productGroupId}</div>}
          {alarm.lotId && <div><span className="text-theme-muted">Lot:</span> {alarm.lotId}</div>}
          {alarm.waferId && <div><span className="text-theme-muted">Wafer:</span> {alarm.waferId}</div>}
          {alarm.recipeId && <div><span className="text-theme-muted">Recipe:</span> {alarm.recipeId}</div>}
          {alarm.routeId && <div><span className="text-theme-muted">Route:</span> {alarm.routeId}</div>}
        </div>
      </div>

      <div className="card p-4">
        <h3 className="text-[10px] font-semibold uppercase tracking-wider text-theme-muted mb-2">Who</h3>
        <div className="text-xs text-theme-secondary space-y-1">
          <div><span className="text-theme-muted">Owner:</span> {alarm.owner}</div>
          <div><span className="text-theme-muted">Department:</span> {alarm.department}</div>
          {alarm.module && <div><span className="text-theme-muted">Module:</span> {alarm.module}</div>}
          {alarm.moduleOwner && <div><span className="text-theme-muted">Module Owner:</span> {alarm.moduleOwner}</div>}
          {alarm.piOwner && <div><span className="text-theme-muted">PI Owner:</span> {alarm.piOwner}</div>}
        </div>
      </div>
    </div>
  );
}

// --- Action Panel ---

function ActionPanel({
  alarm,
  onAck,
  onSetLabel,
  onSetRisk,
  canAck,
}: {
  alarm: Alarm;
  onAck: () => void;
  onSetLabel: (action: 'add' | 'remove', label: AlarmLabel) => void;
  onSetRisk: (risk: RiskLevel) => void;
  canAck: boolean;
}) {
  return (
    <div className="card p-5 flex flex-col gap-4">
      <h2 className="text-xs font-semibold uppercase tracking-wide text-theme-muted">Actions</h2>

      <div className="flex items-center gap-2">
        <span className={`inline-flex items-center px-1.5 py-0.5 rounded text-[10px] font-medium border ${STATUS_COLOR[alarm.status]}`}>
          {alarm.status}
        </span>
        {alarm.status === 'Open' && (
          <button
            onClick={onAck}
            disabled={!canAck}
            className="btn-primary btn-sm text-[10px] disabled:opacity-40 disabled:cursor-not-allowed"
            title={canAck ? 'Acknowledge alarm' : 'You can only ack alarms in your department'}
          >
            <Check size={12} className="mr-1 inline" />
            Ack
          </button>
        )}
      </div>

      <div>
        <h3 className="text-[10px] font-semibold uppercase tracking-wider text-theme-muted mb-2">Labels</h3>
        <div className="flex flex-wrap gap-1.5">
          {ALL_ALARM_LABELS.map((label) => {
            const active = alarm.labels.includes(label);
            return (
              <button
                key={label}
                onClick={() => onSetLabel(active ? 'remove' : 'add', label)}
                className={`px-2 py-0.5 rounded text-[10px] font-medium border transition-colors ${
                  active
                    ? 'bg-accent-subtle text-theme-accent border-theme-accent/30'
                    : 'bg-surface-overlay/40 text-theme-muted border-border-subtle/40 hover:text-theme-secondary'
                }`}
              >
                {active ? <Minus size={10} className="mr-0.5 inline" /> : <Plus size={10} className="mr-0.5 inline" />}
                {label}
              </button>
            );
          })}
        </div>
      </div>

      <div>
        <h3 className="text-[10px] font-semibold uppercase tracking-wider text-theme-muted mb-2">Risk Level</h3>
        <div className="flex gap-1.5">
          {ALL_RISK_LEVELS.map((risk) => (
            <button
              key={risk}
              onClick={() => onSetRisk(risk)}
              className={`inline-flex items-center px-2.5 py-1 rounded text-[10px] font-medium border transition-colors ${
                alarm.riskLevel === risk
                  ? RISK_COLOR[risk]
                  : 'bg-surface-overlay/40 text-theme-muted border-border-subtle/40 hover:text-theme-secondary'
              }`}
            >
              {RISK_LABELS[risk]}
            </button>
          ))}
        </div>
      </div>
    </div>
  );
}

// --- External Source Panel ---

function ExternalSourcePanel({ alarm }: { alarm: Alarm }) {
  const [showSourceBody, setShowSourceBody] = useState(false);

  if (!alarm.source) return null;

  return (
    <div className="card p-5">
      <h2 className="text-xs font-semibold uppercase tracking-wide text-theme-muted mb-3">External Source</h2>
      <div className="space-y-3">
        <div className="flex items-center justify-between">
          <div className="text-xs text-theme-secondary">
            <span className="text-theme-muted">Source:</span> {getAlarmSourceLabel(alarm.source)}
          </div>
          {alarm.source && alarm.sourceAlarmId && (
            <a
              href={getAlarmSourceUrl(alarm.source, alarm.sourceAlarmId)}
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center gap-1 text-xs text-theme-accent hover:underline"
            >
              View in {getAlarmSourceLabel(alarm.source)}
              <ExternalLink size={10} />
            </a>
          )}
        </div>
        {alarm.sourceAlarmId && (
          <div className="text-xs text-theme-secondary">
            <span className="text-theme-muted">Source Alarm ID:</span> <span className="font-mono">{alarm.sourceAlarmId}</span>
          </div>
        )}
        {alarm.externalStatus && (
          <div className="text-xs text-theme-secondary">
            <span className="text-theme-muted">Upstream Status:</span> {alarm.externalStatus}
            {alarm.externalStatusUpdatedAt && (
              <span className="text-theme-muted ml-2">({formatDateTime(alarm.externalStatusUpdatedAt)})</span>
            )}
          </div>
        )}
        {alarm.sourceAlarmBody && (
          <div>
            <button
              onClick={() => setShowSourceBody(!showSourceBody)}
              className="inline-flex items-center gap-1 text-xs text-theme-muted hover:text-theme-secondary"
            >
              {showSourceBody ? <ChevronUp size={12} /> : <ChevronDown size={12} />}
              {showSourceBody ? 'Hide' : 'Show'} raw source payload
            </button>
            {showSourceBody && (
              <div className="mt-2 p-3 bg-surface-overlay/30 rounded border border-border-subtle/30">
                <pre className="text-[10px] text-theme-secondary overflow-x-auto font-mono whitespace-pre-wrap">
                  {alarm.sourceAlarmBody}
                </pre>
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
}

// --- Main Page ---

export function AlarmDetailPage() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { alarm, loading, refresh } = useAlarm(id);
  const currentUser = useCurrentUserStore((s) => s.currentUser);
  const actions = useAlarmActions(id ?? '', refresh);
  const now = Date.now();

  const [linkedIssue, setLinkedIssue] = useState<Issue | undefined>(undefined);
  const [linkedIssueLoading, setLinkedIssueLoading] = useState(true);
  const [showCreateModal, setShowCreateModal] = useState(false);

  // Fetch linked issue for this alarm via GET /api/alarms/{alarmId}/issue
  const reloadLinkedIssue = useCallback(async () => {
    if (!id) { setLinkedIssueLoading(false); return; }
    setLinkedIssueLoading(true);
    try {
      const { data: link } = await backend.GET('/api/alarms/{alarmId}/issue', {
        params: { path: { alarmId: id } },
      });
      if (!link) { setLinkedIssue(undefined); return; }
      const issueId = (link as unknown as { issueId: string }).issueId;
      const { data: issueData } = await backend.GET('/api/issues/{id}', {
        params: { path: { id: issueId } },
      });
      if (issueData) {
        const raw = issueData as unknown as {
          id: string; title: string; date: string;
          riskLevel: string; status: string; issueTime: string;
          operName?: string; operNo?: string; module?: string;
          labels: string[]; product: string; ownerId: string;
          department: string; description: string;
        };
        setLinkedIssue({
          ...raw,
          riskLevel: raw.riskLevel as Issue['riskLevel'],
          status: raw.status as Issue['status'],
          module: raw.module as Issue['module'],
          labels: (raw.labels ?? []) as Issue['labels'],
          activity: [],
        });
      } else {
        setLinkedIssue(undefined);
      }
    } catch {
      setLinkedIssue(undefined);
    } finally {
      setLinkedIssueLoading(false);
    }
  }, [id]);

  useEffect(() => { reloadLinkedIssue(); }, [reloadLinkedIssue]);

  const handleUnlink = useCallback(async () => {
    if (!id || !linkedIssue) return;
    await backend.DELETE('/api/issues/{id}/alarms/{alarmId}', {
      params: { path: { id: linkedIssue.id, alarmId: id } },
    });
    setLinkedIssue(undefined);
  }, [id, linkedIssue]);

  const handleCreateIssueFromAlarm = useCallback(
    async (draft: IssueDraft) => {
      if (!id || !alarm) return;
      const issueId = `iss-${Date.now()}`;
      await backend.POST('/api/issues', {
        body: {
          id: issueId,
          title: draft.title,
          riskLevel: draft.riskLevel,
          issueTime: draft.issueTime,
          operName: draft.operName,
          operNo: draft.operNo,
          product: draft.product,
          ownerId: draft.ownerId,
          department: draft.department,
          description: draft.description,
          alarmId: id,
        } as any,
      });
      setShowCreateModal(false);
      navigate(`/issues/${issueId}`);
    },
    [id, alarm, navigate],
  );

  const handleLinkExisting = useCallback(async () => {
    if (!id) return;
    const issueId = prompt('Enter issue ID to link to:');
    if (!issueId) return;
    await backend.POST('/api/issues/{id}/alarms/{alarmId}', {
      params: { path: { id: issueId, alarmId: id } },
    });
    await reloadLinkedIssue();
  }, [id, reloadLinkedIssue]);

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
                {alarm.externalStatus ? (
                  <span className="inline-flex items-center px-1.5 py-0.5 rounded text-[10px] font-medium border bg-slate-500/15 text-slate-300 border-slate-500/30">
                    Upstream: {alarm.externalStatus} · Local: {alarm.status}
                  </span>
                ) : (
                  <span className={`inline-flex items-center px-1.5 py-0.5 rounded text-[10px] font-medium border ${STATUS_COLOR[alarm.status]}`}>
                    {alarm.status}
                  </span>
                )}
                <span className="badge text-[10px]">{alarm.type}</span>
                {alarm.riskLevel && (
                  <span className={`inline-flex items-center px-1.5 py-0.5 rounded text-[10px] font-medium border ${RISK_COLOR[alarm.riskLevel]}`}>
                    Risk: {RISK_LABELS[alarm.riskLevel]}
                  </span>
                )}
              </div>
            </div>
          </div>

          <div className="mt-4 flex flex-wrap gap-2">
            <Chip icon={Package} label="product" value={alarm.productId} />
            <Chip icon={User} label="owner" value={alarm.owner} />
            <Chip icon={Building2} label="department" value={alarm.department} />
            <Chip icon={Clock} label="fired" value={formatDateTime(alarm.alarmTime)} />
            {alarm.operName && <Chip icon={Wrench} label="operation" value={alarm.operName} />}
            <Chip icon={Cpu} label="equipment" value={`${alarm.eqpId}${alarm.chamberId ? ` / ${alarm.chamberId}` : ''}`} />
          </div>
        </div>

        {/* Grid: main + sidebar */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-5">
          <div className="lg:col-span-2 flex flex-col gap-5">
            <FourWPanels alarm={alarm} now={now} />
            <AlarmDetailsPanel alarm={alarm} />
            {alarm.source && (
              <ExternalSourcePanel alarm={alarm} />
            )}
          </div>

          <div className="flex flex-col gap-5">
            <ActionPanel
              alarm={alarm}
              onAck={() => actions.ack()}
              onSetLabel={(action, label) => actions.setLabel(action, label)}
              onSetRisk={(risk) => actions.setRisk(risk)}
              canAck={currentUser.department !== '' && currentUser.department === alarm.department}
            />
            <LinkedIssueCard
              issue={linkedIssue}
              loading={linkedIssueLoading}
              onUnlink={handleUnlink}
              onCreateIssue={() => setShowCreateModal(true)}
              onLinkExisting={handleLinkExisting}
            />
          </div>
        </div>

        {showCreateModal && alarm && (
          <CreateIssueFromAlarmModal
            alarm={alarm}
            currentUser={currentUser}
            onSubmit={(draft) => handleCreateIssueFromAlarm(draft)}
            onClose={() => setShowCreateModal(false)}
          />
        )}
      </div>
    </div>
  );
}
