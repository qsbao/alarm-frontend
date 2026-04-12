import { describe, expect, it } from 'vitest';
import { genericLinearDefinition } from './genericLinear';
import { attachWorkflow, completeStep } from '../engine';
import type { Issue } from '../../../types';

function makeIssue(overrides: Partial<Issue> = {}): Issue {
  return {
    id: 'iss-001',
    title: 'Test issue',
    date: '2025-01-15T10:00:00Z',
    alarmType: 'TempSpike',
    riskLevel: 'High',
    status: 'Triage',
    issueTime: '2025-01-15T09:55:00Z',
    operation: 'Lithography',
    product: 'A7-Litho',
    ownerId: 'user-tanaka',
    department: 'Litho',
    description: 'Test',
    activity: [],
    ...overrides,
  };
}

const ts = '2025-01-15T12:00:00Z';

describe('genericLinearDefinition', () => {
  it('has the correct id and name', () => {
    expect(genericLinearDefinition.id).toBe('generic_linear_v1');
    expect(genericLinearDefinition.name).toBe('Generic Linear');
  });

  it('has three steps in order: chart_owner_comment → resolved → closed', () => {
    expect(genericLinearDefinition.steps).toHaveLength(3);
    expect(genericLinearDefinition.steps[0].id).toBe('chart_owner_comment');
    expect(genericLinearDefinition.steps[1].id).toBe('resolved');
    expect(genericLinearDefinition.steps[2].id).toBe('closed');

    // preSteps form a linear chain
    expect(genericLinearDefinition.steps[0].preSteps).toEqual([]);
    expect(genericLinearDefinition.steps[1].preSteps).toEqual(['chart_owner_comment']);
    expect(genericLinearDefinition.steps[2].preSteps).toEqual(['resolved']);
  });

  it('has no required roles', () => {
    expect(genericLinearDefinition.requiredRoles).toEqual([]);
  });

  it('closed step accepts an optional comment payload', () => {
    const closedStep = genericLinearDefinition.steps.find((s) => s.id === 'closed')!;
    expect(closedStep.payloadSchema).toBeDefined();
    expect(closedStep.payloadSchema!.comment).toBeDefined();
    expect(closedStep.payloadSchema!.comment.required).toBe(false);
  });
});

describe('genericLinear happy-path scenario', () => {
  it('walks end-to-end: attach → chart_owner_comment → resolved → closed', () => {
    const issue = makeIssue();

    // 1. Attach
    const attachResult = attachWorkflow(genericLinearDefinition, issue, {}, ts);
    expect('error' in attachResult).toBe(false);
    if ('error' in attachResult) return;

    expect(attachResult.instance.stepStates['chart_owner_comment'].status).toBe('ongoing');
    expect(attachResult.instance.stepStates['resolved'].status).toBe('pending');
    expect(attachResult.instance.stepStates['closed'].status).toBe('pending');
    expect(attachResult.issue.status).toBe('Investigating');

    // 2. Complete chart_owner_comment
    const r1 = completeStep(
      genericLinearDefinition,
      attachResult.instance,
      attachResult.issue,
      { stepId: 'chart_owner_comment', actorId: 'user-tanaka', timestamp: ts, payload: {} },
    );
    expect('error' in r1).toBe(false);
    if ('error' in r1) return;

    expect(r1.instance.stepStates['chart_owner_comment'].status).toBe('completed');
    expect(r1.instance.stepStates['resolved'].status).toBe('ongoing');
    expect(r1.issue.status).toBe('Investigating'); // still investigating until resolved is completed

    // 3. Complete resolved (owner-only)
    const r2 = completeStep(
      genericLinearDefinition,
      r1.instance,
      r1.issue,
      { stepId: 'resolved', actorId: 'user-tanaka', timestamp: ts, payload: {} },
    );
    expect('error' in r2).toBe(false);
    if ('error' in r2) return;

    expect(r2.instance.stepStates['resolved'].status).toBe('completed');
    expect(r2.instance.stepStates['closed'].status).toBe('ongoing');
    expect(r2.issue.status).toBe('Resolved');

    // 4. Complete closed with optional comment
    const r3 = completeStep(
      genericLinearDefinition,
      r2.instance,
      r2.issue,
      { stepId: 'closed', actorId: 'user-tanaka', timestamp: ts, payload: { comment: 'All done' } },
    );
    expect('error' in r3).toBe(false);
    if ('error' in r3) return;

    expect(r3.instance.stepStates['closed'].status).toBe('completed');
    expect(r3.instance.completedAt).toBe(ts);
    expect(r3.issue.status).toBe('Closed');
    expect(r3.instance.stepStates['closed'].payload).toEqual({ comment: 'All done' });
  });

  it('closed step works without optional comment', () => {
    const issue = makeIssue();
    const attach = attachWorkflow(genericLinearDefinition, issue, {}, ts);
    if ('error' in attach) return;

    const r1 = completeStep(genericLinearDefinition, attach.instance, attach.issue, {
      stepId: 'chart_owner_comment', actorId: 'user-tanaka', timestamp: ts, payload: {},
    });
    if ('error' in r1) return;

    const r2 = completeStep(genericLinearDefinition, r1.instance, r1.issue, {
      stepId: 'resolved', actorId: 'user-tanaka', timestamp: ts, payload: {},
    });
    if ('error' in r2) return;

    const r3 = completeStep(genericLinearDefinition, r2.instance, r2.issue, {
      stepId: 'closed', actorId: 'user-tanaka', timestamp: ts, payload: {},
    });
    expect('error' in r3).toBe(false);
    if ('error' in r3) return;
    expect(r3.instance.completedAt).toBe(ts);
  });

  it('resolved gate rejects non-owner', () => {
    const issue = makeIssue({ ownerId: 'user-tanaka' });
    const attach = attachWorkflow(genericLinearDefinition, issue, {}, ts);
    if ('error' in attach) return;

    const r1 = completeStep(genericLinearDefinition, attach.instance, attach.issue, {
      stepId: 'chart_owner_comment', actorId: 'user-tanaka', timestamp: ts, payload: {},
    });
    if ('error' in r1) return;

    const r2 = completeStep(genericLinearDefinition, r1.instance, r1.issue, {
      stepId: 'resolved', actorId: 'user-other', timestamp: ts, payload: {},
    });
    expect('error' in r2).toBe(true);
  });

  it('closed gate rejects non-owner', () => {
    const issue = makeIssue({ ownerId: 'user-tanaka' });
    const attach = attachWorkflow(genericLinearDefinition, issue, {}, ts);
    if ('error' in attach) return;

    const r1 = completeStep(genericLinearDefinition, attach.instance, attach.issue, {
      stepId: 'chart_owner_comment', actorId: 'user-tanaka', timestamp: ts, payload: {},
    });
    if ('error' in r1) return;

    const r2 = completeStep(genericLinearDefinition, r1.instance, r1.issue, {
      stepId: 'resolved', actorId: 'user-tanaka', timestamp: ts, payload: {},
    });
    if ('error' in r2) return;

    const r3 = completeStep(genericLinearDefinition, r2.instance, r2.issue, {
      stepId: 'closed', actorId: 'user-other', timestamp: ts, payload: {},
    });
    expect('error' in r3).toBe(true);
  });
});
