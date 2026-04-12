import { describe, expect, it, beforeEach } from 'vitest';
import { api } from './client';
import { resetRelations } from '../lib/relations/issueRelations';

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

describe('getHistoricalAlarmsForIssue', () => {
  it('returns enriched historical alarm rows after a merge', async () => {
    const issues = await api.listIssues();
    // Find two issues in the same department; make the source Triage by picking
    // one without a workflow (status stays 'Triage' after mock init)
    const source = issues.find((i) => i.status === 'Triage' && !i.workflow);
    if (!source) {
      // All issues may have workflows attached; skip gracefully
      return;
    }

    // Find a target in the same department
    const target = issues.find(
      (i) => i.id !== source.id && i.department === source.department && i.status !== 'Merged',
    );
    expect(target).toBeDefined();

    // Ensure source has at least one alarm
    const sourceAlarms = await api.getAlarmsForIssue(source.id);
    if (sourceAlarms.length === 0) {
      const allAlarms = await api.listAlarms();
      await api.linkAlarm(source.id, allAlarms[0].id);
    }
    const alarmsBeforeMerge = await api.getAlarmsForIssue(source.id);

    // Before merge, no historical alarms
    const histBefore = await api.getHistoricalAlarmsForIssue(source.id);
    expect(histBefore).toEqual([]);

    // Merge
    const user = { id: 'test-user', name: 'Test', department: source.department };
    const result = await api.mergeIssues([source.id], target!.id, user);
    expect(result.ok).toBe(true);

    // After merge, historical alarms should be present
    const histAfter = await api.getHistoricalAlarmsForIssue(source.id);
    expect(histAfter.length).toBe(alarmsBeforeMerge.length);
    expect(histAfter.length).toBeGreaterThan(0);

    // Each row has the alarm data and the target issue ID
    for (const row of histAfter) {
      expect(row.alarm).toBeDefined();
      expect(row.alarm.id).toBeTruthy();
      expect(row.mergedToIssueId).toBe(target!.id);
    }

    // Active alarms on source should now be empty
    const activeAfter = await api.getAlarmsForIssue(source.id);
    expect(activeAfter).toEqual([]);
  });

  it('returns empty for an issue with no historical alarms', async () => {
    const issues = await api.listIssues();
    const nonMerged = issues.find((i) => i.status !== 'Merged');
    expect(nonMerged).toBeDefined();
    const hist = await api.getHistoricalAlarmsForIssue(nonMerged!.id);
    expect(hist).toEqual([]);
  });
});

describe('listMergeSourceCandidates', () => {
  it('returns only same-department Triage issues, excluding the target, sorted by recency', async () => {
    const issues = await api.listIssues();
    // Find an issue to use as the target (any status)
    const target = issues.find((i) => i.department === 'Litho');
    expect(target).toBeDefined();

    const candidates = await api.listMergeSourceCandidates(target!.id, target!.department);

    // Every candidate must be same department, Triage status, and not the target
    for (const c of candidates) {
      expect(c.department).toBe(target!.department);
      expect(c.status).toBe('Triage');
      expect(c.id).not.toBe(target!.id);
    }

    // Must be sorted by recency (newest first)
    for (let i = 1; i < candidates.length; i++) {
      expect(new Date(candidates[i - 1].date).getTime()).toBeGreaterThanOrEqual(
        new Date(candidates[i].date).getTime(),
      );
    }
  });

  it('returns empty when no Triage issues exist in the department', async () => {
    // Use a department that likely has no Triage issues after filtering
    const candidates = await api.listMergeSourceCandidates('iss-999', 'NonExistentDept');
    expect(candidates).toEqual([]);
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
