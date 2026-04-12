import { describe, it, expect, beforeEach } from 'vitest';
import { mockClock } from './mockClock';

describe('mockClock', () => {
  beforeEach(() => {
    mockClock.unfreeze();
  });

  it('now() returns a number close to real time when unfrozen', () => {
    const before = Date.now();
    const result = mockClock.now();
    const after = Date.now();
    expect(result).toBeGreaterThanOrEqual(before);
    expect(result).toBeLessThanOrEqual(after);
  });

  it('freeze(date) locks now() to that value', () => {
    const frozen = new Date('2026-01-15T12:00:00Z').getTime();
    mockClock.freeze(frozen);
    expect(mockClock.now()).toBe(frozen);
    expect(mockClock.now()).toBe(frozen);
  });

  it('unfreeze() returns to real time', () => {
    mockClock.freeze(1000);
    mockClock.unfreeze();
    const result = mockClock.now();
    expect(result).toBeGreaterThan(1000);
  });

  it('advance(ms) shifts frozen time forward', () => {
    const base = new Date('2026-01-15T12:00:00Z').getTime();
    mockClock.freeze(base);
    mockClock.advance(60_000); // 1 minute
    expect(mockClock.now()).toBe(base + 60_000);
  });

  it('advance() throws when not frozen', () => {
    expect(() => mockClock.advance(1000)).toThrow();
  });
});
