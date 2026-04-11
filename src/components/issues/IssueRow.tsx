import { Hourglass } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import type { Issue } from '../../types';
import { getUserById } from '../../mocks/users';
import { useCurrentUserStore } from '../../stores/currentUserStore';
import { awaitingMyAction, getOngoingStepLabels } from '../../lib/workflows/discovery';
import { getDefinition } from '../../lib/workflows/registry';
import { RiskBadge } from './RiskBadge';
import { StatusBadge } from './StatusBadge';
import { OngoingStepsBadge } from './OngoingStepsBadge';

function formatDate(iso: string): string {
  const d = new Date(iso);
  return d.toISOString().slice(0, 10);
}

function formatDateTime(iso: string): string {
  const d = new Date(iso);
  return `${d.toISOString().slice(0, 10)} ${d.toISOString().slice(11, 16)}`;
}

export function IssueRow({ issue }: { issue: Issue }) {
  const navigate = useNavigate();
  const currentUser = useCurrentUserStore((s) => s.currentUser);
  const awaiting = awaitingMyAction(issue, currentUser, getDefinition);
  const ongoingLabels = getOngoingStepLabels(issue, getDefinition);

  return (
    <tr
      onClick={() => navigate(`/issues/${issue.id}`)}
      className="cursor-pointer hover:bg-surface-overlay/40 transition-colors border-b border-border-subtle/40"
    >
      <td className="px-3 py-2 text-sm text-theme-secondary whitespace-nowrap">
        {formatDate(issue.date)}
      </td>
      <td className="px-3 py-2 text-sm text-theme-secondary whitespace-nowrap">
        <span className="badge">{issue.alarmType}</span>
      </td>
      <td className="px-3 py-2 text-sm whitespace-nowrap">
        <RiskBadge level={issue.riskLevel} />
      </td>
      <td className="px-3 py-2 text-sm whitespace-nowrap">
        <StatusBadge status={issue.status} />
      </td>
      <td className="px-3 py-2 text-sm whitespace-nowrap">
        <OngoingStepsBadge labels={ongoingLabels} />
      </td>
      <td className="px-3 py-2 text-sm whitespace-nowrap">
        {awaiting && (
          <span className="inline-flex items-center gap-0.5 px-1.5 py-0.5 rounded text-[10px] font-medium border bg-amber-500/15 text-amber-400 border-amber-500/30">
            <Hourglass size={10} />
            you
          </span>
        )}
      </td>
      <td className="px-3 py-2 text-sm text-theme-primary font-medium max-w-md truncate">
        {issue.title}
      </td>
      <td className="px-3 py-2 text-sm text-theme-secondary whitespace-nowrap">
        {formatDateTime(issue.issueTime)}
      </td>
      <td className="px-3 py-2 text-sm text-theme-secondary whitespace-nowrap">
        {issue.operation}
      </td>
      <td className="px-3 py-2 text-sm text-theme-secondary whitespace-nowrap">
        {issue.product}
      </td>
      <td className="px-3 py-2 text-sm text-theme-secondary whitespace-nowrap">
        {getUserById(issue.ownerId)?.name ?? issue.ownerId}
      </td>
      <td className="px-3 py-2 text-sm text-theme-secondary whitespace-nowrap">
        {issue.department}
      </td>
    </tr>
  );
}
