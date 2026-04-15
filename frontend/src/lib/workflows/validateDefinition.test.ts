import { describe, expect, it } from 'vitest';
import { validateDefinition } from './validateDefinition';
import type { WorkflowDefinition } from './types';

function makeDef(overrides: Partial<WorkflowDefinition['steps'][0]>): WorkflowDefinition {
  return {
    id: 'test_v1',
    name: 'Test',
    version: '1',
    steps: [
      {
        id: 'step1',
        label: 'Step 1',
        order: 1,
        preSteps: [],
        ...overrides,
      },
    ],
    requiredRoles: [],
  };
}

describe('validateDefinition', () => {
  it('accepts a step with stepKind and no payloadSchema', () => {
    expect(() => validateDefinition(makeDef({ stepKind: 'meeting:outcome' }))).not.toThrow();
  });

  it('accepts a step with payloadSchema and no stepKind', () => {
    expect(() =>
      validateDefinition(
        makeDef({
          payloadSchema: {
            comment: { kind: 'text', label: 'Comment', required: false },
          },
        }),
      ),
    ).not.toThrow();
  });

  it('accepts a step with neither stepKind nor payloadSchema', () => {
    expect(() => validateDefinition(makeDef({}))).not.toThrow();
  });

  it('accepts a step with stepKind and empty payloadSchema', () => {
    expect(() =>
      validateDefinition(makeDef({ stepKind: 'meeting:outcome', payloadSchema: {} })),
    ).not.toThrow();
  });

  it('throws when a step declares both stepKind and non-empty payloadSchema', () => {
    expect(() =>
      validateDefinition(
        makeDef({
          stepKind: 'meeting:outcome',
          payloadSchema: {
            comment: { kind: 'text', label: 'Comment', required: false },
          },
        }),
      ),
    ).toThrowError(
      'Step "step1" declares both stepKind and a non-empty payloadSchema',
    );
  });
});
