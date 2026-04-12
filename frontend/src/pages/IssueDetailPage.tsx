import { Link, useNavigate, useParams } from 'react-router-dom';
import { useCallback, useEffect, useState } from 'react';
import { GitMerge } from 'lucide-react';
import { ActivityTimeline } from '../components/issue-detail/ActivityTimeline';
import { AlarmList } from '../components/issue-detail/AlarmList';
import { CommentBox } from '../components/issue-detail/CommentBox';
import { HistoricalAlarmList, type HistoricalAlarmRow } from '../components/issue-detail/HistoricalAlarmList';
import { IssueHeader } from '../components/issue-detail/IssueHeader';
import { MergeDialog, type MergeSource } from '../components/issue-detail/MergeDialog';
import { PullMergeDialog } from '../components/issue-detail/PullMergeDialog';
import { WorkflowPanel } from '../components/issue-detail/WorkflowPanel';
import { useIssue } from '../hooks/useIssue';
import type { Alarm } from '../types';
import { useCurrentUserStore } from '../stores/currentUserStore';
import { api } from '../api/client';
import { backend } from '../api/backendClient';

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
  const [showPullDialog, setShowPullDialog] = useState(false);
  const [mergedInto, setMergedInto] = useState<string | null>(null);
  const [historicalAlarms, setHistoricalAlarms] = useState<HistoricalAlarmRow[]>([]);
  const currentUser = useCurrentUserStore((s) => s.currentUser);

  const isMerged = mergedInto != null;

  // Check if this issue has been merged into another
  useEffect(() => {
    if (!id) return;
    let cancelled = false;
    backend.GET('/api/issues/{id}/merged-into', { params: { path: { id } } }).then(({ data }) => {
      if (!cancelled) {
        const result = data as unknown as { targetIssueId?: string } | undefined;
        setMergedInto(result?.targetIssueId ?? null);
      }
    });
    return () => { cancelled = true; };
  }, [id, issue?.status]);

  // Fetch historical alarms for merged issues
  useEffect(() => {
    if (!id || !isMerged) {
      setHistoricalAlarms([]);
      return;
    }
    let cancelled = false;
    (async () => {
      const { data } = await backend.GET('/api/issues/{id}/alarms/historical', {
        params: { path: { id } },
      });
      if (!cancelled && data) {
        const links = data as unknown as Array<{ alarmId: string; mergedToIssueId?: string }>;
        const rows: HistoricalAlarmRow[] = [];
        for (const link of links) {
          if (!link.mergedToIssueId) continue;
          const { data: alarmData } = await backend.GET('/api/alarms/{id}', {
            params: { path: { id: link.alarmId } },
          });
          if (alarmData) {
            rows.push({
              alarm: alarmData as unknown as Alarm,
              mergedToIssueId: link.mergedToIssueId,
            });
          }
        }
        setHistoricalAlarms(rows);
      }
    })();
    return () => { cancelled = true; };
  }, [id, isMerged]);

  const handleMergeConfirm = useCallback(async (targetId: string) => {
    if (!issue) return;
    const { error } = await backend.POST('/api/issues/{id}/merge', {
      params: { path: { id: targetId } },
      body: { sourceIds: [issue.id] } as any,
    });
    if (!error) {
      setShowMergeDialog(false);
      navigate(`/issues/${targetId}`);
    }
  }, [issue, navigate]);

  const handlePullConfirm = useCallback(async (sourceIds: string[]) => {
    if (!issue) return;
    const { error } = await backend.POST('/api/issues/{id}/merge', {
      params: { path: { id: issue.id } },
      body: { sourceIds } as any,
    });
    if (!error) {
      setShowPullDialog(false);
      reload();
    }
  }, [issue, reload]);

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
        {isMerged && (
          <Link
            to={`/issues/${mergedInto}`}
            className="group rounded-lg bg-purple-500/15 border-2 border-purple-500/30 px-5 py-4 flex items-center gap-3 hover:bg-purple-500/20 transition-colors cursor-pointer no-underline"
          >
            <GitMerge size={18} className="text-purple-400 shrink-0" />
            <span className="text-sm font-medium text-purple-300">
              This issue was merged into{' '}
              <span className="font-mono font-semibold">{mergedInto}</span>
            </span>
            <span className="text-sm text-purple-400 group-hover:text-purple-300 ml-auto">
              Go there &rarr;
            </span>
          </Link>
        )}

        <IssueHeader
          issue={issue}
          onAssign={assignOwner}
          onMerge={isMerged ? undefined : () => setShowMergeDialog(true)}
          onPullAlarms={isMerged ? undefined : () => setShowPullDialog(true)}
          disabled={isMerged}
        />

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-5">
          <div className="lg:col-span-2 flex flex-col gap-5">
            {/* Hide workflow panel entirely on merged source pages */}
            {!isMerged && (
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
            )}

            <div className="card p-5">
              <h2 className="text-xs font-semibold uppercase tracking-wide text-theme-muted mb-3">
                Description
              </h2>
              <p className="text-sm text-theme-secondary leading-relaxed whitespace-pre-wrap">
                {issue.description}
              </p>
            </div>

            {/* Comment box hidden on merged pages */}
            {!isMerged && <CommentBox onPost={addComment} />}
          </div>

          <div className="flex flex-col gap-5">
            {/* Show active alarms (read-only when merged) or historical alarms */}
            {isMerged ? (
              <HistoricalAlarmList rows={historicalAlarms} />
            ) : (
              <AlarmList alarms={alarms} issue={issue} onLink={linkAlarm} onUnlink={unlinkAlarm} onMove={moveAlarm} />
            )}
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

      {showPullDialog && (
        <PullMergeDialog
          target={issue}
          targetAlarms={alarms}
          onConfirm={handlePullConfirm}
          onCancel={() => setShowPullDialog(false)}
          currentUserDepartment={currentUser.department}
        />
      )}
    </div>
  );
}
