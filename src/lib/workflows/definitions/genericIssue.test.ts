import { describe, expect, it } from 'vitest';
import { applyAction, attachWorkflow } from '../engine';
import { genericIssueDefinition } from './genericIssue';
import type { Issue } from '../../../types';

function makeIssue(): Issue {
  return {
    id: 'iss-001',
    title: 'Test issue',
    date: '2025-01-01T00:00:00Z',
    alarmType: 'TempSpike',
    riskLevel: 'Low',
    status: 'New',
    issueTime: '2025-01-01T00:00:00Z',
    operation: 'Test',
    product: 'Test',
    ownerId: 'user-tanaka',
    department: 'Litho',
    description: 'Test',
    relatedAlarmIds: [],
    activity: [],
  };
}

const ts = '2025-01-01T01:00:00Z';

describe('genericIssue definition smoke tests', () => {
  it('has 3 phases', () => {
    expect(genericIssueDefinition.phases).toHaveLength(3);
  });

  it('every phase declares a status tag', () => {
    for (const phase of genericIssueDefinition.phases) {
      expect(phase.status).toBeDefined();
    }
  });

  it('phases are tagged New, Investigating, Closed in order', () => {
    expect(genericIssueDefinition.phases[0].status).toBe('New');
    expect(genericIssueDefinition.phases[1].status).toBe('Investigating');
    expect(genericIssueDefinition.phases[2].status).toBe('Closed');
  });

  it('terminal phase has zero actions', () => {
    expect(genericIssueDefinition.phases[2].actions).toEqual([]);
  });

  it('attaches and reaches Closed via the declared advance actions', () => {
    const issue = makeIssue();

    const attached = attachWorkflow(genericIssueDefinition, issue, {}, ts);
    expect('error' in attached).toBe(false);
    if ('error' in attached) return;
    expect(attached.issue.status).toBe('New');

    const r1 = applyAction(genericIssueDefinition, attached.instance, attached.issue, {
      actionId: 'start_investigation',
      actorId: 'anyone',
      timestamp: ts,
      payload: {},
    });
    expect('error' in r1).toBe(false);
    if ('error' in r1) return;
    expect(r1.issue.status).toBe('Investigating');

    const r2 = applyAction(genericIssueDefinition, r1.instance, r1.issue, {
      actionId: 'close',
      actorId: 'anyone',
      timestamp: ts,
      payload: {},
    });
    expect('error' in r2).toBe(false);
    if ('error' in r2) return;
    expect(r2.issue.status).toBe('Closed');
    expect(r2.instance.completedAt).toBe(ts);
  });
});
