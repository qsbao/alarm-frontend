import { describe, expect, it } from 'vitest';
import { getDefaultWorkflowId } from './workflowDefaults';
import type { AlarmType } from '../../types';

describe('getDefaultWorkflowId', () => {
  const SPC_OOC_ALARM_TYPES: AlarmType[] = [
    'TempSpike',
    'PressureDrop',
    'FlowAnomaly',
    'ChamberLeak',
    'VoltageSag',
    'ParticleCount',
    'VacuumFault',
    'RFMismatch',
    'GasFlowDeviation',
    'EndpointDrift',
  ];

  it('returns spc_ooc_v1 for all SPC OOC alarm types', () => {
    for (const type of SPC_OOC_ALARM_TYPES) {
      expect(getDefaultWorkflowId(type)).toBe('spc_ooc_v1');
    }
  });

  it('returns undefined for undefined alarm type', () => {
    expect(getDefaultWorkflowId(undefined)).toBeUndefined();
  });
});
