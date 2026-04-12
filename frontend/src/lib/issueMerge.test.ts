import { describe, expect, it, beforeEach } from 'vitest';
import { mergeIssues } from './issueMerge';
import {
  attachAlarm,
  getActiveAlarmsForIssue,
  getHistoricalAlarmsForIssue,
  resetIssueAlarms,
} from './issueAlarms';
import {
  getMergedInto,
  getMergedSources,
  resetRelations,
} from './relations/issueRelations';
import type { Issue, User } from '../types';

const lithoUser: User = { id: 'user-tanaka', name: 'H. Tanaka', department: 'Litho' };
const etchUser: User = { id: 'user-chen', name: 'M. Chen', department: 'Etch' };
const NOW = '2025-06-15T10:00:00Z';

function makeIssue(overrides: Partial<Issue> = {}): Issue {
  return {
    id: 'iss-001',
    title: 'Test Issue',
    date: '2025-01-15T10:00:00Z',
    alarmType: 'TempSpike',
    riskLevel: 'High',
    status: 'Triage',
    issueTime: '2025-01-15T09:55:00Z',
    operation: 'Lithography',
    product: 'A7-Litho',
    ownerId: 'user-tanaka',
    department: 'Litho',
    description: 'Test',
    activity: [],
    ...overrides,
  };
}

beforeEach(() => {
  resetIssueAlarms();
  resetRelations();
});

describe('issueMerge', () => {
  describe('validation', () => {
    it('returns source_not_triage when a source is not in Triage', () => {
      const source = makeIssue({ id: 'iss-001', status: 'Investigating' });
      const target = makeIssue({ id: 'iss-002' });

      const result = mergeIssues([source], target, lithoUser, NOW);

      expect(result.ok).toBe(false);
      if (!result.ok) expect(result.reason).toBe('source_not_triage');
    });

    it('returns target_is_source when target equals a source', () => {
      const source = makeIssue({ id: 'iss-001' });
      const target = makeIssue({ id: 'iss-001' });

      const result = mergeIssues([source], target, lithoUser, NOW);

      expect(result.ok).toBe(false);
      if (!result.ok) expect(result.reason).toBe('target_is_source');
    });

    it('returns permission_denied when source is in different department', () => {
      const source = makeIssue({ id: 'iss-001', department: 'Etch' });
      const target = makeIssue({ id: 'iss-002', department: 'Litho' });

      const result = mergeIssues([source], target, lithoUser, NOW);

      expect(result.ok).toBe(false);
      if (!result.ok) expect(result.reason).toBe('permission_denied');
    });

    it('returns permission_denied when target is in different department', () => {
      const source = makeIssue({ id: 'iss-001', department: 'Litho' });
      const target = makeIssue({ id: 'iss-002', department: 'Etch' });

      const result = mergeIssues([source], target, lithoUser, NOW);

      expect(result.ok).toBe(false);
      if (!result.ok) expect(result.reason).toBe('permission_denied');
    });
  });

  describe('single-source merge success', () => {
    it('flips source status to Merged', () => {
      const source = makeIssue({ id: 'iss-001' });
      const target = makeIssue({ id: 'iss-002' });
      attachAlarm('iss-001', 'alm-001', 'user-a');
      attachAlarm('iss-001', 'alm-002', 'user-a');

      const result = mergeIssues([source], target, lithoUser, NOW);

      expect(result.ok).toBe(true);
      expect(source.status).toBe('Merged');
    });

    it('marks source IssueAlarm rows and creates target rows', () => {
      const source = makeIssue({ id: 'iss-001' });
      const target = makeIssue({ id: 'iss-002' });
      attachAlarm('iss-001', 'alm-001', 'user-a');
      attachAlarm('iss-001', 'alm-002', 'user-a');

      mergeIssues([source], target, lithoUser, NOW);

      expect(getActiveAlarmsForIssue('iss-001')).toHaveLength(0);
      expect(getHistoricalAlarmsForIssue('iss-001')).toHaveLength(2);
      expect(getActiveAlarmsForIssue('iss-002')).toHaveLength(2);
    });

    it('writes merged_into relation', () => {
      const source = makeIssue({ id: 'iss-001' });
      const target = makeIssue({ id: 'iss-002' });

      mergeIssues([source], target, lithoUser, NOW);

      const rel = getMergedInto('iss-001');
      expect(rel).toBeDefined();
      expect(rel!.toIssueId).toBe('iss-002');
    });

    it('writes both-side issue activity entries', () => {
      const source = makeIssue({ id: 'iss-001' });
      const target = makeIssue({ id: 'iss-002' });
      attachAlarm('iss-001', 'alm-001', 'user-a');

      mergeIssues([source], target, lithoUser, NOW);

      const sourceAct = source.activity.find((a) => a.type === 'alarms_merged_out');
      expect(sourceAct).toBeDefined();
      expect(sourceAct!.toIssueId).toBe('iss-002');
      expect(sourceAct!.alarmIds).toEqual(['alm-001']);

      const targetAct = target.activity.find((a) => a.type === 'alarms_merged_in');
      expect(targetAct).toBeDefined();
      expect(targetAct!.fromIssueId).toBe('iss-001');
      expect(targetAct!.alarmIds).toEqual(['alm-001']);
    });

    it('writes merged_to_issue alarm activity entries', () => {
      const source = makeIssue({ id: 'iss-001' });
      const target = makeIssue({ id: 'iss-002' });
      attachAlarm('iss-001', 'alm-001', 'user-a');

      const result = mergeIssues([source], target, lithoUser, NOW);

      expect(result.ok).toBe(true);
      if (result.ok) {
        expect(result.alarmActivities).toHaveLength(1);
        expect(result.alarmActivities[0].type).toBe('merged_to_issue');
        expect(result.alarmActivities[0].fromIssueId).toBe('iss-001');
        expect(result.alarmActivities[0].toIssueId).toBe('iss-002');
      }
    });
  });

  describe('multi-source merge success', () => {
    it('processes all sources', () => {
      const source1 = makeIssue({ id: 'iss-001' });
      const source2 = makeIssue({ id: 'iss-002' });
      const target = makeIssue({ id: 'iss-010' });
      attachAlarm('iss-001', 'alm-001', 'user-a');
      attachAlarm('iss-002', 'alm-002', 'user-a');
      attachAlarm('iss-002', 'alm-003', 'user-a');

      const result = mergeIssues([source1, source2], target, lithoUser, NOW);

      expect(result.ok).toBe(true);
      expect(source1.status).toBe('Merged');
      expect(source2.status).toBe('Merged');
      expect(getActiveAlarmsForIssue('iss-010')).toHaveLength(3);
      expect(getMergedSources('iss-010')).toHaveLength(2);
    });
  });

  describe('target workflow untouched', () => {
    it('does not change target workflow step or risk level', () => {
      const source = makeIssue({ id: 'iss-001' });
      const target = makeIssue({
        id: 'iss-002',
        status: 'Investigating',
        riskLevel: 'Medium',
        workflow: {
          definitionId: 'generic_linear_v1',
          stepStates: {
            chart_owner_comment: { status: 'completed', completedAt: 't1', completedBy: 'user-a' },
            resolved: { status: 'ongoing' },
            closed: { status: 'pending' },
          },
          actors: [],
        },
      });
      attachAlarm('iss-001', 'alm-001', 'user-a');

      mergeIssues([source], target, lithoUser, NOW);

      expect(target.status).toBe('Investigating');
      expect(target.riskLevel).toBe('Medium');
      expect(target.workflow!.stepStates['resolved'].status).toBe('ongoing');
    });
  });

  describe('merge into Resolved/Closed target', () => {
    it('succeeds and does not auto-reopen a Resolved target', () => {
      const source = makeIssue({ id: 'iss-001' });
      const target = makeIssue({ id: 'iss-002', status: 'Resolved' });
      attachAlarm('iss-001', 'alm-001', 'user-a');

      const result = mergeIssues([source], target, lithoUser, NOW);

      expect(result.ok).toBe(true);
      expect(target.status).toBe('Resolved');
    });

    it('succeeds and does not auto-reopen a Closed target', () => {
      const source = makeIssue({ id: 'iss-001' });
      const target = makeIssue({ id: 'iss-002', status: 'Closed' });
      attachAlarm('iss-001', 'alm-001', 'user-a');

      const result = mergeIssues([source], target, lithoUser, NOW);

      expect(result.ok).toBe(true);
      expect(target.status).toBe('Closed');
    });
  });
});
