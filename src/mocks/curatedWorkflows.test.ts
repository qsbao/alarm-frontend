import { describe, expect, it } from 'vitest';
import { MOCK_ISSUES } from './issues';
import type { WorkflowInstance } from '../lib/workflows/types';

describe('curated mock issues with workflows', () => {
  const withWorkflow = MOCK_ISSUES.filter((i) => i.workflow != null);
  const without = MOCK_ISSUES.filter((i) => i.workflow == null);

  it('exactly 8 issues have workflows attached', () => {
    expect(withWorkflow).toHaveLength(8);
  });

  it('the other 32 issues have no workflow', () => {
    expect(without).toHaveLength(32);
  });

  it('all workflows use the spc_ooc_v1 definition', () => {
    for (const issue of withWorkflow) {
      expect(issue.workflow!.definitionId).toBe('spc_ooc_v1');
    }
  });

  it('all workflows have 4 actors', () => {
    for (const issue of withWorkflow) {
      expect(issue.workflow!.actors).toHaveLength(4);
      const roles = issue.workflow!.actors.map((a) => a.role);
      expect(roles).toContain('chart_owner');
      expect(roles).toContain('pi_engineer');
      expect(roles).toContain('owner_l5_manager');
      expect(roles).toContain('owner_l4_manager');
    }
  });

  describe('phase state distribution', () => {
    function byPhase(phaseId: string) {
      return withWorkflow.filter(
        (i) => i.workflow!.currentPhaseId === phaseId && !i.workflow!.completedAt,
      );
    }

    it('2 in P1 fresh (no completed actions)', () => {
      const p1Fresh = byPhase('p1_owner_input').filter(
        (i) => i.workflow!.actionHistory.length === 0,
      );
      expect(p1Fresh).toHaveLength(2);
    });

    it('2 in P2 with mixed pending actions', () => {
      const p2 = byPhase('p2_pi_l5_review');
      expect(p2.length).toBeGreaterThanOrEqual(2);
    });

    it('1 in P2 with chart_owner + PI done but L5 pending', () => {
      const p2 = byPhase('p2_pi_l5_review');
      const piDoneL5Pending = p2.filter((i) => {
        const wf = i.workflow!;
        const p2Actions = wf.completedActions['p2_pi_l5_review'] ?? [];
        const piDone = p2Actions.some((a) => a.actionId === 'pi_comment');
        const l5Done = p2Actions.some((a) => a.actionId === 'l5_approve');
        return piDone && !l5Done;
      });
      expect(piDoneL5Pending.length).toBeGreaterThanOrEqual(1);
    });

    it('1 in P3', () => {
      const p3 = byPhase('p3_l4_approval');
      expect(p3).toHaveLength(1);
    });

    it('1 terminal (completedAt set)', () => {
      const terminal = withWorkflow.filter((i) => i.workflow!.completedAt != null);
      expect(terminal).toHaveLength(1);
    });

    it('1 with sendsBackTo reset visible in history', () => {
      const withReset = withWorkflow.filter((i) => {
        const wf = i.workflow!;
        return wf.actionHistory.some(
          (r) => r.actionId === 'l5_request_info' || r.actionId === 'l4_request_info',
        );
      });
      expect(withReset.length).toBeGreaterThanOrEqual(1);
    });
  });

  it('workflows with status Investigating or Resolved have correct issue status', () => {
    for (const issue of withWorkflow) {
      // Issues with non-terminal workflows should be at least Investigating
      if (!issue.workflow!.completedAt) {
        expect(issue.status).not.toBe('New');
      }
    }
  });
});
