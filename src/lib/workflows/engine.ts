import type { Issue, IssueStatus } from '../../types';
import type {
  AttachWorkflowResult,
  CompleteStepResult,
  EditStepResult,
  PayloadSchema,
  ReviveStepResult,
  SkipStepResult,
  StepState,
  UserId,
  WorkflowDefinition,
  WorkflowInstance,
} from './types';

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

/**
 * Activates pending steps whose preSteps are all completed or skipped.
 * Evaluates `defaultSkipIf` exactly once on activation — if true, the step
 * goes straight to `skipped` instead of `ongoing`.
 * Mutates `stepStates` in place for simplicity; callers should pass a copy.
 */
function activateSteps(
  definition: WorkflowDefinition,
  stepStates: Record<string, StepState>,
  issue: Issue,
  timestamp: string,
): void {
  let changed = true;
  while (changed) {
    changed = false;
    for (const step of definition.steps) {
      const state = stepStates[step.id];
      if (state.status !== 'pending') continue;

      const allPreDone = step.preSteps.every((preId) => {
        const preState = stepStates[preId];
        return preState && (preState.status === 'completed' || preState.status === 'skipped');
      });

      if (allPreDone) {
        if (step.defaultSkipIf && step.defaultSkipIf(issue)) {
          stepStates[step.id] = {
            status: 'skipped',
            skippedAt: timestamp,
            skippedBy: 'system',
          };
        } else {
          stepStates[step.id] = { status: 'ongoing' };
        }
        changed = true;
      }
    }
  }
}

/**
 * Derives Issue.status from impliesStatus of steps.
 * Priority: highest-order completed step with impliesStatus.
 * Fallback: lowest-order ongoing step with impliesStatus.
 */
export function deriveStatus(
  definition: WorkflowDefinition,
  instance: WorkflowInstance,
): IssueStatus | undefined {
  // Among completed steps with impliesStatus, pick highest order
  let bestCompleted: { order: number; status: IssueStatus } | undefined;
  for (const step of definition.steps) {
    if (!step.impliesStatus) continue;
    const state = instance.stepStates[step.id];
    if (state?.status !== 'completed') continue;
    if (!bestCompleted || step.order > bestCompleted.order) {
      bestCompleted = { order: step.order, status: step.impliesStatus };
    }
  }
  if (bestCompleted) return bestCompleted.status;

  // Fallback: lowest-order ongoing step with impliesStatus
  let bestOngoing: { order: number; status: IssueStatus } | undefined;
  for (const step of definition.steps) {
    if (!step.impliesStatus) continue;
    const state = instance.stepStates[step.id];
    if (state?.status !== 'ongoing') continue;
    if (!bestOngoing || step.order < bestOngoing.order) {
      bestOngoing = { order: step.order, status: step.impliesStatus };
    }
  }
  return bestOngoing?.status;
}

function isTerminal(stepStates: Record<string, StepState>): boolean {
  return Object.values(stepStates).every(
    (s) => s.status === 'completed' || s.status === 'skipped',
  );
}

export function attachWorkflow(
  definition: WorkflowDefinition,
  issue: Issue,
  mocks: Record<string, unknown>,
  timestamp: string,
): AttachWorkflowResult {
  // Resolve required roles
  const actors: { userId: UserId; role: string }[] = [];
  for (const roleEntry of definition.requiredRoles) {
    const userId = roleEntry.resolve(issue, mocks);
    if (!userId) {
      return { error: `Cannot resolve role: ${roleEntry.role}` };
    }
    actors.push({ userId, role: roleEntry.role });
  }

  // Initialize all steps as pending
  const stepStates: Record<string, StepState> = {};
  for (const step of definition.steps) {
    stepStates[step.id] = { status: 'pending' };
  }

  // Activate root steps (no preSteps)
  activateSteps(definition, stepStates, issue, timestamp);

  const instance: WorkflowInstance = {
    definitionId: definition.id,
    stepStates,
    actors,
  };

  const status = deriveStatus(definition, instance);
  const updatedIssue: Issue = {
    ...issue,
    workflow: instance,
    ...(status ? { status } : {}),
  };

  return {
    instance,
    issue: updatedIssue,
    activityEntry: {
      definitionId: definition.id,
      stepId: definition.steps[0]?.id ?? '',
      action: 'attach',
      actorId: 'system',
      timestamp,
    },
  };
}

export function completeStep(
  definition: WorkflowDefinition,
  instance: WorkflowInstance,
  issue: Issue,
  params: {
    stepId: string;
    actorId: UserId;
    timestamp: string;
    payload: Record<string, unknown>;
  },
): CompleteStepResult {
  if (instance.completedAt) {
    return { error: 'Workflow is already completed' };
  }

  const step = definition.steps.find((s) => s.id === params.stepId);
  if (!step) {
    return { error: `Step not found: ${params.stepId}` };
  }

  const stepState = instance.stepStates[params.stepId];
  if (!stepState || stepState.status !== 'ongoing') {
    return { error: `Step ${params.stepId} is not ongoing (current status: ${stepState?.status ?? 'unknown'})` };
  }

  // Gate check
  if (step.gate) {
    const gateResult = step.gate({
      user: { id: params.actorId },
      instance,
      issue,
    });
    if (!gateResult) {
      return { error: `User ${params.actorId} does not pass gate for step ${params.stepId}` };
    }
  }

  // Payload validation
  if (step.payloadSchema) {
    const validationError = validatePayload(params.payload, step.payloadSchema);
    if (validationError) {
      return { error: validationError };
    }
  }

  // Build new step states
  const newStepStates: Record<string, StepState> = {};
  for (const [id, state] of Object.entries(instance.stepStates)) {
    newStepStates[id] = { ...state };
  }
  newStepStates[params.stepId] = {
    status: 'completed',
    payload: params.payload,
    completedAt: params.timestamp,
    completedBy: params.actorId,
  };

  // Activate downstream steps
  activateSteps(definition, newStepStates, issue, params.timestamp);

  const terminal = isTerminal(newStepStates);
  const newInstance: WorkflowInstance = {
    ...instance,
    stepStates: newStepStates,
    ...(terminal ? { completedAt: params.timestamp } : {}),
  };

  const status = deriveStatus(definition, newInstance);
  const updatedIssue: Issue = {
    ...issue,
    workflow: newInstance,
    ...(status ? { status } : {}),
  };

  return {
    instance: newInstance,
    issue: updatedIssue,
    activityEntry: {
      definitionId: definition.id,
      stepId: params.stepId,
      action: 'complete',
      actorId: params.actorId,
      timestamp: params.timestamp,
    },
  };
}

export function skipStep(
  definition: WorkflowDefinition,
  instance: WorkflowInstance,
  issue: Issue,
  params: {
    stepId: string;
    actorId: UserId;
    timestamp: string;
  },
): SkipStepResult {
  if (instance.completedAt) {
    return { error: 'Workflow is already completed' };
  }

  const step = definition.steps.find((s) => s.id === params.stepId);
  if (!step) {
    return { error: `Step not found: ${params.stepId}` };
  }

  const stepState = instance.stepStates[params.stepId];
  if (!stepState || stepState.status !== 'ongoing') {
    return { error: `Step ${params.stepId} is not ongoing (current status: ${stepState?.status ?? 'unknown'})` };
  }

  if (!step.skippableIf) {
    return { error: `Step ${params.stepId} is not skippable` };
  }

  if (!step.skippableIf(issue)) {
    return { error: `Step ${params.stepId} cannot be skipped for this issue` };
  }

  const newStepStates: Record<string, StepState> = {};
  for (const [id, state] of Object.entries(instance.stepStates)) {
    newStepStates[id] = { ...state };
  }
  newStepStates[params.stepId] = {
    status: 'skipped',
    skippedAt: params.timestamp,
    skippedBy: params.actorId,
  };

  activateSteps(definition, newStepStates, issue, params.timestamp);

  const terminal = isTerminal(newStepStates);
  const newInstance: WorkflowInstance = {
    ...instance,
    stepStates: newStepStates,
    ...(terminal ? { completedAt: params.timestamp } : {}),
  };

  const status = deriveStatus(definition, newInstance);
  const updatedIssue: Issue = {
    ...issue,
    workflow: newInstance,
    ...(status ? { status } : {}),
  };

  return {
    instance: newInstance,
    issue: updatedIssue,
    activityEntry: {
      definitionId: definition.id,
      stepId: params.stepId,
      action: 'skip',
      actorId: params.actorId,
      timestamp: params.timestamp,
    },
  };
}

export function reviveStep(
  definition: WorkflowDefinition,
  instance: WorkflowInstance,
  issue: Issue,
  params: {
    stepId: string;
    actorId: UserId;
    timestamp: string;
  },
): ReviveStepResult {
  if (instance.completedAt) {
    return { error: 'Workflow is already completed' };
  }

  const step = definition.steps.find((s) => s.id === params.stepId);
  if (!step) {
    return { error: `Step not found: ${params.stepId}` };
  }

  const stepState = instance.stepStates[params.stepId];
  if (!stepState || stepState.status !== 'skipped') {
    return { error: `Step ${params.stepId} is not skipped (current status: ${stepState?.status ?? 'unknown'})` };
  }

  // Disallow revive once resolved has completed
  const resolvedState = instance.stepStates['resolved'];
  if (resolvedState && resolvedState.status === 'completed') {
    return { error: 'Cannot revive after resolved has completed' };
  }

  // Move step back to ongoing — no cascade to successors
  const newStepStates: Record<string, StepState> = {};
  for (const [id, state] of Object.entries(instance.stepStates)) {
    newStepStates[id] = { ...state };
  }
  newStepStates[params.stepId] = { status: 'ongoing' };

  const newInstance: WorkflowInstance = {
    ...instance,
    stepStates: newStepStates,
  };

  const status = deriveStatus(definition, newInstance);
  const updatedIssue: Issue = {
    ...issue,
    workflow: newInstance,
    ...(status ? { status } : {}),
  };

  return {
    instance: newInstance,
    issue: updatedIssue,
    activityEntry: {
      definitionId: definition.id,
      stepId: params.stepId,
      action: 'revive',
      actorId: params.actorId,
      timestamp: params.timestamp,
    },
  };
}

export function editCompletedStep(
  definition: WorkflowDefinition,
  instance: WorkflowInstance,
  issue: Issue,
  params: {
    stepId: string;
    actorId: UserId;
    timestamp: string;
    payload: Record<string, unknown>;
  },
): EditStepResult {
  const step = definition.steps.find((s) => s.id === params.stepId);
  if (!step) {
    return { error: `Step not found: ${params.stepId}` };
  }

  const stepState = instance.stepStates[params.stepId];
  if (!stepState || stepState.status !== 'completed') {
    return { error: `Step ${params.stepId} is not completed (current status: ${stepState?.status ?? 'unknown'})` };
  }

  // Gate check against the current actor (not the original completer)
  if (step.gate) {
    const gateResult = step.gate({
      user: { id: params.actorId },
      instance,
      issue,
    });
    if (!gateResult) {
      return { error: `User ${params.actorId} does not pass gate for step ${params.stepId}` };
    }
  }

  // Payload validation
  if (step.payloadSchema) {
    const validationError = validatePayload(params.payload, step.payloadSchema);
    if (validationError) {
      return { error: validationError };
    }
  }

  // Mutate payload in place — preserve completedAt/completedBy, no downstream cascade
  const newStepStates: Record<string, StepState> = {};
  for (const [id, state] of Object.entries(instance.stepStates)) {
    newStepStates[id] = { ...state };
  }
  newStepStates[params.stepId] = {
    ...newStepStates[params.stepId],
    payload: params.payload,
  };

  const newInstance: WorkflowInstance = {
    ...instance,
    stepStates: newStepStates,
  };

  return {
    instance: newInstance,
    issue: { ...issue, workflow: newInstance },
    activityEntry: {
      definitionId: definition.id,
      stepId: params.stepId,
      action: 'edit',
      actorId: params.actorId,
      timestamp: params.timestamp,
    },
  };
}
