import { AlertTriangle, GitMerge, X } from 'lucide-react';
import { useCallback, useEffect, useRef, useState } from 'react';
import type { Alarm, Issue } from '../../types';
import { backend } from '../../api/backendClient';
import { StatusBadge } from '../issues/StatusBadge';
import { getUserById } from '../../mocks/users';

interface PullMergeDialogProps {
  target: Issue;
  targetAlarms: Alarm[];
  onConfirm: (sourceIds: string[]) => Promise<void>;
  onCancel: () => void;
  currentUserDepartment: string;
}

export function PullMergeDialog({
  target,
  targetAlarms,
  onConfirm,
  onCancel,
  currentUserDepartment,
}: PullMergeDialogProps) {
  const [candidates, setCandidates] = useState<Issue[]>([]);
  const [selectedSourceIds, setSelectedSourceIds] = useState<Set<string>>(new Set());
  const [loading, setLoading] = useState(true);
  const [merging, setMerging] = useState(false);
  const cancelRef = useRef<HTMLButtonElement>(null);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      const { data } = await backend.GET('/api/issues/{id}/merge-candidates', {
        params: { path: { id: target.id } },
      });
      if (!cancelled && data) {
        const list = (data as unknown as Array<Record<string, any>>)
          .sort((a, b) => new Date(b.date as string).getTime() - new Date(a.date as string).getTime())
          .map((i) => ({
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

  const toggleSource = (id: string) => {
    setSelectedSourceIds((prev) => {
      const next = new Set(prev);
      if (next.has(id)) {
        next.delete(id);
      } else {
        next.add(id);
      }
      return next;
    });
  };

  const [alarmCounts, setAlarmCounts] = useState<Record<string, number>>({});

  // Fetch alarm counts for candidates
  useEffect(() => {
    (async () => {
      const counts: Record<string, number> = {};
      for (const c of candidates) {
        const { data } = await backend.GET('/api/issues/{id}/alarms', {
          params: { path: { id: c.id } },
        });
        counts[c.id] = data ? (data as unknown as unknown[]).length : 0;
      }
      setAlarmCounts(counts);
    })();
  }, [candidates]);

  const selectedSources = candidates.filter((c) => selectedSourceIds.has(c.id));
  const totalSourceAlarms = selectedSources.reduce((sum, s) => {
    return sum + (alarmCounts[s.id] ?? 0);
  }, 0);

  const isResolvedOrClosed = target.status === 'Resolved' || target.status === 'Closed';

  const handleConfirm = useCallback(async () => {
    if (selectedSourceIds.size === 0 || merging) return;
    setMerging(true);
    try {
      await onConfirm(Array.from(selectedSourceIds));
    } finally {
      setMerging(false);
    }
  }, [selectedSourceIds, merging, onConfirm]);

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50" onClick={onCancel}>
      <div
        className="card w-full max-w-lg mx-4 p-6 max-h-[80vh] overflow-y-auto"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center gap-2">
            <GitMerge size={18} className="text-purple-400" />
            <h2 className="text-lg font-semibold text-theme-primary">Pull Alarms From...</h2>
          </div>
          <button onClick={onCancel} className="btn-ghost btn-sm">
            <X size={16} />
          </button>
        </div>

        {/* Target (fixed, read-only) */}
        <div className="mb-4">
          <h3 className="text-xs font-semibold uppercase tracking-wide text-theme-muted mb-2">
            Target (this issue)
          </h3>
          <div className="rounded-lg bg-surface-overlay/40 border border-border-subtle/40 p-3">
            <div className="flex items-center gap-2 flex-wrap">
              <span className="font-mono text-[10px] text-theme-muted">{target.id}</span>
              <span className="text-sm text-theme-primary font-medium">{target.title}</span>
              <StatusBadge status={target.status} />
            </div>
            <div className="mt-1 flex items-center gap-3 text-xs text-theme-muted">
              <span>{target.product} / {target.operation}</span>
              <span>Owner: {getUserById(target.ownerId)?.name ?? target.ownerId}</span>
            </div>
            <div className="mt-1 text-xs text-theme-secondary">
              Has {targetAlarms.length} existing alarm{targetAlarms.length !== 1 ? 's' : ''}
              {selectedSourceIds.size > 0 && (
                <> — total after merge: {targetAlarms.length + totalSourceAlarms}</>
              )}
            </div>
          </div>
        </div>

        {/* Cross-status warning */}
        {isResolvedOrClosed && (
          <div className="mb-4 flex items-start gap-2 rounded-lg bg-amber-500/10 border border-amber-500/20 p-3">
            <AlertTriangle size={16} className="text-amber-400 shrink-0 mt-0.5" />
            <span className="text-xs text-amber-300">
              This issue is <strong>{target.status}</strong> — merging will <strong>not</strong> auto-reopen it.
            </span>
          </div>
        )}

        {/* Source picker (multi-select) */}
        <div className="mb-4">
          <h3 className="text-xs font-semibold uppercase tracking-wide text-theme-muted mb-2">
            Select sources to pull from ({selectedSourceIds.size} selected)
          </h3>
          {loading ? (
            <div className="text-xs text-theme-muted">Loading candidates...</div>
          ) : candidates.length === 0 ? (
            <div className="text-xs text-theme-muted">No Triage issues in your department to pull from.</div>
          ) : (
            <div className="flex flex-col gap-1.5 max-h-48 overflow-y-auto">
              {candidates.map((c) => {
                const alarmCount = alarmCounts[c.id] ?? 0;
                const selected = selectedSourceIds.has(c.id);
                return (
                  <label
                    key={c.id}
                    className={`flex items-start gap-2.5 rounded-lg border p-3 cursor-pointer transition-colors ${
                      selected
                        ? 'bg-purple-500/10 border-purple-500/30'
                        : 'bg-surface-overlay/40 border-border-subtle/40 hover:bg-surface-overlay/60'
                    }`}
                  >
                    <input
                      type="checkbox"
                      checked={selected}
                      onChange={() => toggleSource(c.id)}
                      className="mt-0.5 accent-purple-500"
                    />
                    <div className="min-w-0 flex-1">
                      <div className="flex items-center gap-2">
                        <span className="font-mono text-[10px] text-theme-muted">{c.id}</span>
                        <span className="text-sm text-theme-primary font-medium truncate">{c.title}</span>
                      </div>
                      <div className="mt-0.5 flex items-center gap-3 text-xs text-theme-muted">
                        <span>{c.product} / {c.operation}</span>
                        <span>{alarmCount} alarm{alarmCount !== 1 ? 's' : ''}</span>
                      </div>
                    </div>
                  </label>
                );
              })}
            </div>
          )}
        </div>

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
            disabled={selectedSourceIds.size === 0 || merging}
            className="btn-primary btn-sm"
          >
            <GitMerge size={13} />
            {merging ? 'Merging...' : `Pull ${selectedSourceIds.size > 0 ? selectedSourceIds.size : ''} source${selectedSourceIds.size !== 1 ? 's' : ''}`}
          </button>
        </div>
      </div>
    </div>
  );
}
