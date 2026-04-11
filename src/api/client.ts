import type { ActivityEntry, ActivityType, Alarm, Issue } from '../types';
import { MOCK_ALARMS } from '../mocks/alarms';
import { MOCK_ISSUES } from '../mocks/issues';
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
  resetRelations,
} from '../lib/relations/issueRelations';

const CURRENT_USER = 'demo.user';

function deepCloneWorkflow(wf: WorkflowInstance | undefined): WorkflowInstance | undefined {
  if (!wf) return undefined;
  return JSON.parse(JSON.stringify(wf)) as WorkflowInstance;
}

// Module-level mutable copies of the seed arrays — clones at import time.
const issues: Issue[] = MOCK_ISSUES.map((i) => ({
  ...i,
  relatedAlarmIds: [...i.relatedAlarmIds],
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
    relatedAlarmIds: [...issue.relatedAlarmIds],
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
    if (!issue.relatedAlarmIds.includes(alarmId)) {
      issue.relatedAlarmIds.push(alarmId);
      appendActivity(issue, 'alarm_linked', { alarmId });
    }
    return cloneIssue(issue);
  },

  async unlinkAlarm(id: string, alarmId: string): Promise<Issue> {
    await delay();
    const issue = findIssue(id);
    const idx = issue.relatedAlarmIds.indexOf(alarmId);
    if (idx >= 0) {
      issue.relatedAlarmIds.splice(idx, 1);
      appendActivity(issue, 'alarm_unlinked', { alarmId });
    }
    return cloneIssue(issue);
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
   * Resets all issues to their initial mock state.
   * Used by the dev panel.
   */
  resetAllWorkflows(): void {
    const freshIssues = MOCK_ISSUES.map((i) => ({
      ...i,
      relatedAlarmIds: [...i.relatedAlarmIds],
      activity: i.activity.map((a) => ({ ...a })),
      workflow: i.workflow ? JSON.parse(JSON.stringify(i.workflow)) as WorkflowInstance : undefined,
    }));
    issues.length = 0;
    issues.push(...freshIssues);
    resetRelations();
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
};
