import { describe, expect, it, beforeEach } from 'vitest';
import {
  registerStepKind,
  getStepKind,
  resetStepKindRegistry,
  type StepKindSpec,
} from './stepKindRegistry';

describe('stepKindRegistry', () => {
  beforeEach(() => {
    resetStepKindRegistry();
  });

  it('registers and retrieves a step kind by id', () => {
    const spec: StepKindSpec = { component: () => null };
    registerStepKind('meeting:outcome', spec);
    expect(getStepKind('meeting:outcome')).toBe(spec);
  });

  it('returns undefined for an unknown kind', () => {
    expect(getStepKind('nonexistent:kind')).toBeUndefined();
  });

  it('throws on duplicate id registration', () => {
    const spec: StepKindSpec = { component: () => null };
    registerStepKind('meeting:outcome', spec);
    expect(() => registerStepKind('meeting:outcome', spec))
      .toThrowError('Duplicate step kind id: meeting:outcome');
  });

  it('reset clears all registrations', () => {
    registerStepKind('a:one', { component: () => null });
    resetStepKindRegistry();
    expect(getStepKind('a:one')).toBeUndefined();
  });
});
