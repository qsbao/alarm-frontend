import type { Issue } from '../../types';
import type { UserId } from './types';

export function resolveChartOwner(
  issue: Issue,
  mocks: Record<string, unknown>,
): UserId | undefined {
  const alarms = mocks.alarms as Array<{ id: string; chartOwnerId?: string }> | undefined;
  if (!alarms || !issue.relatedAlarmIds[0]) return undefined;
  const alarm = alarms.find((a) => a.id === issue.relatedAlarmIds[0]);
  return alarm?.chartOwnerId;
}

export function resolvePiEngineer(
  issue: Issue,
  mocks: Record<string, unknown>,
): UserId | undefined {
  const piByDept = mocks.piByDepartment as Record<string, string> | undefined;
  if (!piByDept) return undefined;
  return piByDept[issue.department];
}

export function resolveOwnerL5Manager(
  issue: Issue,
  mocks: Record<string, unknown>,
): UserId | undefined {
  const chain = mocks.managerChain as Record<string, { l5: string; l4: string }> | undefined;
  if (!chain) return undefined;
  return chain[issue.ownerId]?.l5;
}

export function resolveOwnerL4Manager(
  issue: Issue,
  mocks: Record<string, unknown>,
): UserId | undefined {
  const chain = mocks.managerChain as Record<string, { l5: string; l4: string }> | undefined;
  if (!chain) return undefined;
  return chain[issue.ownerId]?.l4;
}
