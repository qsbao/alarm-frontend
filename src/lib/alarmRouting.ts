import type { AlarmType } from '../types';

export interface RoutingResult {
  owner: string;
  department: string;
  chartOwnerId: string;
}

const ROUTING_TABLE: Record<AlarmType, RoutingResult> = {
  TempSpike: { owner: 'H. Tanaka', department: 'Litho', chartOwnerId: 'user-rossi' },
  PressureDrop: { owner: 'M. Chen', department: 'Etch', chartOwnerId: 'user-patel' },
  FlowAnomaly: { owner: 'S. Patel', department: 'Etch', chartOwnerId: 'user-kim' },
  ChamberLeak: { owner: 'K. Müller', department: 'Facilities', chartOwnerId: 'user-smith' },
  VoltageSag: { owner: 'L. Rossi', department: 'Litho', chartOwnerId: 'user-tanaka' },
  ParticleCount: { owner: 'J. Smith', department: 'Facilities', chartOwnerId: 'user-muller' },
  VacuumFault: { owner: 'A. Kim', department: 'Etch', chartOwnerId: 'user-chen' },
  RFMismatch: { owner: 'R. Garcia', department: 'Litho', chartOwnerId: 'user-garcia' },
  GasFlowDeviation: { owner: 'M. Chen', department: 'Etch', chartOwnerId: 'user-park' },
  EndpointDrift: { owner: 'S. Patel', department: 'Etch', chartOwnerId: 'user-patel' },
};

export const alarmRouting = {
  route(alarmType: AlarmType): RoutingResult {
    return ROUTING_TABLE[alarmType];
  },
};
