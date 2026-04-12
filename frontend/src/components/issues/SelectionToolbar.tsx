import { GitMerge, X } from 'lucide-react';
import { useCallback, useState } from 'react';
import { useIssueStore } from '../../stores/issueStore';
import { useCurrentUserStore } from '../../stores/currentUserStore';
import { useIssues } from '../../hooks/useIssues';
import { getActiveAlarmsForIssue } from '../../lib/issueAlarms';
import { api } from '../../api/client';
import { MOCK_ALARMS } from '../../mocks/alarms';
import { MergeDialog, type MergeSource } from '../issue-detail/MergeDialog';
import type { Issue } from '../../types';

interface SelectionToolbarProps {
  pageItems: Issue[];
}

export function SelectionToolbar({ pageItems }: SelectionToolbarProps) {
  const selectedIds = useIssueStore((s) => s.selectedIds);
  const clearSelection = useIssueStore((s) => s.clearSelection);
  const currentUser = useCurrentUserStore((s) => s.currentUser);
  const { refresh } = useIssues();
  const [showMergeDialog, setShowMergeDialog] = useState(false);

  const selectedIssues = pageItems.filter((i) => selectedIds.has(i.id));
  const count = selectedIds.size;

  const hasCrossDept = selectedIssues.some((i) => i.department !== currentUser.department);

  const handleMergeClick = () => {
    if (hasCrossDept) return;
    setShowMergeDialog(true);
  };

  const handleConfirm = useCallback(async (targetId: string) => {
    const sourceIds = [...selectedIds];
    const result = await api.mergeIssues(sourceIds, targetId, currentUser);
    if (!result.ok) return;
    setShowMergeDialog(false);
    clearSelection();
    refresh();
  }, [selectedIds, currentUser, clearSelection, refresh]);

  const handleCancel = useCallback(() => {
    setShowMergeDialog(false);
  }, []);

  const sources: MergeSource[] = selectedIssues.map((issue) => {
    const alarmRows = getActiveAlarmsForIssue(issue.id);
    const alarms = alarmRows
      .map((r) => MOCK_ALARMS.find((a) => a.id === r.alarmId))
      .filter(Boolean) as import('../../types').Alarm[];
    return { issue, alarms };
  });

  return (
    <>
      <div className="flex items-center gap-3 px-4 py-2 bg-theme-accent/10 border-b border-theme-accent/20">
        <span className="text-sm text-theme-primary font-medium">
          {count} selected
        </span>
        <span className="text-theme-muted">·</span>
        <button
          onClick={handleMergeClick}
          disabled={hasCrossDept}
          className="btn-primary btn-sm"
          title={hasCrossDept ? 'Cannot merge issues from another department' : undefined}
        >
          <GitMerge size={13} />
          Merge selected…
        </button>
        <span className="text-theme-muted">·</span>
        <button onClick={clearSelection} className="btn-ghost btn-sm">
          <X size={13} />
          Clear
        </button>
      </div>
      {showMergeDialog && (
        <MergeDialog
          sources={sources}
          onConfirm={handleConfirm}
          onCancel={handleCancel}
          currentUserDepartment={currentUser.department}
        />
      )}
    </>
  );
}
