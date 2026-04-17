import { useState } from 'react';
import { ChevronDown, ChevronRight, MoreHorizontal } from 'lucide-react';
import type { EnrichedAlarmRow } from '../../hooks/useDashboardData';
import { getUserById } from '../../lib/users';
import { RiskBadge } from '../issues/RiskBadge';
import { CauseChip } from './CauseChip';
import { StageStepChip } from './StageStepChip';
import {
  formatEventTime,
  latestCommentText,
  sameCauseBandClass,
} from './alarmRowHelpers';

interface AlarmRowProps {
  row: EnrichedAlarmRow;
  clusterSize: number;
  stepLabel?: string;
  onCauseClick?: (issueId: string) => void;
}

export function AlarmRow({ row, clusterSize, stepLabel, onCauseClick }: AlarmRowProps) {
  const [expanded, setExpanded] = useState(false);
  const { alarm, issue, stage } = row;
  const owner = getUserById(alarm.owner);
  const ownerName = owner?.name ?? alarm.owner;
  const bandClass = sameCauseBandClass(issue?.id);
  const ackEntry = alarm.activity.find((e) => e.type === 'acked');
  const latestComment = issue ? latestCommentText(issue.activity) : undefined;

  return (
    <>
      <tr
        data-testid="alarm-row"
        data-alarm-id={alarm.id}
        data-issue-id={issue?.id ?? ''}
        className={`cursor-pointer hover:bg-surface-overlay/40 transition-colors border-b border-border-subtle/40 ${bandClass}`}
        onClick={() => setExpanded((v) => !v)}
      >
        <td className="pl-2 pr-1 py-2 w-6 text-theme-muted">
          {expanded ? <ChevronDown size={14} /> : <ChevronRight size={14} />}
        </td>
        <td className="px-2 py-2 text-sm whitespace-nowrap">
          {alarm.riskLevel ? <RiskBadge level={alarm.riskLevel} /> : <span className="text-theme-muted">—</span>}
        </td>
        <td className="px-2 py-2 text-sm text-theme-primary whitespace-nowrap">
          <div className="font-medium">{alarm.eqpId}</div>
          <div className="text-xs text-theme-muted">{formatEventTime(alarm.eventTime ?? alarm.alarmTime)}</div>
        </td>
        <td className="px-2 py-2 text-sm">
          {issue ? (
            <CauseChip
              issueId={issue.id}
              issueTitle={issue.title}
              clusterSize={clusterSize}
              onClick={onCauseClick}
            />
          ) : (
            <span className="text-theme-muted text-xs">Un-triaged</span>
          )}
        </td>
        <td className="px-2 py-2 text-sm whitespace-nowrap">
          <StageStepChip stage={stage} stepLabel={stepLabel} />
        </td>
        <td className="px-2 py-2 text-sm whitespace-nowrap">
          <span
            className="inline-flex items-center justify-center w-6 h-6 rounded-full bg-surface-overlay text-[10px] font-medium text-theme-secondary border border-border-subtle/60"
            title={ownerName}
            aria-label={ownerName}
          >
            {initials(ownerName)}
          </span>
        </td>
        <td className="px-2 py-2 text-sm w-8">
          <button
            type="button"
            data-testid="alarm-row-menu"
            onClick={(e) => e.stopPropagation()}
            className="btn-ghost btn-xs"
            aria-label="Row menu"
          >
            <MoreHorizontal size={14} />
          </button>
        </td>
      </tr>
      {expanded && (
        <tr data-testid="alarm-row-details" className={bandClass}>
          <td />
          <td colSpan={6} className="px-2 pb-3 text-xs text-theme-secondary">
            <div className="grid grid-cols-2 md:grid-cols-4 gap-x-6 gap-y-2 bg-surface-overlay/30 rounded-md p-3 border border-border-subtle/40">
              <DetailField label="What" value={`${alarm.type} · ${alarm.message}`} />
              <DetailField label="When" value={formatEventTime(alarm.alarmTime)} />
              <DetailField label="Where" value={[alarm.eqpId, alarm.chamberId].filter(Boolean).join(' · ')} />
              <DetailField label="Who" value={`${ownerName} · ${alarm.department}`} />
              <DetailField
                label="Ack"
                value={ackEntry ? `${ackEntry.author}${ackEntry.note ? ` — ${ackEntry.note}` : ''}` : 'Not yet acked'}
              />
              <DetailField
                label="Labels"
                value={alarm.labels.length > 0 ? alarm.labels.join(', ') : '—'}
              />
              <div className="col-span-2 md:col-span-4">
                <div className="text-[10px] uppercase tracking-wider text-theme-muted mb-0.5">Latest comment</div>
                <div className="text-sm text-theme-primary">
                  {latestComment ?? <span className="text-theme-muted">No comments yet</span>}
                </div>
              </div>
            </div>
          </td>
        </tr>
      )}
    </>
  );
}

function DetailField({ label, value }: { label: string; value: string }) {
  return (
    <div>
      <div className="text-[10px] uppercase tracking-wider text-theme-muted mb-0.5">{label}</div>
      <div className="text-sm text-theme-primary">{value}</div>
    </div>
  );
}

function initials(name: string): string {
  const parts = name.trim().split(/\s+/);
  if (parts.length === 0) return '?';
  if (parts.length === 1) return parts[0].slice(0, 2).toUpperCase();
  return `${parts[0][0]}${parts[parts.length - 1][0]}`.toUpperCase();
}
