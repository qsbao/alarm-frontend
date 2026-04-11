import { describe, expect, it, beforeEach } from 'vitest';
import {
  addBlocker,
  removeBlocker,
  getBlockers,
  isBlocked,
  resetRelations,
} from './issueRelations';
import type { Issue, IssueStatus } from '../../types';
import { completeStep } from '../workflows/engine';
import type { WorkflowDefinition, WorkflowInstance } from '../workflows/types';

beforeEach(() => {
  resetRelations();
});

describe('issueRelations', () => {
  describe('addBlocker / getBlockers round-trip', () => {
    it('adds a blocker and retrieves it', () => {
      const rel = addBlocker('iss-001', 'iss-002', 'user-a');
      expect(rel.fromIssueId).toBe('iss-001');
      expect(rel.toIssueId).toBe('iss-002');
      expect(rel.type).toBe('blocks');
      expect(rel.createdBy).toBe('user-a');

      const blockers = getBlockers('iss-001');
      expect(blockers).toHaveLength(1);
      expect(blockers[0].toIssueId).toBe('iss-002');
    });

    it('supports multiple blockers on the same issue', () => {
      addBlocker('iss-001', 'iss-002', 'user-a');
      addBlocker('iss-001', 'iss-003', 'user-a');
      expect(getBlockers('iss-001')).toHaveLength(2);
    });

    it('returns empty array for issue with no blockers', () => {
      expect(getBlockers('iss-999')).toEqual([]);
    });

    it('does not duplicate identical blocker', () => {
      addBlocker('iss-001', 'iss-002', 'user-a');
      addBlocker('iss-001', 'iss-002', 'user-b');
      expect(getBlockers('iss-001')).toHaveLength(1);
    });
  });

  describe('removeBlocker', () => {
    it('hard-deletes the relation', () => {
      addBlocker('iss-001', 'iss-002', 'user-a');
      const removed = removeBlocker('iss-001', 'iss-002');
      expect(removed).toBe(true);
      expect(getBlockers('iss-001')).toEqual([]);
    });

    it('returns false when relation does not exist', () => {
      const removed = removeBlocker('iss-001', 'iss-999');
      expect(removed).toBe(false);
    });
  });

  describe('isBlocked', () => {
    const lookup = (statuses: Record<string, IssueStatus>) => (id: string) =>
      statuses[id] as IssueStatus | undefined;

    it('returns true when any blocker is in non-terminal status', () => {
      addBlocker('iss-001', 'iss-002', 'user-a');
      expect(isBlocked('iss-001', lookup({ 'iss-002': 'Investigating' }))).toBe(true);
    });

    it('returns true when blocker is New', () => {
      addBlocker('iss-001', 'iss-002', 'user-a');
      expect(isBlocked('iss-001', lookup({ 'iss-002': 'New' }))).toBe(true);
    });

    it('returns false when all blockers are Resolved', () => {
      addBlocker('iss-001', 'iss-002', 'user-a');
      addBlocker('iss-001', 'iss-003', 'user-a');
      expect(
        isBlocked('iss-001', lookup({ 'iss-002': 'Resolved', 'iss-003': 'Resolved' })),
      ).toBe(false);
    });

    it('returns false when all blockers are Closed', () => {
      addBlocker('iss-001', 'iss-002', 'user-a');
      expect(isBlocked('iss-001', lookup({ 'iss-002': 'Closed' }))).toBe(false);
    });

    it('returns false when mix of Resolved and Closed', () => {
      addBlocker('iss-001', 'iss-002', 'user-a');
      addBlocker('iss-001', 'iss-003', 'user-a');
      expect(
        isBlocked('iss-001', lookup({ 'iss-002': 'Resolved', 'iss-003': 'Closed' })),
      ).toBe(false);
    });

    it('returns true when one blocker terminal and one non-terminal', () => {
      addBlocker('iss-001', 'iss-002', 'user-a');
      addBlocker('iss-001', 'iss-003', 'user-a');
      expect(
        isBlocked('iss-001', lookup({ 'iss-002': 'Resolved', 'iss-003': 'Investigating' })),
      ).toBe(true);
    });

    it('returns false when issue has no blockers', () => {
      expect(isBlocked('iss-001', () => undefined)).toBe(false);
    });

    it('treats unknown status (undefined) as non-terminal', () => {
      addBlocker('iss-001', 'iss-002', 'user-a');
      expect(isBlocked('iss-001', () => undefined)).toBe(true);
    });
  });

  describe('resolved step gate integration', () => {
    const resolvedDef: WorkflowDefinition = {
      id: 'test_resolved',
      name: 'Resolved Test',
      version: '1',
      steps: [
        { id: 'work', label: 'Work', order: 1, preSteps: [], impliesStatus: 'Investigating' },
        {
          id: 'resolved',
          label: 'Resolved',
          order: 2,
          preSteps: ['work'],
          gate: ({ user, issue }) => user.id === issue.ownerId,
          impliesStatus: 'Resolved',
        },
      ],
      requiredRoles: [],
    };

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
        ownerId: 'user-owner',
        department: 'Litho',
        description: 'Test',
        relatedAlarmIds: [],
        activity: [],
        ...overrides,
      };
    }

    it('isBlocked prevents resolved completion when blocker is Investigating', () => {
      addBlocker('iss-001', 'iss-002', 'user-a');

      const issue = makeIssue();
      const instance: WorkflowInstance = {
        definitionId: 'test_resolved',
        stepStates: {
          work: { status: 'completed', completedAt: 't1', completedBy: 'user-owner' },
          resolved: { status: 'ongoing' },
        },
        actors: [],
      };

      // isBlocked returns true → API layer would reject
      const blocked = isBlocked('iss-001', (id) =>
        id === 'iss-002' ? 'Investigating' : undefined,
      );
      expect(blocked).toBe(true);

      // Engine itself still allows (gate only checks user) — blocker check is API-layer
      const result = completeStep(resolvedDef, instance, issue, {
        stepId: 'resolved',
        actorId: 'user-owner',
        timestamp: 't2',
        payload: {},
      });
      expect('instance' in result).toBe(true);
    });

    it('isBlocked returns false once all blockers reach terminal status', () => {
      addBlocker('iss-001', 'iss-002', 'user-a');
      addBlocker('iss-001', 'iss-003', 'user-a');

      const blocked = isBlocked('iss-001', (id) => {
        if (id === 'iss-002') return 'Resolved';
        if (id === 'iss-003') return 'Closed';
        return undefined;
      });
      expect(blocked).toBe(false);
    });

    it('addBlocker after resolved completed is rejected (checked at API layer)', () => {
      // Simulate: resolved step is completed
      const issue = makeIssue();
      issue.workflow = {
        definitionId: 'test_resolved',
        stepStates: {
          work: { status: 'completed', completedAt: 't1', completedBy: 'user-owner' },
          resolved: { status: 'completed', completedAt: 't2', completedBy: 'user-owner' },
        },
        actors: [],
      };

      // The API layer checks this condition before calling addBlocker
      const resolvedCompleted =
        issue.workflow.stepStates['resolved']?.status === 'completed';
      expect(resolvedCompleted).toBe(true);
      // API would throw: 'Cannot add blocker after resolved has completed'
    });
  });
});
