import { ArrowLeft, Building2, Calendar, Check, Clock, GitMerge, Package, Pencil, User, Wrench, X } from 'lucide-react';
import { useState } from 'react';
import { Link } from 'react-router-dom';
import type { Issue } from '../../types';
import { getUserById } from '../../lib/users';
import { RiskBadge } from '../issues/RiskBadge';
import { StatusBadge } from '../issues/StatusBadge';

interface IssueHeaderProps {
  issue: Issue;
  onAssign: (ownerId: string) => Promise<void> | void;
  onMerge?: () => void;
  onPullAlarms?: () => void;
  disabled?: boolean;
}

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

export function IssueHeader({ issue, onAssign, onMerge, onPullAlarms, disabled }: IssueHeaderProps) {
  const ownerName = getUserById(issue.ownerId)?.name ?? issue.ownerId;
  const [editing, setEditing] = useState(false);
  const [draft, setDraft] = useState(ownerName);
  const [saving, setSaving] = useState(false);

  const startEdit = () => {
    setDraft(ownerName);
    setEditing(true);
  };

  const cancel = () => {
    setEditing(false);
    setDraft(ownerName);
  };

  const save = async () => {
    const next = draft.trim();
    if (!next || next === ownerName) {
      cancel();
      return;
    }
    setSaving(true);
    try {
      await onAssign(next);
      setEditing(false);
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="card p-5">
      <Link
        to="/issues"
        className="inline-flex items-center gap-1.5 text-xs text-theme-muted hover:text-theme-primary mb-3"
      >
        <ArrowLeft size={13} />
        Issues
      </Link>

      <div className="flex items-start justify-between gap-4 flex-wrap">
        <div className="min-w-0 flex-1">
          <div className="flex items-center gap-2 flex-wrap">
            <h1 className="text-xl font-semibold text-theme-primary">{issue.title}</h1>
            <span className="badge font-mono text-[10px]">{issue.id}</span>
          </div>
          <div className="mt-2 flex items-center gap-2 flex-wrap">
            <RiskBadge level={issue.riskLevel} />
            <StatusBadge status={issue.status} />
            {issue.module && <span className="badge">{issue.module}</span>}
            {issue.labels.map((l) => (
              <span key={l} className="badge">{l}</span>
            ))}
          </div>
        </div>

        {!disabled && (
          <div className="flex items-center gap-2">
            {issue.status !== 'Merged' && onPullAlarms && (
              <button
                onClick={onPullAlarms}
                className="btn-secondary btn-sm"
              >
                <GitMerge size={13} />
                Pull alarms from...
              </button>
            )}
            {issue.status !== 'Merged' && onMerge && (
              <div className="relative group">
                <button
                  onClick={issue.status === 'Triage' ? onMerge : undefined}
                  disabled={issue.status !== 'Triage'}
                  className="btn-secondary btn-sm"
                >
                  <GitMerge size={13} />
                  Merge into...
                </button>
                {issue.status !== 'Triage' && (
                  <div className="absolute right-0 top-full mt-1 z-10 hidden group-hover:block w-56 px-3 py-2 text-xs text-theme-secondary bg-surface-overlay border border-border-subtle rounded-lg shadow-lg">
                    Only Triage issues can be merged. Use <em>moveAlarm</em> to transfer individual alarms instead.
                  </div>
                )}
              </div>
            )}
            {editing ? (
              <>
                <input
                  autoFocus
                  value={draft}
                  onChange={(e) => setDraft(e.target.value)}
                  onKeyDown={(e) => {
                    if (e.key === 'Enter') save();
                    if (e.key === 'Escape') cancel();
                  }}
                  placeholder="Owner name"
                  className="input-base w-44"
                  disabled={saving}
                />
                <button onClick={save} disabled={saving} className="btn-primary btn-sm">
                  <Check size={13} />
                  Save
                </button>
                <button onClick={cancel} disabled={saving} className="btn-ghost btn-sm">
                  <X size={13} />
                </button>
              </>
            ) : (
              <button onClick={startEdit} className="btn-secondary btn-sm">
                <Pencil size={13} />
                Assign owner
              </button>
            )}
          </div>
        )}
      </div>

      <div className="mt-4 flex flex-wrap gap-2">
        <Chip icon={Package} label="product" value={issue.product} />
        <Chip icon={User} label="owner" value={ownerName} />
        <Chip icon={Building2} label="department" value={issue.department} />
        <Chip icon={Clock} label="issue_time" value={formatDateTime(issue.issueTime)} />
        <Chip icon={Wrench} label="oper_name" value={issue.operName ?? '—'} />
        {issue.operNo && <Chip icon={Wrench} label="oper_no" value={issue.operNo} />}
        <Chip icon={Calendar} label="created" value={formatDateTime(issue.date)} />
      </div>
    </div>
  );
}
