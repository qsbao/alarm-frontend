import type { MouseEvent } from 'react';
import { formatCauseChipSuffix } from './causeChipFormat';

interface CauseChipProps {
  issueId: string;
  issueTitle: string;
  clusterSize: number;
  onClick?: (issueId: string) => void;
}

export function CauseChip({ issueId, issueTitle, clusterSize, onClick }: CauseChipProps) {
  const suffix = formatCauseChipSuffix(clusterSize);

  const handleClick = (e: MouseEvent<HTMLButtonElement>) => {
    e.stopPropagation();
    onClick?.(issueId);
  };

  return (
    <button
      type="button"
      data-testid="cause-chip"
      data-issue-id={issueId}
      onClick={handleClick}
      className="badge border text-blue-400 bg-blue-500/10 border-blue-500/20 hover:bg-blue-500/20 max-w-[220px] truncate"
      title={issueTitle}
    >
      <span className="truncate">{issueTitle}</span>
      {suffix && <span className="ml-1 text-theme-muted shrink-0">({suffix})</span>}
    </button>
  );
}
