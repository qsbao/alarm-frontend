import type { WorkflowDefinition } from '../types';

/**
 * SPC OOC branching workflow with parallel L5/L4 and PI tracks.
 *
 * DAG:
 *   chart_owner_comment
 *     ├── l5_review → l4_review ──────────┐
 *     ├── pi_comment ─────────────────────┤
 *     ├── attach_report ──────────────────┼── meeting → resolved → closed
 *     └── verify_calibration ─────────────┘
 */
export const spcOocBranchingDefinition: WorkflowDefinition = {
  id: 'spc_ooc_branching_v1',
  name: 'SPC OOC Branching',
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
      id: 'l5_review',
      label: 'L5 Review',
      order: 2,
      preSteps: ['chart_owner_comment'],
    },
    {
      id: 'l4_review',
      label: 'L4 Review',
      order: 3,
      preSteps: ['l5_review'],
    },
    {
      id: 'pi_comment',
      label: 'PI Comment',
      order: 4,
      preSteps: ['chart_owner_comment'],
    },
    {
      id: 'attach_report',
      label: 'Attach Investigation Report',
      order: 5,
      preSteps: ['chart_owner_comment'],
      skippableIf: () => true,
      payloadSchema: {
        reportId: {
          kind: 'report-reference',
          label: 'Report ID',
          required: false,
        },
      },
    },
    {
      id: 'verify_calibration',
      label: 'Verify Equipment Calibration',
      order: 6,
      preSteps: ['chart_owner_comment'],
      skippableIf: () => true,
      payloadSchema: {
        calibrationId: {
          kind: 'calibration-reference',
          label: 'Calibration ID',
          required: false,
        },
      },
    },
    {
      id: 'meeting',
      label: 'Meeting',
      order: 7,
      preSteps: ['l4_review', 'pi_comment', 'attach_report', 'verify_calibration'],
      skippableIf: (issue) => issue.riskLevel === 'Low',
    },
    {
      id: 'resolved',
      label: 'Resolved',
      order: 8,
      preSteps: ['meeting'],
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
      order: 9,
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
