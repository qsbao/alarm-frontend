import type { WorkflowDefinition } from '../types';
import type { FieldKindSpec } from '../fieldKindRegistry';
import { registerFieldKind } from '../fieldKindRegistry';
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

// Dynamically import plugin field-kind specs at build time
const fieldKindModules = import.meta.glob('../../../../../plugins/*/frontend/fieldKinds/*.ts', { eager: true });

// Load plugin manifests to map file paths to field-kind ids
const pluginManifests = import.meta.glob('../../../../../plugins/*/plugin.json', { eager: true });

interface FieldKindManifestEntry {
  id: string;
  frontendEntry: string;
}

interface PluginManifest {
  id: string;
  fieldKinds?: FieldKindManifestEntry[];
}

for (const [manifestPath, manifestModule] of Object.entries(pluginManifests)) {
  const manifest = manifestModule as PluginManifest;
  if (!manifest.fieldKinds) continue;

  const pluginDir = manifestPath.replace(/\/plugin\.json$/, '');
  for (const entry of manifest.fieldKinds) {
    const resolvedPath = `${pluginDir}/${entry.frontendEntry.replace(/^\.\//, '')}`;
    const mod = fieldKindModules[resolvedPath] as { default: FieldKindSpec } | undefined;
    if (mod?.default) {
      registerFieldKind(entry.id, mod.default);
    }
  }
}

export function getDefinition(id: string): WorkflowDefinition | undefined {
  return definitions.get(id);
}

export function getAllDefinitions(): WorkflowDefinition[] {
  return Array.from(definitions.values());
}
