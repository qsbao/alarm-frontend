import { useCallback, useEffect, useMemo, useState } from 'react';
import { backend } from '../api/backendClient';
import { refreshEvents } from '../lib/refreshEvents';
import { useIssueStore } from '../stores/issueStore';
import { useCurrentUserStore } from '../stores/currentUserStore';
import { ISSUE_BUILTIN_VIEWS } from '../lib/issueSavedViews';
import { getDefinition } from '../lib/workflows/definitions';
import { matchesFilters } from './useFilteredIssues';
import type { Issue, HumanRiskLevel, AlarmLabel, Module } from '../types';

const RISK_RANK: Record<HumanRiskLevel, number> = {
  LOW_RISK: 0,
  MIDDLE_RISK: 1,
  HIGH_RISK: 2,
};

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

function toIssue(raw: BackendIssue): Issue {
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
    labels: (raw.labels ?? []) as AlarmLabel[],
    product: raw.product,
    ownerId: raw.ownerId,
    department: raw.department,
    description: raw.description ?? '',
    activity: [],
  };
}

export function useIssues() {
  const [allIssues, setAllIssues] = useState<Issue[]>([]);
  const [loading, setLoading] = useState(true);

  const search = useIssueStore((s) => s.search);
  const riskFilter = useIssueStore((s) => s.riskFilter);
  const statusFilter = useIssueStore((s) => s.statusFilter);
  const activeViewName = useIssueStore((s) => s.activeViewName);
  const sortKey = useIssueStore((s) => s.sortKey);
  const sortDir = useIssueStore((s) => s.sortDir);
  const page = useIssueStore((s) => s.page);
  const pageSize = useIssueStore((s) => s.pageSize);
  const showMerged = useIssueStore((s) => s.showMerged);
  const currentUser = useCurrentUserStore((s) => s.currentUser);

  const refresh = useCallback(async () => {
    setLoading(true);
    try {
      const { data } = await backend.GET('/api/issues', {
        params: { query: {} },
      });
      const raw = (data ?? []) as unknown as BackendIssue[];
      setAllIssues(raw.map(toIssue));
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    refresh();
  }, [refresh]);

  // Re-fetch when external mutations (e.g. dev panel) signal a change.
  useEffect(() => refreshEvents.subscribe(() => refresh()), [refresh]);

  const filtered = useMemo(() => {
    const activeView = activeViewName
      ? ISSUE_BUILTIN_VIEWS.find((v) => v.name === activeViewName)
      : null;

    const filterParams = { statusFilter, riskFilter, search, showMerged };

    let list = allIssues.filter((i) => {
      if (activeView && !activeView.predicate(i, currentUser, getDefinition)) return false;
      return matchesFilters(i, filterParams);
    });

    list = [...list].sort((a, b) => {
      let cmp: number;
      if (sortKey === 'date') {
        cmp = Date.parse(a.date) - Date.parse(b.date);
      } else {
        cmp = RISK_RANK[a.riskLevel] - RISK_RANK[b.riskLevel];
      }
      return sortDir === 'asc' ? cmp : -cmp;
    });

    return list;
  }, [allIssues, search, riskFilter, statusFilter, showMerged, activeViewName, currentUser, sortKey, sortDir]);

  const totalPages = Math.max(1, Math.ceil(filtered.length / pageSize));
  const safePage = Math.min(page, totalPages);

  const pageItems = useMemo(() => {
    const start = (safePage - 1) * pageSize;
    return filtered.slice(start, start + pageSize);
  }, [filtered, safePage, pageSize]);

  return {
    allIssues,
    filtered,
    pageItems,
    totalPages,
    page: safePage,
    loading,
    refresh,
  };
}
