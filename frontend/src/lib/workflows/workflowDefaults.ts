import type { AlarmType } from '../../types';

const SPC_OOC_ALARM_TYPES: AlarmType[] = [
  'EndpointDrift',
  'ParticleCount',
  'GasFlowDeviation',
];

/**
 * Maps an alarm type to the default workflow definition id.
 * SPC OOC alarm types use the branching workflow; others use generic linear.
 */
export function getDefaultWorkflowId(alarmType: AlarmType | undefined): string | undefined {
  if (!alarmType) return undefined;
  if (SPC_OOC_ALARM_TYPES.includes(alarmType)) return 'spc_ooc_branching_v1';
  return 'generic_linear_v1';
}
