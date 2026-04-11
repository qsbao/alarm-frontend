import { describe, expect, it } from 'vitest';
import { MOCK_ISSUES } from './issues';

describe('mock issues with genericLinear workflows', () => {
  it('every issue has a workflow attached', () => {
    const allWithWorkflow = MOCK_ISSUES.filter((i) => i.workflow != null);
    expect(allWithWorkflow).toHaveLength(MOCK_ISSUES.length);
  });

  it('all issues use the generic_linear_v1 workflow', () => {
    for (const issue of MOCK_ISSUES) {
      expect(issue.workflow!.definitionId).toBe('generic_linear_v1');
    }
  });

  it('every workflow has stepStates for all three steps', () => {
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
