import { describe, expect, it } from 'vitest';
import { getAllDefinitions } from './index';

describe('example-plugin workflows', () => {
  it('plugin exports two workflow definitions via the registry', () => {
    const allDefs = getAllDefinitions();
    const ids = allDefs.map((d) => d.id);
    expect(ids).toContain('example_linear_v1');
    expect(ids).toContain('example_approval_v1');
  });

  it('example_linear_v1 has correct id and three linear steps', () => {
    const def = getAllDefinitions().find((d) => d.id === 'example_linear_v1')!;
    expect(def).toBeDefined();
    expect(def.name).toBe('Example Linear (Plugin)');
    expect(def.steps).toHaveLength(3);
    expect(def.steps[0].preSteps).toEqual([]);
    expect(def.steps[1].preSteps).toEqual(['start']);
    expect(def.steps[2].preSteps).toEqual(['analyze']);
  });

  it('example_approval_v1 has correct id and approval flow steps', () => {
    const def = getAllDefinitions().find((d) => d.id === 'example_approval_v1')!;
    expect(def).toBeDefined();
    expect(def.name).toBe('Example Approval (Plugin)');
    expect(def.steps.length).toBeGreaterThanOrEqual(3);
    expect(def.steps[0].preSteps).toEqual([]);

    const gatedSteps = def.steps.filter((s) => s.gate);
    expect(gatedSteps.length).toBeGreaterThanOrEqual(1);

    const approvalStep = def.steps.find(
      (s) => s.payloadSchema && Object.values(s.payloadSchema).some((f) => f.kind === 'enum')
    );
    expect(approvalStep).toBeDefined();
  });
});
