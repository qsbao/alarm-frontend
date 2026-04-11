import { describe, expect, it } from 'vitest';
import { getDefaultWorkflowId } from './workflowDefaults';
import type { AlarmType } from '../../types';

describe('getDefaultWorkflowId', () => {
  const ALL_ALARM_TYPES: AlarmType[] = [
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

  const SPC_OOC_TYPES: AlarmType[] = ['EndpointDrift', 'ParticleCount', 'GasFlowDeviation'];

  it('returns spc_ooc_branching_v1 for SPC OOC alarm types', () => {
    for (const type of SPC_OOC_TYPES) {
      expect(getDefaultWorkflowId(type)).toBe('spc_ooc_branching_v1');
    }
  });

  it('returns generic_linear_v1 for non-SPC-OOC alarm types', () => {
    const nonSpcOoc = ALL_ALARM_TYPES.filter((t) => !SPC_OOC_TYPES.includes(t));
    for (const type of nonSpcOoc) {
      expect(getDefaultWorkflowId(type)).toBe('generic_linear_v1');
    }
  });

  it('returns undefined for undefined alarm type', () => {
    expect(getDefaultWorkflowId(undefined)).toBeUndefined();
  });
});
