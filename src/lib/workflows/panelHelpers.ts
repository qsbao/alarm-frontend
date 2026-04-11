import type { Issue } from '../../types';
import type { Step, StepStatus, WorkflowDefinition, WorkflowInstance } from './types';

export interface StepDisplayInfo {
  step: Step;
  status: StepStatus;
  waitingOnLabels: string[]; // labels of preSteps not yet done (for pending rows)
}

/**
 * Returns display info for each step, ordered by step.order.
 * Groups: completed/skipped first, ongoing middle, pending last.
 */
export function getStepDisplayList(
  definition: WorkflowDefinition,
  instance: WorkflowInstance,
): StepDisplayInfo[] {
  const items: StepDisplayInfo[] = definition.steps.map((step) => {
    const state = instance.stepStates[step.id];
    const status = state?.status ?? 'pending';

    const waitingOnLabels: string[] = [];
    if (status === 'pending') {
      for (const preId of step.preSteps) {
        const preState = instance.stepStates[preId];
        if (!preState || (preState.status !== 'completed' && preState.status !== 'skipped')) {
          const preStep = definition.steps.find((s) => s.id === preId);
          if (preStep) waitingOnLabels.push(preStep.label);
        }
      }
    }

    return { step, status, waitingOnLabels };
  });

  // Sort: completed/skipped first, ongoing middle, pending last
  const order: Record<StepStatus, number> = {
    completed: 0,
    skipped: 0,
    ongoing: 1,
    pending: 2,
  };

  return items.sort((a, b) => order[a.status] - order[b.status]);
}

/**
 * Checks if a user can act on a given step (ongoing + gate passes).
 */
export function canUserActOnStep(
  step: Step,
  instance: WorkflowInstance,
  issue: Issue,
  userId: string,
): boolean {
  const state = instance.stepStates[step.id];
  if (!state || state.status !== 'ongoing') return false;
  if (!step.gate) return true;
  return step.gate({ user: { id: userId }, instance, issue });
}
