import type { AlarmType } from '../../types';

/**
 * Maps an alarm type to the default workflow definition id.
 * For the demo, all alarm types map to SPC OOC v1.
 * Returns undefined if no default workflow applies.
 */
export function getDefaultWorkflowId(alarmType: AlarmType | undefined): string | undefined {
  if (!alarmType) return undefined;
  // All SPC alarm types default to the SPC OOC workflow
  return 'spc_ooc_v1';
}
