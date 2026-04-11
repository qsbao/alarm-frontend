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

export function getIssueSavedViews(): IssueSavedView[] {
  return [...ISSUE_BUILTIN_VIEWS];
}
