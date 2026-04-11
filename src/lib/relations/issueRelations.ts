import type { IssueStatus } from '../../types';

export interface IssueRelation {
  id: string;
  fromIssueId: string;
  toIssueId: string;
  type: 'blocks';
  createdAt: string;
  createdBy: string;
}

const TERMINAL_STATUSES: IssueStatus[] = ['Resolved', 'Closed'];

let relations: IssueRelation[] = [];
let nextId = 1;

export function addBlocker(
  fromIssueId: string,
  toIssueId: string,
  createdBy: string,
): IssueRelation {
  const existing = relations.find(
    (r) => r.fromIssueId === fromIssueId && r.toIssueId === toIssueId && r.type === 'blocks',
  );
  if (existing) return existing;

  const relation: IssueRelation = {
    id: `rel-${nextId++}`,
    fromIssueId,
    toIssueId,
    type: 'blocks',
    createdAt: new Date().toISOString(),
    createdBy,
  };
  relations.push(relation);
  return relation;
}

export function removeBlocker(fromIssueId: string, toIssueId: string): boolean {
  const idx = relations.findIndex(
    (r) => r.fromIssueId === fromIssueId && r.toIssueId === toIssueId && r.type === 'blocks',
  );
  if (idx < 0) return false;
  relations.splice(idx, 1);
  return true;
}

export function getBlockers(issueId: string): IssueRelation[] {
  return relations.filter((r) => r.fromIssueId === issueId && r.type === 'blocks');
}

export function isBlocked(
  issueId: string,
  getIssueStatus: (id: string) => IssueStatus | undefined,
): boolean {
  const blockers = getBlockers(issueId);
  if (blockers.length === 0) return false;
  return blockers.some((r) => {
    const status = getIssueStatus(r.toIssueId);
    return !status || !TERMINAL_STATUSES.includes(status);
  });
}

export function resetRelations(): void {
  relations = [];
  nextId = 1;
}
