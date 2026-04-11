import { Check, Circle, Clock, AlertCircle, SkipForward } from 'lucide-react';
import { useState } from 'react';
import type { Issue } from '../../types';
import type { PayloadFieldSchema, Step, StepStatus } from '../../lib/workflows/types';
import { getDefinition } from '../../lib/workflows/registry';
import { getStepDisplayList, canUserActOnStep } from '../../lib/workflows/panelHelpers';
import { useCurrentUserStore } from '../../stores/currentUserStore';

interface WorkflowPanelProps {
  issue: Issue;
  onCompleteStep?: (stepId: string, actorId: string, payload: Record<string, unknown>) => Promise<void>;
}

export function WorkflowPanel({ issue, onCompleteStep }: WorkflowPanelProps) {
  const workflow = issue.workflow;
  if (!workflow) return null;

  const definition = getDefinition(workflow.definitionId);
  if (!definition) return null;

  const stepList = getStepDisplayList(definition, workflow);
  const isTerminal = !!workflow.completedAt;

  return (
    <div id="workflow-panel" className="card p-5">
      <div className="flex items-center justify-between mb-4">
        <h2 className="text-xs font-semibold uppercase tracking-wide text-theme-muted">
          {definition.name}
        </h2>
        <span className={`text-[11px] font-medium px-2 py-0.5 rounded-full ${
          isTerminal
            ? 'bg-green-500/10 text-green-600 dark:text-green-400'
            : 'bg-accent-subtle text-theme-accent'
        }`}>
          {isTerminal ? 'Completed' : issue.status}
        </span>
      </div>

      <ul className="flex flex-col gap-1.5">
        {stepList.map(({ step, status, waitingOnLabels }) => (
          <StepRow
            key={step.id}
            step={step}
            status={status}
            waitingOnLabels={waitingOnLabels}
            issue={issue}
            onCompleteStep={onCompleteStep}
          />
        ))}
      </ul>
    </div>
  );
}

const STATUS_ICON: Record<StepStatus, typeof Check> = {
  completed: Check,
  skipped: SkipForward,
  ongoing: Clock,
  pending: Circle,
};

function StepRow({
  step,
  status,
  waitingOnLabels,
  issue,
  onCompleteStep,
}: {
  step: Step;
  status: StepStatus;
  waitingOnLabels: string[];
  issue: Issue;
  onCompleteStep?: (stepId: string, actorId: string, payload: Record<string, unknown>) => Promise<void>;
}) {
  const [showForm, setShowForm] = useState(false);
  const currentUser = useCurrentUserStore((s) => s.currentUser);
  const workflow = issue.workflow!;

  const userCanAct = status === 'ongoing' && canUserActOnStep(step, workflow, issue, currentUser.id);
  const Icon = STATUS_ICON[status];

  return (
    <li>
      <div className="flex items-center gap-2 py-1.5 px-2 rounded-md bg-surface-overlay/30">
        <div className={`shrink-0 ${
          status === 'completed'
            ? 'text-green-600 dark:text-green-400'
            : status === 'ongoing'
              ? 'text-amber-500'
              : status === 'skipped'
                ? 'text-theme-muted'
                : 'text-theme-muted/50'
        }`}>
          <Icon size={14} />
        </div>
        <span className="text-xs font-medium text-theme-primary flex-1">
          {step.label}
        </span>

        {status === 'ongoing' && userCanAct && !showForm && (
          <button
            onClick={() => setShowForm(true)}
            className="text-[10px] font-medium px-2 py-0.5 rounded bg-accent-subtle text-theme-accent hover:bg-accent/20 transition-colors"
          >
            Act
          </button>
        )}

        {status === 'pending' && waitingOnLabels.length > 0 && (
          <span className="text-[10px] text-theme-muted italic">
            Waiting on: {waitingOnLabels.join(', ')}
          </span>
        )}

        <span className={`text-[10px] px-1.5 py-0.5 rounded ${
          status === 'completed'
            ? 'bg-green-500/10 text-green-600 dark:text-green-400'
            : status === 'ongoing'
              ? 'bg-amber-500/10 text-amber-600 dark:text-amber-400'
              : status === 'skipped'
                ? 'bg-surface-overlay/60 text-theme-muted'
                : 'bg-surface-overlay/40 text-theme-muted/60'
        }`}>
          {status === 'completed' ? 'Done' : status === 'ongoing' ? 'Ongoing' : status === 'skipped' ? 'Skipped' : 'Pending'}
        </span>
      </div>

      {showForm && step.payloadSchema && Object.keys(step.payloadSchema).length > 0 && (
        <InlineStepForm
          step={step}
          currentUserId={currentUser.id}
          onSubmit={async (payload) => {
            await onCompleteStep?.(step.id, currentUser.id, payload);
            setShowForm(false);
          }}
          onCancel={() => setShowForm(false)}
        />
      )}
      {showForm && (!step.payloadSchema || Object.keys(step.payloadSchema).length === 0) && (
        <ConfirmAction
          label={step.label}
          onConfirm={async () => {
            await onCompleteStep?.(step.id, currentUser.id, {});
            setShowForm(false);
          }}
          onCancel={() => setShowForm(false)}
        />
      )}
    </li>
  );
}

function ConfirmAction({
  label,
  onConfirm,
  onCancel,
}: {
  label: string;
  onConfirm: () => Promise<void>;
  onCancel: () => void;
}) {
  const [submitting, setSubmitting] = useState(false);

  return (
    <div className="ml-8 mt-1 mb-1 p-3 rounded bg-surface-overlay/40 border border-border-subtle/30">
      <p className="text-[11px] text-theme-secondary mb-2">Complete "{label}"?</p>
      <div className="flex gap-2">
        <button
          onClick={async () => {
            setSubmitting(true);
            try { await onConfirm(); } finally { setSubmitting(false); }
          }}
          disabled={submitting}
          className="btn-primary btn-sm text-[11px]"
        >
          {submitting ? 'Submitting...' : 'Confirm'}
        </button>
        <button onClick={onCancel} className="btn-secondary btn-sm text-[11px]">
          Cancel
        </button>
      </div>
    </div>
  );
}

function InlineStepForm({
  step,
  currentUserId,
  onSubmit,
  onCancel,
}: {
  step: Step;
  currentUserId: string;
  onSubmit: (payload: Record<string, unknown>) => Promise<void>;
  onCancel: () => void;
}) {
  const schema = step.payloadSchema!;
  const [values, setValues] = useState<Record<string, string>>(() => {
    const init: Record<string, string> = {};
    for (const key of Object.keys(schema)) {
      init[key] = '';
    }
    return init;
  });
  const [error, setError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);

    for (const [fieldName, fieldSchema] of Object.entries(schema)) {
      const val = values[fieldName] ?? '';
      if (fieldSchema.required && !val) {
        setError(`${fieldSchema.label} is required`);
        return;
      }
      if (fieldSchema.kind === 'text' && fieldSchema.minLength && val.length < fieldSchema.minLength) {
        setError(`${fieldSchema.label} must be at least ${fieldSchema.minLength} character(s)`);
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
      {Object.entries(schema).map(([fieldName, fieldSchema]) => (
        <SchemaField
          key={fieldName}
          fieldName={fieldName}
          schema={fieldSchema}
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
        <button type="submit" disabled={submitting} className="btn-primary btn-sm text-[11px]">
          {submitting ? 'Submitting...' : 'Submit'}
        </button>
        <button type="button" onClick={onCancel} className="btn-secondary btn-sm text-[11px]">
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
