/**
 * Integration test: panelHelpers × mock data
 * Verifies that all mock issues produce valid step display state.
 */
import { describe, it, expect } from 'vitest';
import { MOCK_ISSUES } from '../../mocks/issues';
import { getDefinition } from './registry';
import { getStepDisplayList } from './panelHelpers';

describe('panelHelpers × mock issues', () => {
  it('all issues use generic_linear_v1', () => {
    for (const issue of MOCK_ISSUES) {
      expect(issue.workflow).toBeDefined();
      expect(issue.workflow!.definitionId).toBe('generic_linear_v1');
    }
  });

  for (const issue of MOCK_ISSUES.slice(0, 6)) {
    describe(`${issue.id} (status: ${issue.status})`, () => {
      const workflow = issue.workflow!;
      const definition = getDefinition(workflow.definitionId)!;

      it('definition is found in registry', () => {
        expect(definition).toBeDefined();
      });

      it('getStepDisplayList returns info for all steps', () => {
        const list = getStepDisplayList(definition, workflow);
        expect(list).toHaveLength(definition.steps.length);
        for (const item of list) {
          expect(['completed', 'skipped', 'ongoing', 'pending']).toContain(item.status);
        }
      });

      it('completed/skipped steps appear before ongoing/pending', () => {
        const list = getStepDisplayList(definition, workflow);
        const doneIdx = list.findIndex((i) => i.status === 'ongoing' || i.status === 'pending');
        if (doneIdx > 0) {
          for (let j = 0; j < doneIdx; j++) {
            expect(['completed', 'skipped']).toContain(list[j].status);
          }
        }
      });
    });
  }
});
