import { AlertTriangle, GitMerge, X } from 'lucide-react';
import { useCallback, useEffect, useRef, useState } from 'react';
import type { Alarm, Issue } from '../../types';
import { backend } from '../../api/backendClient';
import { StatusBadge } from '../issues/StatusBadge';
import { getUserById } from '../../lib/users';

export interface MergeSource {
  issue: Issue;
  alarms: Alarm[];
}

interface MergeDialogProps {
  sources: MergeSource[];
  onConfirm: (targetId: string) => Promise<void>;
  onCancel: () => void;
  currentUserDepartment: string;
  preselectedTargetId?: string;
}

export function MergeDialog({ sources, onConfirm, onCancel, currentUserDepartment, preselectedTargetId }: MergeDialogProps) {
  const [candidates, setCandidates] = useState<Issue[]>([]);
  const [selectedTargetId, setSelectedTargetId] = useState<string | null>(preselectedTargetId ?? null);
  const [targetAlarmCount, setTargetAlarmCount] = useState(0);
  const [loading, setLoading] = useState(true);
  const [merging, setMerging] = useState(false);
  const cancelRef = useRef<HTMLButtonElement>(null);

  const sourceIds = sources.map((s) => s.issue.id);
  const totalSourceAlarms = sources.reduce((sum, s) => sum + s.alarms.length, 0);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      const { data } = await backend.GET('/api/issues', {});
      if (!cancelled && data) {
        const excludeSet = new Set(sourceIds);
        const list = (data as unknown as Array<Record<string, any>>)
          .filter((i) => i.department === currentUserDepartment
            && !excludeSet.has(i.id as string)
            && i.status !== 'Merged')
          .sort((a, b) => new Date(b.date as string).getTime() - new Date(a.date as string).getTime())
          .map((i) => ({
            id: i.id as string,
            title: i.title as string,
            date: i.date as string,
            riskLevel: i.riskLevel as Issue['riskLevel'],
            status: i.status as Issue['status'],
            issueTime: i.issueTime as string,
            operName: i.operName as string | undefined,
            module: i.module as Issue['module'],
            labels: (i.labels ?? []) as Issue['labels'],
            product: i.product as string,
            ownerId: i.ownerId as string,
            department: i.department as string,
            description: (i.description ?? '') as string,
            activity: [],
          }));
        setCandidates(list);
        setLoading(false);
      }
    })();
    return () => { cancelled = true; };
  }, []);

  // Focus cancel button on mount (Cancel is default-focused)
  useEffect(() => {
    cancelRef.current?.focus();
  }, []);

  // Update target alarm count when selection changes
  useEffect(() => {
    if (selectedTargetId) {
      backend.GET('/api/issues/{id}/alarms', { params: { path: { id: selectedTargetId } } })
        .then(({ data }) => {
          setTargetAlarmCount(data ? (data as unknown as unknown[]).length : 0);
        });
    } else {
      setTargetAlarmCount(0);
    }
  }, [selectedTargetId]);

  const selectedTarget = candidates.find((c) => c.id === selectedTargetId);
  const isResolvedOrClosed = selectedTarget && (selectedTarget.status === 'Resolved' || selectedTarget.status === 'Closed');

  const handleConfirm = useCallback(async () => {
    if (!selectedTargetId || merging) return;
    setMerging(true);
    try {
      await onConfirm(selectedTargetId);
    } finally {
      setMerging(false);
    }
  }, [selectedTargetId, merging, onConfirm]);

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50" onClick={onCancel}>
      <div
        className="card w-full max-w-lg mx-4 p-6 max-h-[80vh] overflow-y-auto"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center gap-2">
            <GitMerge size={18} className="text-purple-400" />
            <h2 className="text-lg font-semibold text-theme-primary">Merge Issues</h2>
          </div>
          <button onClick={onCancel} className="btn-ghost btn-sm">
            <X size={16} />
          </button>
        </div>

        {/* Sources */}
        <div className="mb-4">
          <h3 className="text-xs font-semibold uppercase tracking-wide text-theme-muted mb-2">
            Sources ({sources.length})
          </h3>
          <div className="flex flex-col gap-2">
            {sources.map((s) => (
              <div key={s.issue.id} className="rounded-lg bg-surface-overlay/40 border border-border-subtle/40 p-3">
                <div className="flex items-center gap-2">
                  <span className="font-mono text-[10px] text-theme-muted">{s.issue.id}</span>
                  <span className="text-sm text-theme-primary font-medium truncate">{s.issue.title}</span>
                </div>
                <div className="mt-1 flex items-center gap-3 text-xs text-theme-muted">
                  <span>{s.issue.product} / {s.issue.operName ?? '—'}</span>
                  <span>{s.alarms.length} alarm{s.alarms.length !== 1 ? 's' : ''}</span>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Target picker */}
        <div className="mb-4">
          <h3 className="text-xs font-semibold uppercase tracking-wide text-theme-muted mb-2">
            Target Issue
          </h3>
          {loading ? (
            <div className="text-xs text-theme-muted">Loading candidates...</div>
          ) : candidates.length === 0 ? (
            <div className="text-xs text-theme-muted">No eligible target issues in your department.</div>
          ) : (
            <select
              className="input-base w-full text-sm"
              value={selectedTargetId ?? ''}
              onChange={(e) => setSelectedTargetId(e.target.value || null)}
            >
              <option value="">Select a target issue...</option>
              {candidates.map((c) => (
                <option key={c.id} value={c.id}>
                  {c.id} — {c.title} ({c.status})
                </option>
              ))}
            </select>
          )}
        </div>

        {/* Target details */}
        {selectedTarget && (
          <div className="mb-4 rounded-lg bg-surface-overlay/40 border border-border-subtle/40 p-3">
            <div className="flex items-center gap-2 flex-wrap">
              <span className="font-mono text-[10px] text-theme-muted">{selectedTarget.id}</span>
              <span className="text-sm text-theme-primary font-medium">{selectedTarget.title}</span>
              <StatusBadge status={selectedTarget.status} />
            </div>
            <div className="mt-1 flex items-center gap-3 text-xs text-theme-muted">
              <span>{selectedTarget.product} / {selectedTarget.operName ?? '—'}</span>
              <span>Owner: {getUserById(selectedTarget.ownerId)?.name ?? selectedTarget.ownerId}</span>
            </div>
            <div className="mt-1 text-xs text-theme-secondary">
              Has {targetAlarmCount} existing alarm{targetAlarmCount !== 1 ? 's' : ''} — total after merge: {targetAlarmCount + totalSourceAlarms}
            </div>
          </div>
        )}

        {/* Cross-status warning */}
        {isResolvedOrClosed && (
          <div className="mb-4 flex items-start gap-2 rounded-lg bg-amber-500/10 border border-amber-500/20 p-3">
            <AlertTriangle size={16} className="text-amber-400 shrink-0 mt-0.5" />
            <span className="text-xs text-amber-300">
              Target is <strong>{selectedTarget.status}</strong> — merging will <strong>not</strong> auto-reopen it.
            </span>
          </div>
        )}

        {/* Safety warning */}
        <div className="mb-5 text-xs text-theme-muted leading-relaxed">
          <strong className="text-red-400">This cannot be undone.</strong>{' '}
          To recover individual alarms after merging, use <em>moveAlarm</em>.
          <br />
          <span className="text-theme-muted/70">Merge before you start, transfer after.</span>
        </div>

        {/* Actions */}
        <div className="flex items-center justify-end gap-2">
          <button ref={cancelRef} onClick={onCancel} className="btn-secondary btn-sm">
            Cancel
          </button>
          <button
            onClick={handleConfirm}
            disabled={!selectedTargetId || merging}
            className="btn-primary btn-sm"
          >
            <GitMerge size={13} />
            {merging ? 'Merging...' : 'Merge'}
          </button>
        </div>
      </div>
    </div>
  );
}
