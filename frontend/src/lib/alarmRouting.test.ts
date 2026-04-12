import { describe, it, expect } from 'vitest';
import { ALL_ALARM_TYPES } from '../types';
import { alarmRouting } from './alarmRouting';

describe('alarmRouting', () => {
  it('route() resolves every AlarmType to an {owner, department}', () => {
    for (const alarmType of ALL_ALARM_TYPES) {
      const result = alarmRouting.route(alarmType);
      expect(result).toHaveProperty('owner');
      expect(result).toHaveProperty('department');
      expect(result).toHaveProperty('chartOwnerId');
      expect(typeof result.owner).toBe('string');
      expect(typeof result.department).toBe('string');
      expect(typeof result.chartOwnerId).toBe('string');
      expect(result.owner.length).toBeGreaterThan(0);
      expect(result.department.length).toBeGreaterThan(0);
      expect(result.chartOwnerId.length).toBeGreaterThan(0);
    }
  });

  it('returns consistent results for the same type', () => {
    const a = alarmRouting.route('TempSpike');
    const b = alarmRouting.route('TempSpike');
    expect(a).toEqual(b);
  });

  it('covers at least Litho, Etch, and Facilities departments', () => {
    const departments = new Set(
      ALL_ALARM_TYPES.map((t) => alarmRouting.route(t).department),
    );
    expect(departments.has('Litho')).toBe(true);
    expect(departments.has('Etch')).toBe(true);
    expect(departments.has('Facilities')).toBe(true);
  });
});
