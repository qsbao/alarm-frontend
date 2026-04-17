import { useCallback, useEffect, useMemo, useState } from 'react';
import { backend } from '../api/backendClient';
import { classifyAlarm } from '../lib/dashboard/classifyAlarm';
import type {
  AlarmBucket,
  AlarmStage,
} from '../lib/dashboard/classifyAlarm';
import { getDefinition as defaultGetDefinition } from '../lib/workflows/definitions';
import { useCurrentUserStore } from '../stores/currentUserStore';
import type {
  ActivityEntry,
  Alarm,
  AlarmDetails,
  AlarmSource,
  Issue,
  Module,
} from '../types';
import type { WorkflowDefinition, WorkflowInstance } from '../lib/workflows/types';

export interface EnrichedAlarmRow {
  alarm: Alarm;
  issue?: Issue;
  bucket: AlarmBucket;
  stage: AlarmStage;
  meetingBound: boolean;
  meetingTime?: string;
}

export interface DashboardCounts {
  total: number;
  unTriaged: number;
  inWorkflow: number;
  done: number;
  meetingBound: number;
}

export interface DashboardData {
  rows: EnrichedAlarmRow[];
  counts: DashboardCounts;
}

export function buildDashboardData(
  alarms: Alarm[],
  issuesById: Map<string, Issue>,
  alarmIssueMap: Map<string, string>,
  getWorkflowDefinition: (id: string) => WorkflowDefinition | undefined,
): DashboardData {
  const rows: EnrichedAlarmRow[] = alarms.map((alarm) => {
    const issueId = alarmIssueMap.get(alarm.id);
    const issue = issueId ? issuesById.get(issueId) : undefined;
    if (!issue) {
      return {
        alarm,
        issue: undefined,
        bucket: 'Un-triaged',
        stage: 'un-triaged',
        meetingBound: false,
      };
    }
    const wfDef = issue.workflow
      ? getWorkflowDefinition(issue.workflow.definitionId)
      : undefined;
    const c = classifyAlarm(alarm, issue, wfDef);
    return {
      alarm,
      issue,
      bucket: c.bucket,
      stage: c.stage,
      meetingBound: c.meetingBound,
      meetingTime: c.meetingTime,
    };
  });

  const counts: DashboardCounts = {
    total: rows.length,
    unTriaged: rows.filter((r) => r.bucket === 'Un-triaged').length,
    inWorkflow: rows.filter((r) => r.bucket === 'In-workflow').length,
    done: rows.filter((r) => r.bucket === 'Done').length,
    meetingBound: rows.filter((r) => r.meetingBound).length,
  };

  return { rows, counts };
}

interface BackendAlarm {
  id: string;
  type: string;
  severity: string;
  message: string;
  value?: number;
  unit?: string;
  alarmTime: string;
  eventTime?: string;
  alarmDate?: string;
  recoveryTime?: string;
  eqpId: string;
  chamberId?: string;
  productId: string;
  operName?: string;
  operNo?: string;
  technologyId?: string;
  productGroupId?: string;
  processOperName?: string;
  processOperNo?: string;
  lotId?: string;
  lotPriority?: number;
  waferId?: string;
  recipeId?: string;
  routeId?: string;
  module?: string;
  moduleOwner?: string;
  piOwner?: string;
  owner: string;
  department: string;
  chartOwnerId?: string;
  status: string;
  riskLevel?: string;
  labels: string[];
  details?: AlarmDetails;
  source?: string;
  sourceAlarmId?: string;
  sourceAlarmBody?: string;
  externalStatus?: string;
  externalStatusUpdatedAt?: string;
}

interface BackendIssue {
  id: string;
  title: string;
  date: string;
  riskLevel: string;
  status: string;
  issueTime: string;
  operName?: string;
  operNo?: string;
  module?: string;
  labels: string[];
  product: string;
  ownerId: string;
  department: string;
  description: string;
}

interface BackendActivity {
  id: number;
  issueId: string;
  type: string;
  timestamp: string;
  author: string;
  text?: string;
  assignedTo?: string;
  blockerIssueId?: string;
}

interface BackendIssueAlarmLink {
  alarmId: string;
  issueId: string;
}

function toAlarm(raw: BackendAlarm): Alarm {
  return {
    id: raw.id,
    type: raw.type as Alarm['type'],
    severity: raw.severity as Alarm['severity'],
    message: raw.message,
    value: raw.value,
    unit: raw.unit,
    alarmTime: raw.alarmTime,
    eventTime: raw.eventTime,
    alarmDate: raw.alarmDate,
    recoveryTime: raw.recoveryTime,
    eqpId: raw.eqpId,
    chamberId: raw.chamberId,
    productId: raw.productId,
    operName: raw.operName,
    operNo: raw.operNo,
    technologyId: raw.technologyId,
    productGroupId: raw.productGroupId,
    processOperName: raw.processOperName,
    processOperNo: raw.processOperNo,
    lotId: raw.lotId,
    lotPriority: raw.lotPriority,
    waferId: raw.waferId,
    recipeId: raw.recipeId,
    routeId: raw.routeId,
    module: raw.module as Module | undefined,
    moduleOwner: raw.moduleOwner,
    piOwner: raw.piOwner,
    owner: raw.owner,
    department: raw.department,
    chartOwnerId: raw.chartOwnerId,
    status: raw.status as Alarm['status'],
    riskLevel: raw.riskLevel as Alarm['riskLevel'],
    labels: (raw.labels ?? []) as Alarm['labels'],
    activity: [],
    details: raw.details,
    source: raw.source as AlarmSource | undefined,
    sourceAlarmId: raw.sourceAlarmId,
    sourceAlarmBody: raw.sourceAlarmBody,
    externalStatus: raw.externalStatus,
    externalStatusUpdatedAt: raw.externalStatusUpdatedAt,
  };
}

function toIssue(raw: BackendIssue, activity: ActivityEntry[]): Issue {
  return {
    id: raw.id,
    title: raw.title,
    date: raw.date,
    riskLevel: raw.riskLevel as Issue['riskLevel'],
    status: raw.status as Issue['status'],
    issueTime: raw.issueTime,
    operName: raw.operName,
    operNo: raw.operNo,
    module: raw.module as Module | undefined,
    labels: (raw.labels ?? []) as Issue['labels'],
    product: raw.product,
    ownerId: raw.ownerId,
    department: raw.department,
    description: raw.description ?? '',
    activity,
  };
}

function toActivityEntry(raw: BackendActivity): ActivityEntry {
  return {
    id: String(raw.id),
    type: raw.type as ActivityEntry['type'],
    timestamp: raw.timestamp,
    author: raw.author,
    text: raw.text,
    assignedTo: raw.assignedTo,
    blockerIssueId: raw.blockerIssueId,
  };
}

function todayAlarmDate(): string {
  const now = new Date();
  const yyyy = now.getFullYear();
  const mm = String(now.getMonth() + 1).padStart(2, '0');
  const dd = String(now.getDate()).padStart(2, '0');
  return `${yyyy}-${mm}-${dd}`;
}

export interface UseDashboardDataOptions {
  alarmDate?: string;
  department?: string;
}

export function useDashboardData(options: UseDashboardDataOptions = {}) {
  const viewer = useCurrentUserStore((s) => s.currentUser);
  const alarmDate = options.alarmDate ?? todayAlarmDate();
  const department = options.department ?? viewer.department;

  const [alarms, setAlarms] = useState<Alarm[]>([]);
  const [issuesById, setIssuesById] = useState<Map<string, Issue>>(new Map());
  const [alarmIssueMap, setAlarmIssueMap] = useState<Map<string, string>>(new Map());
  const [loading, setLoading] = useState(true);

  const refresh = useCallback(async () => {
    setLoading(true);
    try {
      const from = `${alarmDate}T00:00:00Z`;
      const to = `${alarmDate}T23:59:59.999Z`;
      const { data: alarmsData } = await backend.GET('/api/alarms', {
        params: {
          query: {
            from,
            to,
            department: [department],
          } as any,
        },
      });
      const rawAlarms = (alarmsData ?? []) as unknown as BackendAlarm[];
      const fetchedAlarms = rawAlarms.map(toAlarm);
      setAlarms(fetchedAlarms);

      const linkEntries: Array<[string, string]> = [];
      for (const alarm of fetchedAlarms) {
        try {
          const { data } = await backend.GET('/api/alarms/{alarmId}/issue', {
            params: { path: { alarmId: alarm.id } },
          });
          const link = data as unknown as BackendIssueAlarmLink | undefined;
          if (link?.issueId) {
            linkEntries.push([alarm.id, link.issueId]);
          }
        } catch {
          // no linked issue — treat as unlinked (un-triaged)
        }
      }
      setAlarmIssueMap(new Map(linkEntries));

      const uniqueIssueIds = Array.from(new Set(linkEntries.map(([, issueId]) => issueId)));
      const issueEntries = await Promise.all(
        uniqueIssueIds.map(async (issueId): Promise<[string, Issue] | null> => {
          const [issueRes, activityRes] = await Promise.all([
            backend.GET('/api/issues/{id}', { params: { path: { id: issueId } } }),
            backend.GET('/api/issues/{id}/activity', { params: { path: { id: issueId } } }),
          ]);
          if (!issueRes.data) return null;
          const rawIssue = issueRes.data as unknown as BackendIssue;
          const rawActivity = (activityRes.data ?? []) as unknown as BackendActivity[];
          const issue = toIssue(rawIssue, rawActivity.map(toActivityEntry));
          try {
            const wfRes = await backend.GET('/api/issues/{id}/workflow' as any, {
              params: { path: { id: issueId } },
            });
            if (wfRes.data) {
              issue.workflow = wfRes.data as unknown as WorkflowInstance;
            }
          } catch {
            // no workflow attached
          }
          return [issueId, issue];
        }),
      );
      setIssuesById(
        new Map(issueEntries.filter((e): e is [string, Issue] => e !== null)),
      );
    } finally {
      setLoading(false);
    }
  }, [alarmDate, department]);

  useEffect(() => {
    refresh();
  }, [refresh]);

  const data = useMemo(
    () => buildDashboardData(alarms, issuesById, alarmIssueMap, defaultGetDefinition),
    [alarms, issuesById, alarmIssueMap],
  );

  return {
    rows: data.rows,
    counts: data.counts,
    alarmDate,
    department,
    loading,
    refresh,
  };
}
