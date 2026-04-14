import type { WorkflowDefinition } from '../types';
import { genericLinearDefinition } from './genericLinear';
import { spcOocBranchingDefinition } from './spcOocBranching';

// Built-in definitions
const definitions = new Map<string, WorkflowDefinition>();
definitions.set(genericLinearDefinition.id, genericLinearDefinition);
definitions.set(spcOocBranchingDefinition.id, spcOocBranchingDefinition);

// Dynamically import plugin definitions at build time
const pluginModules = import.meta.glob('../../../../../plugins/*/frontend/index.ts', { eager: true });

// Register all plugin definitions
for (const module of Object.values(pluginModules)) {
  const { definitions: pluginDefinitions } = module as { definitions: WorkflowDefinition[] };
  if (Array.isArray(pluginDefinitions)) {
    for (const def of pluginDefinitions) {
      definitions.set(def.id, def);
    }
  }
}

export function getDefinition(id: string): WorkflowDefinition | undefined {
  return definitions.get(id);
}

export function getAllDefinitions(): WorkflowDefinition[] {
  return Array.from(definitions.values());
}
