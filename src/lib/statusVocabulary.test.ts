import { describe, expect, it } from 'vitest';
import { ALL_ISSUE_STATUSES, type IssueStatus } from '../types';

describe('IssueStatus vocabulary', () => {
  it('includes Triage (renamed from New)', () => {
    expect(ALL_ISSUE_STATUSES).toContain('Triage');
  });

  it('includes Merged as a new terminal status', () => {
    expect(ALL_ISSUE_STATUSES).toContain('Merged');
  });

  it('does not include New', () => {
    expect(ALL_ISSUE_STATUSES).not.toContain('New');
  });

  it('contains exactly the expected statuses', () => {
    expect(ALL_ISSUE_STATUSES).toEqual([
      'Triage',
      'Investigating',
      'Resolved',
      'Closed',
      'Merged',
    ]);
  });

  it('Triage and Merged are assignable to IssueStatus', () => {
    const triage: IssueStatus = 'Triage';
    const merged: IssueStatus = 'Merged';
    expect(triage).toBe('Triage');
    expect(merged).toBe('Merged');
  });
});
