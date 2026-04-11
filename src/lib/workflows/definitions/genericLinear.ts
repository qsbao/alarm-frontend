import type { WorkflowDefinition } from '../types';

/**
 * Generic linear workflow: chart_owner_comment → resolved → closed.
 * Used for simple issues and stub issues created via highlighting.
 * `resolved` and `closed` are owner-only. Both accept an optional comment.
 */
export const genericLinearDefinition: WorkflowDefinition = {
  id: 'generic_linear_v1',
  name: 'Generic Linear',
  version: '1',
  steps: [
    {
      id: 'chart_owner_comment',
      label: 'Chart Owner Comment',
      order: 1,
      preSteps: [],
      impliesStatus: 'Investigating',
    },
    {
      id: 'resolved',
      label: 'Resolved',
      order: 2,
      preSteps: ['chart_owner_comment'],
      gate: ({ user, issue }) => user.id === issue.ownerId,
      payloadSchema: {
        comment: {
          kind: 'text',
          label: 'Comment',
          required: false,
        },
      },
      impliesStatus: 'Resolved',
    },
    {
      id: 'closed',
      label: 'Closed',
      order: 3,
      preSteps: ['resolved'],
      gate: ({ user, issue }) => user.id === issue.ownerId,
      payloadSchema: {
        comment: {
          kind: 'text',
          label: 'Comment',
          required: false,
        },
      },
      impliesStatus: 'Closed',
    },
  ],
  requiredRoles: [],
};
