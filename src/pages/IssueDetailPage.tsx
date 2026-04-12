import { Link, useNavigate, useParams } from 'react-router-dom';
import { useCallback, useEffect, useState } from 'react';
import { ActivityTimeline } from '../components/issue-detail/ActivityTimeline';
import { AlarmList } from '../components/issue-detail/AlarmList';
import { CommentBox } from '../components/issue-detail/CommentBox';
import { IssueHeader } from '../components/issue-detail/IssueHeader';
import { MergeDialog, type MergeSource } from '../components/issue-detail/MergeDialog';
import { WorkflowPanel } from '../components/issue-detail/WorkflowPanel';
import { useIssue } from '../hooks/useIssue';
import { useCurrentUserStore } from '../stores/currentUserStore';
import { api } from '../api/client';

export function IssueDetailPage() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const {
    issue,
    alarms,
    blockers,
    loading,
    reload,
    assignOwner,
    addComment,
    linkAlarm,
    unlinkAlarm,
    moveAlarm,
    completeWorkflowStep,
    skipWorkflowStep,
    reviveWorkflowStep,
    editWorkflowStep,
    addBlocker,
    removeBlocker,
    fetchHighlightCandidates,
    createHighlightedIssue,
    linkExistingIssueAsHighlight,
  } = useIssue(id);

  const [showMergeDialog, setShowMergeDialog] = useState(false);
  const [mergedInto, setMergedInto] = useState<string | null>(null);
  const currentUser = useCurrentUserStore((s) => s.currentUser);

  // Check if this issue has been merged into another
  useEffect(() => {
    if (!id) return;
    let cancelled = false;
    api.getMergedInto(id).then((result) => {
      if (!cancelled) setMergedInto(result?.targetIssueId ?? null);
    });
    return () => { cancelled = true; };
  }, [id, issue?.status]);

  const handleMergeConfirm = useCallback(async (targetId: string) => {
    if (!issue) return;
    const result = await api.mergeIssues([issue.id], targetId, currentUser);
    if (result.ok) {
      setShowMergeDialog(false);
      navigate(`/issues/${targetId}`);
    }
  }, [issue, currentUser, navigate]);

  const mergeSources: MergeSource[] = issue ? [{ issue, alarms }] : [];

  if (loading && !issue) {
    return (
      <div className="h-full flex items-center justify-center text-sm text-theme-muted">
        Loading issue...
      </div>
    );
  }

  if (!issue) {
    return (
      <div className="h-full flex flex-col items-center justify-center gap-3">
        <div className="text-sm text-theme-muted">Issue not found.</div>
        <Link to="/issues" className="btn-secondary btn-sm">
          Back to Issues
        </Link>
      </div>
    );
  }

  return (
    <div className="h-full overflow-y-auto bg-surface-base">
      <div className="max-w-6xl mx-auto p-6 flex flex-col gap-5">
        {/* Merged-source banner */}
        {mergedInto && (
          <div className="rounded-lg bg-purple-500/10 border border-purple-500/20 px-4 py-3 flex items-center gap-3">
            <span className="text-sm text-purple-300">
              Merged into <span className="font-mono font-medium">{mergedInto}</span>
            </span>
            <Link
              to={`/issues/${mergedInto}`}
              className="text-sm text-purple-400 hover:text-purple-300 underline"
            >
              Go there &rarr;
            </Link>
          </div>
        )}

        <IssueHeader issue={issue} onAssign={assignOwner} onMerge={() => setShowMergeDialog(true)} />

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-5">
          <div className="lg:col-span-2 flex flex-col gap-5">
            <WorkflowPanel
              issue={issue}
              blockers={blockers}
              onCompleteStep={completeWorkflowStep}
              onSkipStep={skipWorkflowStep}
              onReviveStep={reviveWorkflowStep}
              onEditStep={editWorkflowStep}
              onAddBlocker={addBlocker}
              onRemoveBlocker={removeBlocker}
              onFetchHighlightCandidates={fetchHighlightCandidates}
              onCreateHighlightedIssue={createHighlightedIssue}
              onLinkExistingIssueAsHighlight={linkExistingIssueAsHighlight}
            />

            <div className="card p-5">
              <h2 className="text-xs font-semibold uppercase tracking-wide text-theme-muted mb-3">
                Description
              </h2>
              <p className="text-sm text-theme-secondary leading-relaxed whitespace-pre-wrap">
                {issue.description}
              </p>
            </div>

            <CommentBox onPost={addComment} />
          </div>

          <div className="flex flex-col gap-5">
            <AlarmList alarms={alarms} issue={issue} onLink={linkAlarm} onUnlink={unlinkAlarm} onMove={moveAlarm} />
            <ActivityTimeline activity={issue.activity} />
          </div>
        </div>
      </div>

      {showMergeDialog && (
        <MergeDialog
          sources={mergeSources}
          onConfirm={handleMergeConfirm}
          onCancel={() => setShowMergeDialog(false)}
          currentUserDepartment={currentUser.department}
        />
      )}
    </div>
  );
}
