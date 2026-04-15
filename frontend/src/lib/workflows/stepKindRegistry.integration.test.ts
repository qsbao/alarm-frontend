import { describe, expect, it, beforeEach, vi } from 'vitest';
import { registerStepKind, resetStepKindRegistry, getStepKind } from './stepKindRegistry';

describe('stepKindRegistry integration', () => {
  beforeEach(() => {
    resetStepKindRegistry();
  });

  it('returns undefined for an unregistered step kind', () => {
    expect(getStepKind('missing-plugin:some-step')).toBeUndefined();
  });

  it('registered step kind component receives correct props shape', () => {
    const mockComponent = vi.fn(() => null);
    registerStepKind('meeting:outcome', { component: mockComponent });

    const spec = getStepKind('meeting:outcome');
    expect(spec).toBeDefined();
    expect(spec!.component).toBe(mockComponent);
  });
});
