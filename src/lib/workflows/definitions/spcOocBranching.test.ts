import { describe, expect, it } from 'vitest';
import { spcOocBranchingDefinition } from './spcOocBranching';
import { attachWorkflow, completeStep, skipStep, reviveStep } from '../engine';
import { getStepDisplayList } from '../panelHelpers';
import type { Issue } from '../../../types';

function makeIssue(overrides: Partial<Issue> = {}): Issue {
  return {
    id: 'iss-001',
    title: 'SPC OOC test issue',
    date: '2025-01-15T10:00:00Z',
    alarmType: 'EndpointDrift',
    riskLevel: 'High',
    status: 'Triage',
    issueTime: '2025-01-15T09:55:00Z',
    operation: 'Endpoint detect',
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

describe('spcOocBranchingDefinition', () => {
  it('has the correct id and name', () => {
    expect(spcOocBranchingDefinition.id).toBe('spc_ooc_branching_v1');
    expect(spcOocBranchingDefinition.name).toBe('SPC OOC Branching');
  });

  it('has seven steps matching the PRD step graph', () => {
    expect(spcOocBranchingDefinition.steps).toHaveLength(7);
    const ids = spcOocBranchingDefinition.steps.map((s) => s.id);
    expect(ids).toEqual([
      'chart_owner_comment',
      'l5_review',
      'l4_review',
      'pi_comment',
      'meeting',
      'resolved',
      'closed',
    ]);
  });

  it('has the correct preSteps for each step', () => {
    const byId = Object.fromEntries(
      spcOocBranchingDefinition.steps.map((s) => [s.id, s]),
    );
    expect(byId['chart_owner_comment'].preSteps).toEqual([]);
    expect(byId['l5_review'].preSteps).toEqual(['chart_owner_comment']);
    expect(byId['l4_review'].preSteps).toEqual(['l5_review']);
    expect(byId['pi_comment'].preSteps).toEqual(['chart_owner_comment']);
    expect(byId['meeting'].preSteps).toEqual(['l4_review', 'pi_comment']);
    expect(byId['resolved'].preSteps).toEqual(['meeting']);
    expect(byId['closed'].preSteps).toEqual(['resolved']);
  });

  it('resolved and closed have owner-only gates', () => {
    const resolved = spcOocBranchingDefinition.steps.find((s) => s.id === 'resolved')!;
    const closed = spcOocBranchingDefinition.steps.find((s) => s.id === 'closed')!;
    expect(resolved.gate).toBeDefined();
    expect(closed.gate).toBeDefined();
  });
});

describe('spcOocBranching scenario: branching happy path', () => {
  it('walks end-to-end: chart_owner_comment → L5+PI parallel → L4 → meeting → resolved → closed', () => {
    const issue = makeIssue();
    const def = spcOocBranchingDefinition;

    // 1. Attach workflow
    const attachResult = attachWorkflow(def, issue, {}, ts);
    expect('error' in attachResult).toBe(false);
    if ('error' in attachResult) return;

    expect(attachResult.instance.stepStates['chart_owner_comment'].status).toBe('ongoing');
    expect(attachResult.instance.stepStates['l5_review'].status).toBe('pending');
    expect(attachResult.instance.stepStates['pi_comment'].status).toBe('pending');
    expect(attachResult.issue.status).toBe('Investigating');

    // 2. Complete chart_owner_comment
    const r1 = completeStep(def, attachResult.instance, attachResult.issue, {
      stepId: 'chart_owner_comment',
      actorId: 'user-tanaka',
      timestamp: ts,
      payload: {},
    });
    expect('error' in r1).toBe(false);
    if ('error' in r1) return;

    // AC: After chart_owner_comment completes, both l5_review and pi_comment are simultaneously ongoing
    expect(r1.instance.stepStates['l5_review'].status).toBe('ongoing');
    expect(r1.instance.stepStates['pi_comment'].status).toBe('ongoing');
    expect(r1.instance.stepStates['l4_review'].status).toBe('pending');
    expect(r1.instance.stepStates['meeting'].status).toBe('pending');

    // 3. Complete l5_review (PI track still ongoing)
    const r2 = completeStep(def, r1.instance, r1.issue, {
      stepId: 'l5_review',
      actorId: 'user-chen',
      timestamp: ts,
      payload: {},
    });
    expect('error' in r2).toBe(false);
    if ('error' in r2) return;

    expect(r2.instance.stepStates['l4_review'].status).toBe('ongoing');
    expect(r2.instance.stepStates['pi_comment'].status).toBe('ongoing');
    expect(r2.instance.stepStates['meeting'].status).toBe('pending');

    // 4. Complete pi_comment (L4 still ongoing, meeting still pending)
    const r3 = completeStep(def, r2.instance, r2.issue, {
      stepId: 'pi_comment',
      actorId: 'user-patel',
      timestamp: ts,
      payload: {},
    });
    expect('error' in r3).toBe(false);
    if ('error' in r3) return;

    // AC: meeting only activates when BOTH l4_review and pi_comment are completed
    expect(r3.instance.stepStates['meeting'].status).toBe('pending');
    expect(r3.instance.stepStates['l4_review'].status).toBe('ongoing');

    // 5. Complete l4_review → meeting should now activate
    const r4 = completeStep(def, r3.instance, r3.issue, {
      stepId: 'l4_review',
      actorId: 'user-muller',
      timestamp: ts,
      payload: {},
    });
    expect('error' in r4).toBe(false);
    if ('error' in r4) return;

    expect(r4.instance.stepStates['meeting'].status).toBe('ongoing');

    // 6. Complete meeting
    const r5 = completeStep(def, r4.instance, r4.issue, {
      stepId: 'meeting',
      actorId: 'user-tanaka',
      timestamp: ts,
      payload: {},
    });
    expect('error' in r5).toBe(false);
    if ('error' in r5) return;

    expect(r5.instance.stepStates['resolved'].status).toBe('ongoing');

    // 7. Complete resolved (owner-only)
    const r6 = completeStep(def, r5.instance, r5.issue, {
      stepId: 'resolved',
      actorId: 'user-tanaka',
      timestamp: ts,
      payload: {},
    });
    expect('error' in r6).toBe(false);
    if ('error' in r6) return;

    expect(r6.instance.stepStates['closed'].status).toBe('ongoing');
    expect(r6.issue.status).toBe('Resolved');

    // 8. Complete closed (owner-only)
    const r7 = completeStep(def, r6.instance, r6.issue, {
      stepId: 'closed',
      actorId: 'user-tanaka',
      timestamp: ts,
      payload: {},
    });
    expect('error' in r7).toBe(false);
    if ('error' in r7) return;

    expect(r7.instance.completedAt).toBe(ts);
    expect(r7.issue.status).toBe('Closed');
  });

  it('meeting does not activate when only l4_review is done but pi_comment is not', () => {
    const issue = makeIssue();
    const def = spcOocBranchingDefinition;

    const attach = attachWorkflow(def, issue, {}, ts);
    if ('error' in attach) return;

    const r1 = completeStep(def, attach.instance, attach.issue, {
      stepId: 'chart_owner_comment', actorId: 'user-tanaka', timestamp: ts, payload: {},
    });
    if ('error' in r1) return;

    const r2 = completeStep(def, r1.instance, r1.issue, {
      stepId: 'l5_review', actorId: 'user-chen', timestamp: ts, payload: {},
    });
    if ('error' in r2) return;

    const r3 = completeStep(def, r2.instance, r2.issue, {
      stepId: 'l4_review', actorId: 'user-muller', timestamp: ts, payload: {},
    });
    if ('error' in r3) return;

    // l4_review done, pi_comment still ongoing → meeting should stay pending
    expect(r3.instance.stepStates['meeting'].status).toBe('pending');
    expect(r3.instance.stepStates['pi_comment'].status).toBe('ongoing');
  });

  it('resolved gate rejects non-owner', () => {
    const issue = makeIssue({ ownerId: 'user-tanaka' });
    const def = spcOocBranchingDefinition;

    const attach = attachWorkflow(def, issue, {}, ts);
    if ('error' in attach) return;

    // Fast-forward to resolved being ongoing
    let inst = attach.instance;
    for (const stepId of ['chart_owner_comment', 'l5_review', 'pi_comment', 'l4_review', 'meeting']) {
      const r = completeStep(def, inst, issue, {
        stepId, actorId: 'user-tanaka', timestamp: ts, payload: {},
      });
      if ('error' in r) return;
      inst = r.instance;
    }

    expect(inst.stepStates['resolved'].status).toBe('ongoing');

    const result = completeStep(def, inst, issue, {
      stepId: 'resolved', actorId: 'user-other', timestamp: ts, payload: {},
    });
    expect('error' in result).toBe(true);
  });
});

describe('spcOocBranching: meeting skip and revive', () => {
  function advanceToMeetingOngoing(issue: Issue) {
    const def = spcOocBranchingDefinition;
    const attach = attachWorkflow(def, issue, {}, ts);
    if ('error' in attach) throw new Error(attach.error);

    let inst = attach.instance;
    let iss = attach.issue;
    for (const stepId of ['chart_owner_comment', 'l5_review', 'pi_comment', 'l4_review']) {
      const r = completeStep(def, inst, iss, {
        stepId, actorId: 'user-tanaka', timestamp: ts, payload: {},
      });
      if ('error' in r) throw new Error(r.error);
      inst = r.instance;
      iss = r.issue;
    }
    return { instance: inst, issue: iss };
  }

  it('meeting is skippable on a low-risk issue', () => {
    const issue = makeIssue({ riskLevel: 'Low' });
    const { instance } = advanceToMeetingOngoing(issue);
    expect(instance.stepStates['meeting'].status).toBe('ongoing');

    const result = skipStep(spcOocBranchingDefinition, instance, issue, {
      stepId: 'meeting', actorId: 'user-tanaka', timestamp: ts,
    });
    expect('error' in result).toBe(false);
    if ('error' in result) return;

    expect(result.instance.stepStates['meeting'].status).toBe('skipped');
    expect(result.instance.stepStates['resolved'].status).toBe('ongoing');
  });

  it('meeting is NOT skippable on a high-risk issue', () => {
    const issue = makeIssue({ riskLevel: 'High' });
    const { instance } = advanceToMeetingOngoing(issue);

    const result = skipStep(spcOocBranchingDefinition, instance, issue, {
      stepId: 'meeting', actorId: 'user-tanaka', timestamp: ts,
    });
    expect('error' in result).toBe(true);
  });

  it('reviving meeting does NOT rewind resolved that already advanced', () => {
    const issue = makeIssue({ riskLevel: 'Low' });
    const { instance } = advanceToMeetingOngoing(issue);

    // Skip meeting → resolved becomes ongoing
    const skipResult = skipStep(spcOocBranchingDefinition, instance, issue, {
      stepId: 'meeting', actorId: 'user-tanaka', timestamp: ts,
    });
    if ('error' in skipResult) throw new Error(skipResult.error);
    expect(skipResult.instance.stepStates['resolved'].status).toBe('ongoing');

    // Revive meeting → resolved should stay ongoing
    const reviveResult = reviveStep(spcOocBranchingDefinition, skipResult.instance, issue, {
      stepId: 'meeting', actorId: 'user-tanaka', timestamp: ts,
    });
    expect('error' in reviveResult).toBe(false);
    if ('error' in reviveResult) return;

    expect(reviveResult.instance.stepStates['meeting'].status).toBe('ongoing');
    expect(reviveResult.instance.stepStates['resolved'].status).toBe('ongoing');
  });

  it('revive disallowed once resolved has completed', () => {
    const issue = makeIssue({ riskLevel: 'Low' });
    const def = spcOocBranchingDefinition;
    const { instance } = advanceToMeetingOngoing(issue);

    // Skip meeting
    const r1 = skipStep(def, instance, issue, {
      stepId: 'meeting', actorId: 'user-tanaka', timestamp: ts,
    });
    if ('error' in r1) throw new Error(r1.error);

    // Complete resolved
    const r2 = completeStep(def, r1.instance, r1.issue, {
      stepId: 'resolved', actorId: 'user-tanaka', timestamp: ts, payload: {},
    });
    if ('error' in r2) throw new Error(r2.error);

    // Try to revive meeting — should fail
    const result = reviveStep(def, r2.instance, r2.issue, {
      stepId: 'meeting', actorId: 'user-tanaka', timestamp: ts,
    });
    expect('error' in result).toBe(true);
    if ('error' in result) {
      expect(result.error).toContain('resolved');
    }
  });
});

describe('spcOocBranching WorkflowPanel display', () => {
  it('shows multiple ongoing rows and correct waiting-on labels for meeting', () => {
    const issue = makeIssue();
    const def = spcOocBranchingDefinition;

    const attach = attachWorkflow(def, issue, {}, ts);
    if ('error' in attach) return;

    // Complete chart_owner_comment → l5_review and pi_comment become ongoing
    const r1 = completeStep(def, attach.instance, attach.issue, {
      stepId: 'chart_owner_comment', actorId: 'user-tanaka', timestamp: ts, payload: {},
    });
    if ('error' in r1) return;

    const displayList = getStepDisplayList(def, r1.instance);

    // Multiple ongoing rows should be present
    const ongoingRows = displayList.filter((d) => d.status === 'ongoing');
    expect(ongoingRows).toHaveLength(2);
    expect(ongoingRows.map((r) => r.step.id).sort()).toEqual(['l5_review', 'pi_comment']);

    // AC: pending meeting shows "Waiting on: L4 Review, PI Comment"
    const meetingRow = displayList.find((d) => d.step.id === 'meeting')!;
    expect(meetingRow.status).toBe('pending');
    expect(meetingRow.waitingOnLabels).toEqual(
      expect.arrayContaining(['L4 Review', 'PI Comment']),
    );
    expect(meetingRow.waitingOnLabels).toHaveLength(2);
  });

  it('meeting waiting-on updates as preSteps complete', () => {
    const issue = makeIssue();
    const def = spcOocBranchingDefinition;

    const attach = attachWorkflow(def, issue, {}, ts);
    if ('error' in attach) return;

    let inst = attach.instance;
    // Complete chart_owner_comment, l5_review, l4_review (pi_comment still ongoing)
    for (const stepId of ['chart_owner_comment', 'l5_review', 'l4_review']) {
      const r = completeStep(def, inst, issue, {
        stepId, actorId: 'user-tanaka', timestamp: ts, payload: {},
      });
      if ('error' in r) return;
      inst = r.instance;
    }

    const displayList = getStepDisplayList(def, inst);
    const meetingRow = displayList.find((d) => d.step.id === 'meeting')!;
    expect(meetingRow.status).toBe('pending');
    // Only pi_comment is still not done
    expect(meetingRow.waitingOnLabels).toEqual(['PI Comment']);
  });
});
