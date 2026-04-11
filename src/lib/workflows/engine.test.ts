import { describe, expect, it } from 'vitest';
import { attachWorkflow, completeStep, deriveStatus } from './engine';
import type { Issue } from '../../types';
import type { WorkflowDefinition, WorkflowInstance } from './types';

// --- Test definitions ---

/** Linear: A → B → C */
const linearDef: WorkflowDefinition = {
  id: 'test_linear',
  name: 'Linear Test',
  version: '1',
  steps: [
    { id: 'A', label: 'Step A', order: 1, preSteps: [], impliesStatus: 'Investigating' },
    { id: 'B', label: 'Step B', order: 2, preSteps: ['A'], impliesStatus: 'Resolved' },
    { id: 'C', label: 'Step C', order: 3, preSteps: ['B'], impliesStatus: 'Closed' },
  ],
  requiredRoles: [],
};

/**
 * Diamond DAG:
 *   A ──┐
 *       ├──► C → D
 *   B ──┘
 */
const diamondDef: WorkflowDefinition = {
  id: 'test_diamond',
  name: 'Diamond Test',
  version: '1',
  steps: [
    { id: 'A', label: 'Step A', order: 1, preSteps: [] },
    { id: 'B', label: 'Step B', order: 2, preSteps: [] },
    { id: 'C', label: 'Step C', order: 3, preSteps: ['A', 'B'], impliesStatus: 'Investigating' },
    { id: 'D', label: 'Step D', order: 4, preSteps: ['C'], impliesStatus: 'Closed' },
  ],
  requiredRoles: [],
};

/** Definition with gate and payload */
const gatedDef: WorkflowDefinition = {
  id: 'test_gated',
  name: 'Gated Test',
  version: '1',
  steps: [
    {
      id: 'gated_step',
      label: 'Gated',
      order: 1,
      preSteps: [],
      gate: ({ user, issue }) => user.id === issue.ownerId,
      payloadSchema: {
        comment: { kind: 'text', label: 'Comment', required: true, minLength: 1 },
        reason: {
          kind: 'enum',
          label: 'Reason',
          required: true,
          options: ['Tool', 'Material', 'Process'],
        },
      },
      impliesStatus: 'Investigating',
    },
    { id: 'done', label: 'Done', order: 2, preSteps: ['gated_step'], impliesStatus: 'Closed' },
  ],
  requiredRoles: [],
};

/** Definition with roles */
const roledDef: WorkflowDefinition = {
  id: 'test_roled',
  name: 'Roled Test',
  version: '1',
  steps: [
    { id: 'step1', label: 'Step 1', order: 1, preSteps: [] },
  ],
  requiredRoles: [
    { role: 'owner', resolve: (issue) => issue.ownerId },
    { role: 'reviewer', resolve: (_issue, mocks) => (mocks as Record<string, string>).reviewer },
  ],
};

function makeIssue(overrides: Partial<Issue> = {}): Issue {
  return {
    id: 'iss-001',
    title: 'Test issue',
    date: '2025-01-15T10:00:00Z',
    alarmType: 'TempSpike',
    riskLevel: 'High',
    status: 'New',
    issueTime: '2025-01-15T09:55:00Z',
    operation: 'Lithography',
    product: 'A7-Litho',
    ownerId: 'user-tanaka',
    department: 'Litho',
    description: 'Test',
    relatedAlarmIds: [],
    activity: [],
    ...overrides,
  };
}

const ts = '2025-01-15T12:00:00Z';

// --- Tests ---

describe('attachWorkflow', () => {
  it('creates instance with all steps pending, then activates root steps to ongoing', () => {
    const issue = makeIssue();
    const result = attachWorkflow(linearDef, issue, {}, ts);
    expect('error' in result).toBe(false);
    if ('error' in result) return;

    expect(result.instance.definitionId).toBe('test_linear');
    expect(result.instance.stepStates['A'].status).toBe('ongoing');
    expect(result.instance.stepStates['B'].status).toBe('pending');
    expect(result.instance.stepStates['C'].status).toBe('pending');
    expect(result.instance.completedAt).toBeUndefined();
  });

  it('activates multiple root steps in a diamond DAG', () => {
    const issue = makeIssue();
    const result = attachWorkflow(diamondDef, issue, {}, ts);
    expect('error' in result).toBe(false);
    if ('error' in result) return;

    expect(result.instance.stepStates['A'].status).toBe('ongoing');
    expect(result.instance.stepStates['B'].status).toBe('ongoing');
    expect(result.instance.stepStates['C'].status).toBe('pending');
    expect(result.instance.stepStates['D'].status).toBe('pending');
  });

  it('derives issue status from the first ongoing step with impliesStatus', () => {
    const issue = makeIssue();
    const result = attachWorkflow(linearDef, issue, {}, ts);
    expect('error' in result).toBe(false);
    if ('error' in result) return;

    expect(result.issue.status).toBe('Investigating');
  });

  it('resolves required roles and stores actors', () => {
    const issue = makeIssue();
    const mocks = { reviewer: 'user-reviewer' };
    const result = attachWorkflow(roledDef, issue, mocks, ts);
    expect('error' in result).toBe(false);
    if ('error' in result) return;

    expect(result.instance.actors).toHaveLength(2);
    expect(result.instance.actors).toEqual([
      { userId: 'user-tanaka', role: 'owner' },
      { userId: 'user-reviewer', role: 'reviewer' },
    ]);
  });

  it('returns error when a required role cannot be resolved', () => {
    const issue = makeIssue();
    const result = attachWorkflow(roledDef, issue, {}, ts);
    expect('error' in result).toBe(true);
  });

  it('returns a well-formed activity entry', () => {
    const issue = makeIssue();
    const result = attachWorkflow(linearDef, issue, {}, ts);
    expect('error' in result).toBe(false);
    if ('error' in result) return;

    expect(result.activityEntry.definitionId).toBe('test_linear');
    expect(result.activityEntry.action).toBe('attach');
    expect(result.activityEntry.actorId).toBe('system');
    expect(result.activityEntry.timestamp).toBe(ts);
  });
});

describe('completeStep', () => {
  describe('DAG activation', () => {
    it('activates the next step when a linear predecessor completes', () => {
      const issue = makeIssue();
      const instance: WorkflowInstance = {
        definitionId: 'test_linear',
        stepStates: {
          A: { status: 'ongoing' },
          B: { status: 'pending' },
          C: { status: 'pending' },
        },
        actors: [],
      };

      const result = completeStep(linearDef, instance, issue, {
        stepId: 'A',
        actorId: 'user-tanaka',
        timestamp: ts,
        payload: {},
      });
      expect('error' in result).toBe(false);
      if ('error' in result) return;

      expect(result.instance.stepStates['A'].status).toBe('completed');
      expect(result.instance.stepStates['B'].status).toBe('ongoing');
      expect(result.instance.stepStates['C'].status).toBe('pending');
    });

    it('does NOT activate a step until ALL preSteps are completed/skipped', () => {
      const issue = makeIssue();
      const instance: WorkflowInstance = {
        definitionId: 'test_diamond',
        stepStates: {
          A: { status: 'ongoing' },
          B: { status: 'ongoing' },
          C: { status: 'pending' },
          D: { status: 'pending' },
        },
        actors: [],
      };

      // Complete only A — C still needs B
      const result = completeStep(diamondDef, instance, issue, {
        stepId: 'A',
        actorId: 'user-tanaka',
        timestamp: ts,
        payload: {},
      });
      expect('error' in result).toBe(false);
      if ('error' in result) return;

      expect(result.instance.stepStates['A'].status).toBe('completed');
      expect(result.instance.stepStates['C'].status).toBe('pending');
    });

    it('activates a step when ALL preSteps are completed', () => {
      const issue = makeIssue();
      const instance: WorkflowInstance = {
        definitionId: 'test_diamond',
        stepStates: {
          A: { status: 'completed', completedAt: ts, completedBy: 'user-tanaka' },
          B: { status: 'ongoing' },
          C: { status: 'pending' },
          D: { status: 'pending' },
        },
        actors: [],
      };

      // Complete B — now both A and B are done, C should activate
      const result = completeStep(diamondDef, instance, issue, {
        stepId: 'B',
        actorId: 'user-tanaka',
        timestamp: ts,
        payload: {},
      });
      expect('error' in result).toBe(false);
      if ('error' in result) return;

      expect(result.instance.stepStates['C'].status).toBe('ongoing');
      expect(result.instance.stepStates['D'].status).toBe('pending');
    });

    it('activates a step when preSteps are a mix of completed and skipped', () => {
      const issue = makeIssue();
      const instance: WorkflowInstance = {
        definitionId: 'test_diamond',
        stepStates: {
          A: { status: 'completed', completedAt: ts, completedBy: 'user-tanaka' },
          B: { status: 'skipped', skippedAt: ts, skippedBy: 'user-tanaka' },
          C: { status: 'pending' },
          D: { status: 'pending' },
        },
        actors: [],
      };

      // C's preSteps are A (completed) and B (skipped) — should activate
      // We need to trigger activation; let's use attachWorkflow-style activation
      // Actually, this scenario would happen during a skip or complete. Let's
      // test it via the engine's activation logic by calling completeStep on A
      // with B already skipped.
      const instanceWithBSkipped: WorkflowInstance = {
        definitionId: 'test_diamond',
        stepStates: {
          A: { status: 'ongoing' },
          B: { status: 'skipped', skippedAt: ts, skippedBy: 'user-tanaka' },
          C: { status: 'pending' },
          D: { status: 'pending' },
        },
        actors: [],
      };

      const result = completeStep(diamondDef, instanceWithBSkipped, issue, {
        stepId: 'A',
        actorId: 'user-tanaka',
        timestamp: ts,
        payload: {},
      });
      expect('error' in result).toBe(false);
      if ('error' in result) return;

      expect(result.instance.stepStates['C'].status).toBe('ongoing');
    });
  });

  describe('terminal detection', () => {
    it('sets completedAt when the last step completes', () => {
      const issue = makeIssue();
      const instance: WorkflowInstance = {
        definitionId: 'test_linear',
        stepStates: {
          A: { status: 'completed', completedAt: ts, completedBy: 'user-tanaka' },
          B: { status: 'completed', completedAt: ts, completedBy: 'user-tanaka' },
          C: { status: 'ongoing' },
        },
        actors: [],
      };

      const result = completeStep(linearDef, instance, issue, {
        stepId: 'C',
        actorId: 'user-tanaka',
        timestamp: ts,
        payload: {},
      });
      expect('error' in result).toBe(false);
      if ('error' in result) return;

      expect(result.instance.completedAt).toBe(ts);
    });

    it('does NOT set completedAt when steps remain', () => {
      const issue = makeIssue();
      const instance: WorkflowInstance = {
        definitionId: 'test_linear',
        stepStates: {
          A: { status: 'ongoing' },
          B: { status: 'pending' },
          C: { status: 'pending' },
        },
        actors: [],
      };

      const result = completeStep(linearDef, instance, issue, {
        stepId: 'A',
        actorId: 'user-tanaka',
        timestamp: ts,
        payload: {},
      });
      expect('error' in result).toBe(false);
      if ('error' in result) return;

      expect(result.instance.completedAt).toBeUndefined();
    });
  });

  describe('gate validation', () => {
    it('returns error when user does not pass gate', () => {
      const issue = makeIssue({ ownerId: 'user-tanaka' });
      const instance: WorkflowInstance = {
        definitionId: 'test_gated',
        stepStates: { gated_step: { status: 'ongoing' }, done: { status: 'pending' } },
        actors: [],
      };

      const result = completeStep(gatedDef, instance, issue, {
        stepId: 'gated_step',
        actorId: 'user-wrong',
        timestamp: ts,
        payload: { comment: 'test', reason: 'Tool' },
      });
      expect('error' in result).toBe(true);
      if ('error' in result) {
        expect(result.error).toContain('gate');
      }
    });

    it('succeeds when user passes gate', () => {
      const issue = makeIssue({ ownerId: 'user-tanaka' });
      const instance: WorkflowInstance = {
        definitionId: 'test_gated',
        stepStates: { gated_step: { status: 'ongoing' }, done: { status: 'pending' } },
        actors: [],
      };

      const result = completeStep(gatedDef, instance, issue, {
        stepId: 'gated_step',
        actorId: 'user-tanaka',
        timestamp: ts,
        payload: { comment: 'test', reason: 'Tool' },
      });
      expect('error' in result).toBe(false);
    });
  });

  describe('payload validation', () => {
    it('returns error when required text field is missing', () => {
      const issue = makeIssue();
      const instance: WorkflowInstance = {
        definitionId: 'test_gated',
        stepStates: { gated_step: { status: 'ongoing' }, done: { status: 'pending' } },
        actors: [],
      };

      const result = completeStep(gatedDef, instance, issue, {
        stepId: 'gated_step',
        actorId: 'user-tanaka',
        timestamp: ts,
        payload: { reason: 'Tool' }, // missing comment
      });
      expect('error' in result).toBe(true);
    });

    it('returns error when required enum field is missing', () => {
      const issue = makeIssue();
      const instance: WorkflowInstance = {
        definitionId: 'test_gated',
        stepStates: { gated_step: { status: 'ongoing' }, done: { status: 'pending' } },
        actors: [],
      };

      const result = completeStep(gatedDef, instance, issue, {
        stepId: 'gated_step',
        actorId: 'user-tanaka',
        timestamp: ts,
        payload: { comment: 'test' }, // missing reason
      });
      expect('error' in result).toBe(true);
    });

    it('returns error for invalid enum value', () => {
      const issue = makeIssue();
      const instance: WorkflowInstance = {
        definitionId: 'test_gated',
        stepStates: { gated_step: { status: 'ongoing' }, done: { status: 'pending' } },
        actors: [],
      };

      const result = completeStep(gatedDef, instance, issue, {
        stepId: 'gated_step',
        actorId: 'user-tanaka',
        timestamp: ts,
        payload: { comment: 'test', reason: 'InvalidValue' },
      });
      expect('error' in result).toBe(true);
    });

    it('stores payload on the completed step state', () => {
      const issue = makeIssue();
      const instance: WorkflowInstance = {
        definitionId: 'test_gated',
        stepStates: { gated_step: { status: 'ongoing' }, done: { status: 'pending' } },
        actors: [],
      };

      const result = completeStep(gatedDef, instance, issue, {
        stepId: 'gated_step',
        actorId: 'user-tanaka',
        timestamp: ts,
        payload: { comment: 'test', reason: 'Tool' },
      });
      expect('error' in result).toBe(false);
      if ('error' in result) return;

      expect(result.instance.stepStates['gated_step'].payload).toEqual({
        comment: 'test',
        reason: 'Tool',
      });
    });
  });

  describe('step not ongoing', () => {
    it('returns error when step is pending', () => {
      const issue = makeIssue();
      const instance: WorkflowInstance = {
        definitionId: 'test_linear',
        stepStates: {
          A: { status: 'ongoing' },
          B: { status: 'pending' },
          C: { status: 'pending' },
        },
        actors: [],
      };

      const result = completeStep(linearDef, instance, issue, {
        stepId: 'B',
        actorId: 'user-tanaka',
        timestamp: ts,
        payload: {},
      });
      expect('error' in result).toBe(true);
    });

    it('returns error when step is already completed', () => {
      const issue = makeIssue();
      const instance: WorkflowInstance = {
        definitionId: 'test_linear',
        stepStates: {
          A: { status: 'completed', completedAt: ts, completedBy: 'user-tanaka' },
          B: { status: 'ongoing' },
          C: { status: 'pending' },
        },
        actors: [],
      };

      const result = completeStep(linearDef, instance, issue, {
        stepId: 'A',
        actorId: 'user-tanaka',
        timestamp: ts,
        payload: {},
      });
      expect('error' in result).toBe(true);
    });

    it('returns error when step does not exist', () => {
      const issue = makeIssue();
      const instance: WorkflowInstance = {
        definitionId: 'test_linear',
        stepStates: { A: { status: 'ongoing' }, B: { status: 'pending' }, C: { status: 'pending' } },
        actors: [],
      };

      const result = completeStep(linearDef, instance, issue, {
        stepId: 'nonexistent',
        actorId: 'user-tanaka',
        timestamp: ts,
        payload: {},
      });
      expect('error' in result).toBe(true);
    });
  });

  describe('completed workflow', () => {
    it('returns error when workflow is already completed', () => {
      const issue = makeIssue();
      const instance: WorkflowInstance = {
        definitionId: 'test_linear',
        stepStates: {
          A: { status: 'completed', completedAt: ts, completedBy: 'u' },
          B: { status: 'completed', completedAt: ts, completedBy: 'u' },
          C: { status: 'completed', completedAt: ts, completedBy: 'u' },
        },
        actors: [],
        completedAt: ts,
      };

      const result = completeStep(linearDef, instance, issue, {
        stepId: 'C',
        actorId: 'user-tanaka',
        timestamp: ts,
        payload: {},
      });
      expect('error' in result).toBe(true);
    });
  });

  describe('activity entry', () => {
    it('returns a well-formed activity entry', () => {
      const issue = makeIssue();
      const instance: WorkflowInstance = {
        definitionId: 'test_linear',
        stepStates: { A: { status: 'ongoing' }, B: { status: 'pending' }, C: { status: 'pending' } },
        actors: [],
      };

      const result = completeStep(linearDef, instance, issue, {
        stepId: 'A',
        actorId: 'user-tanaka',
        timestamp: ts,
        payload: {},
      });
      expect('error' in result).toBe(false);
      if ('error' in result) return;

      expect(result.activityEntry.definitionId).toBe('test_linear');
      expect(result.activityEntry.stepId).toBe('A');
      expect(result.activityEntry.action).toBe('complete');
      expect(result.activityEntry.actorId).toBe('user-tanaka');
      expect(result.activityEntry.timestamp).toBe(ts);
    });
  });
});

describe('deriveStatus', () => {
  it('returns impliesStatus of the highest-order completed step', () => {
    const instance: WorkflowInstance = {
      definitionId: 'test_linear',
      stepStates: {
        A: { status: 'completed', completedAt: ts, completedBy: 'u' },
        B: { status: 'ongoing' },
        C: { status: 'pending' },
      },
      actors: [],
    };
    expect(deriveStatus(linearDef, instance)).toBe('Investigating');
  });

  it('returns impliesStatus of the latest completed step when multiple are done', () => {
    const instance: WorkflowInstance = {
      definitionId: 'test_linear',
      stepStates: {
        A: { status: 'completed', completedAt: ts, completedBy: 'u' },
        B: { status: 'completed', completedAt: ts, completedBy: 'u' },
        C: { status: 'ongoing' },
      },
      actors: [],
    };
    expect(deriveStatus(linearDef, instance)).toBe('Resolved');
  });

  it('falls back to ongoing steps when none are completed', () => {
    const instance: WorkflowInstance = {
      definitionId: 'test_linear',
      stepStates: {
        A: { status: 'ongoing' },
        B: { status: 'pending' },
        C: { status: 'pending' },
      },
      actors: [],
    };
    expect(deriveStatus(linearDef, instance)).toBe('Investigating');
  });

  it('skips steps without impliesStatus', () => {
    const instance: WorkflowInstance = {
      definitionId: 'test_diamond',
      stepStates: {
        A: { status: 'completed', completedAt: ts, completedBy: 'u' },
        B: { status: 'ongoing' },
        C: { status: 'pending' },
        D: { status: 'pending' },
      },
      actors: [],
    };
    // A and B have no impliesStatus, no completed steps with impliesStatus
    // B is ongoing but has no impliesStatus → undefined
    expect(deriveStatus(diamondDef, instance)).toBeUndefined();
  });
});
