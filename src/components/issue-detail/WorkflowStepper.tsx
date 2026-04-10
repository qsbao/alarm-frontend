import { Check } from 'lucide-react';
import { ALL_ISSUE_STATUSES, STATUS_TRANSITIONS, type IssueStatus } from '../../types';

interface WorkflowStepperProps {
  status: IssueStatus;
  onChange: (next: IssueStatus) => Promise<void> | void;
}

const TRANSITION_LABELS: Record<IssueStatus, string> = {
  New: 'Back to New',
  Investigating: 'Mark Investigating',
  Resolved: 'Mark Resolved',
  Closed: 'Close',
};

export function WorkflowStepper({ status, onChange }: WorkflowStepperProps) {
  const currentIndex = ALL_ISSUE_STATUSES.indexOf(status);
  const transitions = STATUS_TRANSITIONS[status];

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
                onClick={() => onChange(next)}
                className={`${Btn} btn-sm`}
              >
                {TRANSITION_LABELS[next]}
              </button>
            );
          })}
        </div>
      )}
    </div>
  );
}
