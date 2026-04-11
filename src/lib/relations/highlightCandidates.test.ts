import { describe, expect, it } from 'vitest';
import { listHighlightCandidates } from './highlightCandidates';
import type { Issue, IssueStatus } from '../../types';

function makeIssue(overrides: Partial<Issue> = {}): Issue {
  return {
    id: 'iss-001',
    title: 'Test',
    date: '2025-01-15T10:00:00Z',
    alarmType: 'TempSpike',
    riskLevel: 'High',
    status: 'Investigating' as IssueStatus,
    issueTime: '2025-01-15T09:55:00Z',
    operation: 'Endpoint detect',
    product: 'A7-Litho',
    ownerId: 'user-owner',
    department: 'Litho',
    description: 'Test',
    relatedAlarmIds: [],
    activity: [],
    ...overrides,
  };
}

describe('listHighlightCandidates', () => {
  it('returns only operations strictly before the parent on the same product route', () => {
    // A7-Litho route: Lot start(0), Wafer transfer(1), Chamber pump-down(2), Recipe step 3(3), Endpoint detect(4), Vent cycle(5)
    // Parent is at "Endpoint detect" (index 4), so upstream = indices 0-3
    const parent = makeIssue({ product: 'A7-Litho', operation: 'Endpoint detect' });
    const result = listHighlightCandidates(parent, []);
    expect(result.map((c) => c.operation.name)).toEqual([
      'Lot start',
      'Wafer transfer',
      'Chamber pump-down',
      'Recipe step 3',
    ]);
  });

  it('returns empty array when parent is at the first operation', () => {
    const parent = makeIssue({ product: 'A7-Litho', operation: 'Lot start' });
    const result = listHighlightCandidates(parent, []);
    expect(result).toEqual([]);
  });

  it('returns empty array when product has no route', () => {
    const parent = makeIssue({ product: 'UNKNOWN-PRODUCT', operation: 'Something' });
    const result = listHighlightCandidates(parent, []);
    expect(result).toEqual([]);
  });

  it('returns empty array when operation is not found on route', () => {
    const parent = makeIssue({ product: 'A7-Litho', operation: 'NonexistentOp' });
    const result = listHighlightCandidates(parent, []);
    expect(result).toEqual([]);
  });

  it('groups existing open issues by operation and excludes resolved/closed ones', () => {
    const parent = makeIssue({ product: 'A7-Litho', operation: 'Recipe step 3' });
    // Upstream: Lot start(0), Wafer transfer(1), Chamber pump-down(2)
    const allIssues: Issue[] = [
      makeIssue({ id: 'iss-010', product: 'A7-Litho', operation: 'Wafer transfer', status: 'Investigating' }),
      makeIssue({ id: 'iss-011', product: 'A7-Litho', operation: 'Wafer transfer', status: 'Resolved' }),
      makeIssue({ id: 'iss-012', product: 'A7-Litho', operation: 'Chamber pump-down', status: 'New' }),
      makeIssue({ id: 'iss-013', product: 'A7-Litho', operation: 'Chamber pump-down', status: 'Closed' }),
      makeIssue({ id: 'iss-014', product: 'A7-Litho', operation: 'Recipe step 3', status: 'Investigating' }), // same op as parent — not upstream
      makeIssue({ id: 'iss-015', product: 'B3-Etch', operation: 'Lot start', status: 'Investigating' }), // different product
    ];
    const result = listHighlightCandidates(parent, allIssues);

    const waferTransfer = result.find((c) => c.operation.name === 'Wafer transfer');
    expect(waferTransfer?.existingOpenIssues.map((i) => i.id)).toEqual(['iss-010']);

    const chamberPump = result.find((c) => c.operation.name === 'Chamber pump-down');
    expect(chamberPump?.existingOpenIssues.map((i) => i.id)).toEqual(['iss-012']);

    const lotStart = result.find((c) => c.operation.name === 'Lot start');
    expect(lotStart?.existingOpenIssues).toEqual([]);
  });

  it('excludes the parent issue itself from existing open issues', () => {
    const parent = makeIssue({ id: 'iss-001', product: 'A7-Litho', operation: 'Wafer transfer' });
    const allIssues: Issue[] = [
      makeIssue({ id: 'iss-001', product: 'A7-Litho', operation: 'Lot start', status: 'Investigating' }),
    ];
    const result = listHighlightCandidates(parent, allIssues);
    const lotStart = result.find((c) => c.operation.name === 'Lot start');
    expect(lotStart?.existingOpenIssues).toEqual([]);
  });
});
