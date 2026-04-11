import { describe, expect, it } from 'vitest';
import { awaitingMyAction } from './discovery';
import type { Issue } from '../../types';
import type { WorkflowInstance } from './types';
import { getDefinition } from './registry';

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

describe('awaitingMyAction', () => {
  describe('no workflow', () => {
    it('returns false when issue has no workflow', () => {
      const issue = makeIssue();
      expect(awaitingMyAction(issue, { id: 'user-tanaka' }, getDefinition)).toBe(false);
    });
  });

  describe('terminal workflow', () => {
    it('returns false when workflow is completed', () => {
      const instance = makeInstance({ completedAt: '2025-01-15T12:00:00Z' });
      const issue = makeIssue(instance);
      expect(awaitingMyAction(issue, { id: 'user-tanaka' }, getDefinition)).toBe(false);
    });
  });

  describe('chart_owner_comment ongoing — no gate, anyone can act', () => {
    it('returns true for any user since chart_owner_comment has no gate', () => {
      const instance = makeInstance();
      const issue = makeIssue(instance);
      expect(awaitingMyAction(issue, { id: 'user-tanaka' }, getDefinition)).toBe(true);
      expect(awaitingMyAction(issue, { id: 'user-nobody' }, getDefinition)).toBe(true);
    });
  });

  describe('resolved ongoing — owner-only gate', () => {
    it('returns true for owner', () => {
      const instance = makeInstance({
        stepStates: {
          chart_owner_comment: { status: 'completed', completedAt: '2025-01-15T12:00:00Z', completedBy: 'user-tanaka' },
          resolved: { status: 'ongoing' },
          closed: { status: 'pending' },
        },
      });
      const issue = makeIssue(instance);
      expect(awaitingMyAction(issue, { id: 'user-tanaka' }, getDefinition)).toBe(true);
    });

    it('returns false for non-owner', () => {
      const instance = makeInstance({
        stepStates: {
          chart_owner_comment: { status: 'completed', completedAt: '2025-01-15T12:00:00Z', completedBy: 'user-tanaka' },
          resolved: { status: 'ongoing' },
          closed: { status: 'pending' },
        },
      });
      const issue = makeIssue(instance);
      expect(awaitingMyAction(issue, { id: 'user-other' }, getDefinition)).toBe(false);
    });
  });
});
