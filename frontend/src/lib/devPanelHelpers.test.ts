import { describe, expect, it } from 'vitest';
import { buildSyntheticPayload, findNextAdvanceAction } from './devPanelHelpers';
import { genericLinearDefinition } from './workflows/definitions/genericLinear';
import type { Issue } from '../types';
import type { WorkflowInstance } from './workflows/types';

function makeIssue(overrides: Partial<Issue> = {}): Issue {
  return {
    id: 'iss-001',
    title: 'Test issue',
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
    activity: [],
    ...overrides,
  };
}

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

describe('buildSyntheticPayload', () => {
  it('fills enum fields with the first option', () => {
    const schema = {
      reason_type: {
        kind: 'enum' as const,
        label: 'Reason',
        required: true,
        options: ['Tool', 'Material', 'Process'],
      },
    };
    const payload = buildSyntheticPayload(schema);
    expect(payload.reason_type).toBe('Tool');
  });

  it('fills text fields with a placeholder string', () => {
    const schema = {
      comment: { kind: 'text' as const, label: 'Comment', required: true, minLength: 1 },
    };
    const payload = buildSyntheticPayload(schema);
    expect(payload.comment).toBe('[Dev panel auto-fill for comment]');
  });

  it('skips optional fields', () => {
    const schema = {
      comment: { kind: 'text' as const, label: 'Comment', required: false },
    };
    const payload = buildSyntheticPayload(schema);
    expect(payload.comment).toBeUndefined();
  });

  it('handles mixed required and optional fields', () => {
    const schema = {
      ooc_reason_type: {
        kind: 'enum' as const,
        label: 'Reason',
        required: true,
        options: ['Tool', 'Material'],
      },
      comment: { kind: 'text' as const, label: 'Comment', required: true, minLength: 1 },
      notes: { kind: 'text' as const, label: 'Notes', required: false },
    };
    const payload = buildSyntheticPayload(schema);
    expect(Object.keys(payload)).toEqual(['ooc_reason_type', 'comment']);
  });
});

describe('findNextAdvanceAction', () => {
  it('returns chart_owner_comment step when it is ongoing', () => {
    const issue = makeIssue();
    const instance = makeInstance();
    const result = findNextAdvanceAction(issue, genericLinearDefinition, instance);

    expect(result).toBeDefined();
    expect(result!.step.id).toBe('chart_owner_comment');
    // chart_owner_comment has no gate, uses issue.ownerId
    expect(result!.actorId).toBe('user-tanaka');
  });

  it('returns resolved step when it is ongoing', () => {
    const issue = makeIssue();
    const instance = makeInstance({
      stepStates: {
        chart_owner_comment: { status: 'completed', completedAt: 'ts', completedBy: 'u' },
        resolved: { status: 'ongoing' },
        closed: { status: 'pending' },
      },
    });
    const result = findNextAdvanceAction(issue, genericLinearDefinition, instance);

    expect(result).toBeDefined();
    expect(result!.step.id).toBe('resolved');
    expect(result!.actorId).toBe('user-tanaka');
  });

  it('returns undefined for a completed workflow', () => {
    const issue = makeIssue();
    const instance = makeInstance({ completedAt: '2025-01-15T12:00:00Z' });
    const result = findNextAdvanceAction(issue, genericLinearDefinition, instance);

    expect(result).toBeUndefined();
  });
});
