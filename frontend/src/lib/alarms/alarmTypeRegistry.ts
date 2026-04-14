import type { ComponentType } from 'react';

export interface AlarmTypeSpec {
  kind: string;
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  panel: ComponentType<{ details: any }>;
  label: string;
  icon: ComponentType<{ size?: number; className?: string }>;
}

const registry = new Map<string, AlarmTypeSpec>();

export function registerAlarmType(kind: string, spec: AlarmTypeSpec): void {
  if (registry.has(kind)) {
    throw new Error(`Duplicate alarm type kind: ${kind}`);
  }
  registry.set(kind, spec);
}

export function getAlarmType(kind: string): AlarmTypeSpec | undefined {
  return registry.get(kind);
}

export function getAllAlarmTypes(): AlarmTypeSpec[] {
  return Array.from(registry.values());
}

export function resetAlarmTypeRegistry(): void {
  registry.clear();
}
