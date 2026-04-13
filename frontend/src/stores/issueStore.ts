import { create } from 'zustand';
import type { IssueStatus, RiskLevel } from '../types';

export type SortKey = 'date' | 'risk_level';
export type SortDir = 'asc' | 'desc';

interface IssueStore {
  search: string;
  riskFilter: RiskLevel | 'all';
  statusFilter: IssueStatus | 'all';
  activeViewName: string | null;
  sortKey: SortKey;
  sortDir: SortDir;
  page: number; // 1-based
  pageSize: number;
  selectedIds: Set<string>;
  showMerged: boolean;

  setSearch: (s: string) => void;
  setRiskFilter: (r: RiskLevel | 'all') => void;
  setStatusFilter: (s: IssueStatus | 'all') => void;
  setActiveViewName: (name: string | null) => void;
  setShowMerged: (v: boolean) => void;
  setSort: (key: SortKey) => void;
  setPage: (p: number) => void;
  toggleSelected: (id: string) => void;
  clearSelection: () => void;
  reset: () => void;
}

const INITIAL: Pick<
  IssueStore,
  | 'search'
  | 'riskFilter'
  | 'statusFilter'
  | 'activeViewName'
  | 'sortKey'
  | 'sortDir'
  | 'page'
  | 'pageSize'
  | 'selectedIds'
  | 'showMerged'
> = {
  search: '',
  riskFilter: 'all',
  statusFilter: 'all',
  activeViewName: null,
  sortKey: 'date',
  sortDir: 'desc',
  page: 1,
  pageSize: 20,
  selectedIds: new Set<string>(),
  showMerged: false,
};

export const useIssueStore = create<IssueStore>((set) => ({
  ...INITIAL,
  setSearch: (s) => set({ search: s, page: 1, selectedIds: new Set() }),
  setRiskFilter: (r) => set({ riskFilter: r, page: 1, selectedIds: new Set() }),
  setStatusFilter: (s) => set({ statusFilter: s, page: 1, selectedIds: new Set() }),
  setActiveViewName: (name) => set({ activeViewName: name, page: 1, selectedIds: new Set() }),
  setShowMerged: (v) => set({ showMerged: v, page: 1, selectedIds: new Set() }),
  setSort: (key) =>
    set((state) => {
      if (state.sortKey === key) {
        return { sortDir: state.sortDir === 'asc' ? 'desc' : 'asc', selectedIds: new Set() };
      }
      return { sortKey: key, sortDir: 'desc', selectedIds: new Set() };
    }),
  setPage: (p) => set({ page: Math.max(1, p), selectedIds: new Set() }),
  toggleSelected: (id) =>
    set((state) => {
      const next = new Set(state.selectedIds);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return { selectedIds: next };
    }),
  clearSelection: () => set({ selectedIds: new Set() }),
  reset: () => set({ ...INITIAL, selectedIds: new Set() }),
}));
