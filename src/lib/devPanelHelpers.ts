import type { Issue } from '../types';
import type { Action, PayloadSchema, WorkflowDefinition, WorkflowInstance } from './workflows/types';

export interface NextActionInfo {
  action: Action;
  actorId: string;
  payload: Record<string, unknown>;
}

/**
 * Finds the next required (non-sendback) action in the current phase that has
 * an actor who passes the gate, and builds a synthetic schema-valid payload.
 */
export function findNextAdvanceAction(
  issue: Issue,
  definition: WorkflowDefinition,
  instance: WorkflowInstance,
): NextActionInfo | undefined {
  if (instance.completedAt) return undefined;

  const currentPhase = definition.phases.find((p) => p.id === instance.currentPhaseId);
  if (!currentPhase) return undefined;

  const completedIds = new Set(
    (instance.completedActions[instance.currentPhaseId] ?? []).map((r) => r.actionId),
  );

  const nextAction = currentPhase.actions.find(
    (a) => !completedIds.has(a.id) && a.required && !a.sendsBackTo,
  );
  if (!nextAction) return undefined;

  const actor = instance.actors.find((a) =>
    nextAction.gate({ user: { id: a.userId }, instance, issue }),
  );
  if (!actor) return undefined;

  return {
    action: nextAction,
    actorId: actor.userId,
    payload: buildSyntheticPayload(nextAction.payloadSchema),
  };
}

/**
 * Finds a sendsBackTo action in the current phase that has an actor who passes
 * the gate, and builds a synthetic payload.
 */
export function findSendbackAction(
  issue: Issue,
  definition: WorkflowDefinition,
  instance: WorkflowInstance,
): NextActionInfo | undefined {
  if (instance.completedAt) return undefined;

  const currentPhase = definition.phases.find((p) => p.id === instance.currentPhaseId);
  if (!currentPhase) return undefined;

  const completedIds = new Set(
    (instance.completedActions[instance.currentPhaseId] ?? []).map((r) => r.actionId),
  );

  const sendbackAction = currentPhase.actions.find(
    (a) => !completedIds.has(a.id) && a.sendsBackTo,
  );
  if (!sendbackAction) return undefined;

  const actor = instance.actors.find((a) =>
    sendbackAction.gate({ user: { id: a.userId }, instance, issue }),
  );
  if (!actor) return undefined;

  return {
    action: sendbackAction,
    actorId: actor.userId,
    payload: buildSyntheticPayload(sendbackAction.payloadSchema),
  };
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
