import type { IssueStatus } from '../../types';

const STATUS_CLASSES: Record<IssueStatus, string> = {
  Triage: 'text-blue-400 bg-blue-500/10 border-blue-500/20',
  Investigating: 'text-amber-400 bg-amber-500/10 border-amber-500/20',
  Resolved: 'text-emerald-400 bg-emerald-500/10 border-emerald-500/20',
  Closed: 'text-slate-400 bg-slate-500/10 border-slate-500/20',
  Merged: 'text-purple-400 bg-purple-500/10 border-purple-500/20',
};

export function StatusBadge({ status }: { status: IssueStatus }) {
  return (
    <span className={`badge border ${STATUS_CLASSES[status]}`}>
      {status}
    </span>
  );
}
