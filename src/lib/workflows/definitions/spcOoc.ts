import type { WorkflowDefinition } from '../types';

export const spcOocDefinition: WorkflowDefinition = {
  id: 'spc_ooc_v1',
  name: 'SPC OOC Review',
  version: '1',
  phases: [
    {
      id: 'p1_owner_input',
      label: 'Owner Input',
      actions: [
        {
          id: 'chart_owner_comment',
          label: 'Chart Owner Comment',
          required: true,
          gate: ({ user, instance }) =>
            instance.actors.some((a) => a.role === 'chart_owner' && a.userId === user.id),
          payloadSchema: {
            ooc_reason_type: {
              kind: 'enum',
              label: 'OOC Reason Type',
              required: true,
              options: ['Tool', 'Material', 'Process', 'Measurement', 'Other'],
            },
            comment: {
              kind: 'text',
              label: 'Comment',
              required: true,
              minLength: 1,
            },
          },
        },
      ],
    },
    {
      id: 'p2_pi_l5_review',
      label: 'PI + L5 Review',
      actions: [
        {
          id: 'pi_comment',
          label: 'PI Comment',
          required: true,
          gate: ({ user, instance }) =>
            instance.actors.some((a) => a.role === 'pi_engineer' && a.userId === user.id),
          payloadSchema: {
            comment: {
              kind: 'text',
              label: 'Comment',
              required: true,
              minLength: 1,
            },
          },
        },
        {
          id: 'l5_approve',
          label: 'L5 Approve',
          required: true,
          gate: ({ user, instance }) =>
            instance.actors.some((a) => a.role === 'owner_l5_manager' && a.userId === user.id),
          payloadSchema: {
            comment: {
              kind: 'text',
              label: 'Comment',
              required: false,
            },
          },
        },
        {
          id: 'l5_request_info',
          label: 'L5 Request Info',
          required: false,
          sendsBackTo: 'p1_owner_input',
          gate: ({ user, instance }) =>
            instance.actors.some((a) => a.role === 'owner_l5_manager' && a.userId === user.id),
          payloadSchema: {
            reason: {
              kind: 'text',
              label: 'Reason',
              required: true,
              minLength: 1,
            },
          },
        },
      ],
    },
    {
      id: 'p3_l4_approval',
      label: 'L4 Approval',
      actions: [
        {
          id: 'l4_approve',
          label: 'L4 Approve',
          required: true,
          gate: ({ user, instance }) =>
            instance.actors.some((a) => a.role === 'owner_l4_manager' && a.userId === user.id),
          payloadSchema: {
            comment: {
              kind: 'text',
              label: 'Comment',
              required: false,
            },
          },
        },
        {
          id: 'l4_request_info',
          label: 'L4 Request Info',
          required: false,
          sendsBackTo: 'p1_owner_input',
          gate: ({ user, instance }) =>
            instance.actors.some((a) => a.role === 'owner_l4_manager' && a.userId === user.id),
          payloadSchema: {
            reason: {
              kind: 'text',
              label: 'Reason',
              required: true,
              minLength: 1,
            },
          },
        },
      ],
    },
  ],
  requiredRoles: [
    {
      role: 'chart_owner',
      resolve: (issue, mocks) => {
        const alarms = mocks.alarms as Array<{ id: string; chartOwnerId?: string }> | undefined;
        if (!alarms || !issue.relatedAlarmIds[0]) return undefined;
        const alarm = alarms.find((a) => a.id === issue.relatedAlarmIds[0]);
        return alarm?.chartOwnerId;
      },
    },
    {
      role: 'pi_engineer',
      resolve: (issue, mocks) => {
        const piByDept = mocks.piByDepartment as Record<string, string> | undefined;
        if (!piByDept) return undefined;
        return piByDept[issue.department];
      },
    },
    {
      role: 'owner_l5_manager',
      resolve: (issue, mocks) => {
        const chain = mocks.managerChain as Record<string, { l5: string; l4: string }> | undefined;
        if (!chain) return undefined;
        return chain[issue.owner]?.l5;
      },
    },
    {
      role: 'owner_l4_manager',
      resolve: (issue, mocks) => {
        const chain = mocks.managerChain as Record<string, { l5: string; l4: string }> | undefined;
        if (!chain) return undefined;
        return chain[issue.owner]?.l4;
      },
    },
  ],
};
