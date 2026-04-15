import { useState } from 'react';
import { Calendar, CheckCircle, AlertCircle } from 'lucide-react';
import type { StepKindProps } from '../../../../frontend/src/lib/workflows/stepKindRegistry';
import { meetingReducer, type MeetingEntries, type MeetingEntry } from './meetingReducer';

function getEntries(payload?: Record<string, unknown>): MeetingEntries {
  if (!payload?.entries || !Array.isArray(payload.entries)) return [];
  return payload.entries as MeetingEntry[];
}

function formatDateTime(iso: string): string {
  try {
    return new Date(iso).toLocaleString();
  } catch {
    return iso;
  }
}

export function MeetingOutcome({ step, state, issue, actions, canSkip }: StepKindProps) {
  const entries = getEntries(state.payload);
  const tail = entries.length > 0 ? entries[entries.length - 1] : undefined;

  if (state.status === 'completed' && tail?.kind === 'passed') {
    return <CompletedCard entries={entries} />;
  }

  if (state.status === 'ongoing' && tail?.kind === 'scheduled') {
    return (
      <OngoingCard
        entries={entries}
        tail={tail}
        onComplete={actions.complete}
        onEdit={actions.edit}
      />
    );
  }

  return (
    <EmptyCard
      entries={entries}
      onEdit={actions.edit}
      onSkip={actions.skip}
      canSkip={canSkip}
    />
  );
}

function EmptyCard({
  entries,
  onEdit,
  onSkip,
  canSkip,
}: {
  entries: MeetingEntries;
  onEdit: (payload: Record<string, unknown>) => Promise<void>;
  onSkip: () => Promise<void>;
  canSkip: boolean;
}) {
  const [showForm, setShowForm] = useState(false);
  const [scheduledTime, setScheduledTime] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleSchedule = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!scheduledTime) {
      setError('Meeting time is required');
      return;
    }
    setError(null);
    setSubmitting(true);
    try {
      const now = new Date().toISOString();
      const newEntries = meetingReducer(entries, {
        type: 'schedule',
        scheduledTime: new Date(scheduledTime).toISOString(),
        recordedBy: 'current-user',
        recordedAt: now,
      });
      await onEdit({ entries: newEntries });
      setShowForm(false);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to schedule');
    } finally {
      setSubmitting(false);
    }
  };

  if (showForm) {
    return (
      <form onSubmit={handleSchedule} className="p-3 rounded bg-surface-overlay/40 border border-border-subtle/30">
        <label className="flex flex-col gap-1 mb-3">
          <span className="text-[10px] font-semibold uppercase tracking-wider text-theme-muted">
            Meeting time <span className="text-red-400">*</span>
          </span>
          <input
            type="datetime-local"
            value={scheduledTime}
            onChange={(e) => setScheduledTime(e.target.value)}
            className="input-base text-xs"
          />
        </label>
        {error && (
          <div className="flex items-center gap-1.5 mb-2 text-[11px] text-red-500">
            <AlertCircle size={12} />
            {error}
          </div>
        )}
        <div className="flex gap-2">
          <button type="submit" disabled={submitting} className="btn-primary btn-sm text-[11px]">
            {submitting ? 'Scheduling...' : 'Schedule'}
          </button>
          <button type="button" onClick={() => setShowForm(false)} className="btn-secondary btn-sm text-[11px]">
            Cancel
          </button>
        </div>
      </form>
    );
  }

  return (
    <div className="p-3 rounded bg-surface-overlay/40 border border-border-subtle/30">
      <div className="flex items-center gap-2 text-xs text-theme-muted mb-2">
        <Calendar size={14} />
        <span>No meeting scheduled yet</span>
      </div>
      <div className="flex gap-2">
        <button
          onClick={() => setShowForm(true)}
          className="btn-primary btn-sm text-[11px]"
        >
          Schedule meeting
        </button>
        {canSkip && entries.length === 0 && (
          <button
            onClick={onSkip}
            className="text-[10px] text-theme-muted hover:text-theme-primary transition-colors"
          >
            Skip — low risk
          </button>
        )}
      </div>
    </div>
  );
}

function OngoingCard({
  entries,
  tail,
  onComplete,
  onEdit,
}: {
  entries: MeetingEntries;
  tail: MeetingEntry & { kind: 'scheduled' };
  onComplete: (payload: Record<string, unknown>) => Promise<void>;
  onEdit: (payload: Record<string, unknown>) => Promise<void>;
}) {
  const [showPassForm, setShowPassForm] = useState(false);
  const [heldTime, setHeldTime] = useState('');
  const [conclusion, setConclusion] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handlePass = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!heldTime) {
      setError('Actual meeting time is required');
      return;
    }
    if (conclusion.length < 10) {
      setError('Conclusion must be at least 10 characters');
      return;
    }
    setError(null);
    setSubmitting(true);
    try {
      const now = new Date().toISOString();
      const newEntries = meetingReducer(entries, {
        type: 'pass',
        actualHeldTime: new Date(heldTime).toISOString(),
        conclusion,
        recordedBy: 'current-user',
        recordedAt: now,
      });
      await onComplete({ entries: newEntries });
      setShowPassForm(false);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to mark as passed');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="p-3 rounded bg-surface-overlay/40 border border-border-subtle/30">
      <div className="flex items-center gap-2 text-xs text-theme-primary mb-2">
        <Calendar size={14} className="text-amber-500" />
        <span>Scheduled for {formatDateTime(tail.scheduledTime)}</span>
      </div>

      {showPassForm ? (
        <form onSubmit={handlePass} className="mt-2">
          <label className="flex flex-col gap-1 mb-2">
            <span className="text-[10px] font-semibold uppercase tracking-wider text-theme-muted">
              Actual meeting time <span className="text-red-400">*</span>
            </span>
            <input
              type="datetime-local"
              value={heldTime}
              onChange={(e) => setHeldTime(e.target.value)}
              className="input-base text-xs"
            />
          </label>
          <label className="flex flex-col gap-1 mb-2">
            <span className="text-[10px] font-semibold uppercase tracking-wider text-theme-muted">
              Conclusion <span className="text-red-400">*</span>
            </span>
            <textarea
              value={conclusion}
              onChange={(e) => setConclusion(e.target.value)}
              className="input-base text-xs resize-none"
              rows={3}
              placeholder="Min 10 characters"
            />
          </label>
          {error && (
            <div className="flex items-center gap-1.5 mb-2 text-[11px] text-red-500">
              <AlertCircle size={12} />
              {error}
            </div>
          )}
          <div className="flex gap-2">
            <button type="submit" disabled={submitting} className="btn-primary btn-sm text-[11px]">
              {submitting ? 'Submitting...' : 'Mark as passed'}
            </button>
            <button type="button" onClick={() => setShowPassForm(false)} className="btn-secondary btn-sm text-[11px]">
              Cancel
            </button>
          </div>
        </form>
      ) : (
        <div className="flex gap-2">
          <button
            onClick={() => setShowPassForm(true)}
            className="btn-primary btn-sm text-[11px]"
          >
            Mark as passed
          </button>
        </div>
      )}
    </div>
  );
}

function CompletedCard({ entries }: { entries: MeetingEntries }) {
  const passedEntry = entries.find((e): e is MeetingEntry & { kind: 'passed' } => e.kind === 'passed');
  if (!passedEntry) return null;

  return (
    <div className="p-3 rounded bg-green-500/5 border border-green-500/20">
      <div className="flex items-center gap-2 text-xs text-green-600 dark:text-green-400 mb-2">
        <CheckCircle size={14} />
        <span>Passed {formatDateTime(passedEntry.actualHeldTime)}</span>
      </div>
      <p className="text-xs text-theme-primary" data-testid="meeting-conclusion">
        {passedEntry.conclusion}
      </p>
    </div>
  );
}
