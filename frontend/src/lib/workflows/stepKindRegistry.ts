import type { FC } from 'react';
import type { Issue } from '../../types';
import type { Step, StepState, WorkflowInstance } from './types';

export interface StepKindActions {
  edit: (payload: Record<string, unknown>) => Promise<void>;
  complete: (payload: Record<string, unknown>) => Promise<void>;
  skip: () => Promise<void>;
}

export interface StepKindProps {
  step: Step;
  state: StepState;
  issue: Issue;
  actions: StepKindActions;
  canSkip: boolean;
}

export interface StepKindSpec {
  component: FC<StepKindProps>;
}

const registry = new Map<string, StepKindSpec>();

export function registerStepKind(id: string, spec: StepKindSpec): void {
  if (registry.has(id)) {
    throw new Error(`Duplicate step kind id: ${id}`);
  }
  registry.set(id, spec);
}

export function getStepKind(id: string): StepKindSpec | undefined {
  return registry.get(id);
}

export function resetStepKindRegistry(): void {
  registry.clear();
}
