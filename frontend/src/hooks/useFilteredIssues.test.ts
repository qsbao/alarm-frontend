import { describe, it, expect } from 'vitest';
import { matchesFilters, type IssueFilterParams } from './useFilteredIssues';
import type { Issue } from '../types';

function makeIssue(overrides: Partial<Issue> = {}): Issue {
  return {
    id: 'iss-test',
    title: 'Test Issue',
    date: '2025-01-01T00:00:00Z',
    alarmType: 'TempSpike',
    riskLevel: 'Medium',
    status: 'Triage',
    issueTime: '2025-01-01T00:00:00Z',
    operation: 'Wafer transfer',
    product: 'A7-Litho',
    ownerId: 'user-tanaka',
    department: 'Litho',
    description: 'test',
    activity: [],
    ...overrides,
  };
}

const DEFAULT_PARAMS: IssueFilterParams = {
  statusFilter: 'all',
  riskFilter: 'all',
  alarmTypeFilter: 'all',
  search: '',
  showMerged: false,
};

describe('matchesFilters — Merged exclusion', () => {
  it('excludes Merged issues by default (showMerged=false, statusFilter=all)', () => {
    const merged = makeIssue({ status: 'Merged' });
    expect(matchesFilters(merged, DEFAULT_PARAMS)).toBe(false);
  });

  it('includes non-Merged issues by default', () => {
    for (const status of ['Triage', 'Investigating', 'Resolved', 'Closed'] as const) {
      const issue = makeIssue({ status });
      expect(matchesFilters(issue, DEFAULT_PARAMS)).toBe(true);
    }
  });

  it('includes Merged issues when showMerged is true', () => {
    const merged = makeIssue({ status: 'Merged' });
    expect(matchesFilters(merged, { ...DEFAULT_PARAMS, showMerged: true })).toBe(true);
  });

  it('includes Merged issues when statusFilter is explicitly Merged', () => {
    const merged = makeIssue({ status: 'Merged' });
    expect(matchesFilters(merged, { ...DEFAULT_PARAMS, statusFilter: 'Merged' })).toBe(true);
  });

  it('existing status filter Triage still works', () => {
    const triage = makeIssue({ status: 'Triage' });
    const investigating = makeIssue({ status: 'Investigating' });
    const params = { ...DEFAULT_PARAMS, statusFilter: 'Triage' as const };
    expect(matchesFilters(triage, params)).toBe(true);
    expect(matchesFilters(investigating, params)).toBe(false);
  });

  it('existing status filter Investigating still works', () => {
    const issue = makeIssue({ status: 'Investigating' });
    const params = { ...DEFAULT_PARAMS, statusFilter: 'Investigating' as const };
    expect(matchesFilters(issue, params)).toBe(true);
  });

  it('risk filter still works', () => {
    const issue = makeIssue({ riskLevel: 'High' });
    expect(matchesFilters(issue, { ...DEFAULT_PARAMS, riskFilter: 'Low' })).toBe(false);
    expect(matchesFilters(issue, { ...DEFAULT_PARAMS, riskFilter: 'High' })).toBe(true);
  });

  it('search filter still works', () => {
    const issue = makeIssue({ title: 'Pressure alarm on tool 5' });
    expect(matchesFilters(issue, { ...DEFAULT_PARAMS, search: 'pressure' })).toBe(true);
    expect(matchesFilters(issue, { ...DEFAULT_PARAMS, search: 'voltage' })).toBe(false);
  });
});
