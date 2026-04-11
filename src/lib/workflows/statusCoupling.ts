import type { Issue, IssueStatus } from '../../types';

export interface WorkflowBlockResult {
  workflowName: string;
  currentPhaseId: string;
}

/**
 * Checks whether transitioning to `targetStatus` is blocked by a non-terminal workflow.
 * Returns null if allowed, or a structured block result if blocked.
 */
export function checkWorkflowBlock(
  issue: Issue,
  targetStatus: IssueStatus,
): WorkflowBlockResult | null {
  if (targetStatus !== 'Resolved' && targetStatus !== 'Closed') return null;

  const wf = issue.workflow;
  if (!wf) return null;
  if (wf.completedAt) return null;

  return {
    workflowName: wf.definitionId,
    currentPhaseId: wf.currentPhaseId,
  };
}
