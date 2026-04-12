import { Bell, ExternalLink } from 'lucide-react';
import { useState, useMemo, useCallback, useEffect, useRef } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { useCurrentUserStore } from '../stores/currentUserStore';
import { isActive, sortAlarms } from '../lib/alarmFiltering';
import { filtersToParams, paramsToFilters } from '../lib/alarmFilterUrl';
import { getViews, saveView, deleteView, BUILTIN_VIEWS } from '../lib/savedViews';
import type { SavedView } from '../lib/savedViews';
import { AlarmFilterBar } from '../components/alarms/AlarmFilterBar';
import { QuickAckDrawer } from '../components/QuickAckDrawer';
import { useAlarms } from '../hooks/useAlarms';
import type { Alarm, AlarmFilters, AlarmSortKey, RiskLevel } from '../types';

const SEVERITY_COLOR: Record<RiskLevel, string> = {
  Critical: 'bg-red-500/15 text-red-400 border-red-500/30',
  High: 'bg-orange-500/15 text-orange-400 border-orange-500/30',
  Medium: 'bg-amber-500/15 text-amber-400 border-amber-500/30',
  Low: 'bg-slate-500/15 text-slate-400 border-slate-500/30',
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
  now,
  onRowClick,
}: {
  alarm: Alarm;
  now: number;
  onRowClick: (id: string) => void;
}) {
  const navigate = useNavigate();
  const active = isActive(alarm, now);

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
        {alarm.machineId}{alarm.chamberId ? `/${alarm.chamberId}` : ''}
      </td>
      <td className="px-3 py-2.5 text-xs text-theme-secondary">{alarm.department}</td>
      <td className="px-3 py-2.5 text-xs text-theme-secondary">{alarm.owner}</td>
      <td className="px-3 py-2.5 text-[10px] text-theme-muted">{formatTime(alarm.time)}</td>
      <td className="px-3 py-2.5">
        <span className={`inline-flex items-center px-1.5 py-0.5 rounded text-[10px] font-medium border ${STATUS_COLOR[alarm.status]}`}>
          {alarm.status}
        </span>
      </td>
      <td className="px-3 py-2.5">
        <span className={`inline-flex items-center px-1.5 py-0.5 rounded text-[10px] font-medium border ${
          active
            ? 'bg-rose-500/15 text-rose-400 border-rose-500/30'
            : 'bg-slate-500/15 text-slate-400 border-slate-500/30'
        }`}>
          {active ? 'Active' : 'Recovered'}
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
      machines: unique((a) => a.machineId),
      chambers: unique((a) => a.chamberId),
      products: unique((a) => a.product),
      operations: unique((a) => a.operation),
    };
  }, [alarms]);
}

function defaultFilters(department: string): AlarmFilters {
  return { status: ['Open'], active: 'active', department: [department] };
}

export function AlarmListPage() {
  const currentUser = useCurrentUserStore((s) => s.currentUser);
  const now = Date.now();
  const [drawerAlarmId, setDrawerAlarmId] = useState<string | null>(null);
  const [searchParams, setSearchParams] = useSearchParams();
  const [views, setViews] = useState(getViews);
  const initializedRef = useRef(false);

  // Parse URL params into filters/sort, or apply default on first load
  const { filters, sortKey, activeViewName } = useMemo(() => {
    // If URL has filter params, use them
    const hasFilterParams = [...searchParams.keys()].some((k) =>
      ['q', 'status', 'department', 'severity', 'humanRisk', 'alarmType', 'owner',
       'machineId', 'chamberId', 'product', 'operation', 'labels', 'active', 'sort', 'view'].includes(k)
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
        sortKey: 'time' as AlarmSortKey,
        activeViewName: 'Needs attention',
      };
    }

    return { filters: {} as AlarmFilters, sortKey: 'time' as AlarmSortKey, activeViewName: null };
  }, [searchParams, currentUser.department]);

  // Apply default URL params on first mount if no params present
  useEffect(() => {
    if (initializedRef.current) return;
    initializedRef.current = true;
    const hasFilterParams = [...searchParams.keys()].some((k) =>
      ['q', 'status', 'department', 'severity', 'humanRisk', 'alarmType', 'owner',
       'machineId', 'chamberId', 'product', 'operation', 'labels', 'active', 'sort', 'view'].includes(k)
    );
    if (!hasFilterParams) {
      const params = filtersToParams(defaultFilters(currentUser.department), 'time');
      params.set('view', 'Needs attention');
      setSearchParams(params, { replace: true });
    }
  }, [searchParams, setSearchParams, currentUser.department]);

  // Fetch alarms from backend with filters applied server-side
  const { alarms, loading } = useAlarms(filters, defaultFrom(), defaultTo());

  const sorted = useMemo(
    () => sortAlarms(alarms, sortKey),
    [alarms, sortKey],
  );

  // For filter option dropdowns, we need unfiltered alarms
  // Fetch all alarms within the date range for filter options
  const { alarms: allAlarms } = useAlarms({}, defaultFrom(), defaultTo());
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
    const sk = view.sortKey ?? 'time';
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
                  {['ID', 'Type', 'Severity', 'Message', 'Machine', 'Dept', 'Owner', 'Time', 'Status', 'Active', ''].map((h, i) => (
                    <th key={i} className="px-3 py-2 text-[10px] font-semibold uppercase tracking-wider text-theme-muted text-left">
                      {h}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {loading ? (
                  <tr>
                    <td colSpan={11} className="px-3 py-8 text-center text-xs text-theme-muted">
                      Loading alarms...
                    </td>
                  </tr>
                ) : sorted.length === 0 ? (
                  <tr>
                    <td colSpan={11} className="px-3 py-8 text-center text-xs text-theme-muted">
                      No alarms match the current filters.
                    </td>
                  </tr>
                ) : (
                  sorted.map((alarm) => (
                    <AlarmRow
                      key={alarm.id}
                      alarm={alarm}
                      now={now}
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
