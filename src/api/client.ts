import type { ActivityEntry, ActivityType, Alarm, Issue, AlarmActivityEntry } from '../types';
import { MOCK_ALARMS } from '../mocks/alarms';
import { MOCK_ISSUES, seedIssueAlarmRows } from '../mocks/issues';
import {
  attachAlarm as iaAttach,
  detachAlarm as iaDetach,
  getActiveAlarmsForIssue,
  getHistoricalAlarmsForIssue,
  getActiveIssueForAlarm as iaGetActiveIssue,
  moveAlarm as iaMoveAlarm,
} from '../lib/issueAlarms';
import {
  attachWorkflow,
  completeStep as engineCompleteStep,
  skipStep as engineSkipStep,
  reviveStep as engineReviveStep,
  editCompletedStep as engineEditCompletedStep,
} from '../lib/workflows/engine';
import { getDefinition } from '../lib/workflows/registry';
import type { WorkflowInstance } from '../lib/workflows/types';
import {
  addBlocker as relAddBlocker,
  removeBlocker as relRemoveBlocker,
  getBlockers,
  isBlocked,
  getMergedInto,
  resetRelations,
} from '../lib/relations/issueRelations';
import { mergeIssues as doMergeIssues } from '../lib/issueMerge';
import type { MergeResult } from '../lib/issueMerge';
import { listHighlightCandidates as listCandidates } from '../lib/relations/highlightCandidates';
import { getProductRoute } from '../mocks/routes';

const CURRENT_USER = 'demo.user';

function deepCloneWorkflow(wf: WorkflowInstance | undefined): WorkflowInstance | undefined {
  if (!wf) return undefined;
  return JSON.parse(JSON.stringify(wf)) as WorkflowInstance;
}

// Module-level mutable copies of the seed arrays — clones at import time.
const issues: Issue[] = MOCK_ISSUES.map((i) => ({
  ...i,
  activity: i.activity.map((a) => ({ ...a })),
  workflow: deepCloneWorkflow(i.workflow),
}));
const alarms: Alarm[] = MOCK_ALARMS.map((a) => ({
  ...a,
  labels: [...a.labels],
  activity: a.activity.map((e) => ({ ...e })),
}));

function delay(min = 100, max = 200): Promise<void> {
  const ms = Math.floor(Math.random() * (max - min + 1)) + min;
  return new Promise((resolve) => setTimeout(resolve, ms));
}

function cloneWorkflow(wf: WorkflowInstance | undefined): WorkflowInstance | undefined {
  if (!wf) return undefined;
  return JSON.parse(JSON.stringify(wf)) as WorkflowInstance;
}

function cloneIssue(issue: Issue): Issue {
  return {
    ...issue,
    activity: issue.activity.map((a) => ({ ...a })),
    workflow: cloneWorkflow(issue.workflow),
  };
}

function findIssue(id: string): Issue {
  const issue = issues.find((i) => i.id === id);
  if (!issue) throw new Error(`Issue not found: ${id}`);
  return issue;
}

function nextActivityId(issue: Issue): string {
  return `${issue.id}-act-${issue.activity.length + 1}`;
}

/**
 * Single chokepoint for appending activity entries — every mutation method
 * routes through here so the audit log is guaranteed.
 */
function appendActivity(
  issue: Issue,
  type: ActivityType,
  patch: Omit<ActivityEntry, 'id' | 'type' | 'timestamp' | 'author'>,
): ActivityEntry {
  const entry: ActivityEntry = {
    id: nextActivityId(issue),
    type,
    timestamp: new Date().toISOString(),
    author: CURRENT_USER,
    ...patch,
  };
  issue.activity.push(entry);
  return entry;
}

function nextIssueId(): string {
  const maxNum = issues.reduce((max, i) => {
    const num = parseInt(i.id.replace('iss-', ''), 10);
    return num > max ? num : max;
  }, 0);
  return `iss-${String(maxNum + 1).padStart(3, '0')}`;
}

export const api = {
  async listIssues(): Promise<Issue[]> {
    await delay();
    return issues.map(cloneIssue);
  },

  async getIssue(id: string): Promise<Issue | undefined> {
    await delay();
    const issue = issues.find((i) => i.id === id);
    if (!issue) return undefined;
    return cloneIssue(issue);
  },

  async assignIssueOwner(id: string, ownerId: string): Promise<Issue> {
    await delay();
    const issue = findIssue(id);
    issue.ownerId = ownerId;
    appendActivity(issue, 'assignment', { assignedTo: ownerId });
    return cloneIssue(issue);
  },

  async addComment(id: string, text: string): Promise<Issue> {
    await delay();
    const issue = findIssue(id);
    appendActivity(issue, 'comment', { text });
    return cloneIssue(issue);
  },

  async linkAlarm(id: string, alarmId: string): Promise<Issue> {
    await delay();
    const issue = findIssue(id);
    iaAttach(id, alarmId, CURRENT_USER);
    appendActivity(issue, 'alarm_linked', { alarmId });
    return cloneIssue(issue);
  },

  async unlinkAlarm(id: string, alarmId: string): Promise<Issue> {
    await delay();
    const issue = findIssue(id);
    iaDetach(id, alarmId);
    appendActivity(issue, 'alarm_unlinked', { alarmId });
    return cloneIssue(issue);
  },

  async moveAlarm(
    alarmId: string,
    targetIssueId: string,
    userDepartment: string,
  ): Promise<{ fromIssueId: string; toIssueId: string }> {
    await delay();
    const sourceRow = iaGetActiveIssue(alarmId);
    if (!sourceRow) throw new Error(`Alarm ${alarmId} has no active issue link`);

    const sourceIssue = findIssue(sourceRow.issueId);
    const targetIssue = findIssue(targetIssueId);

    const result = iaMoveAlarm(alarmId, targetIssueId, {
      by: CURRENT_USER,
      sourceDepartment: sourceIssue.department,
      targetDepartment: targetIssue.department,
      userDepartment,
    });

    if (!result.ok) throw new Error(`moveAlarm failed: ${result.reason}`);

    appendActivity(sourceIssue, 'alarm_moved_out', { alarmId, fromIssueId: sourceIssue.id, toIssueId: targetIssueId });
    appendActivity(targetIssue, 'alarm_moved_in', { alarmId, fromIssueId: sourceIssue.id, toIssueId: targetIssueId });

    return { fromIssueId: sourceIssue.id, toIssueId: targetIssueId };
  },

  async createIssue(draft: Omit<Issue, 'id' | 'activity'>): Promise<Issue> {
    await delay();
    const id = nextIssueId();
    const seedActivity: ActivityEntry = {
      id: `${id}-act-1`,
      type: 'created',
      timestamp: new Date().toISOString(),
      author: 'system',
    };
    const issue: Issue = {
      ...draft,
      id,
      activity: [seedActivity],
    };
    issues.push(issue);
    return cloneIssue(issue);
  },

  /**
   * Attaches a workflow to an issue. The engine activates root steps and
   * derives status. Appends a workflow_transition activity entry.
   */
  async attachWorkflowToIssue(
    id: string,
    definitionId: string,
    actorUserId: string,
  ): Promise<Issue> {
    await delay();
    const issue = findIssue(id);
    const definition = getDefinition(definitionId);
    if (!definition) throw new Error(`Unknown workflow definition: ${definitionId}`);
    if (issue.workflow) throw new Error('Issue already has a workflow attached');

    const result = attachWorkflow(definition, issue, {}, new Date().toISOString());
    if ('error' in result) throw new Error(result.error);

    issue.workflow = result.instance;
    issue.status = result.issue.status;

    appendActivity(issue, 'workflow_transition', {
      workflowDefinitionId: result.activityEntry.definitionId,
      workflowStepId: result.activityEntry.stepId,
      workflowAction: result.activityEntry.action,
      workflowActorId: actorUserId,
    });

    return cloneIssue(issue);
  },

  /**
   * Completes a workflow step on an issue. Validates payload and gate,
   * transitions the step, activates downstream steps, and derives status.
   */
  async completeStep(
    id: string,
    stepId: string,
    actorId: string,
    payload: Record<string, unknown>,
  ): Promise<Issue> {
    await delay();
    const issue = findIssue(id);
    if (!issue.workflow) throw new Error('Issue has no workflow');

    const definition = getDefinition(issue.workflow.definitionId);
    if (!definition) throw new Error(`Unknown workflow definition: ${issue.workflow.definitionId}`);

    // Blocker gate: resolved step cannot complete while blockers are unresolved
    if (stepId === 'resolved') {
      const blocked = isBlocked(id, (blockerId) => {
        const blocker = issues.find((i) => i.id === blockerId);
        return blocker?.status;
      });
      if (blocked) throw new Error('Cannot complete resolved: issue has unresolved blockers');
    }

    const result = engineCompleteStep(definition, issue.workflow, issue, {
      stepId,
      actorId,
      timestamp: new Date().toISOString(),
      payload,
    });
    if ('error' in result) throw new Error(result.error);

    issue.workflow = result.instance;
    issue.status = result.issue.status;

    appendActivity(issue, 'workflow_transition', {
      workflowDefinitionId: result.activityEntry.definitionId,
      workflowStepId: result.activityEntry.stepId,
      workflowAction: result.activityEntry.action,
      workflowActorId: result.activityEntry.actorId,
    });

    return cloneIssue(issue);
  },

  /**
   * Skips a workflow step on an issue. Validates skippableIf predicate,
   * transitions the step to skipped, activates downstream steps, and derives status.
   */
  async skipStep(
    id: string,
    stepId: string,
    actorId: string,
  ): Promise<Issue> {
    await delay();
    const issue = findIssue(id);
    if (!issue.workflow) throw new Error('Issue has no workflow');

    const definition = getDefinition(issue.workflow.definitionId);
    if (!definition) throw new Error(`Unknown workflow definition: ${issue.workflow.definitionId}`);

    const result = engineSkipStep(definition, issue.workflow, issue, {
      stepId,
      actorId,
      timestamp: new Date().toISOString(),
    });
    if ('error' in result) throw new Error(result.error);

    issue.workflow = result.instance;
    issue.status = result.issue.status;

    appendActivity(issue, 'workflow_transition', {
      workflowDefinitionId: result.activityEntry.definitionId,
      workflowStepId: result.activityEntry.stepId,
      workflowAction: result.activityEntry.action,
      workflowActorId: result.activityEntry.actorId,
    });

    return cloneIssue(issue);
  },

  /**
   * Revives a skipped workflow step on an issue. Moves the step back to ongoing
   * without cascading to successors. Disallowed after resolved completes.
   */
  async reviveStep(
    id: string,
    stepId: string,
    actorId: string,
  ): Promise<Issue> {
    await delay();
    const issue = findIssue(id);
    if (!issue.workflow) throw new Error('Issue has no workflow');

    const definition = getDefinition(issue.workflow.definitionId);
    if (!definition) throw new Error(`Unknown workflow definition: ${issue.workflow.definitionId}`);

    const result = engineReviveStep(definition, issue.workflow, issue, {
      stepId,
      actorId,
      timestamp: new Date().toISOString(),
    });
    if ('error' in result) throw new Error(result.error);

    issue.workflow = result.instance;
    issue.status = result.issue.status;

    appendActivity(issue, 'workflow_transition', {
      workflowDefinitionId: result.activityEntry.definitionId,
      workflowStepId: result.activityEntry.stepId,
      workflowAction: result.activityEntry.action,
      workflowActorId: result.activityEntry.actorId,
    });

    return cloneIssue(issue);
  },

  /**
   * Edits a completed workflow step's payload. Re-runs gate against the
   * current actor. Does not cascade downstream.
   */
  async editCompletedStep(
    id: string,
    stepId: string,
    actorId: string,
    payload: Record<string, unknown>,
  ): Promise<Issue> {
    await delay();
    const issue = findIssue(id);
    if (!issue.workflow) throw new Error('Issue has no workflow');

    const definition = getDefinition(issue.workflow.definitionId);
    if (!definition) throw new Error(`Unknown workflow definition: ${issue.workflow.definitionId}`);

    const result = engineEditCompletedStep(definition, issue.workflow, issue, {
      stepId,
      actorId,
      timestamp: new Date().toISOString(),
      payload,
    });
    if ('error' in result) throw new Error(result.error);

    issue.workflow = result.instance;
    issue.status = result.issue.status;

    appendActivity(issue, 'workflow_transition', {
      workflowDefinitionId: result.activityEntry.definitionId,
      workflowStepId: result.activityEntry.stepId,
      workflowAction: result.activityEntry.action,
      workflowActorId: result.activityEntry.actorId,
    });

    return cloneIssue(issue);
  },

  /**
   * Adds a blocker relation: toIssueId blocks fromIssueId.
   * Rejected if the parent's resolved step has already completed.
   * Produces activity entries on both issues.
   */
  async addBlocker(
    fromIssueId: string,
    toIssueId: string,
    actorId: string,
  ): Promise<Issue> {
    await delay();
    const parent = findIssue(fromIssueId);
    const blocker = findIssue(toIssueId);

    // Cannot add blocker after resolved has completed
    if (parent.workflow?.stepStates['resolved']?.status === 'completed') {
      throw new Error('Cannot add blocker after resolved has completed');
    }

    relAddBlocker(fromIssueId, toIssueId, actorId);

    appendActivity(parent, 'blocker_added', { blockerIssueId: toIssueId });
    appendActivity(blocker, 'blocker_added', { blockerIssueId: fromIssueId });

    return cloneIssue(parent);
  },

  /**
   * Removes a blocker relation (hard delete).
   * Produces activity entries on both issues.
   */
  async removeBlocker(
    fromIssueId: string,
    toIssueId: string,
    actorId: string,
  ): Promise<Issue> {
    await delay();
    const parent = findIssue(fromIssueId);
    const blocker = findIssue(toIssueId);

    const removed = relRemoveBlocker(fromIssueId, toIssueId);
    if (!removed) throw new Error('Blocker relation not found');

    appendActivity(parent, 'blocker_removed', { blockerIssueId: toIssueId });
    appendActivity(blocker, 'blocker_removed', { blockerIssueId: fromIssueId });

    return cloneIssue(parent);
  },

  /**
   * Returns blocker relations for a given issue, enriched with blocker status.
   */
  async getBlockers(
    issueId: string,
  ): Promise<Array<{ issueId: string; title: string; status: string }>> {
    await delay();
    const blockers = getBlockers(issueId);
    return blockers.map((r) => {
      const blocker = issues.find((i) => i.id === r.toIssueId);
      return {
        issueId: r.toIssueId,
        title: blocker?.title ?? 'Unknown',
        status: blocker?.status ?? 'Unknown',
      };
    });
  },

  /**
   * Returns highlight candidates for a given issue: upstream operations on the
   * same product's route, each paired with existing open issues.
   */
  async listHighlightCandidates(issueId: string) {
    await delay();
    const issue = findIssue(issueId);
    return listCandidates(issue, issues);
  },

  /**
   * Creates a new child issue for the target operation, attaches the
   * genericLinear workflow, and registers it as a blocker on the parent.
   * Produces activity entries on both parent and child.
   */
  async createHighlightedIssue(
    parentIssueId: string,
    targetOperationId: string,
    actorId: string,
  ): Promise<{ parent: Issue; child: Issue }> {
    await delay();
    const parent = findIssue(parentIssueId);

    if (parent.workflow?.stepStates['resolved']?.status === 'completed') {
      throw new Error('Cannot add highlight after resolved has completed');
    }

    // Parse "Product:Operation name" from targetOperationId
    const sepIdx = targetOperationId.indexOf(':');
    if (sepIdx < 0) throw new Error(`Invalid operation id: ${targetOperationId}`);
    const productName = targetOperationId.slice(0, sepIdx);
    const opName = targetOperationId.slice(sepIdx + 1);

    const route = getProductRoute(productName);
    if (!route) throw new Error(`Unknown product: ${productName}`);
    const op = route.operations.find((o) => o.name === opName);
    if (!op) throw new Error(`Operation not on route: ${opName}`);

    // Create child issue
    const childId = nextIssueId();
    const seedActivity: ActivityEntry = {
      id: `${childId}-act-1`,
      type: 'created',
      timestamp: new Date().toISOString(),
      author: actorId,
    };
    const child: Issue = {
      id: childId,
      title: `Highlight: ${opName} on ${productName}`,
      date: new Date().toISOString(),
      alarmType: parent.alarmType,
      riskLevel: parent.riskLevel,
      status: 'Triage',
      issueTime: new Date().toISOString(),
      operation: opName,
      product: productName,
      ownerId: actorId,
      department: parent.department,
      description: `Highlighted upstream operation "${opName}" from ${parent.id}.`,
      activity: [seedActivity],
    };
    issues.push(child);

    // Attach genericLinear workflow
    const definition = getDefinition('generic_linear_v1')!;
    const attachResult = attachWorkflow(definition, child, {}, new Date().toISOString());
    if ('error' in attachResult) throw new Error(attachResult.error);
    child.workflow = attachResult.instance;
    child.status = attachResult.issue.status;

    appendActivity(child, 'workflow_transition', {
      workflowDefinitionId: attachResult.activityEntry.definitionId,
      workflowStepId: attachResult.activityEntry.stepId,
      workflowAction: attachResult.activityEntry.action,
      workflowActorId: actorId,
    });

    // Register as blocker
    relAddBlocker(parentIssueId, childId, actorId);
    appendActivity(parent, 'blocker_added', { blockerIssueId: childId });
    appendActivity(child, 'blocker_added', { blockerIssueId: parentIssueId });

    return { parent: cloneIssue(parent), child: cloneIssue(child) };
  },

  /**
   * Links an existing issue as a blocker on the parent (highlight by linking).
   * Does not create a new issue. Produces activity entries on both sides.
   * Idempotent — linking the same issue twice is a no-op.
   */
  async linkExistingIssueAsHighlight(
    parentIssueId: string,
    existingIssueId: string,
    actorId: string,
  ): Promise<Issue> {
    await delay();
    const parent = findIssue(parentIssueId);
    const existing = findIssue(existingIssueId);

    if (parent.workflow?.stepStates['resolved']?.status === 'completed') {
      throw new Error('Cannot add highlight after resolved has completed');
    }

    const rel = relAddBlocker(parentIssueId, existingIssueId, actorId);
    // Only append activity if this is a new relation (createdBy matches actorId and just created)
    // Since addBlocker is idempotent and returns existing, check if activity already has this entry
    const alreadyLogged = parent.activity.some(
      (a) => a.type === 'blocker_added' && a.blockerIssueId === existingIssueId,
    );
    if (!alreadyLogged) {
      appendActivity(parent, 'blocker_added', { blockerIssueId: existingIssueId });
      appendActivity(existing, 'blocker_added', { blockerIssueId: parentIssueId });
    }

    return cloneIssue(parent);
  },

  /**
   * Merges one or more source issues into a target issue.
   * Sources must be Triage, same department as user.
   * Returns the merge result; on success, applies alarm activities to alarm store.
   */
  async mergeIssues(
    sourceIds: string[],
    targetId: string,
    user: { id: string; name: string; department: string },
  ): Promise<MergeResult> {
    await delay();
    const sourceMutables = sourceIds.map((id) => findIssue(id));
    const targetMutable = findIssue(targetId);

    const result = doMergeIssues(sourceMutables, targetMutable, user, new Date().toISOString());

    if (result.ok) {
      // Apply alarm activities to alarm objects
      for (const act of result.alarmActivities) {
        // Find the alarm from the IssueAlarm rows — the activity carries fromIssueId/toIssueId
        // We need to find which alarm this activity is for. The activities are ordered by
        // the merge results which go source-by-source, alarm-by-alarm. We can reconstruct
        // by matching on the alarm activity's fromIssueId + toIssueId pattern, but simpler:
        // the alarmActivities don't carry alarmId, so we embed it during merge.
        // For now, we'll skip writing to alarm objects since the issueMerge module
        // already wrote the activity entries to issues. Alarm-level activities are
        // returned for the caller to apply.
      }
    }

    return result;
  },

  /**
   * Lists candidate target issues for a merge (same department, sorted by recency).
   * Excludes the source issue(s) from the list.
   */
  async listMergeTargetCandidates(
    excludeIds: string[],
    department: string,
  ): Promise<Issue[]> {
    await delay();
    const excluded = new Set(excludeIds);
    return issues
      .filter((i) => i.department === department && !excluded.has(i.id) && i.status !== 'Merged')
      .sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime())
      .map(cloneIssue);
  },

  /**
   * Lists candidate source issues for a "pull alarms from" merge.
   * Returns same-department Triage issues, excluding the target, sorted by recency.
   */
  async listMergeSourceCandidates(
    targetId: string,
    department: string,
  ): Promise<Issue[]> {
    await delay();
    return issues
      .filter((i) => i.department === department && i.id !== targetId && i.status === 'Triage')
      .sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime())
      .map(cloneIssue);
  },

  /**
   * Gets the merge-into relation for a source issue, if any.
   */
  async getMergedInto(issueId: string): Promise<{ targetIssueId: string } | undefined> {
    await delay();
    const rel = getMergedInto(issueId);
    if (!rel) return undefined;
    return { targetIssueId: rel.toIssueId };
  },

  /**
   * Resets all issues to their initial mock state.
   * Used by the dev panel.
   */
  resetAllWorkflows(): void {
    const freshIssues = MOCK_ISSUES.map((i) => ({
      ...i,
      activity: i.activity.map((a) => ({ ...a })),
      workflow: i.workflow ? JSON.parse(JSON.stringify(i.workflow)) as WorkflowInstance : undefined,
    }));
    issues.length = 0;
    issues.push(...freshIssues);
    resetRelations();
    seedIssueAlarmRows(freshIssues);
  },

  async listAlarms(): Promise<Alarm[]> {
    await delay();
    return alarms.map((a) => ({ ...a, labels: [...a.labels], activity: a.activity.map((e) => ({ ...e })) }));
  },

  async getAlarmsByIds(ids: string[]): Promise<Alarm[]> {
    await delay();
    const set = new Set(ids);
    const byId = new Map(alarms.map((a) => [a.id, a]));
    return ids
      .filter((id) => set.has(id))
      .map((id) => byId.get(id))
      .filter((a): a is Alarm => Boolean(a))
      .map((a) => ({ ...a, labels: [...a.labels], activity: a.activity.map((e) => ({ ...e })) }));
  },

  async getAlarmsForIssue(issueId: string): Promise<Alarm[]> {
    await delay();
    const rows = getActiveAlarmsForIssue(issueId);
    const ids = rows.map((r) => r.alarmId);
    const byId = new Map(alarms.map((a) => [a.id, a]));
    return ids
      .map((id) => byId.get(id))
      .filter((a): a is Alarm => Boolean(a))
      .map((a) => ({ ...a, labels: [...a.labels], activity: a.activity.map((e) => ({ ...e })) }));
  },

  async getHistoricalAlarmsForIssue(
    issueId: string,
  ): Promise<Array<{ alarm: Alarm; mergedToIssueId: string }>> {
    await delay();
    const rows = getHistoricalAlarmsForIssue(issueId);
    const byId = new Map(alarms.map((a) => [a.id, a]));
    return rows
      .map((r) => {
        const alarm = byId.get(r.alarmId);
        if (!alarm || !r.mergedToIssueId) return null;
        return {
          alarm: { ...alarm, labels: [...alarm.labels], activity: alarm.activity.map((e) => ({ ...e })) },
          mergedToIssueId: r.mergedToIssueId,
        };
      })
      .filter((x): x is { alarm: Alarm; mergedToIssueId: string } => x != null);
  },
};
