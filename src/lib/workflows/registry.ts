import type { WorkflowDefinition } from './types';
import { genericLinearDefinition } from './definitions/genericLinear';
import { spcOocBranchingDefinition } from './definitions/spcOocBranching';

const definitions = new Map<string, WorkflowDefinition>();

definitions.set(genericLinearDefinition.id, genericLinearDefinition);
definitions.set(spcOocBranchingDefinition.id, spcOocBranchingDefinition);

export function getDefinition(id: string): WorkflowDefinition | undefined {
  return definitions.get(id);
}

export function getAllDefinitions(): WorkflowDefinition[] {
  return Array.from(definitions.values());
}
