import { GitMerge, X } from 'lucide-react';
import { useCallback, useEffect, useState } from 'react';
import { useIssueStore } from '../../stores/issueStore';
import { useCurrentUserStore } from '../../stores/currentUserStore';
import { useIssues } from '../../hooks/useIssues';
import { backend } from '../../api/backendClient';
import { MergeDialog, type MergeSource } from '../issue-detail/MergeDialog';
import type { Alarm, Issue } from '../../types';

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
    const { error } = await backend.POST('/api/issues/{id}/merge', {
      params: { path: { id: targetId } },
      body: { sourceIds } as any,
    });
    if (error) return;
    setShowMergeDialog(false);
    clearSelection();
    refresh();
  }, [selectedIds, clearSelection, refresh]);

  const handleCancel = useCallback(() => {
    setShowMergeDialog(false);
  }, []);

  const [sources, setSources] = useState<MergeSource[]>([]);

  // Fetch alarm data for selected issues when merge dialog opens
  useEffect(() => {
    if (!showMergeDialog) return;
    (async () => {
      const result: MergeSource[] = [];
      for (const issue of selectedIssues) {
        const { data } = await backend.GET('/api/issues/{id}/alarms', {
          params: { path: { id: issue.id } },
        });
        const links = (data ?? []) as unknown as Array<{ alarmId: string }>;
        const alarms: Alarm[] = [];
        for (const link of links) {
          const { data: alarmData } = await backend.GET('/api/alarms/{id}', {
            params: { path: { id: link.alarmId } },
          });
          if (alarmData) alarms.push(alarmData as unknown as Alarm);
        }
        result.push({ issue, alarms });
      }
      setSources(result);
    })();
  }, [showMergeDialog, selectedIssues]);

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
