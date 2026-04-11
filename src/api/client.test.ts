import { describe, expect, it, beforeEach } from 'vitest';
import { api } from './client';
import { resetRelations, getBlockers } from '../lib/relations/issueRelations';

beforeEach(() => {
  api.resetAllWorkflows();
  resetRelations();
});

describe('listHighlightCandidates', () => {
  it('returns upstream operations for an issue on a known product/route', async () => {
    const issues = await api.listIssues();
    // Find an issue that's NOT at the first operation on its route
    const candidate = issues.find((iss) => iss.operation !== 'Lot start');
    expect(candidate).toBeDefined();
    const result = await api.listHighlightCandidates(candidate!.id);
    expect(result.length).toBeGreaterThan(0);
    // Every candidate operation should have a name and an existingOpenIssues array
    for (const c of result) {
      expect(c.operation.name).toBeTruthy();
      expect(Array.isArray(c.existingOpenIssues)).toBe(true);
    }
  });

  it('returns empty for an issue at the first operation', async () => {
    const issues = await api.listIssues();
    const first = issues.find((iss) => iss.operation === 'Lot start');
    expect(first).toBeDefined();
    const result = await api.listHighlightCandidates(first!.id);
    expect(result).toEqual([]);
  });
});

describe('createHighlightedIssue', () => {
  it('creates a child issue with genericLinear workflow and registers it as a blocker', async () => {
    const issues = await api.listIssues();
    const parent = issues.find((iss) => iss.operation !== 'Lot start' && iss.status !== 'Closed');
    expect(parent).toBeDefined();

    const candidates = await api.listHighlightCandidates(parent!.id);
    expect(candidates.length).toBeGreaterThan(0);

    const targetOp = candidates[0].operation;
    const { parent: updatedParent, child } = await api.createHighlightedIssue(
      parent!.id,
      targetOp.id,
      'user-tanaka',
    );

    // Child exists with genericLinear workflow
    expect(child.workflow).toBeDefined();
    expect(child.workflow!.definitionId).toBe('generic_linear_v1');

    // Child is on the same product, target operation
    expect(child.product).toBe(parent!.product);
    expect(child.operation).toBe(targetOp.name);

    // Child is registered as blocker on parent
    const blockers = await api.getBlockers(parent!.id);
    expect(blockers.some((b) => b.issueId === child.id)).toBe(true);

    // Activity entries on both sides
    const parentAct = updatedParent.activity.filter((a) => a.type === 'blocker_added');
    expect(parentAct.length).toBeGreaterThan(0);
    expect(parentAct[parentAct.length - 1].blockerIssueId).toBe(child.id);

    const childAct = child.activity.filter((a) => a.type === 'blocker_added');
    expect(childAct.length).toBeGreaterThan(0);
    expect(childAct[childAct.length - 1].blockerIssueId).toBe(parent!.id);
  });
});

describe('linkExistingIssueAsHighlight', () => {
  it('links an existing issue as a blocker without duplicating it', async () => {
    const issues = await api.listIssues();
    const parent = issues.find((iss) => iss.operation !== 'Lot start' && iss.status !== 'Closed');
    const existing = issues.find(
      (iss) => iss.id !== parent!.id && iss.product === parent!.product && iss.status !== 'Closed',
    );
    expect(parent).toBeDefined();
    expect(existing).toBeDefined();

    const updatedParent = await api.linkExistingIssueAsHighlight(
      parent!.id,
      existing!.id,
      'user-tanaka',
    );

    // Blocker relation exists
    const blockers = await api.getBlockers(parent!.id);
    expect(blockers.some((b) => b.issueId === existing!.id)).toBe(true);

    // Issue count didn't change (no new issue created)
    const afterIssues = await api.listIssues();
    expect(afterIssues.length).toBe(issues.length);

    // Activity on both sides
    const parentAct = updatedParent.activity.filter((a) => a.type === 'blocker_added');
    expect(parentAct.length).toBeGreaterThan(0);

    // Linking again should not duplicate
    await api.linkExistingIssueAsHighlight(parent!.id, existing!.id, 'user-tanaka');
    const blockersAfter = await api.getBlockers(parent!.id);
    const count = blockersAfter.filter((b) => b.issueId === existing!.id).length;
    expect(count).toBe(1);
  });
});
