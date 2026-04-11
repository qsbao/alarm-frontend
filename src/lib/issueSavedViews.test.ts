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

  it('returns true for issue with ongoing step the user can act on', () => {
    const issue = makeIssue(makeInstance());
    // chart_owner_comment has no gate, so any user can act
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

  it('returns true for owner when resolved is ongoing', () => {
    const instance = makeInstance({
      stepStates: {
        chart_owner_comment: { status: 'completed', completedAt: '2025-01-15T12:00:00Z', completedBy: 'user-tanaka' },
        resolved: { status: 'ongoing' },
        closed: { status: 'pending' },
      },
    });
    const issue = makeIssue(instance);
    expect(view.predicate(issue, user, getDefinition)).toBe(true);
  });

  it('returns false for non-owner when resolved is ongoing', () => {
    const instance = makeInstance({
      stepStates: {
        chart_owner_comment: { status: 'completed', completedAt: '2025-01-15T12:00:00Z', completedBy: 'user-tanaka' },
        resolved: { status: 'ongoing' },
        closed: { status: 'pending' },
      },
    });
    const issue = makeIssue(instance);
    const otherUser = { id: 'user-other', name: 'Other', department: 'Litho' };
    expect(view.predicate(issue, otherUser, getDefinition)).toBe(false);
  });
});
