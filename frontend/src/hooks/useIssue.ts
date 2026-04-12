import { useCallback, useEffect, useState } from 'react';
import { backend } from '../api/backendClient';
import { api } from '../api/client';
import { refreshEvents } from '../lib/refreshEvents';
import { useAlarmStore } from '../stores/alarmStore';
import type { Alarm, Issue, ActivityEntry } from '../types';
import type { HighlightCandidate } from '../lib/relations/highlightCandidates';

export interface BlockerInfo {
  issueId: string;
  title: string;
  status: string;
}

interface BackendAlarm {
  id: string;
  type: string;
  severity: string;
  message: string;
  value?: number;
  unit?: string;
  time: string;
  recoveryTime?: string;
  machineId: string;
  chamberId?: string;
  product: string;
  operation: string;
  owner: string;
  department: string;
  chartOwnerId?: string;
  status: string;
  humanRisk?: string;
  labels: string[];
}

function toAlarm(raw: BackendAlarm): Alarm {
  return {
    id: raw.id,
    type: raw.type as Alarm['type'],
    severity: raw.severity as Alarm['severity'],
    message: raw.message,
    value: raw.value,
    unit: raw.unit,
    time: raw.time,
    recoveryTime: raw.recoveryTime,
    machineId: raw.machineId,
    chamberId: raw.chamberId,
    product: raw.product,
    operation: raw.operation,
    owner: raw.owner,
    department: raw.department,
    chartOwnerId: raw.chartOwnerId,
    status: raw.status as Alarm['status'],
    humanRisk: raw.humanRisk as Alarm['humanRisk'],
    labels: (raw.labels ?? []) as Alarm['labels'],
    activity: [],
  };
}

interface BackendIssue {
  id: string;
  title: string;
  date: string;
  alarmType: string;
  riskLevel: string;
  status: string;
  issueTime: string;
  operation: string;
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

function toIssue(raw: BackendIssue, activity: ActivityEntry[]): Issue {
  return {
    id: raw.id,
    title: raw.title,
    date: raw.date,
    alarmType: raw.alarmType as Issue['alarmType'],
    riskLevel: raw.riskLevel as Issue['riskLevel'],
    status: raw.status as Issue['status'],
    issueTime: raw.issueTime,
    operation: raw.operation,
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

export function useIssue(id: string | undefined) {
  const [issue, setIssue] = useState<Issue | undefined>(undefined);
  const [alarms, setAlarms] = useState<Alarm[]>([]);
  const [blockers, setBlockers] = useState<BlockerInfo[]>([]);
  const [loading, setLoading] = useState(true);

  const reload = useCallback(async () => {
    if (!id) {
      setIssue(undefined);
      setAlarms([]);
      setLoading(false);
      return;
    }
    setLoading(true);
    try {
      const [issueRes, activityRes] = await Promise.all([
        backend.GET('/api/issues/{id}', { params: { path: { id } } }),
        backend.GET('/api/issues/{id}/activity', { params: { path: { id } } }),
      ]);

      if (issueRes.data) {
        const rawIssue = issueRes.data as unknown as BackendIssue;
        const rawActivity = (activityRes.data ?? []) as unknown as BackendActivity[];
        const found = toIssue(rawIssue, rawActivity.map(toActivityEntry));
        setIssue(found);

        // Fetch active alarms linked to this issue
        try {
          const alarmsRes = await backend.GET('/api/issues/{id}/alarms', {
            params: { path: { id } },
          });
          const issueAlarmLinks = (alarmsRes.data ?? []) as unknown as Array<{ alarmId: string }>;
          // Fetch full alarm details for each linked alarm
          const alarmDetails = await Promise.all(
            issueAlarmLinks.map(async (link) => {
              const { data } = await backend.GET('/api/alarms/{id}', {
                params: { path: { id: link.alarmId } },
              });
              return data ? toAlarm(data as unknown as BackendAlarm) : null;
            }),
          );
          setAlarms(alarmDetails.filter((a): a is Alarm => a !== null));
        } catch {
          setAlarms([]);
        }

        // Blockers from backend
        try {
          const blockersRes = await backend.GET('/api/issues/{id}/blockers', {
            params: { path: { id } },
          });
          const rawBlockers = (blockersRes.data ?? []) as unknown as BlockerInfo[];
          setBlockers(rawBlockers);
        } catch {
          setBlockers([]);
        }
      } else {
        setIssue(undefined);
        setAlarms([]);
        setBlockers([]);
      }
    } finally {
      setLoading(false);
    }
  }, [id]);

  useEffect(() => {
    reload();
  }, [reload]);

  useEffect(() => refreshEvents.subscribe(() => reload()), [reload]);

  const assignOwner = useCallback(
    async (owner: string) => {
      if (!id) return;
      const { data } = await backend.PUT('/api/issues/{id}/owner', {
        params: { path: { id } },
        body: { ownerId: owner } as any,
      });
      if (data) {
        // Refetch to get updated activity
        await reload();
      }
    },
    [id, reload],
  );

  const addComment = useCallback(
    async (text: string) => {
      if (!id) return;
      const { data } = await backend.POST('/api/issues/{id}/comments', {
        params: { path: { id } },
        body: { text } as any,
      });
      if (data) {
        await reload();
      }
    },
    [id, reload],
  );

  const linkAlarm = useCallback(
    async (alarmId: string) => {
      if (!id) return;
      await backend.POST('/api/issues/{id}/alarms/{alarmId}', {
        params: { path: { id, alarmId } },
      });
      await reload();
    },
    [id, reload],
  );

  const unlinkAlarm = useCallback(
    async (alarmId: string) => {
      if (!id) return;
      await backend.DELETE('/api/issues/{id}/alarms/{alarmId}', {
        params: { path: { id, alarmId } },
      });
      await reload();
    },
    [id, reload],
  );

  const completeWorkflowStep = useCallback(
    async (stepId: string, actorId: string, payload: Record<string, unknown>) => {
      if (!id) return;
      const updated = await api.completeStep(id, stepId, actorId, payload);
      setIssue(updated);
    },
    [id],
  );

  const skipWorkflowStep = useCallback(
    async (stepId: string, actorId: string) => {
      if (!id) return;
      const updated = await api.skipStep(id, stepId, actorId);
      setIssue(updated);
    },
    [id],
  );

  const reviveWorkflowStep = useCallback(
    async (stepId: string, actorId: string) => {
      if (!id) return;
      const updated = await api.reviveStep(id, stepId, actorId);
      setIssue(updated);
    },
    [id],
  );

  const editWorkflowStep = useCallback(
    async (stepId: string, actorId: string, payload: Record<string, unknown>) => {
      if (!id) return;
      const updated = await api.editCompletedStep(id, stepId, actorId, payload);
      setIssue(updated);
    },
    [id],
  );

  const addBlocker = useCallback(
    async (blockerIssueId: string) => {
      if (!id) return;
      await backend.POST('/api/issues/{id}/blockers', {
        params: { path: { id } },
        body: { toIssueId: blockerIssueId } as any,
      });
      await reload();
    },
    [id, reload],
  );

  const removeBlocker = useCallback(
    async (blockerIssueId: string) => {
      if (!id) return;
      await backend.DELETE('/api/issues/{id}/blockers/{targetId}', {
        params: { path: { id, targetId: blockerIssueId } },
      } as any);
      await reload();
    },
    [id, reload],
  );

  const fetchHighlightCandidates = useCallback(async (): Promise<HighlightCandidate[]> => {
    if (!id) return [];
    const res = await backend.GET('/api/issues/{id}/highlight-candidates', {
      params: { path: { id } },
    });
    return (res.data ?? []) as unknown as HighlightCandidate[];
  }, [id]);

  const createHighlightedIssue = useCallback(
    async (targetOperationId: string) => {
      if (!id) return;
      await backend.POST('/api/issues/{id}/highlights/create', {
        params: { path: { id } },
        body: { targetOperationId } as any,
      } as any);
      await reload();
    },
    [id, reload],
  );

  const moveAlarm = useCallback(
    async (alarmId: string, targetIssueId: string) => {
      if (!id) return;
      await backend.POST('/api/alarms/{alarmId}/move', {
        params: { path: { alarmId } },
        body: { targetIssueId } as any,
      });
      await reload();
    },
    [id, reload],
  );

  const linkExistingIssueAsHighlight = useCallback(
    async (existingIssueId: string) => {
      if (!id) return;
      await backend.POST('/api/issues/{id}/highlights', {
        params: { path: { id } },
        body: { toIssueId: existingIssueId } as any,
      });
      await reload();
    },
    [id, reload],
  );

  return {
    issue,
    alarms,
    blockers,
    loading,
    reload,
    assignOwner,
    addComment,
    linkAlarm,
    unlinkAlarm,
    moveAlarm,
    completeWorkflowStep,
    skipWorkflowStep,
    reviveWorkflowStep,
    editWorkflowStep,
    addBlocker,
    removeBlocker,
    fetchHighlightCandidates,
    createHighlightedIssue,
    linkExistingIssueAsHighlight,
  };
}
