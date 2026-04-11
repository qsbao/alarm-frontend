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

  it('returns spc_ooc_branching_v1 for EndpointDrift', () => {
    expect(getDefaultWorkflowId('EndpointDrift')).toBe('spc_ooc_branching_v1');
  });

  it('returns generic_linear_v1 for non-SPC-OOC alarm types', () => {
    const nonSpcOoc = ALL_ALARM_TYPES.filter((t) => t !== 'EndpointDrift');
    for (const type of nonSpcOoc) {
      expect(getDefaultWorkflowId(type)).toBe('generic_linear_v1');
    }
  });

  it('returns undefined for undefined alarm type', () => {
    expect(getDefaultWorkflowId(undefined)).toBeUndefined();
  });
});
