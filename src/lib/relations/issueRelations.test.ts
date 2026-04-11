import { describe, expect, it, beforeEach } from 'vitest';
import {
  addBlocker,
  removeBlocker,
  getBlockers,
  isBlocked,
  resetRelations,
} from './issueRelations';
import type { IssueStatus } from '../../types';

beforeEach(() => {
  resetRelations();
});

describe('issueRelations', () => {
  describe('addBlocker / getBlockers round-trip', () => {
    it('adds a blocker and retrieves it', () => {
      const rel = addBlocker('iss-001', 'iss-002', 'user-a');
      expect(rel.fromIssueId).toBe('iss-001');
      expect(rel.toIssueId).toBe('iss-002');
      expect(rel.type).toBe('blocks');
      expect(rel.createdBy).toBe('user-a');

      const blockers = getBlockers('iss-001');
      expect(blockers).toHaveLength(1);
      expect(blockers[0].toIssueId).toBe('iss-002');
    });

    it('supports multiple blockers on the same issue', () => {
      addBlocker('iss-001', 'iss-002', 'user-a');
      addBlocker('iss-001', 'iss-003', 'user-a');
      expect(getBlockers('iss-001')).toHaveLength(2);
    });

    it('returns empty array for issue with no blockers', () => {
      expect(getBlockers('iss-999')).toEqual([]);
    });

    it('does not duplicate identical blocker', () => {
      addBlocker('iss-001', 'iss-002', 'user-a');
      addBlocker('iss-001', 'iss-002', 'user-b');
      expect(getBlockers('iss-001')).toHaveLength(1);
    });
  });

  describe('removeBlocker', () => {
    it('hard-deletes the relation', () => {
      addBlocker('iss-001', 'iss-002', 'user-a');
      const removed = removeBlocker('iss-001', 'iss-002');
      expect(removed).toBe(true);
      expect(getBlockers('iss-001')).toEqual([]);
    });

    it('returns false when relation does not exist', () => {
      const removed = removeBlocker('iss-001', 'iss-999');
      expect(removed).toBe(false);
    });
  });

  describe('isBlocked', () => {
    const lookup = (statuses: Record<string, IssueStatus>) => (id: string) =>
      statuses[id] as IssueStatus | undefined;

    it('returns true when any blocker is in non-terminal status', () => {
      addBlocker('iss-001', 'iss-002', 'user-a');
      expect(isBlocked('iss-001', lookup({ 'iss-002': 'Investigating' }))).toBe(true);
    });

    it('returns true when blocker is New', () => {
      addBlocker('iss-001', 'iss-002', 'user-a');
      expect(isBlocked('iss-001', lookup({ 'iss-002': 'New' }))).toBe(true);
    });

    it('returns false when all blockers are Resolved', () => {
      addBlocker('iss-001', 'iss-002', 'user-a');
      addBlocker('iss-001', 'iss-003', 'user-a');
      expect(
        isBlocked('iss-001', lookup({ 'iss-002': 'Resolved', 'iss-003': 'Resolved' })),
      ).toBe(false);
    });

    it('returns false when all blockers are Closed', () => {
      addBlocker('iss-001', 'iss-002', 'user-a');
      expect(isBlocked('iss-001', lookup({ 'iss-002': 'Closed' }))).toBe(false);
    });

    it('returns false when mix of Resolved and Closed', () => {
      addBlocker('iss-001', 'iss-002', 'user-a');
      addBlocker('iss-001', 'iss-003', 'user-a');
      expect(
        isBlocked('iss-001', lookup({ 'iss-002': 'Resolved', 'iss-003': 'Closed' })),
      ).toBe(false);
    });

    it('returns true when one blocker terminal and one non-terminal', () => {
      addBlocker('iss-001', 'iss-002', 'user-a');
      addBlocker('iss-001', 'iss-003', 'user-a');
      expect(
        isBlocked('iss-001', lookup({ 'iss-002': 'Resolved', 'iss-003': 'Investigating' })),
      ).toBe(true);
    });

    it('returns false when issue has no blockers', () => {
      expect(isBlocked('iss-001', () => undefined)).toBe(false);
    });

    it('treats unknown status (undefined) as non-terminal', () => {
      addBlocker('iss-001', 'iss-002', 'user-a');
      expect(isBlocked('iss-001', () => undefined)).toBe(true);
    });
  });
});
