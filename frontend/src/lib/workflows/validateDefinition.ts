import type { WorkflowDefinition } from './types';

export function validateDefinition(definition: WorkflowDefinition): void {
  for (const step of definition.steps) {
    if (
      step.stepKind &&
      step.payloadSchema &&
      Object.keys(step.payloadSchema).length > 0
    ) {
      throw new Error(
        `Step "${step.id}" declares both stepKind and a non-empty payloadSchema`,
      );
    }
  }
}
