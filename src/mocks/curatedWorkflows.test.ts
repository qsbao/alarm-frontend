import { describe, expect, it } from 'vitest';
import { MOCK_ISSUES } from './issues';
import { getDefinition } from '../lib/workflows/registry';

describe('mock issues with curated workflows', () => {
  it('every issue has a workflow attached', () => {
    const allWithWorkflow = MOCK_ISSUES.filter((i) => i.workflow != null);
    expect(allWithWorkflow).toHaveLength(MOCK_ISSUES.length);
  });

  it('all issues use a registered workflow definition', () => {
    for (const issue of MOCK_ISSUES) {
      const def = getDefinition(issue.workflow!.definitionId);
      expect(def).toBeDefined();
    }
  });

  it('EndpointDrift issues use spc_ooc_branching_v1', () => {
    const endpointDrift = MOCK_ISSUES.filter((i) => i.alarmType === 'EndpointDrift');
    expect(endpointDrift.length).toBeGreaterThan(0);
    for (const issue of endpointDrift) {
      expect(issue.workflow!.definitionId).toBe('spc_ooc_branching_v1');
    }
  });

  it('non-EndpointDrift issues use generic_linear_v1', () => {
    const other = MOCK_ISSUES.filter((i) => i.alarmType !== 'EndpointDrift');
    expect(other.length).toBeGreaterThan(0);
    for (const issue of other) {
      expect(issue.workflow!.definitionId).toBe('generic_linear_v1');
    }
  });

  it('every workflow has stepStates for chart_owner_comment, resolved, and closed', () => {
    for (const issue of MOCK_ISSUES) {
      const wf = issue.workflow!;
      expect(wf.stepStates).toHaveProperty('chart_owner_comment');
      expect(wf.stepStates).toHaveProperty('resolved');
      expect(wf.stepStates).toHaveProperty('closed');
    }
  });

  it('workflow distribution covers Investigating, Resolved, and Closed statuses', () => {
    const counts: Record<string, number> = {};
    for (const issue of MOCK_ISSUES) {
      counts[issue.status] = (counts[issue.status] ?? 0) + 1;
    }
    expect(counts['Investigating']).toBeGreaterThan(0);
    expect(counts['Closed']).toBeGreaterThan(0);
  });

  it('terminal workflows have completedAt set', () => {
    const terminal = MOCK_ISSUES.filter((i) => i.workflow!.completedAt != null);
    expect(terminal.length).toBeGreaterThan(0);
    for (const issue of terminal) {
      expect(issue.status).toBe('Closed');
    }
  });

  it('non-terminal workflows have ongoing steps', () => {
    const nonTerminal = MOCK_ISSUES.filter((i) => !i.workflow!.completedAt);
    expect(nonTerminal.length).toBeGreaterThan(0);
    for (const issue of nonTerminal) {
      const stepStates = issue.workflow!.stepStates;
      const hasOngoing = Object.values(stepStates).some((s) => s.status === 'ongoing');
      expect(hasOngoing).toBe(true);
    }
  });
});
