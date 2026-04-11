import {
  ArrowRight,
  GitBranch,
  Link as LinkIcon,
  MessageSquare,
  Plus,
  Unlink,
  UserCheck,
} from 'lucide-react';
import type { ActivityEntry, ActivityType } from '../../types';
import { getUserById } from '../../mocks/users';
import { getDefinition } from '../../lib/workflows/registry';

const ICON_MAP: Record<ActivityType, typeof Plus> = {
  created: Plus,
  status_change: ArrowRight,
  assignment: UserCheck,
  comment: MessageSquare,
  alarm_linked: LinkIcon,
  alarm_unlinked: Unlink,
  workflow_transition: GitBranch,
};

function relativeTime(iso: string): string {
  const then = Date.parse(iso);
  const now = Date.now();
  const diff = Math.max(0, now - then);
  const mins = Math.floor(diff / 60_000);
  if (mins < 1) return 'just now';
  if (mins < 60) return `${mins}m ago`;
  const hours = Math.floor(mins / 60);
  if (hours < 24) return `${hours}h ago`;
  const days = Math.floor(hours / 24);
  if (days < 30) return `${days}d ago`;
  return new Date(iso).toISOString().slice(0, 10);
}

function describe(entry: ActivityEntry): React.ReactNode {
  switch (entry.type) {
    case 'created':
      return (
        <>
          <span className="text-theme-primary font-medium">{entry.author}</span> created the issue
        </>
      );
    case 'status_change':
      return (
        <>
          <span className="text-theme-primary font-medium">{entry.author}</span> changed status
          {' '}
          <span className="text-theme-secondary">{entry.fromStatus}</span>
          {' → '}
          <span className="text-theme-accent font-medium">{entry.toStatus}</span>
        </>
      );
    case 'assignment':
      return (
        <>
          <span className="text-theme-primary font-medium">{entry.author}</span> assigned to
          {' '}
          <span className="text-theme-accent font-medium">{entry.assignedTo}</span>
        </>
      );
    case 'comment':
      return (
        <>
          <span className="text-theme-primary font-medium">{entry.author}</span> commented:
          {' '}
          <span className="text-theme-secondary">"{entry.text}"</span>
        </>
      );
    case 'alarm_linked':
      return (
        <>
          <span className="text-theme-primary font-medium">{entry.author}</span> linked alarm
          {' '}
          <span className="font-mono text-theme-secondary">{entry.alarmId}</span>
        </>
      );
    case 'alarm_unlinked':
      return (
        <>
          <span className="text-theme-primary font-medium">{entry.author}</span> unlinked alarm
          {' '}
          <span className="font-mono text-theme-secondary">{entry.alarmId}</span>
        </>
      );
    case 'workflow_transition': {
      const actorName = entry.workflowActorId
        ? (getUserById(entry.workflowActorId)?.name ?? entry.workflowActorId)
        : entry.author;
      const def = entry.workflowDefinitionId ? getDefinition(entry.workflowDefinitionId) : undefined;
      const defName = def?.name ?? entry.workflowDefinitionId ?? 'workflow';
      const actionId = entry.workflowActionId ?? '';
      const isAttach = actionId === '__attach__';
      const fromPhase = def?.phases.find((p) => p.id === entry.workflowFromPhaseId);
      const toPhase = def?.phases.find((p) => p.id === entry.workflowToPhaseId);
      // Find action label
      let actionLabel = actionId;
      if (def) {
        for (const phase of def.phases) {
          const act = phase.actions.find((a) => a.id === actionId);
          if (act) { actionLabel = act.label; break; }
        }
      }

      if (isAttach) {
        return (
          <>
            <span className="text-theme-primary font-medium">{actorName}</span> attached workflow
            {' '}
            <span className="text-theme-accent font-medium">{defName}</span>
          </>
        );
      }

      const moved = entry.workflowFromPhaseId !== entry.workflowToPhaseId;
      return (
        <>
          <span className="text-theme-primary font-medium">{actorName}</span>
          {' '}
          <span className="text-theme-secondary">{actionLabel}</span>
          {moved && fromPhase && toPhase && (
            <>
              {' '}
              <span className="text-theme-muted">{fromPhase.label}</span>
              {' \u2192 '}
              <span className="text-theme-accent font-medium">{toPhase.label}</span>
            </>
          )}
        </>
      );
    }
  }
}

export function ActivityTimeline({ activity }: { activity: ActivityEntry[] }) {
  const reversed = [...activity].reverse();

  const scrollToWorkflow = () => {
    document.getElementById('workflow-panel')?.scrollIntoView({ behavior: 'smooth' });
  };

  return (
    <div className="card p-5">
      <h2 className="text-xs font-semibold uppercase tracking-wide text-theme-muted mb-3">
        Activity
      </h2>
      <ul className="flex flex-col gap-3">
        {reversed.map((entry) => {
          const Icon = ICON_MAP[entry.type];
          const isWfTransition = entry.type === 'workflow_transition';
          return (
            <li
              key={entry.id}
              className={`flex items-start gap-3 ${isWfTransition ? 'cursor-pointer hover:bg-surface-overlay/30 -mx-2 px-2 py-1 rounded-md transition-colors' : ''}`}
              onClick={isWfTransition ? scrollToWorkflow : undefined}
            >
              <div className={`w-7 h-7 shrink-0 rounded-full bg-surface-overlay/60 border border-border-subtle/40 flex items-center justify-center ${
                isWfTransition ? 'text-theme-accent' : 'text-theme-muted'
              }`}>
                <Icon size={13} />
              </div>
              <div className="min-w-0 flex-1">
                <div className="text-xs leading-relaxed">{describe(entry)}</div>
                <div className="text-[10px] text-theme-muted mt-0.5">
                  {relativeTime(entry.timestamp)}
                  {isWfTransition && (
                    <span className="ml-1.5 text-theme-accent">View in workflow panel &rarr;</span>
                  )}
                </div>
              </div>
            </li>
          );
        })}
      </ul>
    </div>
  );
}
