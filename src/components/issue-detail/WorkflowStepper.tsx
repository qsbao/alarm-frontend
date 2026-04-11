import { AlertCircle, Check } from 'lucide-react';
import { useState } from 'react';
import { ALL_ISSUE_STATUSES, STATUS_TRANSITIONS, type Issue, type IssueStatus } from '../../types';
import { WorkflowBlockError } from '../../api/client';
import { getDefinition } from '../../lib/workflows/registry';

interface WorkflowStepperProps {
  issue: Issue;
  onChange: (next: IssueStatus) => Promise<void> | void;
}

const TRANSITION_LABELS: Record<IssueStatus, string> = {
  New: 'Back to New',
  Investigating: 'Mark Investigating',
  Resolved: 'Mark Resolved',
  Closed: 'Close',
};

export function WorkflowStepper({ issue, onChange }: WorkflowStepperProps) {
  const status = issue.status;
  const currentIndex = ALL_ISSUE_STATUSES.indexOf(status);
  const transitions = STATUS_TRANSITIONS[status];
  const [blockMessage, setBlockMessage] = useState<string | null>(null);

  const handleTransition = async (next: IssueStatus) => {
    setBlockMessage(null);
    try {
      await onChange(next);
    } catch (err) {
      if (err instanceof WorkflowBlockError) {
        const def = getDefinition(err.workflowName);
        const defName = def?.name ?? err.workflowName;
        const phase = def?.phases.find((p) => p.id === err.currentPhaseId);
        const phaseName = phase?.label ?? err.currentPhaseId;
        setBlockMessage(
          `Cannot mark ${next}: workflow "${defName}" is in phase "${phaseName}" and must complete first.`,
        );
      } else {
        throw err;
      }
    }
  };

  return (
    <div className="card p-5">
      <h2 className="text-xs font-semibold uppercase tracking-wide text-theme-muted mb-4">
        Workflow
      </h2>

      <div className="flex items-center">
        {ALL_ISSUE_STATUSES.map((step, idx) => {
          const reached = idx <= currentIndex;
          const isCurrent = idx === currentIndex;
          return (
            <div key={step} className="flex items-center flex-1 last:flex-none">
              <div className="flex flex-col items-center gap-1.5">
                <div
                  className={`w-8 h-8 rounded-full flex items-center justify-center text-xs font-semibold border transition-colors ${
                    reached
                      ? 'bg-accent-subtle text-theme-accent border-accent/40'
                      : 'bg-surface-overlay/40 text-theme-muted border-border-subtle/40'
                  } ${isCurrent ? 'ring-2 ring-accent/30' : ''}`}
                >
                  {idx < currentIndex ? <Check size={14} /> : idx + 1}
                </div>
                <span
                  className={`text-[11px] font-medium ${
                    reached ? 'text-theme-primary' : 'text-theme-muted'
                  }`}
                >
                  {step}
                </span>
              </div>
              {idx < ALL_ISSUE_STATUSES.length - 1 && (
                <div
                  className={`flex-1 h-0.5 mx-2 mb-5 ${
                    idx < currentIndex ? 'bg-accent/40' : 'bg-border-subtle/40'
                  }`}
                />
              )}
            </div>
          );
        })}
      </div>

      {transitions.length > 0 && (
        <div className="mt-5 flex flex-wrap items-center gap-2">
          {transitions.map((next, idx) => {
            const Btn = idx === 0 ? 'btn-primary' : 'btn-secondary';
            return (
              <button
                key={next}
                onClick={() => handleTransition(next)}
                className={`${Btn} btn-sm`}
              >
                {TRANSITION_LABELS[next]}
              </button>
            );
          })}
        </div>
      )}

      {blockMessage && (
        <div className="mt-3 flex items-start gap-2 text-xs text-amber-600 dark:text-amber-400 bg-amber-500/10 rounded-md px-3 py-2">
          <AlertCircle size={14} className="shrink-0 mt-0.5" />
          <span>{blockMessage}</span>
        </div>
      )}
    </div>
  );
}
