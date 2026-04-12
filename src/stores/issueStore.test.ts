import { describe, it, expect, beforeEach } from 'vitest';
import { useIssueStore } from './issueStore';

function act(fn: () => void) {
  fn();
}

describe('issueStore selection slice', () => {
  beforeEach(() => {
    // Reset store to initial state between tests
    useIssueStore.setState({
      selectedIds: new Set<string>(),
      search: '',
      riskFilter: 'all',
      statusFilter: 'all',
      alarmTypeFilter: 'all',
      activeViewName: null,
      sortKey: 'date',
      sortDir: 'desc',
      page: 1,
      pageSize: 20,
    });
  });

  it('starts with an empty selection', () => {
    const { selectedIds } = useIssueStore.getState();
    expect(selectedIds.size).toBe(0);
  });

  it('toggleSelected adds an id', () => {
    act(() => useIssueStore.getState().toggleSelected('iss-001'));
    expect(useIssueStore.getState().selectedIds.has('iss-001')).toBe(true);
    expect(useIssueStore.getState().selectedIds.size).toBe(1);
  });

  it('toggleSelected removes an already-selected id', () => {
    act(() => useIssueStore.getState().toggleSelected('iss-001'));
    act(() => useIssueStore.getState().toggleSelected('iss-001'));
    expect(useIssueStore.getState().selectedIds.has('iss-001')).toBe(false);
    expect(useIssueStore.getState().selectedIds.size).toBe(0);
  });

  it('clearSelection empties the set', () => {
    act(() => useIssueStore.getState().toggleSelected('iss-001'));
    act(() => useIssueStore.getState().toggleSelected('iss-002'));
    expect(useIssueStore.getState().selectedIds.size).toBe(2);

    act(() => useIssueStore.getState().clearSelection());
    expect(useIssueStore.getState().selectedIds.size).toBe(0);
  });

  it('clears selection on filter change (statusFilter)', () => {
    act(() => useIssueStore.getState().toggleSelected('iss-001'));
    act(() => useIssueStore.getState().setStatusFilter('Triage'));
    expect(useIssueStore.getState().selectedIds.size).toBe(0);
  });

  it('clears selection on filter change (riskFilter)', () => {
    act(() => useIssueStore.getState().toggleSelected('iss-001'));
    act(() => useIssueStore.getState().setRiskFilter('High'));
    expect(useIssueStore.getState().selectedIds.size).toBe(0);
  });

  it('clears selection on filter change (alarmTypeFilter)', () => {
    act(() => useIssueStore.getState().toggleSelected('iss-001'));
    act(() => useIssueStore.getState().setAlarmTypeFilter('TempSpike'));
    expect(useIssueStore.getState().selectedIds.size).toBe(0);
  });

  it('clears selection on filter change (search)', () => {
    act(() => useIssueStore.getState().toggleSelected('iss-001'));
    act(() => useIssueStore.getState().setSearch('hello'));
    expect(useIssueStore.getState().selectedIds.size).toBe(0);
  });

  it('clears selection on sort change', () => {
    act(() => useIssueStore.getState().toggleSelected('iss-001'));
    act(() => useIssueStore.getState().setSort('risk_level'));
    expect(useIssueStore.getState().selectedIds.size).toBe(0);
  });

  it('clears selection on page change', () => {
    act(() => useIssueStore.getState().toggleSelected('iss-001'));
    act(() => useIssueStore.getState().setPage(2));
    expect(useIssueStore.getState().selectedIds.size).toBe(0);
  });

  it('clears selection on reset', () => {
    act(() => useIssueStore.getState().toggleSelected('iss-001'));
    act(() => useIssueStore.getState().reset());
    expect(useIssueStore.getState().selectedIds.size).toBe(0);
  });
});
