import { Plus } from 'lucide-react';
import { useState, useRef, useEffect } from 'react';
import type {
  AlarmFilters,
  AlarmLabel,
  AlarmStatus,
} from '../../types';
import {
  ALL_ALARM_LABELS,
  ALL_ALARM_STATUSES,
  ALL_HUMAN_RISK_LEVELS,
  ALL_RISK_LEVELS,
} from '../../types';
import { getAllAlarmTypes } from '../../lib/alarms/alarmTypeRegistry';

interface FilterGroup {
  heading: string;
  items: { key: keyof AlarmFilters; label: string; options: string[] }[];
}

interface AddFilterPopoverProps {
  filters: AlarmFilters;
  onToggleFilter: (key: keyof AlarmFilters, value: string) => void;
  departments: string[];
  owners: string[];
  machines: string[];
  chambers: string[];
  products: string[];
  operations: string[];
}

export function AddFilterPopover({
  filters,
  onToggleFilter,
  departments,
  owners,
  machines,
  chambers,
  products,
  operations,
}: AddFilterPopoverProps) {
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!open) return;
    const handler = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false);
    };
    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, [open]);

  const groups: FilterGroup[] = [
    {
      heading: 'Triage',
      items: [
        { key: 'status', label: 'Status', options: ALL_ALARM_STATUSES as unknown as string[] },
        { key: 'riskLevel', label: 'Risk Level', options: ALL_HUMAN_RISK_LEVELS as unknown as string[] },
        { key: 'severity', label: 'System Severity', options: ALL_RISK_LEVELS as unknown as string[] },
      ],
    },
    {
      heading: 'Routing',
      items: [
        { key: 'department', label: 'Department', options: departments },
        { key: 'owner', label: 'Owner', options: owners },
      ],
    },
    {
      heading: 'Context',
      items: [
        { key: 'eqpId', label: 'Equipment', options: machines },
        { key: 'chamberId', label: 'Chamber', options: chambers },
        { key: 'productId', label: 'Product', options: products },
        { key: 'operName', label: 'Operation', options: operations },
      ],
    },
    {
      heading: 'Tags',
      items: [
        { key: 'alarmType', label: 'Alarm Type', options: getAllAlarmTypes().map((s) => s.kind) },
        { key: 'labels', label: 'Label', options: ALL_ALARM_LABELS as unknown as string[] },
      ],
    },
  ];

  function isChecked(key: keyof AlarmFilters, value: string): boolean {
    const arr = filters[key];
    if (Array.isArray(arr)) return arr.includes(value as never);
    return false;
  }

  return (
    <div className="relative" ref={ref}>
      <button
        onClick={() => setOpen(!open)}
        className="btn-ghost text-[11px]"
      >
        <Plus size={12} />
        Add filter
      </button>

      {open && (
        <div className="absolute left-0 top-full mt-1 z-50 bg-surface-raised border border-border-default rounded-lg shadow-xl p-3 w-[340px] max-h-[420px] overflow-y-auto">
          {groups.map((group) => (
            <div key={group.heading} className="mb-3 last:mb-0">
              <div className="text-[10px] uppercase tracking-wider font-semibold text-theme-muted mb-1.5">
                {group.heading}
              </div>
              {group.items.map((item) => (
                <div key={item.key} className="mb-2 last:mb-0">
                  <div className="text-[11px] font-medium text-theme-secondary mb-1">{item.label}</div>
                  <div className="flex flex-wrap gap-1">
                    {item.options.map((opt) => (
                      <button
                        key={opt}
                        onClick={() => onToggleFilter(item.key, opt)}
                        className={`px-1.5 py-0.5 rounded text-[10px] font-medium border transition-colors ${
                          isChecked(item.key, opt)
                            ? 'bg-accent-subtle text-theme-accent border-theme-accent/30'
                            : 'bg-surface-overlay/30 text-theme-secondary border-border-subtle/40 hover:border-border-default'
                        }`}
                      >
                        {opt}
                      </button>
                    ))}
                  </div>
                </div>
              ))}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
