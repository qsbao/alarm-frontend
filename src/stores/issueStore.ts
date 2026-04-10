import { create } from 'zustand';
import type { AlarmType, IssueStatus, RiskLevel } from '../types';

export type SortKey = 'date' | 'risk_level';
export type SortDir = 'asc' | 'desc';

interface IssueStore {
  search: string;
  riskFilter: RiskLevel | 'all';
  statusFilter: IssueStatus | 'all';
  alarmTypeFilter: AlarmType | 'all';
  sortKey: SortKey;
  sortDir: SortDir;
  page: number; // 1-based
  pageSize: number;

  setSearch: (s: string) => void;
  setRiskFilter: (r: RiskLevel | 'all') => void;
  setStatusFilter: (s: IssueStatus | 'all') => void;
  setAlarmTypeFilter: (t: AlarmType | 'all') => void;
  setSort: (key: SortKey) => void;
  setPage: (p: number) => void;
  reset: () => void;
}

const INITIAL: Pick<
  IssueStore,
  | 'search'
  | 'riskFilter'
  | 'statusFilter'
  | 'alarmTypeFilter'
  | 'sortKey'
  | 'sortDir'
  | 'page'
  | 'pageSize'
> = {
  search: '',
  riskFilter: 'all',
  statusFilter: 'all',
  alarmTypeFilter: 'all',
  sortKey: 'date',
  sortDir: 'desc',
  page: 1,
  pageSize: 20,
};

export const useIssueStore = create<IssueStore>((set) => ({
  ...INITIAL,
  setSearch: (s) => set({ search: s, page: 1 }),
  setRiskFilter: (r) => set({ riskFilter: r, page: 1 }),
  setStatusFilter: (s) => set({ statusFilter: s, page: 1 }),
  setAlarmTypeFilter: (t) => set({ alarmTypeFilter: t, page: 1 }),
  setSort: (key) =>
    set((state) => {
      // Click same column → flip direction. Click new column → reset to desc.
      if (state.sortKey === key) {
        return { sortDir: state.sortDir === 'asc' ? 'desc' : 'asc' };
      }
      return { sortKey: key, sortDir: 'desc' };
    }),
  setPage: (p) => set({ page: Math.max(1, p) }),
  reset: () => set({ ...INITIAL }),
}));
