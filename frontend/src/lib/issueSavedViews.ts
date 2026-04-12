import type { Issue, User } from '../types';
import type { WorkflowDefinition } from './workflows/types';
import { awaitingMyAction } from './workflows/discovery';

export interface IssueSavedView {
  name: string;
  builtin: boolean;
  predicate: (
    issue: Issue,
    user: User,
    getDefinition: (id: string) => WorkflowDefinition | undefined,
  ) => boolean;
}

export const ISSUE_BUILTIN_VIEWS: IssueSavedView[] = [
  {
    name: 'Awaiting my action',
    builtin: true,
    predicate: (issue, user, getDefinition) =>
      awaitingMyAction(issue, user, getDefinition),
  },
];

/**
 * Creates a saved-view predicate that matches issues with a specific
 * step in `ongoing` status. No gate evaluation — purely status-based.
 */
export function makeHasOngoingStepView(stepId: string): IssueSavedView {
  return {
    name: `Has ongoing: ${stepId}`,
    builtin: false,
    predicate: (issue) => {
      const workflow = issue.workflow;
      if (!workflow || workflow.completedAt) return false;
      const state = workflow.stepStates[stepId];
      return state?.status === 'ongoing';
    },
  };
}

export function getIssueSavedViews(): IssueSavedView[] {
  return [...ISSUE_BUILTIN_VIEWS];
}
