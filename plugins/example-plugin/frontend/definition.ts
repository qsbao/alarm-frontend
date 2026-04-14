import type { WorkflowDefinition } from '../../../frontend/src/lib/workflows/types';

/**
 * Example linear workflow from a plugin.
 * Demonstrates plugin workflow definition.
 */
export const exampleLinearDefinition: WorkflowDefinition = {
  id: 'example_linear_v1',
  name: 'Example Linear (Plugin)',
  version: '1',
  steps: [
    {
      id: 'start',
      label: 'Start',
      order: 1,
      preSteps: [],
      impliesStatus: 'Investigating',
    },
    {
      id: 'analyze',
      label: 'Analyze',
      order: 2,
      preSteps: ['start'],
      payloadSchema: {
        analysis: {
          kind: 'text',
          label: 'Analysis',
          required: true,
          minLength: 5,
        },
      },
      impliesStatus: 'Investigating',
    },
    {
      id: 'resolve',
      label: 'Resolve',
      order: 3,
      preSteps: ['analyze'],
      gate: ({ user, issue }) => user.id === issue.ownerId,
      payloadSchema: {
        resolution: {
          kind: 'text',
          label: 'Resolution',
          required: true,
        },
      },
      impliesStatus: 'Resolved',
    },
  ],
  requiredRoles: [],
};
