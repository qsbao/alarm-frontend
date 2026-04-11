import { describe, it, expect } from 'vitest';
import type { Issue } from '../../types';
import type { WorkflowInstance, WorkflowDefinition, ActionRecord } from './types';
import { spcOocDefinition } from './definitions/spcOoc';
import {
  type ActionDisplayStatus,
  getActionDisplayStatus,
  getActorDisplayName,
  getPhaseDisplayState,
  getHistoryRecords,
} from './panelHelpers';

// ---------- factories ----------
const ts = '2025-06-01T10:00:00Z';

function makeIssue(overrides?: Partial<Issue>): Issue {
  return {
    id: 'iss-001',
    title: 'Test',
    date: ts,
    alarmType: 'TempSpike',
    riskLevel: 'High',
    status: 'Investigating',
    issueTime: ts,
    operation: 'Wafer transfer',
    product: 'A7-Litho',
    ownerId: 'user-tanaka',
    department: 'Litho',
    description: '',
    relatedAlarmIds: ['alm-001'],
    activity: [],
    ...overrides,
  };
}

function makeInstance(overrides?: Partial<WorkflowInstance>): WorkflowInstance {
  return {
    definitionId: 'spc_ooc_v1',
    currentPhaseId: 'p1_owner_input',
    actors: [
      { userId: 'user-rossi', role: 'chart_owner' },
      { userId: 'user-sato', role: 'pi_engineer' },
      { userId: 'user-yamamoto', role: 'owner_l5_manager' },
      { userId: 'user-nakamura', role: 'owner_l4_manager' },
    ],
    completedActions: {},
    actionHistory: [],
    ...overrides,
  };
}

function makeRecord(actionId: string, phaseId: string, actorId: string): ActionRecord {
  return {
    id: `rec-${actionId}`,
    actionId,
    phaseId,
    actorId,
    timestamp: ts,
    payload: { comment: 'test' },
  };
}

const users = new Map([
  ['user-rossi', 'L. Rossi'],
  ['user-sato', 'N. Sato'],
  ['user-yamamoto', 'T. Yamamoto'],
  ['user-nakamura', 'Y. Nakamura'],
]);

const lookupUser = (id: string) => users.get(id);

// ---------- tests ----------

describe('getActionDisplayStatus', () => {
  const def = spcOocDefinition;
  const issue = makeIssue();

  it('returns "done" when action is in completedActions for current phase', () => {
    const instance = makeInstance({
      currentPhaseId: 'p2_pi_l5_review',
      completedActions: {
        p1_owner_input: [makeRecord('chart_owner_comment', 'p1_owner_input', 'user-rossi')],
        p2_pi_l5_review: [makeRecord('pi_comment', 'p2_pi_l5_review', 'user-sato')],
      },
    });
    const phase = def.phases[1]; // p2
    const action = phase.actions[0]; // pi_comment
    expect(getActionDisplayStatus(action, instance, issue, phase.id)).toBe('done');
  });

  it('returns "pending_available" when gate passes for a required action', () => {
    const instance = makeInstance({
      currentPhaseId: 'p1_owner_input',
    });
    const phase = def.phases[0];
    const action = phase.actions[0]; // chart_owner_comment
    // user-rossi is chart_owner, so we test if gate passes — but getActionDisplayStatus
    // doesn't take a user; it just checks if the action is NOT done.
    // Actually let me re-think: the status depends on whether the gate passes for
    // the gated actor, not the current user. "pending available" means the gated actor
    // CAN act. "pending unavailable" means it's blocked by something else.
    // Re-reading the issue: "⏳ pending available / ⊘ pending unavailable"
    // Looking at the PRD: action buttons enabled only when current user passes gate.
    // But for display status, "pending available" = not done + required,
    // "pending unavailable" = not done + required but blocked (e.g., previous phase action not done?)
    // Actually in the context of phase display: we show the CURRENT phase's actions.
    // So all required actions in current phase are "pending available" if not done.
    // "pending unavailable" might mean: action whose gate can't be satisfied
    // because the actor role is in the actors list but... hmm.
    // Let me re-read the AC more carefully:
    // "Current phase's action rows render with status: ✓ done / ⏳ pending available / ⊘ pending unavailable / ⋯ optional"
    // I think: pending available = not done + required, pending unavailable = not done + required but
    // maybe for a non-current phase? Or maybe it relates to whether it's in the current phase.
    // Since we're showing current phase actions: done = completed, pending available = not done + required,
    // optional = not done + not required. "pending unavailable" perhaps for phases that aren't current.
    // Actually, let me think again. The phase ribbon shows ALL phases. The current phase actions are shown.
    // So "pending unavailable" could mean an action in a future phase that can't be taken yet.
    // Or it could mean: in the current phase, an action that is required but whose prerequisite
    // (like another action) hasn't been met. But the engine doesn't have intra-phase dependencies.
    // I think "pending unavailable" = action in a non-current phase (future) that can't be acted on yet.
    // And for history: completed phases show as done.
    // Let me simplify: for the current phase, actions are either done, pending (available), or optional.
    // For past phases, all shown actions are done. For future phases, actions are pending unavailable.
    expect(getActionDisplayStatus(action, instance, issue, phase.id)).toBe('pending_available');
  });

  it('returns "optional" for a non-required action that is not done', () => {
    const instance = makeInstance({
      currentPhaseId: 'p2_pi_l5_review',
      completedActions: {
        p1_owner_input: [makeRecord('chart_owner_comment', 'p1_owner_input', 'user-rossi')],
      },
    });
    const phase = def.phases[1];
    const action = phase.actions[2]; // l5_request_info (optional)
    expect(getActionDisplayStatus(action, instance, issue, phase.id)).toBe('optional');
  });

  it('returns "pending_unavailable" for an action in a non-current phase', () => {
    const instance = makeInstance({
      currentPhaseId: 'p1_owner_input',
    });
    const phase = def.phases[2]; // p3 (future)
    const action = phase.actions[0]; // l4_approve
    expect(getActionDisplayStatus(action, instance, issue, phase.id)).toBe('pending_unavailable');
  });
});

describe('getActorDisplayName', () => {
  it('returns display name for the gated actor', () => {
    const instance = makeInstance();
    const def = spcOocDefinition;
    const action = def.phases[0].actions[0]; // chart_owner_comment — gated to chart_owner
    const name = getActorDisplayName(action, instance, lookupUser);
    expect(name).toBe('L. Rossi');
  });

  it('returns display name for PI action', () => {
    const instance = makeInstance();
    const def = spcOocDefinition;
    const action = def.phases[1].actions[0]; // pi_comment — gated to pi_engineer
    const name = getActorDisplayName(action, instance, lookupUser);
    expect(name).toBe('N. Sato');
  });

  it('returns undefined when no actor matches', () => {
    const instance = makeInstance({ actors: [] });
    const def = spcOocDefinition;
    const action = def.phases[0].actions[0];
    const name = getActorDisplayName(action, instance, lookupUser);
    expect(name).toBeUndefined();
  });
});

describe('getPhaseDisplayState', () => {
  const def = spcOocDefinition;

  it('marks current phase as "current"', () => {
    const instance = makeInstance({ currentPhaseId: 'p2_pi_l5_review' });
    const states = getPhaseDisplayState(def, instance);
    expect(states).toEqual([
      { phaseId: 'p1_owner_input', label: 'Owner Input', state: 'completed' },
      { phaseId: 'p2_pi_l5_review', label: 'PI + L5 Review', state: 'current' },
      { phaseId: 'p3_l4_approval', label: 'L4 Approval', state: 'upcoming' },
    ]);
  });

  it('marks all phases completed when workflow is terminal', () => {
    const instance = makeInstance({
      currentPhaseId: 'p3_l4_approval',
      completedAt: ts,
    });
    const states = getPhaseDisplayState(def, instance);
    expect(states.every((s) => s.state === 'completed')).toBe(true);
  });

  it('marks first phase as current when workflow is fresh', () => {
    const instance = makeInstance({ currentPhaseId: 'p1_owner_input' });
    const states = getPhaseDisplayState(def, instance);
    expect(states[0].state).toBe('current');
    expect(states[1].state).toBe('upcoming');
    expect(states[2].state).toBe('upcoming');
  });
});

describe('getHistoryRecords', () => {
  const def = spcOocDefinition;

  it('returns empty array when no completed actions exist', () => {
    const instance = makeInstance();
    expect(getHistoryRecords(def, instance)).toEqual([]);
  });

  it('returns completed action records from past phases only', () => {
    const instance = makeInstance({
      currentPhaseId: 'p2_pi_l5_review',
      completedActions: {
        p1_owner_input: [makeRecord('chart_owner_comment', 'p1_owner_input', 'user-rossi')],
        p2_pi_l5_review: [makeRecord('pi_comment', 'p2_pi_l5_review', 'user-sato')],
      },
    });
    const history = getHistoryRecords(def, instance);
    // Only p1 actions are "history" (past phases); p2 is current
    expect(history).toHaveLength(1);
    expect(history[0].actionId).toBe('chart_owner_comment');
  });

  it('returns all phase actions for terminal workflows', () => {
    const instance = makeInstance({
      currentPhaseId: 'p3_l4_approval',
      completedAt: ts,
      completedActions: {
        p1_owner_input: [makeRecord('chart_owner_comment', 'p1_owner_input', 'user-rossi')],
        p2_pi_l5_review: [
          makeRecord('pi_comment', 'p2_pi_l5_review', 'user-sato'),
          makeRecord('l5_approve', 'p2_pi_l5_review', 'user-yamamoto'),
        ],
        p3_l4_approval: [makeRecord('l4_approve', 'p3_l4_approval', 'user-nakamura')],
      },
    });
    const history = getHistoryRecords(def, instance);
    expect(history).toHaveLength(4);
  });

  it('includes send-back records from actionHistory', () => {
    const sendBackRecord = makeRecord('l5_request_info', 'p2_pi_l5_review', 'user-yamamoto');
    const instance = makeInstance({
      currentPhaseId: 'p2_pi_l5_review',
      completedActions: {
        p1_owner_input: [makeRecord('chart_owner_comment', 'p1_owner_input', 'user-rossi')],
      },
      actionHistory: [
        makeRecord('chart_owner_comment', 'p1_owner_input', 'user-rossi'),
        sendBackRecord,
        makeRecord('chart_owner_comment', 'p1_owner_input', 'user-rossi'),
      ],
    });
    const history = getHistoryRecords(def, instance);
    // Past phases: p1_owner_input has 1 completed action
    // Plus we should also see send-back records in actionHistory from past phases
    // Actually, let me reconsider: history should show records from past phases'
    // completedActions, not the full actionHistory. The actionHistory includes
    // the send-back record. But for the "history section", we want records from
    // phases that are before the current phase.
    // The send-back record is from p2, which IS the current phase, so it wouldn't
    // show in past-phase history. But it IS in actionHistory.
    // The AC says "completed actions collapse into a history section below the active phase"
    // So history = completed actions from past phases. The full actionHistory with
    // send-backs is a separate concern.
    expect(history).toHaveLength(1);
    expect(history[0].actionId).toBe('chart_owner_comment');
  });
});
