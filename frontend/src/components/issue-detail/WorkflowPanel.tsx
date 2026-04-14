import { Check, Circle, Clock, AlertCircle, SkipForward, Link2, Trash2, Plus, ChevronDown, ChevronUp } from 'lucide-react';
import { useState, Component, type ErrorInfo, type ReactNode } from 'react';
import type { Issue } from '../../types';
import type { BlockerInfo } from '../../hooks/useIssue';
import type { PayloadFieldSchema, Step, StepStatus } from '../../lib/workflows/types';
import { getFieldKind } from '../../lib/workflows/fieldKindRegistry';
import type { HighlightCandidate } from '../../lib/relations/highlightCandidates';
import { getDefinition, getAllDefinitions } from '../../lib/workflows/definitions';
import { getStepDisplayList, canUserActOnStep, canSkipStep, canReviveStep, canEditStep } from '../../lib/workflows/panelHelpers';
import { useCurrentUserStore } from '../../stores/currentUserStore';

interface WorkflowPanelProps {
  issue: Issue;
  blockers?: BlockerInfo[];
  onCompleteStep?: (stepId: string, actorId: string, payload: Record<string, unknown>) => Promise<void>;
  onSkipStep?: (stepId: string, actorId: string) => Promise<void>;
  onReviveStep?: (stepId: string, actorId: string) => Promise<void>;
  onEditStep?: (stepId: string, actorId: string, payload: Record<string, unknown>) => Promise<void>;
  onAddBlocker?: (blockerIssueId: string) => Promise<void>;
  onRemoveBlocker?: (blockerIssueId: string) => Promise<void>;
  onFetchHighlightCandidates?: () => Promise<HighlightCandidate[]>;
  onCreateHighlightedIssue?: (targetOperationId: string) => Promise<void>;
  onLinkExistingIssueAsHighlight?: (existingIssueId: string) => Promise<void>;
  onAttachWorkflow?: (definitionId: string) => Promise<void>;
}

export function WorkflowPanel({
  issue,
  blockers = [],
  onCompleteStep,
  onSkipStep,
  onReviveStep,
  onEditStep,
  onAddBlocker,
  onRemoveBlocker,
  onFetchHighlightCandidates,
  onCreateHighlightedIssue,
  onLinkExistingIssueAsHighlight,
  onAttachWorkflow,
}: WorkflowPanelProps) {
  const workflow = issue.workflow;

  if (!workflow) {
    if (!onAttachWorkflow) return null;
    const allDefinitions = getAllDefinitions();
    return (
      <div id="workflow-panel" className="card p-5">
        <h3 className="text-lg font-semibold mb-3">Workflow</h3>
        <p className="text-sm text-muted-foreground mb-3">No workflow attached to this issue.</p>
        <div className="flex flex-wrap gap-2">
          {allDefinitions.map((def, index) => (
            <button
              key={def.id}
              className={`btn btn-sm ${index === 0 ? 'btn-primary' : 'btn-outline'}`}
              onClick={() => onAttachWorkflow(def.id)}
            >
              Attach {def.name}
            </button>
          ))}
        </div>
      </div>
    );
  }

  const definition = getDefinition(workflow.definitionId);
  if (!definition) return null;

  const stepList = getStepDisplayList(definition, workflow);
  const isTerminal = !!workflow.completedAt;
  const resolvedCompleted = workflow.stepStates['resolved']?.status === 'completed';

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
            onSkipStep={onSkipStep}
            onReviveStep={onReviveStep}
            onEditStep={onEditStep}
          />
        ))}
      </ul>

      <RelatedIssuesSection
        blockers={blockers}
        resolvedCompleted={resolvedCompleted}
        onAddBlocker={onAddBlocker}
        onRemoveBlocker={onRemoveBlocker}
        onFetchHighlightCandidates={onFetchHighlightCandidates}
        onCreateHighlightedIssue={onCreateHighlightedIssue}
        onLinkExistingIssueAsHighlight={onLinkExistingIssueAsHighlight}
      />
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
  onSkipStep,
  onReviveStep,
  onEditStep,
}: {
  step: Step;
  status: StepStatus;
  waitingOnLabels: string[];
  issue: Issue;
  onCompleteStep?: (stepId: string, actorId: string, payload: Record<string, unknown>) => Promise<void>;
  onSkipStep?: (stepId: string, actorId: string) => Promise<void>;
  onReviveStep?: (stepId: string, actorId: string) => Promise<void>;
  onEditStep?: (stepId: string, actorId: string, payload: Record<string, unknown>) => Promise<void>;
}) {
  const [showForm, setShowForm] = useState(false);
  const [showEditForm, setShowEditForm] = useState(false);
  const [skipPending, setSkipPending] = useState(false);
  const [revivePending, setRevivePending] = useState(false);
  const currentUser = useCurrentUserStore((s) => s.currentUser);
  const workflow = issue.workflow!;

  const userCanAct = status === 'ongoing' && canUserActOnStep(step, workflow, issue, currentUser.id);
  const userCanSkip = status === 'ongoing' && canSkipStep(step, workflow, issue);
  const userCanRevive = status === 'skipped' && canReviveStep(step, workflow);
  const userCanEdit = status === 'completed' && canEditStep(step, workflow, issue, currentUser.id);
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

        {status === 'ongoing' && userCanSkip && !showForm && (
          <button
            disabled={skipPending}
            onClick={async () => {
              setSkipPending(true);
              try { await onSkipStep?.(step.id, currentUser.id); } finally { setSkipPending(false); }
            }}
            className="text-[10px] font-medium px-2 py-0.5 rounded bg-surface-overlay/60 text-theme-muted hover:bg-surface-overlay transition-colors"
          >
            {skipPending ? 'Skipping...' : 'Skip'}
          </button>
        )}

        {status === 'skipped' && userCanRevive && (
          <button
            disabled={revivePending}
            onClick={async () => {
              setRevivePending(true);
              try { await onReviveStep?.(step.id, currentUser.id); } finally { setRevivePending(false); }
            }}
            className="text-[10px] font-medium px-2 py-0.5 rounded bg-amber-500/10 text-amber-600 dark:text-amber-400 hover:bg-amber-500/20 transition-colors"
          >
            {revivePending ? 'Reviving...' : 'Revive'}
          </button>
        )}

        {status === 'completed' && userCanEdit && step.payloadSchema && !showEditForm && (
          <button
            onClick={() => setShowEditForm(true)}
            className="text-[10px] font-medium px-2 py-0.5 rounded bg-surface-overlay/60 text-theme-muted hover:bg-surface-overlay transition-colors"
          >
            Edit
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
          issue={issue}
          stepStatus={status}
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
      {showEditForm && step.payloadSchema && Object.keys(step.payloadSchema).length > 0 && (
        <InlineStepForm
          step={step}
          currentUserId={currentUser.id}
          issue={issue}
          stepStatus={status}
          initialValues={workflow.stepStates[step.id]?.payload}
          onSubmit={async (payload) => {
            await onEditStep?.(step.id, currentUser.id, payload);
            setShowEditForm(false);
          }}
          onCancel={() => setShowEditForm(false)}
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
  issue,
  stepStatus,
  initialValues,
  onSubmit,
  onCancel,
}: {
  step: Step;
  currentUserId: string;
  issue: Issue;
  stepStatus: StepStatus;
  initialValues?: Record<string, unknown>;
  onSubmit: (payload: Record<string, unknown>) => Promise<void>;
  onCancel: () => void;
}) {
  const schema = step.payloadSchema!;
  const [values, setValues] = useState<Record<string, string>>(() => {
    const init: Record<string, string> = {};
    for (const key of Object.keys(schema)) {
      init[key] = initialValues?.[key] != null ? String(initialValues[key]) : '';
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
      if (fieldSchema.kind !== 'enum' && fieldSchema.kind !== 'text'
        && !getFieldKind(fieldSchema.kind)) {
        setError(`Cannot submit: plugin not loaded for field kind "${fieldSchema.kind}"`);
        return;
      }
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
          issue={issue}
          stepStatus={stepStatus}
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

class SchemaFieldErrorBoundary extends Component<
  { children: ReactNode; fieldName: string },
  { hasError: boolean }
> {
  state = { hasError: false };

  static getDerivedStateFromError() {
    return { hasError: true };
  }

  componentDidCatch(error: Error, info: ErrorInfo) {
    console.error(`SchemaField error for "${this.props.fieldName}":`, error, info);
  }

  render() {
    if (this.state.hasError) {
      return (
        <div className="flex flex-col gap-1 mb-2 last:mb-0">
          <span className="text-[10px] font-semibold uppercase tracking-wider text-theme-muted">
            {this.props.fieldName}
          </span>
          <div className="rounded bg-red-500/10 border border-red-500/30 p-2 text-[11px] text-red-500 flex items-center gap-1.5">
            <AlertCircle size={12} />
            Field plugin error
          </div>
        </div>
      );
    }
    return this.props.children;
  }
}

function UnknownFieldKindPlaceholder({ kind, label }: { kind: string; label: string }) {
  return (
    <div className="flex flex-col gap-1 mb-2 last:mb-0" data-unknown-field-kind={kind}>
      <span className="text-[10px] font-semibold uppercase tracking-wider text-theme-muted">
        {label}
      </span>
      <div className="rounded bg-amber-500/10 border border-amber-500/30 p-2 text-[11px] text-amber-600 dark:text-amber-400 flex items-center gap-1.5">
        <AlertCircle size={12} />
        Plugin not loaded for field kind "{kind}"
      </div>
    </div>
  );
}

function SchemaField({
  fieldName,
  schema,
  value,
  onChange,
  issue,
  stepStatus,
}: {
  fieldName: string;
  schema: PayloadFieldSchema;
  value: string;
  onChange: (v: string) => void;
  issue: Issue;
  stepStatus: StepStatus;
}) {
  if (schema.kind === 'enum' || schema.kind === 'text') {
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

  // Registry lookup for plugin-contributed field kinds
  const spec = getFieldKind(schema.kind);
  if (!spec) {
    return <UnknownFieldKindPlaceholder kind={schema.kind} label={schema.label} />;
  }

  const PluginComponent = spec.component;
  return (
    <SchemaFieldErrorBoundary fieldName={fieldName}>
      <PluginComponent
        value={value}
        onChange={onChange}
        readOnly={stepStatus === 'completed' || stepStatus === 'skipped'}
        stepStatus={stepStatus}
        issue={issue}
      />
    </SchemaFieldErrorBoundary>
  );
}

const BLOCKER_STATUS_STYLES: Record<string, string> = {
  New: 'bg-blue-500/10 text-blue-600 dark:text-blue-400',
  Investigating: 'bg-amber-500/10 text-amber-600 dark:text-amber-400',
  Resolved: 'bg-green-500/10 text-green-600 dark:text-green-400',
  Closed: 'bg-surface-overlay/60 text-theme-muted',
};

function RelatedIssuesSection({
  blockers,
  resolvedCompleted,
  onAddBlocker,
  onRemoveBlocker,
  onFetchHighlightCandidates,
  onCreateHighlightedIssue,
  onLinkExistingIssueAsHighlight,
}: {
  blockers: BlockerInfo[];
  resolvedCompleted: boolean;
  onAddBlocker?: (blockerIssueId: string) => Promise<void>;
  onRemoveBlocker?: (blockerIssueId: string) => Promise<void>;
  onFetchHighlightCandidates?: () => Promise<HighlightCandidate[]>;
  onCreateHighlightedIssue?: (targetOperationId: string) => Promise<void>;
  onLinkExistingIssueAsHighlight?: (existingIssueId: string) => Promise<void>;
}) {
  const [showDialog, setShowDialog] = useState(false);
  const [candidates, setCandidates] = useState<HighlightCandidate[]>([]);
  const [loadingCandidates, setLoadingCandidates] = useState(false);
  const [dialogError, setDialogError] = useState<string | null>(null);

  const openDialog = async () => {
    setShowDialog(true);
    setDialogError(null);
    setLoadingCandidates(true);
    try {
      const result = await onFetchHighlightCandidates?.() ?? [];
      setCandidates(result);
    } catch (err) {
      setDialogError(err instanceof Error ? err.message : 'Failed to load candidates');
    } finally {
      setLoadingCandidates(false);
    }
  };

  const handleCreate = async (operationId: string) => {
    setDialogError(null);
    try {
      await onCreateHighlightedIssue?.(operationId);
      setShowDialog(false);
    } catch (err) {
      setDialogError(err instanceof Error ? err.message : 'Failed to create highlighted issue');
    }
  };

  const handleLink = async (issueId: string) => {
    setDialogError(null);
    try {
      await onLinkExistingIssueAsHighlight?.(issueId);
      setShowDialog(false);
    } catch (err) {
      setDialogError(err instanceof Error ? err.message : 'Failed to link issue');
    }
  };

  return (
    <div className="mt-4 pt-4 border-t border-border-subtle/30">
      <div className="flex items-center justify-between mb-2">
        <h3 className="text-xs font-semibold uppercase tracking-wide text-theme-muted flex items-center gap-1.5">
          <Link2 size={12} />
          Related Issues
        </h3>
        {!resolvedCompleted && !showDialog && (
          <button
            onClick={openDialog}
            className="text-[10px] font-medium px-2 py-0.5 rounded bg-accent-subtle text-theme-accent hover:bg-accent/20 transition-colors flex items-center gap-1"
          >
            <Plus size={10} />
            Add highlight
          </button>
        )}
      </div>

      {blockers.length === 0 && !showDialog && (
        <p className="text-[11px] text-theme-muted italic">No blocking issues</p>
      )}

      {blockers.length > 0 && (
        <ul className="flex flex-col gap-1">
          {blockers.map((b) => (
            <BlockerRow
              key={b.issueId}
              blocker={b}
              onRemove={onRemoveBlocker}
            />
          ))}
        </ul>
      )}

      {showDialog && (
        <HighlightDialog
          candidates={candidates}
          loading={loadingCandidates}
          error={dialogError}
          onCreateNew={handleCreate}
          onLinkExisting={handleLink}
          onClose={() => setShowDialog(false)}
        />
      )}
    </div>
  );
}

function HighlightDialog({
  candidates,
  loading,
  error,
  onCreateNew,
  onLinkExisting,
  onClose,
}: {
  candidates: HighlightCandidate[];
  loading: boolean;
  error: string | null;
  onCreateNew: (operationId: string) => Promise<void>;
  onLinkExisting: (issueId: string) => Promise<void>;
  onClose: () => void;
}) {
  const [actionPending, setActionPending] = useState<string | null>(null);
  const [expandedOp, setExpandedOp] = useState<string | null>(null);

  const handleAction = async (action: () => Promise<void>, key: string) => {
    setActionPending(key);
    try { await action(); } finally { setActionPending(null); }
  };

  return (
    <div className="mt-2 p-3 rounded bg-surface-overlay/40 border border-border-subtle/30">
      <div className="flex items-center justify-between mb-2">
        <span className="text-[11px] font-semibold text-theme-secondary">
          Select upstream operation to highlight
        </span>
        <button
          onClick={onClose}
          className="text-[10px] text-theme-muted hover:text-theme-primary transition-colors"
        >
          Close
        </button>
      </div>

      {loading && (
        <p className="text-[11px] text-theme-muted italic">Loading candidates...</p>
      )}

      {error && (
        <div className="flex items-center gap-1.5 mb-2 text-[11px] text-red-500">
          <AlertCircle size={12} />
          {error}
        </div>
      )}

      {!loading && candidates.length === 0 && !error && (
        <p className="text-[11px] text-theme-muted italic">No upstream operations available</p>
      )}

      {!loading && candidates.length > 0 && (
        <ul className="flex flex-col gap-1.5">
          {candidates.map((c) => {
            const isExpanded = expandedOp === c.operation.id;
            const hasOpenIssues = c.existingOpenIssues.length > 0;
            return (
              <li key={c.operation.id} className="rounded bg-surface-overlay/30 border border-border-subtle/20">
                <div className="flex items-center gap-2 py-1.5 px-2">
                  <span className="text-xs font-medium text-theme-primary flex-1">
                    {c.operation.name}
                  </span>
                  {hasOpenIssues && (
                    <button
                      onClick={() => setExpandedOp(isExpanded ? null : c.operation.id)}
                      className="text-[10px] text-theme-muted hover:text-theme-primary transition-colors flex items-center gap-0.5"
                    >
                      {c.existingOpenIssues.length} open
                      {isExpanded ? <ChevronUp size={10} /> : <ChevronDown size={10} />}
                    </button>
                  )}
                  <button
                    disabled={actionPending !== null}
                    onClick={() => handleAction(() => onCreateNew(c.operation.id), `create-${c.operation.id}`)}
                    className="text-[10px] font-medium px-2 py-0.5 rounded bg-accent-subtle text-theme-accent hover:bg-accent/20 transition-colors"
                  >
                    {actionPending === `create-${c.operation.id}` ? 'Creating...' : 'Create new'}
                  </button>
                </div>
                {isExpanded && hasOpenIssues && (
                  <ul className="px-2 pb-2 flex flex-col gap-1">
                    {c.existingOpenIssues.map((iss) => (
                      <li key={iss.id} className="flex items-center gap-2 py-1 px-2 rounded bg-surface-overlay/20">
                        <span className="text-[11px] text-theme-secondary flex-1 truncate">
                          {iss.id} — {iss.title}
                        </span>
                        <span className={`text-[10px] px-1.5 py-0.5 rounded ${
                          BLOCKER_STATUS_STYLES[iss.status] ?? 'bg-surface-overlay/40 text-theme-muted/60'
                        }`}>
                          {iss.status}
                        </span>
                        <button
                          disabled={actionPending !== null}
                          onClick={() => handleAction(() => onLinkExisting(iss.id), `link-${iss.id}`)}
                          className="text-[10px] font-medium px-2 py-0.5 rounded bg-surface-overlay/60 text-theme-muted hover:bg-surface-overlay transition-colors"
                        >
                          {actionPending === `link-${iss.id}` ? 'Linking...' : 'Link'}
                        </button>
                      </li>
                    ))}
                  </ul>
                )}
              </li>
            );
          })}
        </ul>
      )}
    </div>
  );
}

function BlockerRow({
  blocker,
  onRemove,
}: {
  blocker: BlockerInfo;
  onRemove?: (blockerIssueId: string) => Promise<void>;
}) {
  const [removePending, setRemovePending] = useState(false);

  return (
    <li className="flex items-center gap-2 py-1.5 px-2 rounded-md bg-surface-overlay/30">
      <Link2 size={12} className="shrink-0 text-theme-muted" />
      <span className="text-xs font-medium text-theme-primary flex-1 truncate">
        {blocker.issueId} — {blocker.title}
      </span>
      <span className={`text-[10px] px-1.5 py-0.5 rounded ${
        BLOCKER_STATUS_STYLES[blocker.status] ?? 'bg-surface-overlay/40 text-theme-muted/60'
      }`}>
        {blocker.status}
      </span>
      {onRemove && (
        <button
          disabled={removePending}
          onClick={async () => {
            setRemovePending(true);
            try { await onRemove(blocker.issueId); } finally { setRemovePending(false); }
          }}
          className="text-red-400 hover:text-red-500 transition-colors p-0.5"
          title="Remove blocker"
        >
          <Trash2 size={12} />
        </button>
      )}
    </li>
  );
}
