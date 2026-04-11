import { Check, ChevronDown, ChevronRight, Circle, Clock, Eye, Ban, MoreHorizontal, AlertCircle } from 'lucide-react';
import { useState } from 'react';
import type { Issue } from '../../types';
import type { Action, ActionRecord, PayloadFieldSchema, PayloadSchema, WorkflowDefinition } from '../../lib/workflows/types';
import { getDefinition } from '../../lib/workflows/registry';
import {
  getActionDisplayStatus,
  getActorDisplayName,
  getHistoryRecords,
  getPhaseDisplayState,
  type ActionDisplayStatus,
  type PhaseDisplayState,
} from '../../lib/workflows/panelHelpers';
import { getUserById } from '../../mocks/users';
import { useCurrentUserStore } from '../../stores/currentUserStore';

const lookupUser = (id: string) => getUserById(id)?.name;

const STATUS_ICON: Record<ActionDisplayStatus, typeof Check> = {
  done: Check,
  pending_available: Clock,
  pending_unavailable: Ban,
  optional: MoreHorizontal,
};

const STATUS_LABEL: Record<ActionDisplayStatus, string> = {
  done: 'Done',
  pending_available: 'Pending',
  pending_unavailable: 'Not yet available',
  optional: 'Optional',
};

interface WorkflowPanelProps {
  issue: Issue;
  onFireAction?: (actionId: string, actorId: string, payload: Record<string, unknown>) => Promise<void>;
}

export function WorkflowPanel({ issue, onFireAction }: WorkflowPanelProps) {
  const workflow = issue.workflow;
  if (!workflow) return null;

  const definition = getDefinition(workflow.definitionId);
  if (!definition) return null;

  const phaseStates = getPhaseDisplayState(definition, workflow);
  const currentPhase = definition.phases.find((p) => p.id === workflow.currentPhaseId);
  const historyRecords = getHistoryRecords(definition, workflow);
  const currentPhaseLabel = phaseStates.find((p) => p.state === 'current')?.label
    ?? (workflow.completedAt ? 'Completed' : '');

  return (
    <div className="card p-5">
      <Header name={definition.name} currentPhaseLabel={currentPhaseLabel} isTerminal={!!workflow.completedAt} />
      <PhaseRibbon phases={phaseStates} />
      {currentPhase && !workflow.completedAt && (
        <CurrentPhaseActions
          phase={currentPhase}
          definition={definition}
          issue={issue}
          onFireAction={onFireAction}
        />
      )}
      {historyRecords.length > 0 && (
        <HistorySection records={historyRecords} definition={definition} />
      )}
    </div>
  );
}

function Header({ name, currentPhaseLabel, isTerminal }: { name: string; currentPhaseLabel: string; isTerminal: boolean }) {
  return (
    <div className="flex items-center justify-between mb-4">
      <h2 className="text-xs font-semibold uppercase tracking-wide text-theme-muted">
        {name}
      </h2>
      <span className={`text-[11px] font-medium px-2 py-0.5 rounded-full ${
        isTerminal
          ? 'bg-green-500/10 text-green-600 dark:text-green-400'
          : 'bg-accent-subtle text-theme-accent'
      }`}>
        {isTerminal ? 'Completed' : currentPhaseLabel}
      </span>
    </div>
  );
}

function PhaseRibbon({ phases }: { phases: PhaseDisplayState[] }) {
  return (
    <div className="flex items-center mb-4">
      {phases.map((phase, idx) => (
        <div key={phase.phaseId} className="flex items-center flex-1 last:flex-none">
          <div className="flex flex-col items-center gap-1">
            <div
              className={`w-6 h-6 rounded-full flex items-center justify-center text-[10px] font-semibold border transition-colors ${
                phase.state === 'completed'
                  ? 'bg-accent-subtle text-theme-accent border-accent/40'
                  : phase.state === 'current'
                    ? 'bg-accent-subtle text-theme-accent border-accent/40 ring-2 ring-accent/30'
                    : 'bg-surface-overlay/40 text-theme-muted border-border-subtle/40'
              }`}
            >
              {phase.state === 'completed' ? <Check size={12} /> : idx + 1}
            </div>
            <span className={`text-[10px] font-medium text-center leading-tight ${
              phase.state !== 'upcoming' ? 'text-theme-primary' : 'text-theme-muted'
            }`}>
              {phase.label}
            </span>
          </div>
          {idx < phases.length - 1 && (
            <div className={`flex-1 h-0.5 mx-1.5 mb-4 ${
              phase.state === 'completed' ? 'bg-accent/40' : 'bg-border-subtle/40'
            }`} />
          )}
        </div>
      ))}
    </div>
  );
}

function CurrentPhaseActions({
  phase,
  definition,
  issue,
  onFireAction,
}: {
  phase: import('../../lib/workflows/types').Phase;
  definition: WorkflowDefinition;
  issue: Issue;
  onFireAction?: (actionId: string, actorId: string, payload: Record<string, unknown>) => Promise<void>;
}) {
  const workflow = issue.workflow!;
  const currentUser = useCurrentUserStore((s) => s.currentUser);

  return (
    <div className="mb-3">
      <h3 className="text-[11px] font-semibold uppercase tracking-wide text-theme-muted mb-2">
        Current Actions
      </h3>
      <ul className="flex flex-col gap-1.5">
        {phase.actions.map((action) => {
          const status = getActionDisplayStatus(action, workflow, issue, phase.id);
          const actorName = getActorDisplayName(action, workflow, lookupUser);
          const completedRecord = status === 'done'
            ? (workflow.completedActions[phase.id] ?? []).find((r) => r.actionId === action.id)
            : undefined;
          // Check if current user passes the gate
          const userCanAct = status !== 'done' && action.gate({
            user: { id: currentUser.id },
            instance: workflow,
            issue,
          });
          return (
            <ActionRow
              key={action.id}
              action={action}
              status={status}
              actorName={actorName}
              completedRecord={completedRecord}
              userCanAct={userCanAct}
              currentUserId={currentUser.id}
              onFireAction={onFireAction}
            />
          );
        })}
      </ul>
    </div>
  );
}

function ActionRow({
  action,
  status,
  actorName,
  completedRecord,
  userCanAct,
  currentUserId,
  onFireAction,
}: {
  action: Action;
  status: ActionDisplayStatus;
  actorName: string | undefined;
  completedRecord: ActionRecord | undefined;
  userCanAct: boolean;
  currentUserId: string;
  onFireAction?: (actionId: string, actorId: string, payload: Record<string, unknown>) => Promise<void>;
}) {
  const [expanded, setExpanded] = useState(false);
  const [showForm, setShowForm] = useState(false);
  const Icon = STATUS_ICON[status];

  return (
    <li>
      <div className="flex items-center gap-2 py-1.5 px-2 rounded-md bg-surface-overlay/30">
        <div className={`shrink-0 ${
          status === 'done'
            ? 'text-green-600 dark:text-green-400'
            : status === 'pending_available'
              ? 'text-amber-500'
              : status === 'optional'
                ? 'text-theme-muted'
                : 'text-theme-muted/50'
        }`}>
          <Icon size={14} />
        </div>
        <span className="text-xs font-medium text-theme-primary flex-1">
          {action.label}
        </span>
        {status !== 'done' && userCanAct && !showForm && (
          <button
            onClick={() => setShowForm(true)}
            className="text-[10px] font-medium px-2 py-0.5 rounded bg-accent-subtle text-theme-accent hover:bg-accent/20 transition-colors"
          >
            Act
          </button>
        )}
        {status !== 'done' && !userCanAct && actorName && (
          <span className="text-[10px] text-theme-muted italic" title={`Gated to ${actorName}`}>
            waiting on {actorName}
          </span>
        )}
        {status === 'done' && completedRecord && (
          <button
            onClick={() => setExpanded(!expanded)}
            className="text-[10px] text-theme-accent hover:underline flex items-center gap-0.5"
          >
            <Eye size={11} />
            view
          </button>
        )}
        <span className={`text-[10px] px-1.5 py-0.5 rounded ${
          status === 'done'
            ? 'bg-green-500/10 text-green-600 dark:text-green-400'
            : status === 'pending_available'
              ? 'bg-amber-500/10 text-amber-600 dark:text-amber-400'
              : status === 'optional'
                ? 'bg-surface-overlay/60 text-theme-muted'
                : 'bg-surface-overlay/40 text-theme-muted/60'
        }`}>
          {STATUS_LABEL[status]}
        </span>
      </div>
      {expanded && completedRecord && (
        <PayloadView payload={completedRecord.payload} />
      )}
      {showForm && (
        <InlineActionForm
          action={action}
          currentUserId={currentUserId}
          onSubmit={async (payload) => {
            await onFireAction?.(action.id, currentUserId, payload);
            setShowForm(false);
          }}
          onCancel={() => setShowForm(false)}
        />
      )}
    </li>
  );
}

function InlineActionForm({
  action,
  currentUserId,
  onSubmit,
  onCancel,
}: {
  action: Action;
  currentUserId: string;
  onSubmit: (payload: Record<string, unknown>) => Promise<void>;
  onCancel: () => void;
}) {
  const [values, setValues] = useState<Record<string, string>>(() => {
    const init: Record<string, string> = {};
    for (const key of Object.keys(action.payloadSchema)) {
      init[key] = '';
    }
    return init;
  });
  const [error, setError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);

    // Client-side validation
    for (const [fieldName, schema] of Object.entries(action.payloadSchema)) {
      const val = values[fieldName] ?? '';
      if (schema.required && !val) {
        setError(`${schema.label} is required`);
        return;
      }
      if (schema.kind === 'text' && schema.minLength && val.length < schema.minLength) {
        setError(`${schema.label} must be at least ${schema.minLength} character(s)`);
        return;
      }
    }

    setSubmitting(true);
    try {
      await onSubmit(values);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Action failed');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <form onSubmit={handleSubmit} className="ml-8 mt-1 mb-1 p-3 rounded bg-surface-overlay/40 border border-border-subtle/30">
      {Object.entries(action.payloadSchema).map(([fieldName, schema]) => (
        <SchemaField
          key={fieldName}
          fieldName={fieldName}
          schema={schema}
          value={values[fieldName] ?? ''}
          onChange={(v) => setValues({ ...values, [fieldName]: v })}
        />
      ))}
      {error && (
        <div className="flex items-center gap-1.5 mt-2 text-[11px] text-red-500">
          <AlertCircle size={12} />
          {error}
        </div>
      )}
      <div className="flex gap-2 mt-3">
        <button
          type="submit"
          disabled={submitting}
          className="btn-primary btn-sm text-[11px]"
        >
          {submitting ? 'Submitting...' : 'Submit'}
        </button>
        <button
          type="button"
          onClick={onCancel}
          className="btn-secondary btn-sm text-[11px]"
        >
          Cancel
        </button>
      </div>
    </form>
  );
}

function SchemaField({
  fieldName,
  schema,
  value,
  onChange,
}: {
  fieldName: string;
  schema: PayloadFieldSchema;
  value: string;
  onChange: (v: string) => void;
}) {
  return (
    <label className="flex flex-col gap-1 mb-2 last:mb-0">
      <span className="text-[10px] font-semibold uppercase tracking-wider text-theme-muted">
        {schema.label}
        {schema.required && <span className="text-red-400 ml-0.5">*</span>}
      </span>
      {schema.kind === 'enum' && schema.options ? (
        <select
          value={value}
          onChange={(e) => onChange(e.target.value)}
          className="input-base text-xs"
        >
          <option value="">Select...</option>
          {schema.options.map((opt) => (
            <option key={opt} value={opt}>{opt}</option>
          ))}
        </select>
      ) : (
        <textarea
          value={value}
          onChange={(e) => onChange(e.target.value)}
          className="input-base text-xs resize-none"
          rows={2}
          placeholder={schema.minLength ? `Min ${schema.minLength} character(s)` : ''}
        />
      )}
    </label>
  );
}

function PayloadView({ payload }: { payload: Record<string, unknown> }) {
  const entries = Object.entries(payload).filter(([, v]) => v !== undefined && v !== null && v !== '');
  if (entries.length === 0) return null;

  return (
    <div className="ml-8 mt-1 mb-1 p-2 rounded bg-surface-overlay/40 border border-border-subtle/30">
      {entries.map(([key, value]) => (
        <div key={key} className="text-[11px] mb-0.5 last:mb-0">
          <span className="text-theme-muted font-medium">{key}:</span>{' '}
          <span className="text-theme-secondary">{String(value)}</span>
        </div>
      ))}
    </div>
  );
}

function HistorySection({ records, definition }: { records: ActionRecord[]; definition: WorkflowDefinition }) {
  const [open, setOpen] = useState(false);

  // Build lookup for action labels
  const actionLabels = new Map<string, string>();
  for (const phase of definition.phases) {
    for (const action of phase.actions) {
      actionLabels.set(action.id, action.label);
    }
  }

  return (
    <div className="border-t border-border-subtle/30 pt-3">
      <button
        onClick={() => setOpen(!open)}
        className="flex items-center gap-1 text-[11px] font-semibold uppercase tracking-wide text-theme-muted hover:text-theme-primary transition-colors w-full"
      >
        {open ? <ChevronDown size={12} /> : <ChevronRight size={12} />}
        History ({records.length})
      </button>
      {open && (
        <ul className="mt-2 flex flex-col gap-1">
          {records.map((record) => (
            <HistoryRow
              key={record.id}
              record={record}
              actionLabel={actionLabels.get(record.actionId) ?? record.actionId}
            />
          ))}
        </ul>
      )}
    </div>
  );
}

function HistoryRow({ record, actionLabel }: { record: ActionRecord; actionLabel: string }) {
  const [expanded, setExpanded] = useState(false);
  const actorName = lookupUser(record.actorId) ?? record.actorId;

  return (
    <li>
      <div className="flex items-center gap-2 py-1 px-2 rounded-md bg-surface-overlay/20">
        <div className="text-green-600 dark:text-green-400 shrink-0">
          <Check size={12} />
        </div>
        <span className="text-[11px] text-theme-primary font-medium flex-1">
          {actionLabel}
        </span>
        <span className="text-[10px] text-theme-muted">
          {actorName}
        </span>
        <button
          onClick={() => setExpanded(!expanded)}
          className="text-[10px] text-theme-accent hover:underline flex items-center gap-0.5"
        >
          <Eye size={11} />
          view
        </button>
      </div>
      {expanded && <PayloadView payload={record.payload} />}
    </li>
  );
}
