import type { FC } from 'react';
import type { Issue } from '../../types';
import type { StepStatus } from './types';

export interface FieldProps {
  value: string;
  onChange: (v: string) => void;
  readOnly: boolean;
  stepStatus: StepStatus;
  issue: Issue;
}

export interface FieldKindSpec {
  component: FC<FieldProps>;
}

const registry = new Map<string, FieldKindSpec>();

export function registerFieldKind(id: string, spec: FieldKindSpec): void {
  if (registry.has(id)) {
    throw new Error(`Duplicate field kind id: ${id}`);
  }
  registry.set(id, spec);
}

export function getFieldKind(id: string): FieldKindSpec | undefined {
  return registry.get(id);
}

export function getAllFieldKindIds(): string[] {
  return Array.from(registry.keys());
}

export function resetFieldKindRegistry(): void {
  registry.clear();
}
