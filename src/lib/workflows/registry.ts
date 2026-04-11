import type { WorkflowDefinition } from './types';
import { genericLinearDefinition } from './definitions/genericLinear';

const definitions = new Map<string, WorkflowDefinition>();

definitions.set(genericLinearDefinition.id, genericLinearDefinition);

export function getDefinition(id: string): WorkflowDefinition | undefined {
  return definitions.get(id);
}

export function getAllDefinitions(): WorkflowDefinition[] {
  return Array.from(definitions.values());
}
