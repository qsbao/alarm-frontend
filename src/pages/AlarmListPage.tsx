import { Bell, ExternalLink } from 'lucide-react';
import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAlarmStore } from '../stores/alarmStore';
import { isActive } from '../lib/alarmFiltering';
import { mockClock } from '../lib/mockClock';
import { QuickAckDrawer } from '../components/QuickAckDrawer';
import type { Alarm, RiskLevel } from '../types';

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

export function AlarmListPage() {
  const alarms = useAlarmStore((s) => s.alarms);
  const now = mockClock.now();
  const [drawerAlarmId, setDrawerAlarmId] = useState<string | null>(null);

  return (
    <div className="h-full overflow-auto p-6">
      <div className="max-w-7xl mx-auto">
        <div className="flex items-center gap-3 mb-6">
          <div className="flex items-center justify-center w-8 h-8 rounded-lg bg-accent-subtle text-theme-accent">
            <Bell className="w-4 h-4" />
          </div>
          <div>
            <h1 className="text-lg font-semibold text-theme-primary">Alarm Queue</h1>
            <p className="text-xs text-theme-muted">{alarms.length} alarms</p>
          </div>
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
                {alarms.map((alarm) => (
                  <AlarmRow
                    key={alarm.id}
                    alarm={alarm}
                    now={now}
                    onRowClick={setDrawerAlarmId}
                  />
                ))}
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
