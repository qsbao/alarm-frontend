import type { AlarmType } from '../../types';

/**
 * Maps an alarm type to the default workflow definition id.
 * All alarm types now use the generic linear workflow.
 */
export function getDefaultWorkflowId(alarmType: AlarmType | undefined): string | undefined {
  if (!alarmType) return undefined;
  return 'generic_linear_v1';
}
