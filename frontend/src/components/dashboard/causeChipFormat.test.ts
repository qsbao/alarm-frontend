import { describe, it, expect } from 'vitest';
import { formatCauseChipSuffix } from './causeChipFormat';

describe('formatCauseChipSuffix', () => {
  it('returns empty string when the cause cluster has one alarm (self-only)', () => {
    expect(formatCauseChipSuffix(1)).toBe('');
  });

  it('returns "+N alarms" when there are siblings', () => {
    expect(formatCauseChipSuffix(2)).toBe('+1 alarm');
    expect(formatCauseChipSuffix(5)).toBe('+4 alarms');
  });

  it('treats zero cluster size as empty (no cause linkage)', () => {
    expect(formatCauseChipSuffix(0)).toBe('');
  });
});
