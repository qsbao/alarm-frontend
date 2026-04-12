import type { Issue } from '../types';
import type { PayloadSchema, Step, WorkflowDefinition, WorkflowInstance } from './workflows/types';

export interface NextActionInfo {
  step: Step;
  actorId: string;
  payload: Record<string, unknown>;
}

/**
 * Finds the next ongoing step that has an actor who passes the gate,
 * and builds a synthetic schema-valid payload.
 */
export function findNextAdvanceAction(
  issue: Issue,
  definition: WorkflowDefinition,
  instance: WorkflowInstance,
): NextActionInfo | undefined {
  if (instance.completedAt) return undefined;

  for (const step of definition.steps) {
    const state = instance.stepStates[step.id];
    if (!state || state.status !== 'ongoing') continue;

    // Find an actor who passes the gate
    let actorId: string | undefined;
    if (!step.gate) {
      // No gate — use issue owner or first actor
      actorId = issue.ownerId || instance.actors[0]?.userId;
    } else {
      const actor = instance.actors.find((a) =>
        step.gate!({ user: { id: a.userId }, instance, issue }),
      );
      if (actor) {
        actorId = actor.userId;
      } else if (step.gate({ user: { id: issue.ownerId }, instance, issue })) {
        actorId = issue.ownerId;
      }
    }

    if (!actorId) continue;

    return {
      step,
      actorId,
      payload: buildSyntheticPayload(step.payloadSchema ?? {}),
    };
  }

  return undefined;
}

/**
 * Builds a synthetic but schema-valid payload from a PayloadSchema.
 * Enum fields use the first option; text fields get a placeholder string.
 */
export function buildSyntheticPayload(schema: PayloadSchema): Record<string, unknown> {
  const payload: Record<string, unknown> = {};
  for (const [key, field] of Object.entries(schema)) {
    if (field.required) {
      if (field.kind === 'enum' && field.options?.length) {
        payload[key] = field.options[0];
      } else {
        payload[key] = `[Dev panel auto-fill for ${key}]`;
      }
    }
  }
  return payload;
}
