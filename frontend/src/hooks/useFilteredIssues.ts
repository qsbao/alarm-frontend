import type { Issue, IssueStatus, RiskLevel, AlarmType } from '../types';
import { getUserById } from '../lib/users';

export interface IssueFilterParams {
  statusFilter: IssueStatus | 'all';
  riskFilter: RiskLevel | 'all';
  alarmTypeFilter: AlarmType | 'all';
  search: string;
  showMerged: boolean;
}

/**
 * Pure filter predicate for the discover list.
 * Extracted from useIssues so it can be unit-tested without React.
 */
export function matchesFilters(issue: Issue, params: IssueFilterParams): boolean {
  const { statusFilter, riskFilter, alarmTypeFilter, search, showMerged } = params;

  // Hide merged issues by default unless the chip is on or user explicitly filters to Merged
  if (!showMerged && statusFilter !== 'Merged' && issue.status === 'Merged') return false;

  if (riskFilter !== 'all' && issue.riskLevel !== riskFilter) return false;
  if (statusFilter !== 'all' && issue.status !== statusFilter) return false;
  if (alarmTypeFilter !== 'all' && issue.alarmType !== alarmTypeFilter) return false;

  const q = search.trim().toLowerCase();
  if (q) {
    const ownerName = getUserById(issue.ownerId)?.name ?? issue.ownerId;
    const hay = `${issue.title} ${ownerName} ${issue.product} ${issue.id}`.toLowerCase();
    if (!hay.includes(q)) return false;
  }

  return true;
}
