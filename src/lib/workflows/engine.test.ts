import { describe, expect, it } from 'vitest';
import { applyAction, attachWorkflow } from './engine';
import { spcOocDefinition } from './definitions/spcOoc';
import type { Issue } from '../../types';
import type { WorkflowDefinition, WorkflowInstance } from './types';

/**
 * Minimal definition with mixed-status phases for tests that need to observe
 * status transitions across phases tagged differently. Three phases:
 *   p_new (New) → p_inv (Investigating) → p_done (Closed, zero actions)
 * `back_to_start` in p_inv sends back to p_new.
 */
const mixedStatusDefinition: WorkflowDefinition = {
  id: 'test_mixed',
  name: 'Mixed Status Test',
  version: '1',
  phases: [
    {
      id: 'p_new',
      label: 'Triage',
      status: 'New',
      actions: [
        {
          id: 'start',
          label: 'Start',
          required: true,
          gate: () => true,
          payloadSchema: {},
        },
      ],
    },
    {
      id: 'p_inv',
      label: 'Investigation',
      status: 'Investigating',
      actions: [
        {
          id: 'finish',
          label: 'Finish',
          required: true,
          gate: () => true,
          payloadSchema: {},
        },
        {
          id: 'back_to_start',
          label: 'Back',
          required: false,
          sendsBackTo: 'p_new',
          gate: () => true,
          payloadSchema: {},
        },
      ],
    },
    {
      id: 'p_done',
      label: 'Done',
      status: 'Closed',
      actions: [],
    },
  ],
  requiredRoles: [],
};

function makeIssue(overrides: Partial<Issue> = {}): Issue {
  return {
    id: 'iss-001',
    title: 'SPC OOC on LITHO-07',
    date: '2025-01-15T10:00:00Z',
    alarmType: 'TempSpike',
    riskLevel: 'High',
    status: 'New',
    issueTime: '2025-01-15T09:55:00Z',
    operation: 'Lithography',
    product: 'A7-Litho',
    ownerId: 'user-tanaka',
    department: 'Litho',
    description: 'SPC chart out of control',
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

const ts = '2025-01-15T12:00:00Z';

describe('attachWorkflow', () => {
  it('creates a workflow instance from a definition', () => {
    const issue = makeIssue();
    const mocks = {
      alarms: [{ id: 'alm-001', chartOwnerId: 'user-tanaka' }],
      piByDepartment: { Litho: 'user-pi' },
      managerChain: { 'user-tanaka': { l5: 'user-l5', l4: 'user-l4' } },
    };

    const result = attachWorkflow(spcOocDefinition, issue, mocks, ts);
    expect('error' in result).toBe(false);
    if ('error' in result) return;

    expect(result.instance.definitionId).toBe('spc_ooc_v1');
    expect(result.instance.currentPhaseId).toBe('p1_owner_input');
    expect(result.instance.actors).toHaveLength(4);
    expect(result.instance.completedActions).toEqual({});
    expect(result.instance.actionHistory).toEqual([]);
    expect(result.instance.completedAt).toBeUndefined();
  });

  it('writes the initial phase status onto the returned issue', () => {
    // Pre-existing status is irrelevant — engine derives from phases[0]
    const issue = makeIssue({ status: 'Closed' });
    const mocks = {
      alarms: [{ id: 'alm-001', chartOwnerId: 'user-tanaka' }],
      piByDepartment: { Litho: 'user-pi' },
      managerChain: { 'user-tanaka': { l5: 'user-l5', l4: 'user-l4' } },
    };

    const result = attachWorkflow(spcOocDefinition, issue, mocks, ts);
    expect('error' in result).toBe(false);
    if ('error' in result) return;

    // P1 (p1_owner_input) is tagged Investigating
    expect(result.issue.status).toBe('Investigating');
  });

  it('returns error when a required role cannot be resolved', () => {
    const issue = makeIssue();
    const mocks = {
      alarms: [],
      piByDepartment: {},
      managerChain: {},
    };

    const result = attachWorkflow(spcOocDefinition, issue, mocks, ts);
    expect('error' in result).toBe(true);
  });
});

describe('applyAction', () => {
  describe('happy path through SPC OOC', () => {
    it('completes full workflow: P1 → P2 → P3 → terminal', () => {
      const issue = makeIssue();
      let instance = makeInstance();

      // P1: chart_owner_comment
      const r1 = applyAction(spcOocDefinition, instance, issue, {
        actionId: 'chart_owner_comment',
        actorId: 'user-tanaka',
        timestamp: ts,
        payload: { ooc_reason_type: 'Tool', comment: 'Drift detected' },
      });
      expect('error' in r1).toBe(false);
      if ('error' in r1) return;
      instance = r1.instance;
      expect(instance.currentPhaseId).toBe('p2_pi_l5_review');

      // P2: pi_comment
      const r2 = applyAction(spcOocDefinition, instance, issue, {
        actionId: 'pi_comment',
        actorId: 'user-pi',
        timestamp: ts,
        payload: { comment: 'Confirmed from PI side' },
      });
      expect('error' in r2).toBe(false);
      if ('error' in r2) return;
      instance = r2.instance;
      // Only one of two required actions done — should NOT advance
      expect(instance.currentPhaseId).toBe('p2_pi_l5_review');

      // P2: l5_approve
      const r3 = applyAction(spcOocDefinition, instance, issue, {
        actionId: 'l5_approve',
        actorId: 'user-l5',
        timestamp: ts,
        payload: { comment: 'Approved' },
      });
      expect('error' in r3).toBe(false);
      if ('error' in r3) return;
      instance = r3.instance;
      expect(instance.currentPhaseId).toBe('p3_l4_approval');

      // P3: l4_approve
      const r4 = applyAction(spcOocDefinition, instance, issue, {
        actionId: 'l4_approve',
        actorId: 'user-l4',
        timestamp: ts,
        payload: {},
      });
      expect('error' in r4).toBe(false);
      if ('error' in r4) return;
      instance = r4.instance;
      expect(instance.completedAt).toBe(ts);
    });
  });

  describe('parallel correctness in phase 2', () => {
    it('firing one required action does not advance phase', () => {
      const issue = makeIssue();
      let instance = makeInstance({ currentPhaseId: 'p2_pi_l5_review' });

      const r1 = applyAction(spcOocDefinition, instance, issue, {
        actionId: 'pi_comment',
        actorId: 'user-pi',
        timestamp: ts,
        payload: { comment: 'PI input' },
      });
      expect('error' in r1).toBe(false);
      if ('error' in r1) return;
      instance = r1.instance;
      expect(instance.currentPhaseId).toBe('p2_pi_l5_review');
    });

    it('firing both required actions advances phase', () => {
      const issue = makeIssue();
      let instance = makeInstance({ currentPhaseId: 'p2_pi_l5_review' });

      const r1 = applyAction(spcOocDefinition, instance, issue, {
        actionId: 'l5_approve',
        actorId: 'user-l5',
        timestamp: ts,
        payload: {},
      });
      expect('error' in r1).toBe(false);
      if ('error' in r1) return;
      instance = r1.instance;

      const r2 = applyAction(spcOocDefinition, instance, issue, {
        actionId: 'pi_comment',
        actorId: 'user-pi',
        timestamp: ts,
        payload: { comment: 'PI input' },
      });
      expect('error' in r2).toBe(false);
      if ('error' in r2) return;
      instance = r2.instance;
      expect(instance.currentPhaseId).toBe('p3_l4_approval');
    });
  });

  describe('send-back loop', () => {
    it('resets currentPhaseId to target, clears completedActions from target forward, preserves history', () => {
      const issue = makeIssue();
      let instance = makeInstance({ currentPhaseId: 'p2_pi_l5_review' });

      // Complete pi_comment first
      const r1 = applyAction(spcOocDefinition, instance, issue, {
        actionId: 'pi_comment',
        actorId: 'user-pi',
        timestamp: ts,
        payload: { comment: 'PI input' },
      });
      expect('error' in r1).toBe(false);
      if ('error' in r1) return;
      instance = r1.instance;

      // L5 sends back to P1
      const r2 = applyAction(spcOocDefinition, instance, issue, {
        actionId: 'l5_request_info',
        actorId: 'user-l5',
        timestamp: ts,
        payload: { reason: 'Need more detail' },
      });
      expect('error' in r2).toBe(false);
      if ('error' in r2) return;
      instance = r2.instance;

      expect(instance.currentPhaseId).toBe('p1_owner_input');
      // completedActions from p1 forward should be cleared
      expect(instance.completedActions['p1_owner_input'] ?? []).toEqual([]);
      expect(instance.completedActions['p2_pi_l5_review'] ?? []).toEqual([]);
      // History should preserve all records (pi_comment + l5_request_info)
      expect(instance.actionHistory).toHaveLength(2);
    });
  });

  describe('gate denial', () => {
    it('returns error when user does not pass gate', () => {
      const issue = makeIssue();
      const instance = makeInstance();

      const result = applyAction(spcOocDefinition, instance, issue, {
        actionId: 'chart_owner_comment',
        actorId: 'user-wrong',
        timestamp: ts,
        payload: { ooc_reason_type: 'Tool', comment: 'test' },
      });
      expect('error' in result).toBe(true);
      if ('error' in result) {
        expect(result.error).toContain('gate');
      }
    });
  });

  describe('payload validation', () => {
    it('returns error when required enum field is missing', () => {
      const issue = makeIssue();
      const instance = makeInstance();

      const result = applyAction(spcOocDefinition, instance, issue, {
        actionId: 'chart_owner_comment',
        actorId: 'user-tanaka',
        timestamp: ts,
        payload: { comment: 'test' },
      });
      expect('error' in result).toBe(true);
    });

    it('returns error when required text field is missing', () => {
      const issue = makeIssue();
      const instance = makeInstance();

      const result = applyAction(spcOocDefinition, instance, issue, {
        actionId: 'chart_owner_comment',
        actorId: 'user-tanaka',
        timestamp: ts,
        payload: { ooc_reason_type: 'Tool' },
      });
      expect('error' in result).toBe(true);
    });

    it('returns error for invalid enum value', () => {
      const issue = makeIssue();
      const instance = makeInstance();

      const result = applyAction(spcOocDefinition, instance, issue, {
        actionId: 'chart_owner_comment',
        actorId: 'user-tanaka',
        timestamp: ts,
        payload: { ooc_reason_type: 'InvalidValue', comment: 'test' },
      });
      expect('error' in result).toBe(true);
    });

    it('accepts optional fields when omitted', () => {
      const issue = makeIssue();
      const instance = makeInstance({ currentPhaseId: 'p3_l4_approval' });

      const result = applyAction(spcOocDefinition, instance, issue, {
        actionId: 'l4_approve',
        actorId: 'user-l4',
        timestamp: ts,
        payload: {},
      });
      expect('error' in result).toBe(false);
    });
  });

  describe('terminal detection', () => {
    it('sets completedAt when last required action of last phase completes', () => {
      const issue = makeIssue();
      const instance = makeInstance({ currentPhaseId: 'p3_l4_approval' });

      const result = applyAction(spcOocDefinition, instance, issue, {
        actionId: 'l4_approve',
        actorId: 'user-l4',
        timestamp: ts,
        payload: {},
      });
      expect('error' in result).toBe(false);
      if ('error' in result) return;
      expect(result.instance.completedAt).toBe(ts);
    });

    it('does not set completedAt when non-terminal action completes', () => {
      const issue = makeIssue();
      const instance = makeInstance();

      const result = applyAction(spcOocDefinition, instance, issue, {
        actionId: 'chart_owner_comment',
        actorId: 'user-tanaka',
        timestamp: ts,
        payload: { ooc_reason_type: 'Tool', comment: 'test' },
      });
      expect('error' in result).toBe(false);
      if ('error' in result) return;
      expect(result.instance.completedAt).toBeUndefined();
    });
  });

  describe('auto-advance timing', () => {
    it('advances phase exactly when all required actions complete', () => {
      const issue = makeIssue();
      const instance = makeInstance();

      // Phase 1 has one required action; completing it should advance
      const result = applyAction(spcOocDefinition, instance, issue, {
        actionId: 'chart_owner_comment',
        actorId: 'user-tanaka',
        timestamp: ts,
        payload: { ooc_reason_type: 'Tool', comment: 'test' },
      });
      expect('error' in result).toBe(false);
      if ('error' in result) return;
      expect(result.instance.currentPhaseId).toBe('p2_pi_l5_review');
    });
  });

  describe('activity entry', () => {
    it('returns a well-formed activity entry', () => {
      const issue = makeIssue();
      const instance = makeInstance();

      const result = applyAction(spcOocDefinition, instance, issue, {
        actionId: 'chart_owner_comment',
        actorId: 'user-tanaka',
        timestamp: ts,
        payload: { ooc_reason_type: 'Tool', comment: 'test' },
      });
      expect('error' in result).toBe(false);
      if ('error' in result) return;

      expect(result.activityEntry.definitionId).toBe('spc_ooc_v1');
      expect(result.activityEntry.phaseId).toBe('p1_owner_input');
      expect(result.activityEntry.actionId).toBe('chart_owner_comment');
      expect(result.activityEntry.actorId).toBe('user-tanaka');
      expect(result.activityEntry.fromPhaseId).toBe('p1_owner_input');
      expect(result.activityEntry.toPhaseId).toBe('p2_pi_l5_review');
      expect(result.activityEntry.timestamp).toBe(ts);
    });
  });

  describe('action in wrong phase', () => {
    it('returns error when action does not belong to current phase', () => {
      const issue = makeIssue();
      const instance = makeInstance(); // currentPhaseId = p1

      const result = applyAction(spcOocDefinition, instance, issue, {
        actionId: 'l5_approve',
        actorId: 'user-l5',
        timestamp: ts,
        payload: {},
      });
      expect('error' in result).toBe(true);
    });
  });

  describe('issue.status derivation', () => {
    it('writes the new phase status onto the returned issue when an action advances the phase', () => {
      const issue = makeIssue({ status: 'New' });
      const instance = makeInstance();

      const result = applyAction(spcOocDefinition, instance, issue, {
        actionId: 'chart_owner_comment',
        actorId: 'user-tanaka',
        timestamp: ts,
        payload: { ooc_reason_type: 'Tool', comment: 'test' },
      });
      expect('error' in result).toBe(false);
      if ('error' in result) return;

      // P1 → P2; P2 is tagged Investigating
      expect(result.issue.status).toBe('Investigating');
    });

    it('leaves issue.status unchanged when an action completes within a phase without advancing', () => {
      // Pre-existing status matches current phase tag (Investigating).
      // Phase 2 has two required actions; firing one alone should not advance.
      const issue = makeIssue({ status: 'Investigating' });
      const instance = makeInstance({ currentPhaseId: 'p2_pi_l5_review' });

      const result = applyAction(spcOocDefinition, instance, issue, {
        actionId: 'pi_comment',
        actorId: 'user-pi',
        timestamp: ts,
        payload: { comment: 'PI input' },
      });
      expect('error' in result).toBe(false);
      if ('error' in result) return;

      expect(result.instance.currentPhaseId).toBe('p2_pi_l5_review');
      expect(result.issue.status).toBe('Investigating');
    });

    it('auto-advances into a zero-action terminal phase, sets completedAt, writes terminal status', () => {
      const issue = makeIssue({ status: 'New' });
      const instance: WorkflowInstance = {
        definitionId: 'test_mixed',
        currentPhaseId: 'p_inv',
        actors: [],
        completedActions: {},
        actionHistory: [],
      };

      // Firing 'finish' completes the only required action of p_inv → engine
      // advances to p_done (zero actions, last phase) and must terminate.
      const result = applyAction(mixedStatusDefinition, instance, issue, {
        actionId: 'finish',
        actorId: 'anyone',
        timestamp: ts,
        payload: {},
      });
      expect('error' in result).toBe(false);
      if ('error' in result) return;

      expect(result.instance.currentPhaseId).toBe('p_done');
      expect(result.instance.completedAt).toBe(ts);
      expect(result.issue.status).toBe('Closed');
    });

    it('writes the target phase status onto the issue when an action sends back', () => {
      const issue = makeIssue({ status: 'Investigating' });
      const instance: WorkflowInstance = {
        definitionId: 'test_mixed',
        currentPhaseId: 'p_inv',
        actors: [],
        completedActions: {},
        actionHistory: [],
      };

      const result = applyAction(mixedStatusDefinition, instance, issue, {
        actionId: 'back_to_start',
        actorId: 'anyone',
        timestamp: ts,
        payload: {},
      });
      expect('error' in result).toBe(false);
      if ('error' in result) return;

      // p_inv → p_new (sendsBackTo). p_new is tagged New.
      expect(result.instance.currentPhaseId).toBe('p_new');
      expect(result.issue.status).toBe('New');
    });
  });

  describe('action on completed workflow', () => {
    it('returns error when workflow is already terminal', () => {
      const issue = makeIssue();
      const instance = makeInstance({
        currentPhaseId: 'p3_l4_approval',
        completedAt: '2025-01-15T11:00:00Z',
      });

      const result = applyAction(spcOocDefinition, instance, issue, {
        actionId: 'l4_approve',
        actorId: 'user-l4',
        timestamp: ts,
        payload: {},
      });
      expect('error' in result).toBe(true);
    });
  });
});
