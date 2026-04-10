import {
  ArrowRight,
  Link as LinkIcon,
  MessageSquare,
  Plus,
  Unlink,
  UserCheck,
} from 'lucide-react';
import type { ActivityEntry, ActivityType } from '../../types';

const ICON_MAP: Record<ActivityType, typeof Plus> = {
  created: Plus,
  status_change: ArrowRight,
  assignment: UserCheck,
  comment: MessageSquare,
  alarm_linked: LinkIcon,
  alarm_unlinked: Unlink,
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
  }
}

export function ActivityTimeline({ activity }: { activity: ActivityEntry[] }) {
  const reversed = [...activity].reverse();

  return (
    <div className="card p-5">
      <h2 className="text-xs font-semibold uppercase tracking-wide text-theme-muted mb-3">
        Activity
      </h2>
      <ul className="flex flex-col gap-3">
        {reversed.map((entry) => {
          const Icon = ICON_MAP[entry.type];
          return (
            <li key={entry.id} className="flex items-start gap-3">
              <div className="w-7 h-7 shrink-0 rounded-full bg-surface-overlay/60 border border-border-subtle/40 flex items-center justify-center text-theme-muted">
                <Icon size={13} />
              </div>
              <div className="min-w-0 flex-1">
                <div className="text-xs leading-relaxed">{describe(entry)}</div>
                <div className="text-[10px] text-theme-muted mt-0.5">
                  {relativeTime(entry.timestamp)}
                </div>
              </div>
            </li>
          );
        })}
      </ul>
    </div>
  );
}
