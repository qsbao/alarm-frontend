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

  // Check if any ongoing step has a gate that this user passes (or no gate)
  return definition.steps.some((step) => {
    const state = workflow.stepStates[step.id];
    if (!state || state.status !== 'ongoing') return false;
    if (!step.gate) return true; // no gate = anyone can act
    return step.gate({ user, instance: workflow, issue });
  });
}
