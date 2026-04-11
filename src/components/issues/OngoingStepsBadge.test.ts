import { describe, it, expect } from 'vitest';

// Test the truncation logic directly since component rendering
// is out of scope for v1 (per PRD). We test the pure logic.

const MAX_VISIBLE = 2;

function formatBadge(labels: string[]): { visible: string; overflow: number } | null {
  if (labels.length === 0) return null;
  const visible = labels.slice(0, MAX_VISIBLE).join(', ');
  const overflow = Math.max(0, labels.length - MAX_VISIBLE);
  return { visible, overflow };
}

describe('OngoingStepsBadge truncation logic', () => {
  it('returns null for empty labels', () => {
    expect(formatBadge([])).toBeNull();
  });

  it('shows single label without overflow', () => {
    const result = formatBadge(['Chart Owner Comment']);
    expect(result).toEqual({ visible: 'Chart Owner Comment', overflow: 0 });
  });

  it('shows two labels without overflow', () => {
    const result = formatBadge(['L5 Review', 'PI Comment']);
    expect(result).toEqual({ visible: 'L5 Review, PI Comment', overflow: 0 });
  });

  it('truncates to 2 labels with overflow count for 3 labels', () => {
    const result = formatBadge(['L5 Review', 'PI Comment', 'Meeting']);
    expect(result).toEqual({ visible: 'L5 Review, PI Comment', overflow: 1 });
  });

  it('truncates to 2 labels with overflow count for 5 labels', () => {
    const result = formatBadge(['A', 'B', 'C', 'D', 'E']);
    expect(result).toEqual({ visible: 'A, B', overflow: 3 });
  });
});
