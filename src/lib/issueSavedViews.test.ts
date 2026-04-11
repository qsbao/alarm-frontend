import { describe, it, expect } from 'vitest';
import { ISSUE_BUILTIN_VIEWS, getIssueSavedViews } from './issueSavedViews';
import type { Issue } from '../types';
import type { WorkflowInstance } from './workflows/types';
import { getDefinition } from './workflows/registry';

function makeIssue(workflow?: WorkflowInstance): Issue {
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
    workflow,
  };
}

function makeInstance(overrides: Partial<WorkflowInstance> = {}): WorkflowInstance {
  return {
    definitionId: 'spc_ooc_v1',
    currentPhaseId: 'p1_owner_input',
    actors: [
      { userId: 'user-tanaka', role: 'chart_owner' },
      { userId: 'user-pi', role: 'pi_engineer' },
      { userId: 'user-l5', role: 'owner_l5_manager' },
      { userId: 'user-l4', role: 'owner_l4_manager' },
    ],
    completedActions: {},
    actionHistory: [],
    ...overrides,
  };
}

describe('ISSUE_BUILTIN_VIEWS', () => {
  it('has exactly one builtin view', () => {
    expect(ISSUE_BUILTIN_VIEWS).toHaveLength(1);
  });

  it('the builtin view is named "Awaiting my action"', () => {
    expect(ISSUE_BUILTIN_VIEWS[0].name).toBe('Awaiting my action');
  });

  it('is marked as builtin', () => {
    expect(ISSUE_BUILTIN_VIEWS[0].builtin).toBe(true);
  });
});

describe('getIssueSavedViews', () => {
  it('returns all builtin views', () => {
    const views = getIssueSavedViews();
    expect(views).toHaveLength(1);
    expect(views[0].name).toBe('Awaiting my action');
  });
});

describe('Awaiting my action predicate', () => {
  const view = ISSUE_BUILTIN_VIEWS[0];
  const user = { id: 'user-tanaka', name: 'Tanaka', department: 'Litho' };

  it('returns true for issue with workflow awaiting this user', () => {
    const issue = makeIssue(makeInstance());
    expect(view.predicate(issue, user, getDefinition)).toBe(true);
  });

  it('returns false for issue without workflow', () => {
    const issue = makeIssue();
    expect(view.predicate(issue, user, getDefinition)).toBe(false);
  });

  it('returns false for issue with completed workflow', () => {
    const issue = makeIssue(makeInstance({ completedAt: '2025-01-15T12:00:00Z' }));
    expect(view.predicate(issue, user, getDefinition)).toBe(false);
  });

  it('returns false for user not gated on current phase', () => {
    const issue = makeIssue(makeInstance());
    const otherUser = { id: 'user-pi', name: 'PI', department: 'Litho' };
    expect(view.predicate(issue, otherUser, getDefinition)).toBe(false);
  });

  it('returns true for PI when in P2', () => {
    const instance = makeInstance({
      currentPhaseId: 'p2_pi_l5_review',
      completedActions: {
        p1_owner_input: [
          {
            id: 'r1',
            actionId: 'chart_owner_comment',
            phaseId: 'p1_owner_input',
            actorId: 'user-tanaka',
            timestamp: '2025-01-15T12:00:00Z',
            payload: {},
          },
        ],
      },
    });
    const issue = makeIssue(instance);
    const piUser = { id: 'user-pi', name: 'PI', department: 'Litho' };
    expect(view.predicate(issue, piUser, getDefinition)).toBe(true);
  });
});
