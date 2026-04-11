import type { Issue } from '../../types';
import type { Action, ActionRecord, WorkflowDefinition, WorkflowInstance } from './types';

export type ActionDisplayStatus = 'done' | 'pending_available' | 'pending_unavailable' | 'optional';

export function getActionDisplayStatus(
  action: Action,
  instance: WorkflowInstance,
  issue: Issue,
  phaseId: string,
): ActionDisplayStatus {
  const completedIds = new Set(
    (instance.completedActions[phaseId] ?? []).map((r) => r.actionId),
  );

  if (completedIds.has(action.id)) return 'done';
  if (phaseId !== instance.currentPhaseId) return 'pending_unavailable';
  if (!action.required) return 'optional';
  return 'pending_available';
}

/**
 * Finds the actor gated on an action by testing each workflow actor against the gate.
 * Returns the display name via the lookup function, or undefined.
 */
export function getActorDisplayName(
  action: Action,
  instance: WorkflowInstance,
  lookupUser: (id: string) => string | undefined,
): string | undefined {
  const issue = { ownerId: '' } as Issue; // gate only checks instance.actors
  for (const actor of instance.actors) {
    if (action.gate({ user: { id: actor.userId }, instance, issue })) {
      return lookupUser(actor.userId);
    }
  }
  return undefined;
}

export interface PhaseDisplayState {
  phaseId: string;
  label: string;
  state: 'completed' | 'current' | 'upcoming';
}

export function getPhaseDisplayState(
  definition: WorkflowDefinition,
  instance: WorkflowInstance,
): PhaseDisplayState[] {
  if (instance.completedAt) {
    return definition.phases.map((p) => ({
      phaseId: p.id,
      label: p.label,
      state: 'completed' as const,
    }));
  }

  const currentIdx = definition.phases.findIndex((p) => p.id === instance.currentPhaseId);

  return definition.phases.map((p, idx) => ({
    phaseId: p.id,
    label: p.label,
    state: idx < currentIdx ? 'completed' : idx === currentIdx ? 'current' : 'upcoming',
  }));
}

/**
 * Returns completed action records from phases before the current phase.
 * For terminal workflows, returns all completed actions across all phases.
 */
export function getHistoryRecords(
  definition: WorkflowDefinition,
  instance: WorkflowInstance,
): ActionRecord[] {
  const currentIdx = definition.phases.findIndex((p) => p.id === instance.currentPhaseId);
  const records: ActionRecord[] = [];

  for (let i = 0; i < definition.phases.length; i++) {
    if (instance.completedAt || i < currentIdx) {
      const phaseRecords = instance.completedActions[definition.phases[i].id] ?? [];
      records.push(...phaseRecords);
    }
  }

  return records;
}
