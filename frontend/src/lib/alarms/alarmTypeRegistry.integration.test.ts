import { describe, expect, it, beforeEach } from 'vitest';
import {
  getAlarmType,
  getAllAlarmTypes,
  registerAlarmType,
  resetAlarmTypeRegistry,
  type AlarmTypeSpec,
} from './alarmTypeRegistry';

describe('alarmTypeRegistry integration', () => {
  beforeEach(() => {
    resetAlarmTypeRegistry();
  });

  it('returns undefined for an unregistered alarm kind', () => {
    expect(getAlarmType('nonexistent_kind')).toBeUndefined();
  });

  it('getAllAlarmTypes returns labels and kinds for filter dropdowns', () => {
    const specA: AlarmTypeSpec = {
      kind: 'spc_ooc',
      panel: () => null,
      label: 'SPC OOC',
      icon: () => null,
    };
    const specB: AlarmTypeSpec = {
      kind: 'TempSpike',
      panel: () => null,
      label: 'Temp Spike',
      icon: () => null,
    };
    registerAlarmType('spc_ooc', specA);
    registerAlarmType('TempSpike', specB);

    const all = getAllAlarmTypes();
    expect(all.map((s) => s.kind)).toEqual(['spc_ooc', 'TempSpike']);
    expect(all.map((s) => s.label)).toEqual(['SPC OOC', 'Temp Spike']);
  });
});
