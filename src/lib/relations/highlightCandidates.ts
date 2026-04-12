import type { Issue, IssueStatus } from '../../types';
import { getProductRoute, type RouteOperation } from '../../mocks/routes';

const OPEN_STATUSES: IssueStatus[] = ['Triage', 'Investigating'];

export interface HighlightCandidate {
  operation: RouteOperation;
  existingOpenIssues: Issue[];
}

/**
 * Returns operations on the same product's route occurring strictly before
 * the parent's operation, paired with any existing open issues per operation.
 */
export function listHighlightCandidates(
  parentIssue: Issue,
  allIssues: Issue[],
): HighlightCandidate[] {
  const route = getProductRoute(parentIssue.product);
  if (!route) return [];

  const parentIdx = route.operations.findIndex((op) => op.name === parentIssue.operation);
  if (parentIdx <= 0) return [];

  const upstream = route.operations.slice(0, parentIdx);

  return upstream.map((op) => ({
    operation: op,
    existingOpenIssues: allIssues.filter(
      (iss) =>
        iss.id !== parentIssue.id &&
        iss.product === parentIssue.product &&
        iss.operation === op.name &&
        OPEN_STATUSES.includes(iss.status),
    ),
  }));
}
