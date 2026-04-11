import type { Issue } from '../../types';
import type {
  ActionRecord,
  ApplyActionResult,
  AttachWorkflowResult,
  PayloadSchema,
  UserId,
  WorkflowDefinition,
  WorkflowInstance,
} from './types';

let recordCounter = 0;
function nextRecordId(): string {
  recordCounter += 1;
  return `wf-act-${recordCounter}`;
}

function validatePayload(
  payload: Record<string, unknown>,
  schema: PayloadSchema,
): string | null {
  for (const [fieldName, fieldSchema] of Object.entries(schema)) {
    const value = payload[fieldName];

    if (fieldSchema.required) {
      if (value === undefined || value === null || value === '') {
        return `Missing required field: ${fieldName}`;
      }
    }

    if (value === undefined || value === null || value === '') continue;

    if (fieldSchema.kind === 'enum' && fieldSchema.options) {
      if (!fieldSchema.options.includes(value as string)) {
        return `Invalid value for ${fieldName}: ${value}. Expected one of: ${fieldSchema.options.join(', ')}`;
      }
    }

    if (fieldSchema.kind === 'text' && fieldSchema.minLength !== undefined) {
      if (typeof value !== 'string' || value.length < fieldSchema.minLength) {
        return `Field ${fieldName} must be at least ${fieldSchema.minLength} character(s)`;
      }
    }
  }
  return null;
}

function withWorkflowStatus(
  issue: Issue,
  definition: WorkflowDefinition,
  instance: WorkflowInstance,
): Issue {
  const phase = definition.phases.find((p) => p.id === instance.currentPhaseId);
  const nextStatus = phase?.status ?? issue.status;
  return { ...issue, workflow: instance, status: nextStatus };
}

export function attachWorkflow(
  definition: WorkflowDefinition,
  issue: Issue,
  mocks: Record<string, unknown>,
  timestamp: string,
): AttachWorkflowResult {
  const actors: { userId: UserId; role: string }[] = [];

  for (const roleEntry of definition.requiredRoles) {
    const userId = roleEntry.resolve(issue, mocks);
    if (!userId) {
      return { error: `Cannot resolve role: ${roleEntry.role}` };
    }
    actors.push({ userId, role: roleEntry.role });
  }

  const instance: WorkflowInstance = {
    definitionId: definition.id,
    currentPhaseId: definition.phases[0].id,
    actors,
    completedActions: {},
    actionHistory: [],
  };

  return {
    instance,
    issue: withWorkflowStatus(issue, definition, instance),
    activityEntry: {
      definitionId: definition.id,
      phaseId: definition.phases[0].id,
      actionId: '__attach__',
      actorId: 'system',
      fromPhaseId: '',
      toPhaseId: definition.phases[0].id,
      timestamp,
    },
  };
}

export function applyAction(
  definition: WorkflowDefinition,
  instance: WorkflowInstance,
  issue: Issue,
  params: {
    actionId: string;
    actorId: UserId;
    timestamp: string;
    payload: Record<string, unknown>;
  },
): ApplyActionResult {
  if (instance.completedAt) {
    return { error: 'Workflow is already completed' };
  }

  const currentPhase = definition.phases.find((p) => p.id === instance.currentPhaseId);
  if (!currentPhase) {
    return { error: `Phase not found: ${instance.currentPhaseId}` };
  }

  const action = currentPhase.actions.find((a) => a.id === params.actionId);
  if (!action) {
    return { error: `Action ${params.actionId} not found in current phase ${instance.currentPhaseId}` };
  }

  // Gate check
  const gateResult = action.gate({
    user: { id: params.actorId },
    instance,
    issue,
  });
  if (!gateResult) {
    return { error: `User ${params.actorId} does not pass gate for action ${params.actionId}` };
  }

  // Payload validation
  const validationError = validatePayload(params.payload, action.payloadSchema);
  if (validationError) {
    return { error: validationError };
  }

  const record: ActionRecord = {
    id: nextRecordId(),
    actionId: params.actionId,
    phaseId: instance.currentPhaseId,
    actorId: params.actorId,
    timestamp: params.timestamp,
    payload: params.payload,
  };

  const newHistory = [...instance.actionHistory, record];

  // Handle sendsBackTo
  if (action.sendsBackTo) {
    const targetPhaseIdx = definition.phases.findIndex((p) => p.id === action.sendsBackTo);
    const newCompleted: Record<string, ActionRecord[]> = {};
    // Keep completedActions only for phases before the target
    for (const phase of definition.phases) {
      if (definition.phases.indexOf(phase) < targetPhaseIdx) {
        if (instance.completedActions[phase.id]) {
          newCompleted[phase.id] = [...instance.completedActions[phase.id]];
        }
      }
      // phases from target forward: cleared
    }

    const sentBackInstance: WorkflowInstance = {
      ...instance,
      currentPhaseId: action.sendsBackTo,
      completedActions: newCompleted,
      actionHistory: newHistory,
    };
    return {
      instance: sentBackInstance,
      issue: withWorkflowStatus(issue, definition, sentBackInstance),
      activityEntry: {
        definitionId: definition.id,
        phaseId: instance.currentPhaseId,
        actionId: params.actionId,
        actorId: params.actorId,
        fromPhaseId: instance.currentPhaseId,
        toPhaseId: action.sendsBackTo,
        timestamp: params.timestamp,
      },
    };
  }

  // Normal action: add to completedActions
  const phaseActions = instance.completedActions[instance.currentPhaseId] ?? [];
  const newCompletedActions = {
    ...instance.completedActions,
    [instance.currentPhaseId]: [...phaseActions, record],
  };

  // Walk forward through phases as long as the current phase's required
  // actions are all complete. A phase with zero required actions auto-clears.
  let phaseIdx = definition.phases.findIndex((p) => p.id === instance.currentPhaseId);
  let completedAt: string | undefined;
  while (phaseIdx >= 0) {
    const phase = definition.phases[phaseIdx];
    const completedIds = new Set(
      (newCompletedActions[phase.id] ?? []).map((r) => r.actionId),
    );
    const allRequiredDone = phase.actions
      .filter((a) => a.required)
      .every((a) => completedIds.has(a.id));
    if (!allRequiredDone) break;
    if (phaseIdx < definition.phases.length - 1) {
      phaseIdx += 1;
    } else {
      completedAt = params.timestamp;
      break;
    }
  }
  const newPhaseId = definition.phases[phaseIdx].id;

  const advancedInstance: WorkflowInstance = {
    ...instance,
    currentPhaseId: newPhaseId,
    completedActions: newCompletedActions,
    actionHistory: newHistory,
    ...(completedAt ? { completedAt } : {}),
  };
  return {
    instance: advancedInstance,
    issue: withWorkflowStatus(issue, definition, advancedInstance),
    activityEntry: {
      definitionId: definition.id,
      phaseId: instance.currentPhaseId,
      actionId: params.actionId,
      actorId: params.actorId,
      fromPhaseId: instance.currentPhaseId,
      toPhaseId: newPhaseId,
      timestamp: params.timestamp,
    },
  };
}
