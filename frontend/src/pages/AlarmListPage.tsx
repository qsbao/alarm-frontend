import { Bell, ExternalLink } from 'lucide-react';
import { useState, useMemo, useCallback, useEffect, useRef } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { useCurrentUserStore } from '../stores/currentUserStore';
import { sortAlarms } from '../lib/alarmFiltering';
import { filtersToParams, paramsToFilters } from '../lib/alarmFilterUrl';
import { getViews, saveView, deleteView } from '../lib/savedViews';
import type { SavedView } from '../lib/savedViews';
import { AlarmFilterBar } from '../components/alarms/AlarmFilterBar';
import { QuickAckDrawer } from '../components/QuickAckDrawer';
import { useAlarms } from '../hooks/useAlarms';
import type { Alarm, AlarmFilters, AlarmSortKey, RiskLevel } from '../types';

const SEVERITY_COLOR: Record<RiskLevel, string> = {
  P0: 'bg-red-500/15 text-red-400 border-red-500/30',
  P1: 'bg-orange-500/15 text-orange-400 border-orange-500/30',
  P2: 'bg-amber-500/15 text-amber-400 border-amber-500/30',
  P3: 'bg-slate-500/15 text-slate-400 border-slate-500/30',
};

const STATUS_COLOR: Record<string, string> = {
  Open: 'bg-blue-500/15 text-blue-400 border-blue-500/30',
  Acked: 'bg-emerald-500/15 text-emerald-400 border-emerald-500/30',
};

function formatTime(iso: string): string {
  const d = new Date(iso);
  return `${d.toISOString().slice(0, 10)} ${d.toISOString().slice(11, 16)}`;
}

// Default date range: 30 days back from now
function defaultFrom(): string {
  const d = new Date();
  d.setDate(d.getDate() - 90);
  return d.toISOString();
}

function defaultTo(): string {
  return new Date().toISOString();
}

function AlarmRow({
  alarm,
  onRowClick,
}: {
  alarm: Alarm;
  onRowClick: (id: string) => void;
}) {
  const navigate = useNavigate();

  return (
    <tr
      className="border-b border-border-subtle/40 hover:bg-surface-overlay/30 transition-colors cursor-pointer"
      onClick={() => onRowClick(alarm.id)}
    >
      <td className="px-3 py-2.5 text-xs font-mono text-theme-secondary">{alarm.id}</td>
      <td className="px-3 py-2.5">
        <span className="badge text-[10px]">{alarm.type}</span>
      </td>
      <td className="px-3 py-2.5">
        <span className={`inline-flex items-center px-1.5 py-0.5 rounded text-[10px] font-medium border ${SEVERITY_COLOR[alarm.severity]}`}>
          {alarm.severity}
        </span>
      </td>
      <td className="px-3 py-2.5 text-xs text-theme-primary truncate max-w-[240px]">{alarm.message}</td>
      <td className="px-3 py-2.5 text-xs font-mono text-theme-secondary">
        {alarm.eqpId}{alarm.chamberId ? `/${alarm.chamberId}` : ''}
      </td>
      <td className="px-3 py-2.5 text-xs text-theme-secondary">{alarm.department}</td>
      <td className="px-3 py-2.5 text-xs text-theme-secondary">{alarm.owner}</td>
      <td className="px-3 py-2.5 text-[10px] text-theme-muted">{formatTime(alarm.alarmTime)}</td>
      <td className="px-3 py-2.5">
        <span className={`inline-flex items-center px-1.5 py-0.5 rounded text-[10px] font-medium border ${STATUS_COLOR[alarm.status]}`}>
          {alarm.status}
        </span>
      </td>
      <td className="px-3 py-2.5">
        <button
          onClick={(e) => {
            e.stopPropagation();
            navigate(`/alarms/${alarm.id}`);
          }}
          className="p-1 rounded hover:bg-surface-overlay/60 text-theme-muted hover:text-theme-primary transition-colors"
          title="Open detail page"
        >
          <ExternalLink size={13} />
        </button>
      </td>
    </tr>
  );
}

/** Extract unique sorted values from alarms for filter options. */
function useFilterOptions(alarms: Alarm[]) {
  return useMemo(() => {
    const unique = (fn: (a: Alarm) => string | undefined) =>
      [...new Set(alarms.map(fn).filter(Boolean) as string[])].sort();
    return {
      departments: unique((a) => a.department),
      owners: unique((a) => a.owner),
      machines: unique((a) => a.eqpId),
      chambers: unique((a) => a.chamberId),
      products: unique((a) => a.productId),
      operations: unique((a) => a.operName),
    };
  }, [alarms]);
}

function defaultFilters(department: string): AlarmFilters {
  return { department: [department] };
}

export function AlarmListPage() {
  const currentUser = useCurrentUserStore((s) => s.currentUser);
  const [drawerAlarmId, setDrawerAlarmId] = useState<string | null>(null);
  const [searchParams, setSearchParams] = useSearchParams();
  const [views, setViews] = useState(getViews);
  const initializedRef = useRef(false);
  const from = useMemo(() => defaultFrom(), []);
  const to = useMemo(() => defaultTo(), []);
  const emptyFilters = useMemo<AlarmFilters>(() => ({}), []);

  // Parse URL params into filters/sort, or apply default on first load
  const { filters, sortKey, activeViewName } = useMemo(() => {
    // If URL has filter params, use them
    const hasFilterParams = [...searchParams.keys()].some((k) =>
      ['q', 'status', 'department', 'severity', 'riskLevel', 'alarmType', 'owner',
       'eqpId', 'chamberId', 'productId', 'operName', 'labels', 'active', 'sort', 'view'].includes(k)
    );

    if (hasFilterParams) {
      const { filters: f, sortKey: sk } = paramsToFilters(searchParams);
      const viewName = searchParams.get('view');
      return { filters: f, sortKey: sk, activeViewName: viewName };
    }

    // Default: "Needs attention" scoped to current user's department
    if (!initializedRef.current) {
      return {
        filters: defaultFilters(currentUser.department),
        sortKey: 'alarmTime' as AlarmSortKey,
        activeViewName: null,
      };
    }

    return { filters: {} as AlarmFilters, sortKey: 'alarmTime' as AlarmSortKey, activeViewName: null };
  }, [searchParams, currentUser.department]);

  // Apply default URL params on first mount if no params present
  useEffect(() => {
    if (initializedRef.current) return;
    initializedRef.current = true;
    const hasFilterParams = [...searchParams.keys()].some((k) =>
      ['q', 'status', 'department', 'severity', 'riskLevel', 'alarmType', 'owner',
       'eqpId', 'chamberId', 'productId', 'operName', 'labels', 'active', 'sort', 'view'].includes(k)
    );
    if (!hasFilterParams) {
      const params = filtersToParams(defaultFilters(currentUser.department), 'alarmTime');
      setSearchParams(params, { replace: true });
    }
  }, [searchParams, setSearchParams, currentUser.department]);

  // Fetch alarms from backend with filters applied server-side
  const { alarms, loading } = useAlarms(filters, from, to);

  const sorted = useMemo(
    () => sortAlarms(alarms, sortKey),
    [alarms, sortKey],
  );

  // For filter option dropdowns, we need unfiltered alarms
  // Fetch all alarms within the date range for filter options
  const { alarms: allAlarms } = useAlarms(emptyFilters, from, to);
  const filterOptions = useFilterOptions(allAlarms);

  const updateUrl = useCallback(
    (f: AlarmFilters, sk: AlarmSortKey, viewName?: string | null) => {
      const params = filtersToParams(f, sk);
      if (viewName) params.set('view', viewName);
      setSearchParams(params, { replace: true });
    },
    [setSearchParams],
  );

  function handleFiltersChange(f: AlarmFilters) {
    updateUrl(f, sortKey, null);
  }

  function handleSortChange(sk: AlarmSortKey) {
    updateUrl(filters, sk, activeViewName);
  }

  function handleSelectView(view: SavedView) {
    const f = view.filters;
    const sk = view.sortKey ?? 'alarmTime';
    // For "Needs attention" view, scope to current user's department if not already scoped
    const finalFilters = view.name === 'Needs attention' && !f.department
      ? { ...f, department: [currentUser.department] }
      : f;
    updateUrl(finalFilters, sk, view.name);
  }

  function handleSaveView(name: string) {
    saveView(name, filters, sortKey);
    setViews(getViews());
  }

  function handleDeleteView(name: string) {
    deleteView(name);
    setViews(getViews());
  }

  function handleClear() {
    setSearchParams({}, { replace: true });
  }

  function handleWidenAllDepartments() {
    const { department: _, ...rest } = filters;
    updateUrl(rest, sortKey, activeViewName);
  }

  const isDeptScoped = filters.department && filters.department.length > 0;

  return (
    <div className="h-full overflow-auto p-6">
      <div className="max-w-7xl mx-auto">
        <div className="flex items-center gap-3 mb-4">
          <div className="flex items-center justify-center w-8 h-8 rounded-lg bg-accent-subtle text-theme-accent">
            <Bell className="w-4 h-4" />
          </div>
          <div className="flex-1">
            <h1 className="text-lg font-semibold text-theme-primary">Alarm Queue</h1>
            <p className="text-xs text-theme-muted">
              {loading ? 'Loading...' : `${sorted.length} alarms`}
            </p>
          </div>
          {isDeptScoped && (
            <button
              onClick={handleWidenAllDepartments}
              className="btn-ghost text-[11px]"
            >
              All departments
            </button>
          )}
        </div>

        <div className="mb-4">
          <AlarmFilterBar
            filters={filters}
            sortKey={sortKey}
            views={views}
            activeViewName={activeViewName}
            onFiltersChange={handleFiltersChange}
            onSortChange={handleSortChange}
            onSelectView={handleSelectView}
            onSaveView={handleSaveView}
            onDeleteView={handleDeleteView}
            onClear={handleClear}
            {...filterOptions}
          />
        </div>

        <div className="card overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr className="border-b border-border-default">
                  {['ID', 'Type', 'Severity', 'Message', 'Equipment', 'Dept', 'Owner', 'Time', 'Status', ''].map((h, i) => (
                    <th key={i} className="px-3 py-2 text-[10px] font-semibold uppercase tracking-wider text-theme-muted text-left">
                      {h}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {loading ? (
                  <tr>
                    <td colSpan={10} className="px-3 py-8 text-center text-xs text-theme-muted">
                      Loading alarms...
                    </td>
                  </tr>
                ) : sorted.length === 0 ? (
                  <tr>
                    <td colSpan={10} className="px-3 py-8 text-center text-xs text-theme-muted">
                      No alarms match the current filters.
                    </td>
                  </tr>
                ) : (
                  sorted.map((alarm) => (
                    <AlarmRow
                      key={alarm.id}
                      alarm={alarm}
                      onRowClick={setDrawerAlarmId}
                    />
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>
      </div>

      {drawerAlarmId && (
        <QuickAckDrawer
          alarmId={drawerAlarmId}
          onClose={() => setDrawerAlarmId(null)}
        />
      )}
    </div>
  );
}
