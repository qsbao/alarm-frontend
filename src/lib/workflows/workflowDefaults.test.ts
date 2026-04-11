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

  it('returns generic_linear_v1 for all alarm types', () => {
    for (const type of ALL_ALARM_TYPES) {
      expect(getDefaultWorkflowId(type)).toBe('generic_linear_v1');
    }
  });

  it('returns undefined for undefined alarm type', () => {
    expect(getDefaultWorkflowId(undefined)).toBeUndefined();
  });
});
