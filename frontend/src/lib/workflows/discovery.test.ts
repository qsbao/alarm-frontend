import { describe, expect, it } from 'vitest';
import { awaitingMyAction, getOngoingStepLabels } from './discovery';
import type { Issue } from '../../types';
import type { WorkflowInstance } from './types';
import { getDefinition } from './definitions';

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

describe('getOngoingStepLabels', () => {
  it('returns empty array when issue has no workflow', () => {
    const issue = makeIssue();
    expect(getOngoingStepLabels(issue, getDefinition)).toEqual([]);
  });

  it('returns empty array when workflow is completed', () => {
    const instance = makeInstance({ completedAt: '2025-01-15T12:00:00Z' });
    const issue = makeIssue(instance);
    expect(getOngoingStepLabels(issue, getDefinition)).toEqual([]);
  });

  it('returns label of single ongoing step (generic linear)', () => {
    const instance = makeInstance();
    const issue = makeIssue(instance);
    expect(getOngoingStepLabels(issue, getDefinition)).toEqual(['Chart Owner Comment']);
  });

  it('returns label of resolved step when ongoing', () => {
    const instance = makeInstance({
      stepStates: {
        chart_owner_comment: { status: 'completed', completedAt: '2025-01-15T12:00:00Z', completedBy: 'user-tanaka' },
        resolved: { status: 'ongoing' },
        closed: { status: 'pending' },
      },
    });
    const issue = makeIssue(instance);
    expect(getOngoingStepLabels(issue, getDefinition)).toEqual(['Resolved']);
  });

  it('returns multiple labels for parallel ongoing steps (SPC OOC)', () => {
    const instance: WorkflowInstance = {
      definitionId: 'spc_ooc_branching_v1',
      stepStates: {
        chart_owner_comment: { status: 'completed', completedAt: '2025-01-15T12:00:00Z', completedBy: 'user-tanaka' },
        l5_review: { status: 'ongoing' },
        l4_review: { status: 'pending' },
        pi_comment: { status: 'ongoing' },
        meeting: { status: 'pending' },
        resolved: { status: 'pending' },
        closed: { status: 'pending' },
      },
      actors: [],
    };
    const issue = makeIssue(instance);
    const labels = getOngoingStepLabels(issue, getDefinition);
    expect(labels).toEqual(['L5 Review', 'PI Comment']);
  });

  it('returns labels sorted by step order', () => {
    // pi_comment has order 4, l5_review has order 2 — should come out sorted
    const instance: WorkflowInstance = {
      definitionId: 'spc_ooc_branching_v1',
      stepStates: {
        chart_owner_comment: { status: 'completed', completedAt: '2025-01-15T12:00:00Z', completedBy: 'user-tanaka' },
        l5_review: { status: 'ongoing' },
        l4_review: { status: 'pending' },
        pi_comment: { status: 'ongoing' },
        meeting: { status: 'pending' },
        resolved: { status: 'pending' },
        closed: { status: 'pending' },
      },
      actors: [],
    };
    const issue = makeIssue(instance);
    const labels = getOngoingStepLabels(issue, getDefinition);
    // l5_review (order 2) before pi_comment (order 4)
    expect(labels[0]).toBe('L5 Review');
    expect(labels[1]).toBe('PI Comment');
  });

  it('returns empty array when definition not found', () => {
    const instance: WorkflowInstance = {
      definitionId: 'nonexistent_workflow',
      stepStates: { some_step: { status: 'ongoing' } },
      actors: [],
    };
    const issue = makeIssue(instance);
    expect(getOngoingStepLabels(issue, getDefinition)).toEqual([]);
  });

  it('returns empty array when all steps are completed or skipped', () => {
    const instance = makeInstance({
      stepStates: {
        chart_owner_comment: { status: 'completed', completedAt: '2025-01-15T12:00:00Z', completedBy: 'user-tanaka' },
        resolved: { status: 'completed', completedAt: '2025-01-15T13:00:00Z', completedBy: 'user-tanaka' },
        closed: { status: 'completed', completedAt: '2025-01-15T14:00:00Z', completedBy: 'user-tanaka' },
      },
      completedAt: '2025-01-15T14:00:00Z',
    });
    const issue = makeIssue(instance);
    expect(getOngoingStepLabels(issue, getDefinition)).toEqual([]);
  });

  it('does not evaluate gates (no per-row gate evaluation)', () => {
    // resolved has owner-only gate, but getOngoingStepLabels should NOT check it
    const instance = makeInstance({
      stepStates: {
        chart_owner_comment: { status: 'completed', completedAt: '2025-01-15T12:00:00Z', completedBy: 'user-tanaka' },
        resolved: { status: 'ongoing' },
        closed: { status: 'pending' },
      },
    });
    const issue = makeIssue(instance);
    // Should return 'Resolved' regardless — no user context needed
    expect(getOngoingStepLabels(issue, getDefinition)).toEqual(['Resolved']);
  });
});
