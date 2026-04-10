import type { AlarmType } from '../types';

export interface RoutingResult {
  owner: string;
  department: string;
}

const ROUTING_TABLE: Record<AlarmType, RoutingResult> = {
  TempSpike: { owner: 'H. Tanaka', department: 'Litho' },
  PressureDrop: { owner: 'M. Chen', department: 'Etch' },
  FlowAnomaly: { owner: 'S. Patel', department: 'Etch' },
  ChamberLeak: { owner: 'K. Müller', department: 'Facilities' },
  VoltageSag: { owner: 'L. Rossi', department: 'Litho' },
  ParticleCount: { owner: 'J. Smith', department: 'Facilities' },
  VacuumFault: { owner: 'A. Kim', department: 'Etch' },
  RFMismatch: { owner: 'R. Garcia', department: 'Litho' },
  GasFlowDeviation: { owner: 'M. Chen', department: 'Etch' },
  EndpointDrift: { owner: 'S. Patel', department: 'Etch' },
};

export const alarmRouting = {
  route(alarmType: AlarmType): RoutingResult {
    return ROUTING_TABLE[alarmType];
  },
};
