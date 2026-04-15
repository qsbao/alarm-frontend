import type { WorkflowDefinition } from '../types';
import type { FieldKindSpec } from '../fieldKindRegistry';
import { registerFieldKind } from '../fieldKindRegistry';
import type { StepKindSpec } from '../stepKindRegistry';
import { registerStepKind } from '../stepKindRegistry';
import { validateDefinition } from '../validateDefinition';
import { registerAlarmType, type AlarmTypeSpec } from '../../alarms/alarmTypeRegistry';
import { spcOocAlarmType } from '../../alarms/spcOocAlarmType';
import { genericLinearDefinition } from './genericLinear';
import { spcOocBranchingDefinition } from './spcOocBranching';

// Built-in definitions
const definitions = new Map<string, WorkflowDefinition>();
validateDefinition(genericLinearDefinition);
definitions.set(genericLinearDefinition.id, genericLinearDefinition);
validateDefinition(spcOocBranchingDefinition);
definitions.set(spcOocBranchingDefinition.id, spcOocBranchingDefinition);

// Dynamically import plugin definitions at build time
const pluginModules = import.meta.glob('../../../../../plugins/*/frontend/index.ts', { eager: true });

// Register all plugin definitions
for (const module of Object.values(pluginModules)) {
  const { definitions: pluginDefinitions } = module as { definitions: WorkflowDefinition[] };
  if (Array.isArray(pluginDefinitions)) {
    for (const def of pluginDefinitions) {
      validateDefinition(def);
      definitions.set(def.id, def);
    }
  }
}

// Dynamically import plugin field-kind and step-kind specs at build time
const fieldKindModules = import.meta.glob('../../../../../plugins/*/frontend/fieldKinds/*.ts', { eager: true });
const stepKindModules = import.meta.glob('../../../../../plugins/*/frontend/stepKinds/*.{ts,tsx}', { eager: true });

// Load plugin manifests to map file paths to field-kind ids
const pluginManifests = import.meta.glob('../../../../../plugins/*/plugin.json', { eager: true });

interface ManifestEntry {
  id: string;
  frontendEntry: string;
}

interface AlarmTypeManifestEntry {
  kind: string;
  frontendEntry: string;
  backendClass?: string;
}

interface PluginManifest {
  id: string;
  fieldKinds?: ManifestEntry[];
  stepKinds?: ManifestEntry[];
  alarmTypes?: AlarmTypeManifestEntry[];
}

// Dynamically import plugin alarm-type specs at build time
const alarmTypeModules = import.meta.glob('../../../../../plugins/*/frontend/alarmTypes/*.{ts,tsx}', { eager: true });

// Register core built-in alarm types
registerAlarmType(spcOocAlarmType.kind, spcOocAlarmType);

for (const [manifestPath, manifestModule] of Object.entries(pluginManifests)) {
  const manifest = manifestModule as PluginManifest;
  const pluginDir = manifestPath.replace(/\/plugin\.json$/, '');

  if (manifest.fieldKinds) {
    for (const entry of manifest.fieldKinds) {
      const resolvedPath = `${pluginDir}/${entry.frontendEntry.replace(/^\.\//, '')}`;
      const mod = fieldKindModules[resolvedPath] as { default: FieldKindSpec } | undefined;
      if (mod?.default) {
        registerFieldKind(entry.id, mod.default);
      }
    }
  }

  if (manifest.stepKinds) {
    for (const entry of manifest.stepKinds) {
      const resolvedPath = `${pluginDir}/${entry.frontendEntry.replace(/^\.\//, '')}`;
      const mod = stepKindModules[resolvedPath] as { default: StepKindSpec } | undefined;
      if (mod?.default) {
        registerStepKind(entry.id, mod.default);
      }
    }
  }

  if (manifest.alarmTypes) {
    for (const entry of manifest.alarmTypes) {
      const resolvedPath = `${pluginDir}/${entry.frontendEntry.replace(/^\.\//, '')}`;
      const mod = alarmTypeModules[resolvedPath] as { default: AlarmTypeSpec } | undefined;
      if (mod?.default) {
        registerAlarmType(entry.kind, mod.default);
      }
    }
  }
}

export function getDefinition(id: string): WorkflowDefinition | undefined {
  return definitions.get(id);
}

export function getAllDefinitions(): WorkflowDefinition[] {
  return Array.from(definitions.values());
}
