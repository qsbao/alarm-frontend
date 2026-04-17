import type { Alarm, Issue } from '../../types';
import type { WorkflowDefinition, WorkflowInstance } from '../workflows/types';

export type AlarmBucket = 'Un-triaged' | 'In-workflow' | 'Done';
export type AlarmStage =
  | 'un-triaged'
  | 'pre-meeting'
  | 'meeting'
  | 'post-meeting'
  | 'done';

export interface ClassifyAlarmResult {
  bucket: AlarmBucket;
  stage: AlarmStage;
  meetingBound: boolean;
  meetingTime?: string;
}

export function classifyAlarm(
  _alarm: Alarm,
  issue: Issue,
  workflowDefinition: WorkflowDefinition | undefined,
): ClassifyAlarmResult {
  if (hasNoHumanActivity(issue)) {
    return { bucket: 'Un-triaged', stage: 'un-triaged', meetingBound: false };
  }

  const workflow = issue.workflow;

  if (isWorkflowDone(issue, workflow)) {
    return { bucket: 'Done', stage: 'done', meetingBound: false };
  }

  if (!workflow || !workflowDefinition) {
    return { bucket: 'In-workflow', stage: 'pre-meeting', meetingBound: false };
  }

  const ongoingIds = workflowDefinition.steps
    .filter((s) => workflow.stepStates[s.id]?.status === 'ongoing')
    .map((s) => s.id);

  if (ongoingIds.includes('meeting')) {
    return {
      bucket: 'In-workflow',
      stage: 'meeting',
      meetingBound: true,
      meetingTime: extractMeetingTime(workflow),
    };
  }

  const meetingStep = workflowDefinition.steps.find((s) => s.id === 'meeting');
  if (!meetingStep) {
    return { bucket: 'In-workflow', stage: 'pre-meeting', meetingBound: false };
  }

  const meetingOrder = meetingStep.order;
  const hasPostMeetingOngoing = workflowDefinition.steps.some(
    (s) => s.order > meetingOrder && workflow.stepStates[s.id]?.status === 'ongoing',
  );

  if (hasPostMeetingOngoing) {
    return { bucket: 'In-workflow', stage: 'post-meeting', meetingBound: false };
  }

  return { bucket: 'In-workflow', stage: 'pre-meeting', meetingBound: false };
}

function hasNoHumanActivity(issue: Issue): boolean {
  return issue.activity.every((entry) => entry.type === 'created');
}

function isWorkflowDone(issue: Issue, workflow: WorkflowInstance | undefined): boolean {
  if (workflow?.completedAt) return true;
  return issue.status === 'Resolved' || issue.status === 'Closed';
}

function extractMeetingTime(workflow: WorkflowInstance): string | undefined {
  const payload = workflow.stepStates['meeting']?.payload;
  const entries = payload && (payload as { entries?: unknown }).entries;
  if (!Array.isArray(entries)) return undefined;
  for (let i = entries.length - 1; i >= 0; i--) {
    const entry = entries[i] as { kind?: string; scheduledTime?: string } | undefined;
    if (entry?.kind === 'scheduled' && typeof entry.scheduledTime === 'string') {
      return entry.scheduledTime;
    }
  }
  return undefined;
}
