/**
 * Integration test: panelHelpers × curated mock data
 * Verifies that all 8 curated workflow issues produce valid panel display state.
 */
import { describe, it, expect } from 'vitest';
import { MOCK_ISSUES } from '../../mocks/issues';
import { getDefinition } from './registry';
import {
  getActionDisplayStatus,
  getActorDisplayName,
  getHistoryRecords,
  getPhaseDisplayState,
} from './panelHelpers';
import { getUserById } from '../../mocks/users';

const lookupUser = (id: string) => getUserById(id)?.name;

describe('panelHelpers × curated issues', () => {
  const withWorkflow = MOCK_ISSUES.filter((i) => i.workflow != null);

  it('exactly 8 curated issues have workflows', () => {
    expect(withWorkflow).toHaveLength(8);
  });

  for (const issue of withWorkflow) {
    describe(`${issue.id} (phase: ${issue.workflow!.currentPhaseId}${issue.workflow!.completedAt ? ', terminal' : ''})`, () => {
      const workflow = issue.workflow!;
      const definition = getDefinition(workflow.definitionId)!;

      it('definition is found in registry', () => {
        expect(definition).toBeDefined();
      });

      it('getPhaseDisplayState returns valid states for all phases', () => {
        const states = getPhaseDisplayState(definition, workflow);
        expect(states).toHaveLength(definition.phases.length);
        for (const s of states) {
          expect(['completed', 'current', 'upcoming']).toContain(s.state);
        }
        if (workflow.completedAt) {
          expect(states.every((s) => s.state === 'completed')).toBe(true);
        } else {
          expect(states.filter((s) => s.state === 'current')).toHaveLength(1);
        }
      });

      it('getActionDisplayStatus returns valid status for current phase actions', () => {
        const phase = definition.phases.find((p) => p.id === workflow.currentPhaseId)!;
        for (const action of phase.actions) {
          const status = getActionDisplayStatus(action, workflow, issue, phase.id);
          expect(['done', 'pending_available', 'pending_unavailable', 'optional']).toContain(status);
        }
      });

      it('getActorDisplayName resolves for all current phase pending actions', () => {
        const phase = definition.phases.find((p) => p.id === workflow.currentPhaseId)!;
        for (const action of phase.actions) {
          const status = getActionDisplayStatus(action, workflow, issue, phase.id);
          if (status === 'pending_available' || status === 'optional') {
            const name = getActorDisplayName(action, workflow, lookupUser);
            expect(name).toBeDefined();
            expect(typeof name).toBe('string');
          }
        }
      });

      it('getHistoryRecords returns ActionRecord[]', () => {
        const history = getHistoryRecords(definition, workflow);
        expect(Array.isArray(history)).toBe(true);
        for (const record of history) {
          expect(record).toHaveProperty('actionId');
          expect(record).toHaveProperty('actorId');
          expect(record).toHaveProperty('payload');
        }
      });
    });
  }

  it('32 non-workflow issues have no workflow', () => {
    const without = MOCK_ISSUES.filter((i) => i.workflow == null);
    expect(without).toHaveLength(32);
  });
});
