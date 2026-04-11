import { Link, useParams } from 'react-router-dom';
import { ActivityTimeline } from '../components/issue-detail/ActivityTimeline';
import { AlarmList } from '../components/issue-detail/AlarmList';
import { CommentBox } from '../components/issue-detail/CommentBox';
import { IssueHeader } from '../components/issue-detail/IssueHeader';
import { WorkflowPanel } from '../components/issue-detail/WorkflowPanel';
import { WorkflowStepper } from '../components/issue-detail/WorkflowStepper';
import { useIssue } from '../hooks/useIssue';

export function IssueDetailPage() {
  const { id } = useParams<{ id: string }>();
  const {
    issue,
    alarms,
    loading,
    changeStatus,
    assignOwner,
    addComment,
    linkAlarm,
    unlinkAlarm,
    fireWorkflowAction,
  } = useIssue(id);

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
        <IssueHeader issue={issue} onAssign={assignOwner} />

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-5">
          <div className="lg:col-span-2 flex flex-col gap-5">
            <WorkflowStepper issue={issue} onChange={changeStatus} />

            <WorkflowPanel issue={issue} onFireAction={fireWorkflowAction} />

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
            <AlarmList alarms={alarms} issue={issue} onLink={linkAlarm} onUnlink={unlinkAlarm} />
            <ActivityTimeline activity={issue.activity} />
          </div>
        </div>
      </div>
    </div>
  );
}
