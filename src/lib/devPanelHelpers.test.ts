import { describe, expect, it } from 'vitest';
import { buildSyntheticPayload, findNextAdvanceAction, findSendbackAction } from './devPanelHelpers';
import { spcOocDefinition } from './workflows/definitions/spcOoc';
import type { Issue } from '../types';
import type { WorkflowInstance } from './workflows/types';

function makeIssue(overrides: Partial<Issue> = {}): Issue {
  return {
    id: 'iss-001',
    title: 'SPC OOC on LITHO-07',
    date: '2025-01-15T10:00:00Z',
    alarmType: 'TempSpike',
    riskLevel: 'High',
    status: 'Investigating',
    issueTime: '2025-01-15T09:55:00Z',
    operation: 'Lithography',
    product: 'A7-Litho',
    ownerId: 'user-tanaka',
    department: 'Litho',
    description: 'SPC OOC',
    relatedAlarmIds: ['alm-001'],
    activity: [],
    ...overrides,
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
  it('returns the chart_owner_comment action at P1', () => {
    const issue = makeIssue();
    const instance = makeInstance();
    const result = findNextAdvanceAction(issue, spcOocDefinition, instance);

    expect(result).toBeDefined();
    expect(result!.action.id).toBe('chart_owner_comment');
    expect(result!.actorId).toBe('user-tanaka');
    expect(result!.payload.ooc_reason_type).toBe('Tool');
    expect(result!.payload.comment).toBe('[Dev panel auto-fill for comment]');
  });

  it('returns pi_comment at P2 when both required actions are pending', () => {
    const issue = makeIssue();
    const instance = makeInstance({ currentPhaseId: 'p2_pi_l5_review' });
    const result = findNextAdvanceAction(issue, spcOocDefinition, instance);

    expect(result).toBeDefined();
    expect(result!.action.id).toBe('pi_comment');
    expect(result!.actorId).toBe('user-pi');
  });

  it('returns l5_approve at P2 when pi_comment is already done', () => {
    const issue = makeIssue();
    const instance = makeInstance({
      currentPhaseId: 'p2_pi_l5_review',
      completedActions: {
        p2_pi_l5_review: [
          {
            id: 'r1',
            actionId: 'pi_comment',
            phaseId: 'p2_pi_l5_review',
            actorId: 'user-pi',
            timestamp: '2025-01-15T12:00:00Z',
            payload: { comment: 'test' },
          },
        ],
      },
    });
    const result = findNextAdvanceAction(issue, spcOocDefinition, instance);

    expect(result).toBeDefined();
    expect(result!.action.id).toBe('l5_approve');
    expect(result!.actorId).toBe('user-l5');
  });

  it('returns l4_approve at P3', () => {
    const issue = makeIssue();
    const instance = makeInstance({ currentPhaseId: 'p3_l4_approval' });
    const result = findNextAdvanceAction(issue, spcOocDefinition, instance);

    expect(result).toBeDefined();
    expect(result!.action.id).toBe('l4_approve');
    expect(result!.actorId).toBe('user-l4');
  });

  it('returns undefined for a completed workflow', () => {
    const issue = makeIssue();
    const instance = makeInstance({ completedAt: '2025-01-15T12:00:00Z' });
    const result = findNextAdvanceAction(issue, spcOocDefinition, instance);

    expect(result).toBeUndefined();
  });

  it('returns undefined when all required actions in the current phase are done', () => {
    const issue = makeIssue();
    const instance = makeInstance({
      currentPhaseId: 'p2_pi_l5_review',
      completedActions: {
        p2_pi_l5_review: [
          { id: 'r1', actionId: 'pi_comment', phaseId: 'p2_pi_l5_review', actorId: 'user-pi', timestamp: '2025-01-15T12:00:00Z', payload: {} },
          { id: 'r2', actionId: 'l5_approve', phaseId: 'p2_pi_l5_review', actorId: 'user-l5', timestamp: '2025-01-15T12:00:00Z', payload: {} },
        ],
      },
    });
    const result = findNextAdvanceAction(issue, spcOocDefinition, instance);
    // All required actions in P2 are done; the engine would have advanced the phase,
    // but in this test the phase wasn't advanced — still, no required action is left.
    expect(result).toBeUndefined();
  });
});

describe('findSendbackAction', () => {
  it('returns undefined at P1 (no sendsBackTo actions in P1)', () => {
    const issue = makeIssue();
    const instance = makeInstance();
    const result = findSendbackAction(issue, spcOocDefinition, instance);

    expect(result).toBeUndefined();
  });

  it('returns l5_request_info at P2', () => {
    const issue = makeIssue();
    const instance = makeInstance({ currentPhaseId: 'p2_pi_l5_review' });
    const result = findSendbackAction(issue, spcOocDefinition, instance);

    expect(result).toBeDefined();
    expect(result!.action.id).toBe('l5_request_info');
    expect(result!.actorId).toBe('user-l5');
    expect(result!.payload.reason).toBe('[Dev panel auto-fill for reason]');
  });

  it('returns l4_request_info at P3', () => {
    const issue = makeIssue();
    const instance = makeInstance({ currentPhaseId: 'p3_l4_approval' });
    const result = findSendbackAction(issue, spcOocDefinition, instance);

    expect(result).toBeDefined();
    expect(result!.action.id).toBe('l4_request_info');
    expect(result!.actorId).toBe('user-l4');
  });

  it('returns undefined for a completed workflow', () => {
    const issue = makeIssue();
    const instance = makeInstance({
      currentPhaseId: 'p3_l4_approval',
      completedAt: '2025-01-15T12:00:00Z',
    });
    const result = findSendbackAction(issue, spcOocDefinition, instance);

    expect(result).toBeUndefined();
  });
});
