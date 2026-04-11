import type { Issue } from '../../types';
import type { UserId, WorkflowDefinition, WorkflowInstance } from './types';

interface IssueWithWorkflow extends Issue {
  workflow?: WorkflowInstance;
}

export function awaitingMyAction(
  issue: IssueWithWorkflow,
  user: { id: UserId },
  getDefinition: (id: string) => WorkflowDefinition | undefined,
): boolean {
  const workflow = issue.workflow;
  if (!workflow || workflow.completedAt) return false;

  const definition = getDefinition(workflow.definitionId);
  if (!definition) return false;

  const currentPhase = definition.phases.find((p) => p.id === workflow.currentPhaseId);
  if (!currentPhase) return false;

  const completedIds = new Set(
    (workflow.completedActions[workflow.currentPhaseId] ?? []).map((r) => r.actionId),
  );

  return currentPhase.actions.some(
    (action) =>
      !completedIds.has(action.id) &&
      action.gate({ user, instance: workflow, issue }),
  );
}
