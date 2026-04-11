import type { ActivityEntry, ActivityType, Alarm, Issue, IssueStatus } from '../types';
import { MOCK_ALARMS } from '../mocks/alarms';
import { MOCK_ISSUES } from '../mocks/issues';
import { applyAction, attachWorkflow } from '../lib/workflows/engine';
import { getDefinition } from '../lib/workflows/registry';
import { checkWorkflowBlock } from '../lib/workflows/statusCoupling';
import type { WorkflowInstance } from '../lib/workflows/types';
import { MANAGER_CHAIN } from '../mocks/managerChain';
import { PI_BY_DEPARTMENT } from '../mocks/piByDepartment';

const CURRENT_USER = 'demo.user';

// Deep-clone a WorkflowInstance from seed data (JSON round-trip is fine for plain data).
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
  return {
    ...wf,
    actors: wf.actors.map((a) => ({ ...a })),
    completedActions: Object.fromEntries(
      Object.entries(wf.completedActions).map(([k, v]) => [k, v.map((r) => ({ ...r, payload: { ...r.payload } }))]),
    ),
    actionHistory: wf.actionHistory.map((r) => ({ ...r, payload: { ...r.payload } })),
  };
}

export class WorkflowBlockError extends Error {
  constructor(
    public readonly workflowName: string,
    public readonly currentPhaseId: string,
  ) {
    super(`Cannot transition: workflow "${workflowName}" is in phase "${currentPhaseId}" and must complete first`);
    this.name = 'WorkflowBlockError';
  }
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

  async updateIssueStatus(id: string, next: IssueStatus): Promise<Issue> {
    await delay();
    const issue = findIssue(id);

    // Workflow coupling: block Resolved/Closed while workflow is non-terminal
    const block = checkWorkflowBlock(issue, next);
    if (block) {
      throw new WorkflowBlockError(block.workflowName, block.currentPhaseId);
    }

    const from = issue.status;
    issue.status = next;
    appendActivity(issue, 'status_change', { fromStatus: from, toStatus: next });
    return cloneIssue(issue);
  },

  async assignIssueOwner(id: string, ownerId: string): Promise<Issue> {
    await delay();
    const issue = findIssue(id);
    issue.ownerId = ownerId;
    // Note: workflow actors remain frozen on owner reassignment (by design)
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
   * Attaches a workflow to an issue. Auto-advances New → Investigating atomically.
   * Returns the updated issue. Appends workflow_transition + optional status_change activity.
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

    const mocks = {
      alarms: alarms.map((a) => ({ id: a.id, chartOwnerId: a.chartOwnerId })),
      piByDepartment: PI_BY_DEPARTMENT as Record<string, string>,
      managerChain: MANAGER_CHAIN as Record<string, { l5: string; l4: string }>,
    };

    const result = attachWorkflow(definition, issue, mocks, new Date().toISOString());
    if ('error' in result) throw new Error(result.error);

    issue.workflow = result.instance;

    // Append workflow_transition activity via the chokepoint
    appendActivity(issue, 'workflow_transition', {
      workflowDefinitionId: result.activityEntry.definitionId,
      workflowPhaseId: result.activityEntry.phaseId,
      workflowActionId: result.activityEntry.actionId,
      workflowActorId: actorUserId,
      workflowFromPhaseId: result.activityEntry.fromPhaseId,
      workflowToPhaseId: result.activityEntry.toPhaseId,
    });

    // Auto-advance New → Investigating atomically
    if (issue.status === 'New') {
      const from = issue.status;
      issue.status = 'Investigating';
      appendActivity(issue, 'status_change', { fromStatus: from, toStatus: 'Investigating' });
    }

    return cloneIssue(issue);
  },

  /**
   * Fires a workflow action on an issue. Wraps the pure engine with side effects:
   * mutates the issue's workflow, appends workflow_transition activity, persists.
   */
  async fireWorkflowAction(
    id: string,
    actionId: string,
    actorId: string,
    payload: Record<string, unknown>,
  ): Promise<Issue> {
    await delay();
    const issue = findIssue(id);
    if (!issue.workflow) throw new Error('Issue has no workflow');

    const definition = getDefinition(issue.workflow.definitionId);
    if (!definition) throw new Error(`Unknown workflow definition: ${issue.workflow.definitionId}`);

    const result = applyAction(definition, issue.workflow, issue, {
      actionId,
      actorId,
      timestamp: new Date().toISOString(),
      payload,
    });
    if ('error' in result) throw new Error(result.error);

    // Mutate the stored issue's workflow
    issue.workflow = result.instance;

    // Append workflow_transition activity via the chokepoint
    appendActivity(issue, 'workflow_transition', {
      workflowDefinitionId: result.activityEntry.definitionId,
      workflowPhaseId: result.activityEntry.phaseId,
      workflowActionId: result.activityEntry.actionId,
      workflowActorId: result.activityEntry.actorId,
      workflowFromPhaseId: result.activityEntry.fromPhaseId,
      workflowToPhaseId: result.activityEntry.toPhaseId,
    });

    return cloneIssue(issue);
  },

  /**
   * Resets all issues to their initial mock state (including curated workflows).
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
  },

  async listAlarms(): Promise<Alarm[]> {
    await delay();
    return alarms.map((a) => ({ ...a, labels: [...a.labels], activity: a.activity.map((e) => ({ ...e })) }));
  },

  async getAlarmsByIds(ids: string[]): Promise<Alarm[]> {
    await delay();
    const set = new Set(ids);
    // Preserve the order of `ids` for stable rendering.
    const byId = new Map(alarms.map((a) => [a.id, a]));
    return ids
      .filter((id) => set.has(id))
      .map((id) => byId.get(id))
      .filter((a): a is Alarm => Boolean(a))
      .map((a) => ({ ...a, labels: [...a.labels], activity: a.activity.map((e) => ({ ...e })) }));
  },
};
