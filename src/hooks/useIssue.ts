import { useCallback, useEffect, useState } from 'react';
import { api } from '../api/client';
import type { Alarm, Issue, IssueStatus } from '../types';

export function useIssue(id: string | undefined) {
  const [issue, setIssue] = useState<Issue | undefined>(undefined);
  const [alarms, setAlarms] = useState<Alarm[]>([]);
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
      const found = await api.getIssue(id);
      setIssue(found);
      if (found && found.relatedAlarmIds.length > 0) {
        const list = await api.getAlarmsByIds(found.relatedAlarmIds);
        setAlarms(list);
      } else {
        setAlarms([]);
      }
    } finally {
      setLoading(false);
    }
  }, [id]);

  useEffect(() => {
    reload();
  }, [reload]);

  // After a mutation, sync the local issue + reload its alarms (only when the
  // alarm set could have changed).
  const applyIssue = useCallback(async (next: Issue, refetchAlarms: boolean) => {
    setIssue(next);
    if (refetchAlarms) {
      if (next.relatedAlarmIds.length === 0) {
        setAlarms([]);
      } else {
        const list = await api.getAlarmsByIds(next.relatedAlarmIds);
        setAlarms(list);
      }
    }
  }, []);

  const changeStatus = useCallback(
    async (next: IssueStatus) => {
      if (!id) return;
      const updated = await api.updateIssueStatus(id, next);
      await applyIssue(updated, false);
    },
    [id, applyIssue],
  );

  const assignOwner = useCallback(
    async (owner: string) => {
      if (!id) return;
      const updated = await api.assignIssueOwner(id, owner);
      await applyIssue(updated, false);
    },
    [id, applyIssue],
  );

  const addComment = useCallback(
    async (text: string) => {
      if (!id) return;
      const updated = await api.addComment(id, text);
      await applyIssue(updated, false);
    },
    [id, applyIssue],
  );

  const linkAlarm = useCallback(
    async (alarmId: string) => {
      if (!id) return;
      const updated = await api.linkAlarm(id, alarmId);
      await applyIssue(updated, true);
    },
    [id, applyIssue],
  );

  const unlinkAlarm = useCallback(
    async (alarmId: string) => {
      if (!id) return;
      const updated = await api.unlinkAlarm(id, alarmId);
      await applyIssue(updated, true);
    },
    [id, applyIssue],
  );

  return {
    issue,
    alarms,
    loading,
    reload,
    changeStatus,
    assignOwner,
    addComment,
    linkAlarm,
    unlinkAlarm,
  };
}
