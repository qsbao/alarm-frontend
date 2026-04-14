import { describe, expect, it, beforeEach } from 'vitest';
import {
  registerAlarmType,
  getAlarmType,
  getAllAlarmTypes,
  resetAlarmTypeRegistry,
  type AlarmTypeSpec,
} from './alarmTypeRegistry';

const dummySpec: AlarmTypeSpec = {
  kind: 'test_kind',
  panel: () => null,
  label: 'Test Kind',
  icon: () => null,
};

describe('alarmTypeRegistry', () => {
  beforeEach(() => {
    resetAlarmTypeRegistry();
  });

  it('registers and retrieves an alarm type by kind', () => {
    registerAlarmType('test_kind', dummySpec);
    expect(getAlarmType('test_kind')).toBe(dummySpec);
  });

  it('returns undefined for an unregistered kind', () => {
    expect(getAlarmType('nonexistent')).toBeUndefined();
  });

  it('throws on duplicate kind registration', () => {
    registerAlarmType('test_kind', dummySpec);
    expect(() => registerAlarmType('test_kind', dummySpec))
      .toThrowError('Duplicate alarm type kind: test_kind');
  });

  it('returns all registered alarm types', () => {
    const specA: AlarmTypeSpec = { ...dummySpec, kind: 'a', label: 'A' };
    const specB: AlarmTypeSpec = { ...dummySpec, kind: 'b', label: 'B' };
    registerAlarmType('a', specA);
    registerAlarmType('b', specB);
    const all = getAllAlarmTypes();
    expect(all).toHaveLength(2);
    expect(all).toContainEqual(specA);
    expect(all).toContainEqual(specB);
  });

  it('reset clears the registry', () => {
    registerAlarmType('test_kind', dummySpec);
    resetAlarmTypeRegistry();
    expect(getAlarmType('test_kind')).toBeUndefined();
    expect(getAllAlarmTypes()).toHaveLength(0);
  });
});
