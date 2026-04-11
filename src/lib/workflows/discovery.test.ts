import { describe, expect, it } from 'vitest';
import { awaitingMyAction } from './discovery';
import type { Issue } from '../../types';
import type { WorkflowInstance } from './types';
import { spcOocDefinition } from './definitions/spcOoc';
import { getDefinition } from './registry';

function makeIssue(workflow?: WorkflowInstance): Issue & { workflow?: WorkflowInstance } {
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

const ts = '2025-01-15T12:00:00Z';

describe('awaitingMyAction', () => {
  describe('no workflow', () => {
    it('returns false when issue has no workflow', () => {
      const issue = makeIssue();
      expect(awaitingMyAction(issue, { id: 'user-tanaka' }, getDefinition)).toBe(false);
    });
  });

  describe('terminal workflow', () => {
    it('returns false when workflow is completed', () => {
      const instance = makeInstance({ completedAt: ts });
      const issue = makeIssue(instance);
      expect(awaitingMyAction(issue, { id: 'user-tanaka' }, getDefinition)).toBe(false);
    });
  });

  describe('P1 fresh — chart_owner_comment pending', () => {
    const instance = makeInstance();
    const issue = makeIssue(instance);

    it('returns true for chart_owner', () => {
      expect(awaitingMyAction(issue, { id: 'user-tanaka' }, getDefinition)).toBe(true);
    });

    it('returns false for PI', () => {
      expect(awaitingMyAction(issue, { id: 'user-pi' }, getDefinition)).toBe(false);
    });

    it('returns false for L5', () => {
      expect(awaitingMyAction(issue, { id: 'user-l5' }, getDefinition)).toBe(false);
    });

    it('returns false for L4', () => {
      expect(awaitingMyAction(issue, { id: 'user-l4' }, getDefinition)).toBe(false);
    });

    it('returns false for unrelated user', () => {
      expect(awaitingMyAction(issue, { id: 'user-nobody' }, getDefinition)).toBe(false);
    });
  });

  describe('P1 done — auto-advanced to P2', () => {
    const instance = makeInstance({
      currentPhaseId: 'p2_pi_l5_review',
      completedActions: {
        p1_owner_input: [
          {
            id: 'r1',
            actionId: 'chart_owner_comment',
            phaseId: 'p1_owner_input',
            actorId: 'user-tanaka',
            timestamp: ts,
            payload: { ooc_reason_type: 'Tool', comment: 'test' },
          },
        ],
      },
    });
    const issue = makeIssue(instance);

    it('returns false for chart_owner', () => {
      expect(awaitingMyAction(issue, { id: 'user-tanaka' }, getDefinition)).toBe(false);
    });

    it('returns true for PI', () => {
      expect(awaitingMyAction(issue, { id: 'user-pi' }, getDefinition)).toBe(true);
    });

    it('returns true for L5', () => {
      expect(awaitingMyAction(issue, { id: 'user-l5' }, getDefinition)).toBe(true);
    });

    it('returns false for L4', () => {
      expect(awaitingMyAction(issue, { id: 'user-l4' }, getDefinition)).toBe(false);
    });

    it('returns false for unrelated user', () => {
      expect(awaitingMyAction(issue, { id: 'user-nobody' }, getDefinition)).toBe(false);
    });
  });

  describe('P2 partial — PI done, L5 pending', () => {
    const instance = makeInstance({
      currentPhaseId: 'p2_pi_l5_review',
      completedActions: {
        p1_owner_input: [
          {
            id: 'r1',
            actionId: 'chart_owner_comment',
            phaseId: 'p1_owner_input',
            actorId: 'user-tanaka',
            timestamp: ts,
            payload: {},
          },
        ],
        p2_pi_l5_review: [
          {
            id: 'r2',
            actionId: 'pi_comment',
            phaseId: 'p2_pi_l5_review',
            actorId: 'user-pi',
            timestamp: ts,
            payload: { comment: 'done' },
          },
        ],
      },
    });
    const issue = makeIssue(instance);

    it('returns false for PI (already done)', () => {
      expect(awaitingMyAction(issue, { id: 'user-pi' }, getDefinition)).toBe(false);
    });

    it('returns true for L5', () => {
      expect(awaitingMyAction(issue, { id: 'user-l5' }, getDefinition)).toBe(true);
    });

    it('returns false for L4', () => {
      expect(awaitingMyAction(issue, { id: 'user-l4' }, getDefinition)).toBe(false);
    });
  });

  describe('P2 done — auto-advanced to P3', () => {
    const instance = makeInstance({
      currentPhaseId: 'p3_l4_approval',
      completedActions: {
        p1_owner_input: [
          {
            id: 'r1',
            actionId: 'chart_owner_comment',
            phaseId: 'p1_owner_input',
            actorId: 'user-tanaka',
            timestamp: ts,
            payload: {},
          },
        ],
        p2_pi_l5_review: [
          {
            id: 'r2',
            actionId: 'pi_comment',
            phaseId: 'p2_pi_l5_review',
            actorId: 'user-pi',
            timestamp: ts,
            payload: {},
          },
          {
            id: 'r3',
            actionId: 'l5_approve',
            phaseId: 'p2_pi_l5_review',
            actorId: 'user-l5',
            timestamp: ts,
            payload: {},
          },
        ],
      },
    });
    const issue = makeIssue(instance);

    it('returns false for chart_owner', () => {
      expect(awaitingMyAction(issue, { id: 'user-tanaka' }, getDefinition)).toBe(false);
    });

    it('returns false for PI', () => {
      expect(awaitingMyAction(issue, { id: 'user-pi' }, getDefinition)).toBe(false);
    });

    it('returns false for L5', () => {
      expect(awaitingMyAction(issue, { id: 'user-l5' }, getDefinition)).toBe(false);
    });

    it('returns true for L4', () => {
      expect(awaitingMyAction(issue, { id: 'user-l4' }, getDefinition)).toBe(true);
    });

    it('returns false for unrelated user', () => {
      expect(awaitingMyAction(issue, { id: 'user-nobody' }, getDefinition)).toBe(false);
    });
  });

  describe('P3 — L4 pending', () => {
    const instance = makeInstance({ currentPhaseId: 'p3_l4_approval' });
    const issue = makeIssue(instance);

    it('returns true for L4', () => {
      expect(awaitingMyAction(issue, { id: 'user-l4' }, getDefinition)).toBe(true);
    });

    it('returns false for chart_owner', () => {
      expect(awaitingMyAction(issue, { id: 'user-tanaka' }, getDefinition)).toBe(false);
    });
  });
});
