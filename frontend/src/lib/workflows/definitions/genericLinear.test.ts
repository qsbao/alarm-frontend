import { describe, expect, it } from 'vitest';
import { genericLinearDefinition } from './genericLinear';

describe('genericLinearDefinition', () => {
  it('has the correct id and name', () => {
    expect(genericLinearDefinition.id).toBe('generic_linear_v1');
    expect(genericLinearDefinition.name).toBe('Generic Linear');
  });

  it('has three steps in order: chart_owner_comment -> resolved -> closed', () => {
    expect(genericLinearDefinition.steps).toHaveLength(3);
    expect(genericLinearDefinition.steps[0].id).toBe('chart_owner_comment');
    expect(genericLinearDefinition.steps[1].id).toBe('resolved');
    expect(genericLinearDefinition.steps[2].id).toBe('closed');

    // preSteps form a linear chain
    expect(genericLinearDefinition.steps[0].preSteps).toEqual([]);
    expect(genericLinearDefinition.steps[1].preSteps).toEqual(['chart_owner_comment']);
    expect(genericLinearDefinition.steps[2].preSteps).toEqual(['resolved']);
  });

  it('has no required roles', () => {
    expect(genericLinearDefinition.requiredRoles).toEqual([]);
  });

  it('closed step accepts an optional comment payload', () => {
    const closedStep = genericLinearDefinition.steps.find((s) => s.id === 'closed')!;
    expect(closedStep.payloadSchema).toBeDefined();
    expect(closedStep.payloadSchema!.comment).toBeDefined();
    expect(closedStep.payloadSchema!.comment.required).toBe(false);
  });
});
