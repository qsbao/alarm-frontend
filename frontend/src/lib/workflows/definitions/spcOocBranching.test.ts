import { describe, expect, it } from 'vitest';
import { spcOocBranchingDefinition } from './spcOocBranching';

describe('spcOocBranchingDefinition', () => {
  it('has the correct id and name', () => {
    expect(spcOocBranchingDefinition.id).toBe('spc_ooc_branching_v1');
    expect(spcOocBranchingDefinition.name).toBe('SPC OOC Branching');
  });

  it('has ten steps matching the PRD step graph', () => {
    expect(spcOocBranchingDefinition.steps).toHaveLength(10);
    const ids = spcOocBranchingDefinition.steps.map((s) => s.id);
    expect(ids).toEqual([
      'chart_owner_comment',
      'l5_review',
      'l4_review',
      'pi_comment',
      'attach_report',
      'verify_calibration',
      'meeting',
      'lot_disposition',
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
    expect(byId['verify_calibration'].preSteps).toEqual(['chart_owner_comment']);
    expect(byId['meeting'].preSteps).toEqual(['l4_review', 'pi_comment', 'attach_report', 'verify_calibration']);
    expect(byId['lot_disposition'].preSteps).toEqual(['meeting']);
    expect(byId['resolved'].preSteps).toEqual(['lot_disposition']);
    expect(byId['closed'].preSteps).toEqual(['resolved']);
  });

  it('attach_report is skippable', () => {
    const step = spcOocBranchingDefinition.steps.find((s) => s.id === 'attach_report')!;
    expect(step.skippableIf).toBeDefined();
    expect(step.skippableIf!({} as any)).toBe(true);
  });

  it('verify_calibration is skippable', () => {
    const step = spcOocBranchingDefinition.steps.find((s) => s.id === 'verify_calibration')!;
    expect(step.skippableIf).toBeDefined();
    expect(step.skippableIf!({} as any)).toBe(true);
  });

  it('verify_calibration has calibration-reference payload schema', () => {
    const step = spcOocBranchingDefinition.steps.find((s) => s.id === 'verify_calibration')!;
    expect(step.payloadSchema).toBeDefined();
    expect(step.payloadSchema!['calibrationId'].kind).toBe('calibration-reference');
  });

  it('attach_report has report-reference payload schema', () => {
    const step = spcOocBranchingDefinition.steps.find((s) => s.id === 'attach_report')!;
    expect(step.payloadSchema).toBeDefined();
    expect(step.payloadSchema!['reportId'].kind).toBe('report-reference');
  });

  it('lot_disposition is skippable', () => {
    const step = spcOocBranchingDefinition.steps.find((s) => s.id === 'lot_disposition')!;
    expect(step.skippableIf).toBeDefined();
    expect(step.skippableIf!({} as any)).toBe(true);
  });

  it('lot_disposition is auto-skipped when riskLevel is Low', () => {
    const step = spcOocBranchingDefinition.steps.find((s) => s.id === 'lot_disposition')!;
    expect(step.defaultSkipIf).toBeDefined();
    expect(step.defaultSkipIf!({ riskLevel: 'Low' } as any)).toBe(true);
    expect(step.defaultSkipIf!({ riskLevel: 'High' } as any)).toBe(false);
  });

  it('lot_disposition has lot-disposition payload schema', () => {
    const step = spcOocBranchingDefinition.steps.find((s) => s.id === 'lot_disposition')!;
    expect(step.payloadSchema).toBeDefined();
    expect(step.payloadSchema!['lotId'].kind).toBe('lot-disposition');
  });

  it('resolved and closed have owner-only gates', () => {
    const resolved = spcOocBranchingDefinition.steps.find((s) => s.id === 'resolved')!;
    const closed = spcOocBranchingDefinition.steps.find((s) => s.id === 'closed')!;
    expect(resolved.gate).toBeDefined();
    expect(closed.gate).toBeDefined();
  });
});
