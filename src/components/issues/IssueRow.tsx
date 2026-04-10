import { useNavigate } from 'react-router-dom';
import type { Issue } from '../../types';
import { RiskBadge } from './RiskBadge';
import { StatusBadge } from './StatusBadge';

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
        {issue.owner}
      </td>
      <td className="px-3 py-2 text-sm text-theme-secondary whitespace-nowrap">
        {issue.department}
      </td>
    </tr>
  );
}
