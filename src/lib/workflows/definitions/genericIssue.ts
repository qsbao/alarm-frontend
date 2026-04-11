import type { WorkflowDefinition } from '../types';

/**
 * Default workflow attached to issues with no domain-specific process.
 * Three phases: Triage (New) → In Progress (Investigating) → Closed (Closed).
 * No gates, no payload schemas — any user can advance.
 */
export const genericIssueDefinition: WorkflowDefinition = {
  id: 'generic_issue_v1',
  name: 'Generic Issue',
  version: '1',
  phases: [
    {
      id: 'triage',
      label: 'Triage',
      status: 'New',
      actions: [
        {
          id: 'start_investigation',
          label: 'Start Investigation',
          required: true,
          gate: () => true,
          payloadSchema: {},
        },
      ],
    },
    {
      id: 'in_progress',
      label: 'In Progress',
      status: 'Investigating',
      actions: [
        {
          id: 'close',
          label: 'Close',
          required: true,
          gate: () => true,
          payloadSchema: {
            resolution: {
              kind: 'text',
              label: 'Resolution',
              required: false,
            },
          },
        },
      ],
    },
    {
      id: 'closed',
      label: 'Closed',
      status: 'Closed',
      actions: [],
    },
  ],
  requiredRoles: [],
};
