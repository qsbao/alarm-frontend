import { useCallback, useEffect, useMemo, useState } from 'react';
import { api } from '../api/client';
import { getUserById } from '../mocks/users';
import { useIssueStore } from '../stores/issueStore';
import { useCurrentUserStore } from '../stores/currentUserStore';
import { ISSUE_BUILTIN_VIEWS } from '../lib/issueSavedViews';
import { getDefinition } from '../lib/workflows/registry';
import type { Issue, RiskLevel } from '../types';

const RISK_RANK: Record<RiskLevel, number> = {
  Low: 0,
  Medium: 1,
  High: 2,
  Critical: 3,
};

export function useIssues() {
  const [allIssues, setAllIssues] = useState<Issue[]>([]);
  const [loading, setLoading] = useState(true);

  const search = useIssueStore((s) => s.search);
  const riskFilter = useIssueStore((s) => s.riskFilter);
  const statusFilter = useIssueStore((s) => s.statusFilter);
  const alarmTypeFilter = useIssueStore((s) => s.alarmTypeFilter);
  const activeViewName = useIssueStore((s) => s.activeViewName);
  const sortKey = useIssueStore((s) => s.sortKey);
  const sortDir = useIssueStore((s) => s.sortDir);
  const page = useIssueStore((s) => s.page);
  const pageSize = useIssueStore((s) => s.pageSize);
  const currentUser = useCurrentUserStore((s) => s.currentUser);

  const refresh = useCallback(async () => {
    setLoading(true);
    try {
      const list = await api.listIssues();
      setAllIssues(list);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    refresh();
  }, [refresh]);

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase();
    const activeView = activeViewName
      ? ISSUE_BUILTIN_VIEWS.find((v) => v.name === activeViewName)
      : null;

    let list = allIssues.filter((i) => {
      if (activeView && !activeView.predicate(i, currentUser, getDefinition)) return false;
      if (riskFilter !== 'all' && i.riskLevel !== riskFilter) return false;
      if (statusFilter !== 'all' && i.status !== statusFilter) return false;
      if (alarmTypeFilter !== 'all' && i.alarmType !== alarmTypeFilter) return false;
      if (q) {
        const ownerName = getUserById(i.ownerId)?.name ?? i.ownerId;
        const hay = `${i.title} ${ownerName} ${i.product} ${i.id}`.toLowerCase();
        if (!hay.includes(q)) return false;
      }
      return true;
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
  }, [allIssues, search, riskFilter, statusFilter, alarmTypeFilter, activeViewName, currentUser, sortKey, sortDir]);

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
