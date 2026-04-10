import { ExternalLink, FileText, Link as LinkIcon, Plus, Unlink } from 'lucide-react';
import { Link } from 'react-router-dom';
import type { Issue } from '../../types';

interface LinkedIssueCardProps {
  issue: Issue | undefined;
  loading: boolean;
  onUnlink: () => void;
  onCreateIssue: () => void;
  onLinkExisting: () => void;
}

export function LinkedIssueCard({ issue, loading, onUnlink, onCreateIssue, onLinkExisting }: LinkedIssueCardProps) {
  return (
    <div className="card p-5">
      <h2 className="text-xs font-semibold uppercase tracking-wide text-theme-muted mb-3">
        Linked Issue
      </h2>

      {loading && (
        <div className="text-xs text-theme-muted italic">Loading...</div>
      )}

      {!loading && issue && (
        <div className="flex flex-col gap-3">
          <div className="flex items-start gap-2">
            <FileText size={14} className="text-theme-muted mt-0.5 shrink-0" />
            <div className="min-w-0 flex-1">
              <Link
                to={`/issues/${issue.id}`}
                className="text-sm text-theme-accent hover:underline font-medium leading-tight"
              >
                {issue.title}
              </Link>
              <div className="mt-1 flex items-center gap-2 flex-wrap">
                <span className="badge font-mono text-[10px]">{issue.id}</span>
                <span className="badge text-[10px]">{issue.status}</span>
                <span className="badge text-[10px]">{issue.riskLevel}</span>
              </div>
            </div>
            <Link
              to={`/issues/${issue.id}`}
              className="text-theme-muted hover:text-theme-primary shrink-0"
              title="Open issue"
            >
              <ExternalLink size={13} />
            </Link>
          </div>
          <button
            onClick={onUnlink}
            className="btn-secondary btn-sm self-start"
          >
            <Unlink size={13} />
            Unlink
          </button>
        </div>
      )}

      {!loading && !issue && (
        <div className="flex flex-col gap-2">
          <div className="text-xs text-theme-muted italic">No linked issue.</div>
          <div className="flex gap-2 flex-wrap">
            <button
              onClick={onCreateIssue}
              className="btn-primary btn-sm"
            >
              <Plus size={13} />
              Create issue
            </button>
            <button
              onClick={onLinkExisting}
              className="btn-secondary btn-sm"
            >
              <LinkIcon size={13} />
              Link to existing issue
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
