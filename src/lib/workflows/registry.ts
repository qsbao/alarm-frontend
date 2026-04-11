import type { WorkflowDefinition } from './types';
import { spcOocDefinition } from './definitions/spcOoc';

const definitions = new Map<string, WorkflowDefinition>();

definitions.set(spcOocDefinition.id, spcOocDefinition);

export function getDefinition(id: string): WorkflowDefinition | undefined {
  return definitions.get(id);
}

export function getAllDefinitions(): WorkflowDefinition[] {
  return Array.from(definitions.values());
}
