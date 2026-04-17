import { GitMerge, PlusCircle, X } from 'lucide-react';
import { useEffect } from 'react';
import type { Alarm, Issue } from '../../types';
import { findSimilarCauses } from '../../lib/dashboard/findSimilarCauses';
import { getUserById } from '../../lib/users';
import { StatusBadge } from '../issues/StatusBadge';
import { formatEventTime } from './alarmRowHelpers';

interface TriageDrawerProps {
  alarm: Alarm;
  candidateIssues: Issue[];
  onClose: () => void;
  onStartNewWorkflow: () => void;
  onMergeInto: (preselectedTargetId?: string) => void;
}

export function TriageDrawer({
  alarm,
  candidateIssues,
  onClose,
  onStartNewWorkflow,
  onMergeInto,
}: TriageDrawerProps) {
  useEffect(() => {
    function handleKeyDown(e: KeyboardEvent) {
      if (e.key === 'Escape') onClose();
    }
    document.addEventListener('keydown', handleKeyDown);
    return () => document.removeEventListener('keydown', handleKeyDown);
  }, [onClose]);

  const ranked = findSimilarCauses(alarm, candidateIssues);
  const owner = getUserById(alarm.owner);
  const ownerName = owner?.name ?? alarm.owner;

  return (
    <>
      <div className="fixed inset-0 bg-black/30 z-40" onClick={onClose} data-testid="triage-drawer-backdrop" />

      <div
        data-testid="triage-drawer"
        className="fixed top-0 right-0 h-full w-[440px] max-w-full bg-surface-base border-l border-border-default z-50 flex flex-col shadow-2xl animate-slideIn"
      >
        <div className="flex items-center justify-between px-5 py-3 border-b border-border-subtle">
          <div className="flex items-center gap-2">
            <span className="text-xs font-semibold text-theme-primary">Triage</span>
            <span className="badge font-mono text-[10px]">{alarm.id}</span>
          </div>
          <button onClick={onClose} className="btn-ghost btn-xs" aria-label="Close triage drawer">
            <X size={14} />
          </button>
        </div>

        <div className="flex-1 overflow-y-auto p-5 flex flex-col gap-5">
          <section data-testid="triage-drawer-summary">
            <div className="text-sm text-theme-primary font-medium mb-2">{alarm.message}</div>
            <div className="flex items-center gap-2 flex-wrap mb-2">
              <span className="badge text-[10px]">{alarm.type}</span>
              <span className="badge text-[10px]">{alarm.severity}</span>
            </div>
            <div className="text-xs text-theme-secondary space-y-0.5">
              <div>
                <span className="text-theme-muted">Tool:</span>{' '}
                <span className="font-mono">{alarm.eqpId}</span>
                {alarm.chamberId && ` / ${alarm.chamberId}`}
              </div>
              <div>
                <span className="text-theme-muted">When:</span>{' '}
                {formatEventTime(alarm.eventTime ?? alarm.alarmTime)}
              </div>
              <div>
                <span className="text-theme-muted">Owner:</span> {ownerName}{' '}
                <span className="text-theme-muted">({alarm.department})</span>
              </div>
              <div>
                <span className="text-theme-muted">Product:</span> {alarm.productId}
              </div>
            </div>
          </section>

          <section data-testid="triage-drawer-candidates">
            <h3 className="text-[10px] font-semibold uppercase tracking-wider text-theme-muted mb-2">
              Similar causes ({ranked.length})
            </h3>
            {ranked.length === 0 ? (
              <div className="text-xs text-theme-muted">
                No same-day candidates from this department on this tool or product.
              </div>
            ) : (
              <ul className="flex flex-col gap-1.5">
                {ranked.map((issue) => (
                  <li key={issue.id}>
                    <button
                      type="button"
                      data-testid="triage-drawer-candidate"
                      data-issue-id={issue.id}
                      onClick={() => onMergeInto(issue.id)}
                      className="w-full text-left rounded border border-border-subtle/60 bg-surface-overlay/30 hover:bg-surface-overlay/60 transition-colors p-2"
                    >
                      <div className="flex items-center gap-2 flex-wrap">
                        <span className="font-mono text-[10px] text-theme-muted">{issue.id}</span>
                        <span className="text-sm text-theme-primary truncate">{issue.title}</span>
                        <StatusBadge status={issue.status} />
                      </div>
                      <div className="mt-0.5 text-xs text-theme-muted">
                        {issue.product}
                        {issue.module ? ` · ${issue.module}` : ''}
                      </div>
                    </button>
                  </li>
                ))}
              </ul>
            )}
          </section>
        </div>

        <div className="border-t border-border-subtle px-5 py-3 flex items-center justify-end gap-2">
          <button
            type="button"
            data-testid="triage-drawer-start-new"
            onClick={onStartNewWorkflow}
            className="btn-secondary btn-sm"
          >
            <PlusCircle size={13} />
            Start new workflow
          </button>
          <button
            type="button"
            data-testid="triage-drawer-merge"
            onClick={() => onMergeInto()}
            className="btn-secondary btn-sm"
          >
            <GitMerge size={13} />
            Merge into existing…
          </button>
        </div>
      </div>
    </>
  );
}
