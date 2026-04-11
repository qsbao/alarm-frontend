import { describe, expect, it } from 'vitest';
import { checkWorkflowBlock } from './statusCoupling';
import type { Issue } from '../../types';
import type { WorkflowInstance } from './types';

function makeIssue(overrides: Partial<Issue> = {}): Issue {
  return {
    id: 'iss-001',
    title: 'Test issue',
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
    ...overrides,
  };
}

function makeWorkflow(overrides: Partial<WorkflowInstance> = {}): WorkflowInstance {
  return {
    definitionId: 'spc_ooc_v1',
    currentPhaseId: 'p1_owner_input',
    actors: [],
    completedActions: {},
    actionHistory: [],
    ...overrides,
  };
}

describe('checkWorkflowBlock', () => {
  it('returns null for issues without a workflow', () => {
    const issue = makeIssue();
    expect(checkWorkflowBlock(issue, 'Resolved')).toBeNull();
    expect(checkWorkflowBlock(issue, 'Closed')).toBeNull();
  });

  it('returns null for terminal workflows', () => {
    const issue = makeIssue({
      workflow: makeWorkflow({ completedAt: '2025-01-15T12:00:00Z' }),
    });
    expect(checkWorkflowBlock(issue, 'Resolved')).toBeNull();
    expect(checkWorkflowBlock(issue, 'Closed')).toBeNull();
  });

  it('blocks Resolved when workflow is non-terminal', () => {
    const issue = makeIssue({ workflow: makeWorkflow() });
    const result = checkWorkflowBlock(issue, 'Resolved');
    expect(result).not.toBeNull();
    expect(result!.workflowName).toBe('spc_ooc_v1');
    expect(result!.currentPhaseId).toBe('p1_owner_input');
  });

  it('blocks Closed when workflow is non-terminal', () => {
    const issue = makeIssue({ workflow: makeWorkflow() });
    const result = checkWorkflowBlock(issue, 'Closed');
    expect(result).not.toBeNull();
  });

  it('does not block New or Investigating transitions', () => {
    const issue = makeIssue({ workflow: makeWorkflow() });
    expect(checkWorkflowBlock(issue, 'New')).toBeNull();
    expect(checkWorkflowBlock(issue, 'Investigating')).toBeNull();
  });
});
