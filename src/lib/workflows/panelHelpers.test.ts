import { describe, expect, it } from 'vitest';
import { getStepDisplayList, canUserActOnStep } from './panelHelpers';
import { genericLinearDefinition } from './definitions/genericLinear';
import type { Issue } from '../../types';
import type { WorkflowInstance } from './types';

function makeInstance(overrides: Partial<WorkflowInstance> = {}): WorkflowInstance {
  return {
    definitionId: 'generic_linear_v1',
    stepStates: {
      chart_owner_comment: { status: 'ongoing' },
      resolved: { status: 'pending' },
      closed: { status: 'pending' },
    },
    actors: [],
    ...overrides,
  };
}

function makeIssue(overrides: Partial<Issue> = {}): Issue {
  return {
    id: 'iss-001',
    title: 'Test',
    date: '2025-01-15T10:00:00Z',
    alarmType: 'TempSpike',
    riskLevel: 'High',
    status: 'Investigating',
    issueTime: '2025-01-15T09:55:00Z',
    operation: 'Lithography',
    product: 'A7-Litho',
    ownerId: 'user-tanaka',
    department: 'Litho',
    description: 'Test',
    relatedAlarmIds: [],
    activity: [],
    ...overrides,
  };
}

describe('getStepDisplayList', () => {
  it('returns steps sorted: completed first, ongoing middle, pending last', () => {
    const instance = makeInstance({
      stepStates: {
        chart_owner_comment: { status: 'completed', completedAt: 'ts', completedBy: 'u' },
        resolved: { status: 'ongoing' },
        closed: { status: 'pending' },
      },
    });
    const list = getStepDisplayList(genericLinearDefinition, instance);

    expect(list[0].status).toBe('completed');
    expect(list[0].step.id).toBe('chart_owner_comment');
    expect(list[1].status).toBe('ongoing');
    expect(list[1].step.id).toBe('resolved');
    expect(list[2].status).toBe('pending');
    expect(list[2].step.id).toBe('closed');
  });

  it('populates waitingOnLabels for pending steps', () => {
    const instance = makeInstance();
    const list = getStepDisplayList(genericLinearDefinition, instance);

    const resolvedItem = list.find((i) => i.step.id === 'resolved');
    expect(resolvedItem?.waitingOnLabels).toEqual(['Chart Owner Comment']);

    const closedItem = list.find((i) => i.step.id === 'closed');
    expect(closedItem?.waitingOnLabels).toEqual(['Resolved']);
  });

  it('returns empty waitingOnLabels for ongoing steps', () => {
    const instance = makeInstance();
    const list = getStepDisplayList(genericLinearDefinition, instance);

    const ongoingItem = list.find((i) => i.step.id === 'chart_owner_comment');
    expect(ongoingItem?.waitingOnLabels).toEqual([]);
  });
});

describe('canUserActOnStep', () => {
  it('returns true for ongoing step with no gate', () => {
    const instance = makeInstance();
    const issue = makeIssue();
    const step = genericLinearDefinition.steps[0]; // chart_owner_comment, no gate
    expect(canUserActOnStep(step, instance, issue, 'anyone')).toBe(true);
  });

  it('returns true for ongoing step when user passes gate', () => {
    const instance = makeInstance({
      stepStates: {
        chart_owner_comment: { status: 'completed', completedAt: 'ts', completedBy: 'u' },
        resolved: { status: 'ongoing' },
        closed: { status: 'pending' },
      },
    });
    const issue = makeIssue({ ownerId: 'user-tanaka' });
    const step = genericLinearDefinition.steps[1]; // resolved, owner-only
    expect(canUserActOnStep(step, instance, issue, 'user-tanaka')).toBe(true);
  });

  it('returns false for ongoing step when user does not pass gate', () => {
    const instance = makeInstance({
      stepStates: {
        chart_owner_comment: { status: 'completed', completedAt: 'ts', completedBy: 'u' },
        resolved: { status: 'ongoing' },
        closed: { status: 'pending' },
      },
    });
    const issue = makeIssue({ ownerId: 'user-tanaka' });
    const step = genericLinearDefinition.steps[1]; // resolved, owner-only
    expect(canUserActOnStep(step, instance, issue, 'user-other')).toBe(false);
  });

  it('returns false for pending step', () => {
    const instance = makeInstance();
    const issue = makeIssue();
    const step = genericLinearDefinition.steps[1]; // resolved, pending
    expect(canUserActOnStep(step, instance, issue, 'user-tanaka')).toBe(false);
  });
});
