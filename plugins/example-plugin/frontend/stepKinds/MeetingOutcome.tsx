import { useState } from 'react';
import { Calendar, CheckCircle, AlertCircle, ChevronDown, ChevronRight, RefreshCw } from 'lucide-react';
import type { StepKindProps } from '../../../../frontend/src/lib/workflows/stepKindRegistry';
import { meetingReducer, isValidRescheduleTime, getMeetingSummary, type MeetingEntries, type MeetingEntry, type ScheduledEntry } from './meetingReducer';
import { getLatestFailureContext, getTimelineRows, type TimelineRow } from './meetingHelpers';

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

function getLastScheduledTime(entries: MeetingEntries): string | undefined {
  for (let i = entries.length - 1; i >= 0; i--) {
    if (entries[i].kind === 'scheduled') return (entries[i] as ScheduledEntry).scheduledTime;
  }
  return undefined;
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

function FailureBlockquote({ entries }: { entries: MeetingEntries }) {
  const ctx = getLatestFailureContext(entries);
  if (!ctx) return null;

  return (
    <blockquote className="border-l-2 border-amber-500/50 pl-3 my-2 text-[11px] text-theme-muted" data-testid="failure-blockquote">
      <div>Held {formatDateTime(ctx.latestFailure.actualHeldTime)}</div>
      <div className="text-theme-primary">{ctx.latestFailure.failReason}</div>
      <div className="italic">— {ctx.latestFailure.recordedBy}</div>
      {ctx.earlierFailureCount > 0 && (
        <div className="mt-1 text-[10px] opacity-70" data-testid="earlier-failures-count">
          ({ctx.earlierFailureCount} earlier meeting{ctx.earlierFailureCount > 1 ? 's' : ''} also failed)
        </div>
      )}
    </blockquote>
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
  const [showRescheduleForm, setShowRescheduleForm] = useState(false);
  const [showHistory, setShowHistory] = useState(false);
  const [heldTime, setHeldTime] = useState('');
  const [conclusion, setConclusion] = useState('');
  const [rescheduleHeldTime, setRescheduleHeldTime] = useState('');
  const [rescheduleReason, setRescheduleReason] = useState('');
  const [rescheduleNewTime, setRescheduleNewTime] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const priorScheduledTime = getLastScheduledTime(entries);

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

  const handleReschedule = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!rescheduleHeldTime) {
      setError('Previous meeting time is required');
      return;
    }
    if (!rescheduleReason.trim()) {
      setError('Reason is required');
      return;
    }
    if (!rescheduleNewTime) {
      setError('New meeting time is required');
      return;
    }
    const newTimeISO = new Date(rescheduleNewTime).toISOString();
    if (priorScheduledTime && !isValidRescheduleTime(newTimeISO, priorScheduledTime)) {
      setError('New meeting time must be after the prior scheduled time');
      return;
    }
    setError(null);
    setSubmitting(true);
    try {
      const now = new Date().toISOString();
      const newEntries = meetingReducer(entries, {
        type: 'reschedule',
        actualHeldTime: new Date(rescheduleHeldTime).toISOString(),
        failReason: rescheduleReason.trim(),
        newScheduledTime: newTimeISO,
        recordedBy: 'current-user',
        recordedAt: now,
      });
      await onEdit({ entries: newEntries });
      setShowRescheduleForm(false);
      setRescheduleHeldTime('');
      setRescheduleReason('');
      setRescheduleNewTime('');
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to reschedule');
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

      <FailureBlockquote entries={entries} />

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
            <button type="button" onClick={() => { setShowPassForm(false); setError(null); }} className="btn-secondary btn-sm text-[11px]">
              Cancel
            </button>
          </div>
        </form>
      ) : showRescheduleForm ? (
        <form onSubmit={handleReschedule} className="mt-2">
          <label className="flex flex-col gap-1 mb-2">
            <span className="text-[10px] font-semibold uppercase tracking-wider text-theme-muted">
              Previous meeting held at <span className="text-red-400">*</span>
            </span>
            <input
              type="datetime-local"
              value={rescheduleHeldTime}
              onChange={(e) => setRescheduleHeldTime(e.target.value)}
              className="input-base text-xs"
            />
          </label>
          <label className="flex flex-col gap-1 mb-2">
            <span className="text-[10px] font-semibold uppercase tracking-wider text-theme-muted">
              Reason it failed <span className="text-red-400">*</span>
            </span>
            <textarea
              value={rescheduleReason}
              onChange={(e) => setRescheduleReason(e.target.value)}
              className="input-base text-xs resize-none"
              rows={2}
              placeholder="Why did this meeting fail?"
            />
          </label>
          <label className="flex flex-col gap-1 mb-2">
            <span className="text-[10px] font-semibold uppercase tracking-wider text-theme-muted">
              New meeting time <span className="text-red-400">*</span>
            </span>
            <input
              type="datetime-local"
              value={rescheduleNewTime}
              onChange={(e) => setRescheduleNewTime(e.target.value)}
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
              {submitting ? 'Rescheduling...' : 'Reschedule'}
            </button>
            <button type="button" onClick={() => { setShowRescheduleForm(false); setError(null); }} className="btn-secondary btn-sm text-[11px]">
              Cancel
            </button>
          </div>
        </form>
      ) : (
        <div className="flex gap-2">
          <button
            onClick={() => { setShowRescheduleForm(true); setError(null); }}
            className="btn-secondary btn-sm text-[11px]"
          >
            Reschedule
          </button>
          <button
            onClick={() => { setShowPassForm(true); setError(null); }}
            className="btn-primary btn-sm text-[11px]"
          >
            Mark as passed
          </button>
        </div>
      )}

      {entries.length > 1 && (
        <HistoryPanel entries={entries} isOpen={showHistory} onToggle={() => setShowHistory(!showHistory)} />
      )}
    </div>
  );
}

function CompletedCard({ entries }: { entries: MeetingEntries }) {
  const [showHistory, setShowHistory] = useState(false);
  const passedEntry = entries.find((e): e is MeetingEntry & { kind: 'passed' } => e.kind === 'passed');
  if (!passedEntry) return null;

  const summary = getMeetingSummary(entries);

  return (
    <div className="p-3 rounded bg-green-500/5 border border-green-500/20">
      <div className="flex items-center gap-2 text-xs text-green-600 dark:text-green-400 mb-2">
        <CheckCircle size={14} />
        <span>Passed {formatDateTime(passedEntry.actualHeldTime)}</span>
      </div>
      <p className="text-xs text-theme-primary" data-testid="meeting-conclusion">
        {passedEntry.conclusion}
      </p>
      {summary.totalMeetings > 0 && (
        <p className="text-[11px] text-theme-muted mt-1" data-testid="meeting-summary">
          {summary.totalMeetings} meeting{summary.totalMeetings > 1 ? 's' : ''} held{summary.rescheduled > 0 && ` (${summary.rescheduled} rescheduled)`}
        </p>
      )}
      {entries.length > 2 && (
        <HistoryPanel entries={entries} isOpen={showHistory} onToggle={() => setShowHistory(!showHistory)} />
      )}
    </div>
  );
}

function HistoryPanel({
  entries,
  isOpen,
  onToggle,
}: {
  entries: MeetingEntries;
  isOpen: boolean;
  onToggle: () => void;
}) {
  const rows = getTimelineRows(entries);

  return (
    <div className="mt-2">
      <button
        onClick={onToggle}
        className="flex items-center gap-1 text-[10px] text-theme-muted hover:text-theme-primary transition-colors"
        data-testid="history-toggle"
      >
        {isOpen ? <ChevronDown size={12} /> : <ChevronRight size={12} />}
        History ({rows.length} events)
      </button>
      {isOpen && (
        <div className="mt-1 pl-2 border-l border-border-subtle/30 space-y-1.5" data-testid="history-panel">
          {rows.map((row, i) => (
            <TimelineRowView key={i} row={row} />
          ))}
        </div>
      )}
    </div>
  );
}

function TimelineRowView({ row }: { row: TimelineRow }) {
  if (row.type === 'scheduled') {
    return (
      <div className="text-[10px] text-theme-muted" data-testid="timeline-scheduled">
        <Calendar size={10} className="inline mr-1" />
        Scheduled for {formatDateTime(row.scheduledTime)}
        <span className="opacity-60"> — {row.recordedBy}</span>
      </div>
    );
  }

  if (row.type === 'rescheduled') {
    return (
      <div className="text-[10px] text-amber-600 dark:text-amber-400" data-testid="timeline-rescheduled">
        <RefreshCw size={10} className="inline mr-1" />
        Rescheduled to {formatDateTime(row.newScheduledTime)} — reason: {row.failReason}
        <span className="opacity-60"> — {row.recordedBy}</span>
      </div>
    );
  }

  return (
    <div className="text-[10px] text-green-600 dark:text-green-400" data-testid="timeline-passed">
      <CheckCircle size={10} className="inline mr-1" />
      Passed {formatDateTime(row.actualHeldTime)}: {row.conclusion}
      <span className="opacity-60"> — {row.recordedBy}</span>
    </div>
  );
}
