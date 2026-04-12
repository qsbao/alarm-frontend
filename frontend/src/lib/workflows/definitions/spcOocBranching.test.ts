import { describe, expect, it } from 'vitest';
import { spcOocBranchingDefinition } from './spcOocBranching';

describe('spcOocBranchingDefinition', () => {
  it('has the correct id and name', () => {
    expect(spcOocBranchingDefinition.id).toBe('spc_ooc_branching_v1');
    expect(spcOocBranchingDefinition.name).toBe('SPC OOC Branching');
  });

  it('has eight steps matching the PRD step graph', () => {
    expect(spcOocBranchingDefinition.steps).toHaveLength(8);
    const ids = spcOocBranchingDefinition.steps.map((s) => s.id);
    expect(ids).toEqual([
      'chart_owner_comment',
      'l5_review',
      'l4_review',
      'pi_comment',
      'attach_report',
      'meeting',
      'resolved',
      'closed',
    ]);
  });

  it('has the correct preSteps for each step', () => {
    const byId = Object.fromEntries(
      spcOocBranchingDefinition.steps.map((s) => [s.id, s]),
    );
    expect(byId['chart_owner_comment'].preSteps).toEqual([]);
    expect(byId['l5_review'].preSteps).toEqual(['chart_owner_comment']);
    expect(byId['l4_review'].preSteps).toEqual(['l5_review']);
    expect(byId['pi_comment'].preSteps).toEqual(['chart_owner_comment']);
    expect(byId['attach_report'].preSteps).toEqual(['chart_owner_comment']);
    expect(byId['meeting'].preSteps).toEqual(['l4_review', 'pi_comment', 'attach_report']);
    expect(byId['resolved'].preSteps).toEqual(['meeting']);
    expect(byId['closed'].preSteps).toEqual(['resolved']);
  });

  it('attach_report is skippable', () => {
    const step = spcOocBranchingDefinition.steps.find((s) => s.id === 'attach_report')!;
    expect(step.skippableIf).toBeDefined();
    expect(step.skippableIf!({} as any)).toBe(true);
  });

  it('attach_report has report-reference payload schema', () => {
    const step = spcOocBranchingDefinition.steps.find((s) => s.id === 'attach_report')!;
    expect(step.payloadSchema).toBeDefined();
    expect(step.payloadSchema!['reportId'].kind).toBe('report-reference');
  });

  it('resolved and closed have owner-only gates', () => {
    const resolved = spcOocBranchingDefinition.steps.find((s) => s.id === 'resolved')!;
    const closed = spcOocBranchingDefinition.steps.find((s) => s.id === 'closed')!;
    expect(resolved.gate).toBeDefined();
    expect(closed.gate).toBeDefined();
  });
});
