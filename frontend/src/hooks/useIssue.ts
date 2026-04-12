import { useCallback, useEffect, useState } from 'react';
import { backend } from '../api/backendClient';
import { api } from '../api/client';
import { refreshEvents } from '../lib/refreshEvents';
import { useAlarmStore } from '../stores/alarmStore';
import { useCurrentUserStore } from '../stores/currentUserStore';
import type { Alarm, Issue, ActivityEntry } from '../types';
import type { HighlightCandidate } from '../lib/relations/highlightCandidates';

export interface BlockerInfo {
  issueId: string;
  title: string;
  status: string;
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

        // Alarms are still from mock client until issue-alarm linking is built
        try {
          const list = await api.getAlarmsForIssue(id);
          setAlarms(list);
        } catch {
          setAlarms([]);
        }

        // Blockers still from mock client
        try {
          const blockerList = await api.getBlockers(id);
          setBlockers(blockerList);
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

  // --- Below methods still use mock client (out of scope for this slice) ---

  const linkAlarm = useCallback(
    async (alarmId: string) => {
      if (!id) return;
      const currentUser = useCurrentUserStore.getState().currentUser;
      useAlarmStore.getState().linkAlarm(alarmId, id, currentUser);
      const updated = await api.linkAlarm(id, alarmId);
      setIssue(updated);
      const list = await api.getAlarmsForIssue(id);
      setAlarms(list);
    },
    [id],
  );

  const unlinkAlarm = useCallback(
    async (alarmId: string) => {
      if (!id) return;
      const currentUser = useCurrentUserStore.getState().currentUser;
      useAlarmStore.getState().unlinkAlarm(alarmId, currentUser);
      const updated = await api.unlinkAlarm(id, alarmId);
      setIssue(updated);
      const list = await api.getAlarmsForIssue(id);
      setAlarms(list);
    },
    [id],
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
      const currentUser = useCurrentUserStore.getState().currentUser;
      const updated = await api.addBlocker(id, blockerIssueId, currentUser.id);
      setIssue(updated);
      const blockerList = await api.getBlockers(id);
      setBlockers(blockerList);
    },
    [id],
  );

  const removeBlocker = useCallback(
    async (blockerIssueId: string) => {
      if (!id) return;
      const currentUser = useCurrentUserStore.getState().currentUser;
      const updated = await api.removeBlocker(id, blockerIssueId, currentUser.id);
      setIssue(updated);
      const blockerList = await api.getBlockers(id);
      setBlockers(blockerList);
    },
    [id],
  );

  const fetchHighlightCandidates = useCallback(async (): Promise<HighlightCandidate[]> => {
    if (!id) return [];
    return api.listHighlightCandidates(id);
  }, [id]);

  const createHighlightedIssue = useCallback(
    async (targetOperationId: string) => {
      if (!id) return;
      const currentUser = useCurrentUserStore.getState().currentUser;
      const { parent: updated } = await api.createHighlightedIssue(id, targetOperationId, currentUser.id);
      setIssue(updated);
      const blockerList = await api.getBlockers(id);
      setBlockers(blockerList);
    },
    [id],
  );

  const moveAlarm = useCallback(
    async (alarmId: string, targetIssueId: string) => {
      if (!id) return;
      const currentUser = useCurrentUserStore.getState().currentUser;
      const result = await api.moveAlarm(alarmId, targetIssueId, currentUser.department);
      useAlarmStore.getState().moveAlarm(alarmId, result.fromIssueId, result.toIssueId, currentUser);
      await reload();
    },
    [id, reload],
  );

  const linkExistingIssueAsHighlight = useCallback(
    async (existingIssueId: string) => {
      if (!id) return;
      const currentUser = useCurrentUserStore.getState().currentUser;
      const updated = await api.linkExistingIssueAsHighlight(id, existingIssueId, currentUser.id);
      setIssue(updated);
      const blockerList = await api.getBlockers(id);
      setBlockers(blockerList);
    },
    [id],
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
