import type { ActivityEntry, ActivityType, Alarm, Issue, IssueStatus } from '../types';
import { MOCK_ALARMS } from '../mocks/alarms';
import { MOCK_ISSUES } from '../mocks/issues';

const CURRENT_USER = 'demo.user';

// Module-level mutable copies of the seed arrays — clones at import time.
const issues: Issue[] = MOCK_ISSUES.map((i) => ({
  ...i,
  relatedAlarmIds: [...i.relatedAlarmIds],
  activity: i.activity.map((a) => ({ ...a })),
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
    // Return shallow clones so callers can't mutate the store directly.
    return issues.map((i) => ({
      ...i,
      relatedAlarmIds: [...i.relatedAlarmIds],
      activity: i.activity.map((a) => ({ ...a })),
    }));
  },

  async getIssue(id: string): Promise<Issue | undefined> {
    await delay();
    const issue = issues.find((i) => i.id === id);
    if (!issue) return undefined;
    return {
      ...issue,
      relatedAlarmIds: [...issue.relatedAlarmIds],
      activity: issue.activity.map((a) => ({ ...a })),
    };
  },

  async updateIssueStatus(id: string, next: IssueStatus): Promise<Issue> {
    await delay();
    const issue = findIssue(id);
    const from = issue.status;
    issue.status = next;
    appendActivity(issue, 'status_change', { fromStatus: from, toStatus: next });
    return {
      ...issue,
      relatedAlarmIds: [...issue.relatedAlarmIds],
      activity: issue.activity.map((a) => ({ ...a })),
    };
  },

  async assignIssueOwner(id: string, ownerId: string): Promise<Issue> {
    await delay();
    const issue = findIssue(id);
    issue.ownerId = ownerId;
    appendActivity(issue, 'assignment', { assignedTo: ownerId });
    return {
      ...issue,
      relatedAlarmIds: [...issue.relatedAlarmIds],
      activity: issue.activity.map((a) => ({ ...a })),
    };
  },

  async addComment(id: string, text: string): Promise<Issue> {
    await delay();
    const issue = findIssue(id);
    appendActivity(issue, 'comment', { text });
    return {
      ...issue,
      relatedAlarmIds: [...issue.relatedAlarmIds],
      activity: issue.activity.map((a) => ({ ...a })),
    };
  },

  async linkAlarm(id: string, alarmId: string): Promise<Issue> {
    await delay();
    const issue = findIssue(id);
    if (!issue.relatedAlarmIds.includes(alarmId)) {
      issue.relatedAlarmIds.push(alarmId);
      appendActivity(issue, 'alarm_linked', { alarmId });
    }
    return {
      ...issue,
      relatedAlarmIds: [...issue.relatedAlarmIds],
      activity: issue.activity.map((a) => ({ ...a })),
    };
  },

  async unlinkAlarm(id: string, alarmId: string): Promise<Issue> {
    await delay();
    const issue = findIssue(id);
    const idx = issue.relatedAlarmIds.indexOf(alarmId);
    if (idx >= 0) {
      issue.relatedAlarmIds.splice(idx, 1);
      appendActivity(issue, 'alarm_unlinked', { alarmId });
    }
    return {
      ...issue,
      relatedAlarmIds: [...issue.relatedAlarmIds],
      activity: issue.activity.map((a) => ({ ...a })),
    };
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
    return {
      ...issue,
      relatedAlarmIds: [...issue.relatedAlarmIds],
      activity: issue.activity.map((a) => ({ ...a })),
    };
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
