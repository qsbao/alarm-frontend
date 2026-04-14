import type { WorkflowDefinition } from '../../../frontend/src/lib/workflows/types';

export const exampleApprovalDefinition: WorkflowDefinition = {
  id: 'example_approval_v1',
  name: 'Example Approval (Plugin)',
  version: '1',
  steps: [
    {
      id: 'submit',
      label: 'Submit Request',
      order: 1,
      preSteps: [],
      payloadSchema: {
        description: {
          kind: 'text',
          label: 'Description',
          required: true,
          minLength: 10,
        },
      },
      impliesStatus: 'Investigating',
    },
    {
      id: 'review',
      label: 'Review',
      order: 2,
      preSteps: ['submit'],
      gate: ({ user, issue }) => user.id !== issue.ownerId,
      payloadSchema: {
        decision: {
          kind: 'enum',
          label: 'Decision',
          required: true,
          options: ['Approve', 'Reject'],
        },
        comment: {
          kind: 'text',
          label: 'Review Comment',
          required: false,
        },
      },
      impliesStatus: 'Investigating',
    },
    {
      id: 'closed',
      label: 'Close',
      order: 3,
      preSteps: ['review'],
      gate: ({ user, issue }) => user.id === issue.ownerId,
      impliesStatus: 'Closed',
    },
  ],
  requiredRoles: [],
};
