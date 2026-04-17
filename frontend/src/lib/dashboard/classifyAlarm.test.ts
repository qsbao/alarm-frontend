import { describe, it, expect } from 'vitest';
import { classifyAlarm } from './classifyAlarm';
import type { Alarm, Issue, ActivityEntry } from '../../types';
import type { WorkflowInstance } from '../workflows/types';
import { getDefinition } from '../workflows/definitions';

function makeAlarm(overrides: Partial<Alarm> = {}): Alarm {
  return {
    id: 'alm-001',
    type: 'spc_ooc',
    severity: 'P1',
    message: 'test',
    alarmTime: '2026-04-17T10:00:00Z',
    alarmDate: '2026-04-17',
    eqpId: 'LITHO-07',
    productId: 'A7-Litho',
    owner: 'user-tanaka',
    department: 'Litho',
    status: 'Open',
    labels: [],
    activity: [],
    ...overrides,
  };
}

function makeIssue(overrides: Partial<Issue> = {}): Issue {
  return {
    id: 'iss-001',
    title: 'Test cause',
    date: '2026-04-17T10:00:00Z',
    riskLevel: 'HIGH_RISK',
    status: 'Triage',
    issueTime: '2026-04-17T09:55:00Z',
    labels: [],
    product: 'A7-Litho',
    ownerId: 'user-tanaka',
    department: 'Litho',
    description: 'test',
    activity: [],
    ...overrides,
  };
}

function createdOnly(): ActivityEntry[] {
  return [
    { id: 'act-0', type: 'created', timestamp: '2026-04-17T09:55:00Z', author: 'system' },
  ];
}

function withComment(): ActivityEntry[] {
  return [
    ...createdOnly(),
    { id: 'act-1', type: 'comment', timestamp: '2026-04-17T10:00:00Z', author: 'user-tanaka', text: 'looking' },
  ];
}

function sparseInstance(overrides: Partial<WorkflowInstance> = {}): WorkflowInstance {
  return {
    definitionId: 'spc_ooc_branching_v1',
    stepStates: {
      chart_owner_comment: { status: 'ongoing' },
      l5_review: { status: 'pending' },
      l4_review: { status: 'pending' },
      pi_comment: { status: 'pending' },
      attach_report: { status: 'pending' },
      verify_calibration: { status: 'pending' },
      meeting: { status: 'pending' },
      lot_disposition: { status: 'pending' },
      resolved: { status: 'pending' },
      closed: { status: 'pending' },
    },
    actors: [],
    ...overrides,
  };
}

describe('classifyAlarm', () => {
  describe('Un-triaged — zero human activity', () => {
    it('classifies an Issue with empty activity as Un-triaged', () => {
      const alarm = makeAlarm();
      const issue = makeIssue();
      const result = classifyAlarm(alarm, issue, getDefinition(issue.workflow?.definitionId ?? ''));
      expect(result).toEqual({ bucket: 'Un-triaged', stage: 'un-triaged', meetingBound: false });
    });

    it('classifies an Issue with only auto-created activity as Un-triaged', () => {
      const alarm = makeAlarm();
      const issue = makeIssue({ activity: createdOnly() });
      const result = classifyAlarm(alarm, issue, getDefinition(issue.workflow?.definitionId ?? ''));
      expect(result.bucket).toBe('Un-triaged');
      expect(result.stage).toBe('un-triaged');
      expect(result.meetingBound).toBe(false);
    });

    it('Un-triaged takes precedence even if a workflow is attached but no human acted', () => {
      const alarm = makeAlarm();
      const issue = makeIssue({
        activity: createdOnly(),
        workflow: sparseInstance(),
      });
      const result = classifyAlarm(alarm, issue, getDefinition(issue.workflow!.definitionId));
      expect(result.bucket).toBe('Un-triaged');
    });
  });

  describe('In-workflow — pre-meeting', () => {
    it('classifies a pre-meeting ongoing step with human activity as In-workflow + pre-meeting', () => {
      const alarm = makeAlarm();
      const issue = makeIssue({
        status: 'Investigating',
        activity: withComment(),
        workflow: sparseInstance(), // chart_owner_comment ongoing (order 1)
      });
      const result = classifyAlarm(alarm, issue, getDefinition(issue.workflow!.definitionId));
      expect(result.bucket).toBe('In-workflow');
      expect(result.stage).toBe('pre-meeting');
      expect(result.meetingBound).toBe(false);
    });

    it('classifies l5_review as pre-meeting (order 2, before meeting at order 7)', () => {
      const alarm = makeAlarm();
      const issue = makeIssue({
        status: 'Investigating',
        activity: withComment(),
        workflow: sparseInstance({
          stepStates: {
            chart_owner_comment: { status: 'completed', completedAt: '2026-04-17T10:05:00Z', completedBy: 'user-tanaka' },
            l5_review: { status: 'ongoing' },
            l4_review: { status: 'pending' },
            pi_comment: { status: 'pending' },
            attach_report: { status: 'pending' },
            verify_calibration: { status: 'pending' },
            meeting: { status: 'pending' },
            lot_disposition: { status: 'pending' },
            resolved: { status: 'pending' },
            closed: { status: 'pending' },
          },
        }),
      });
      const result = classifyAlarm(alarm, issue, getDefinition(issue.workflow!.definitionId));
      expect(result.stage).toBe('pre-meeting');
      expect(result.bucket).toBe('In-workflow');
    });
  });

  describe('In-workflow — meeting step', () => {
    it('marks meetingBound true when meeting step is ongoing and returns stage "meeting"', () => {
      const alarm = makeAlarm();
      const issue = makeIssue({
        status: 'Investigating',
        activity: withComment(),
        workflow: sparseInstance({
          stepStates: {
            chart_owner_comment: { status: 'completed', completedAt: '2026-04-17T10:05:00Z', completedBy: 'user-tanaka' },
            l5_review: { status: 'completed', completedAt: '2026-04-17T10:10:00Z', completedBy: 'user-tanaka' },
            l4_review: { status: 'completed', completedAt: '2026-04-17T10:15:00Z', completedBy: 'user-tanaka' },
            pi_comment: { status: 'completed', completedAt: '2026-04-17T10:20:00Z', completedBy: 'user-tanaka' },
            attach_report: { status: 'skipped', skippedAt: '2026-04-17T10:16:00Z', skippedBy: 'user-tanaka' },
            verify_calibration: { status: 'skipped', skippedAt: '2026-04-17T10:17:00Z', skippedBy: 'user-tanaka' },
            meeting: {
              status: 'ongoing',
              payload: {
                entries: [
                  {
                    kind: 'scheduled',
                    scheduledTime: '2026-04-17T17:00:00Z',
                    recordedBy: 'user-tanaka',
                    recordedAt: '2026-04-17T10:21:00Z',
                  },
                ],
              },
            },
            lot_disposition: { status: 'pending' },
            resolved: { status: 'pending' },
            closed: { status: 'pending' },
          },
        }),
      });
      const result = classifyAlarm(alarm, issue, getDefinition(issue.workflow!.definitionId));
      expect(result.bucket).toBe('In-workflow');
      expect(result.stage).toBe('meeting');
      expect(result.meetingBound).toBe(true);
      expect(result.meetingTime).toBe('2026-04-17T17:00:00Z');
    });

    it('meetingBound true but meetingTime undefined when meeting has no scheduled entry yet', () => {
      const alarm = makeAlarm();
      const issue = makeIssue({
        status: 'Investigating',
        activity: withComment(),
        workflow: sparseInstance({
          stepStates: {
            chart_owner_comment: { status: 'completed', completedAt: '2026-04-17T10:05:00Z', completedBy: 'user-tanaka' },
            l5_review: { status: 'completed', completedAt: '2026-04-17T10:10:00Z', completedBy: 'user-tanaka' },
            l4_review: { status: 'completed', completedAt: '2026-04-17T10:15:00Z', completedBy: 'user-tanaka' },
            pi_comment: { status: 'completed', completedAt: '2026-04-17T10:20:00Z', completedBy: 'user-tanaka' },
            attach_report: { status: 'skipped', skippedAt: '2026-04-17T10:16:00Z', skippedBy: 'user-tanaka' },
            verify_calibration: { status: 'skipped', skippedAt: '2026-04-17T10:17:00Z', skippedBy: 'user-tanaka' },
            meeting: { status: 'ongoing' },
            lot_disposition: { status: 'pending' },
            resolved: { status: 'pending' },
            closed: { status: 'pending' },
          },
        }),
      });
      const result = classifyAlarm(alarm, issue, getDefinition(issue.workflow!.definitionId));
      expect(result.meetingBound).toBe(true);
      expect(result.meetingTime).toBeUndefined();
    });
  });

  describe('In-workflow — post-meeting', () => {
    it('classifies lot_disposition ongoing as post-meeting (order 8 > meeting order 7)', () => {
      const alarm = makeAlarm();
      const issue = makeIssue({
        status: 'Investigating',
        activity: withComment(),
        workflow: sparseInstance({
          stepStates: {
            chart_owner_comment: { status: 'completed', completedAt: '2026-04-17T10:05:00Z', completedBy: 'user-tanaka' },
            l5_review: { status: 'completed', completedAt: '2026-04-17T10:10:00Z', completedBy: 'user-tanaka' },
            l4_review: { status: 'completed', completedAt: '2026-04-17T10:15:00Z', completedBy: 'user-tanaka' },
            pi_comment: { status: 'completed', completedAt: '2026-04-17T10:20:00Z', completedBy: 'user-tanaka' },
            attach_report: { status: 'skipped', skippedAt: '2026-04-17T10:16:00Z', skippedBy: 'user-tanaka' },
            verify_calibration: { status: 'skipped', skippedAt: '2026-04-17T10:17:00Z', skippedBy: 'user-tanaka' },
            meeting: { status: 'completed', completedAt: '2026-04-17T17:30:00Z', completedBy: 'user-tanaka' },
            lot_disposition: { status: 'ongoing' },
            resolved: { status: 'pending' },
            closed: { status: 'pending' },
          },
        }),
      });
      const result = classifyAlarm(alarm, issue, getDefinition(issue.workflow!.definitionId));
      expect(result.stage).toBe('post-meeting');
      expect(result.bucket).toBe('In-workflow');
      expect(result.meetingBound).toBe(false);
    });

    it('LOW_RISK skipped meeting → stage is post-meeting when a later step is ongoing', () => {
      const alarm = makeAlarm();
      const issue = makeIssue({
        riskLevel: 'LOW_RISK',
        status: 'Investigating',
        activity: withComment(),
        workflow: sparseInstance({
          stepStates: {
            chart_owner_comment: { status: 'completed', completedAt: '2026-04-17T10:05:00Z', completedBy: 'user-tanaka' },
            l5_review: { status: 'completed', completedAt: '2026-04-17T10:10:00Z', completedBy: 'user-tanaka' },
            l4_review: { status: 'completed', completedAt: '2026-04-17T10:15:00Z', completedBy: 'user-tanaka' },
            pi_comment: { status: 'completed', completedAt: '2026-04-17T10:20:00Z', completedBy: 'user-tanaka' },
            attach_report: { status: 'skipped', skippedAt: '2026-04-17T10:16:00Z', skippedBy: 'user-tanaka' },
            verify_calibration: { status: 'skipped', skippedAt: '2026-04-17T10:17:00Z', skippedBy: 'user-tanaka' },
            // LOW_RISK: meeting skipped
            meeting: { status: 'skipped', skippedAt: '2026-04-17T10:21:00Z', skippedBy: 'user-tanaka' },
            lot_disposition: { status: 'skipped', skippedAt: '2026-04-17T10:22:00Z', skippedBy: 'user-tanaka' },
            resolved: { status: 'ongoing' },
            closed: { status: 'pending' },
          },
        }),
      });
      const result = classifyAlarm(alarm, issue, getDefinition(issue.workflow!.definitionId));
      expect(result.stage).toBe('post-meeting');
      expect(result.bucket).toBe('In-workflow');
      expect(result.meetingBound).toBe(false);
    });
  });

  describe('Done — terminal workflow', () => {
    it('classifies a workflow with completedAt as Done', () => {
      const alarm = makeAlarm();
      const issue = makeIssue({
        status: 'Closed',
        activity: withComment(),
        workflow: sparseInstance({
          stepStates: {
            chart_owner_comment: { status: 'completed', completedAt: '2026-04-17T10:05:00Z', completedBy: 'user-tanaka' },
            l5_review: { status: 'completed', completedAt: '2026-04-17T10:10:00Z', completedBy: 'user-tanaka' },
            l4_review: { status: 'completed', completedAt: '2026-04-17T10:15:00Z', completedBy: 'user-tanaka' },
            pi_comment: { status: 'completed', completedAt: '2026-04-17T10:20:00Z', completedBy: 'user-tanaka' },
            attach_report: { status: 'skipped', skippedAt: '2026-04-17T10:16:00Z', skippedBy: 'user-tanaka' },
            verify_calibration: { status: 'skipped', skippedAt: '2026-04-17T10:17:00Z', skippedBy: 'user-tanaka' },
            meeting: { status: 'completed', completedAt: '2026-04-17T17:30:00Z', completedBy: 'user-tanaka' },
            lot_disposition: { status: 'completed', completedAt: '2026-04-17T18:00:00Z', completedBy: 'user-tanaka' },
            resolved: { status: 'completed', completedAt: '2026-04-17T18:05:00Z', completedBy: 'user-tanaka' },
            closed: { status: 'completed', completedAt: '2026-04-17T18:10:00Z', completedBy: 'user-tanaka' },
          },
          completedAt: '2026-04-17T18:10:00Z',
        }),
      });
      const result = classifyAlarm(alarm, issue, getDefinition(issue.workflow!.definitionId));
      expect(result.bucket).toBe('Done');
      expect(result.stage).toBe('done');
      expect(result.meetingBound).toBe(false);
    });

    it('classifies an Issue with status "Resolved" as Done even without workflow.completedAt', () => {
      const alarm = makeAlarm();
      const issue = makeIssue({
        status: 'Resolved',
        activity: withComment(),
      });
      const result = classifyAlarm(alarm, issue, undefined);
      expect(result.bucket).toBe('Done');
      expect(result.stage).toBe('done');
    });

    it('classifies an Issue with status "Closed" as Done', () => {
      const alarm = makeAlarm();
      const issue = makeIssue({
        status: 'Closed',
        activity: withComment(),
      });
      const result = classifyAlarm(alarm, issue, undefined);
      expect(result.bucket).toBe('Done');
      expect(result.stage).toBe('done');
    });
  });
});
