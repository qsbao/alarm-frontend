import { Search, X, Save, Trash2 } from 'lucide-react';
import { useState } from 'react';
import type { AlarmFilters, AlarmSortKey } from '../../types';
import type { SavedView } from '../../lib/savedViews';
import { FilterChip } from './FilterChip';
import { AddFilterPopover } from './AddFilterPopover';

interface AlarmFilterBarProps {
  filters: AlarmFilters;
  sortKey: AlarmSortKey;
  views: SavedView[];
  activeViewName: string | null;
  onFiltersChange: (filters: AlarmFilters) => void;
  onSortChange: (sortKey: AlarmSortKey) => void;
  onSelectView: (view: SavedView) => void;
  onSaveView: (name: string) => void;
  onDeleteView: (name: string) => void;
  onClear: () => void;
  departments: string[];
  owners: string[];
  machines: string[];
  chambers: string[];
  products: string[];
  operations: string[];
}

const SORT_OPTIONS: { key: AlarmSortKey; label: string }[] = [
  { key: 'time', label: 'Newest first' },
  { key: 'severity', label: 'Severity' },
  { key: 'type', label: 'Alarm type' },
  { key: 'department', label: 'Department' },
];

function toggleArrayFilter(filters: AlarmFilters, key: keyof AlarmFilters, value: string): AlarmFilters {
  const current = (filters[key] as string[] | undefined) ?? [];
  const next = current.includes(value)
    ? current.filter((v) => v !== value)
    : [...current, value];
  const updated = { ...filters };
  if (next.length === 0) {
    delete (updated as Record<string, unknown>)[key];
  } else {
    (updated as Record<string, unknown>)[key] = next;
  }
  return updated;
}

function chipEntries(filters: AlarmFilters): { key: keyof AlarmFilters; label: string; value: string }[] {
  const entries: { key: keyof AlarmFilters; label: string; value: string }[] = [];
  const arrayDims: [keyof AlarmFilters, string][] = [
    ['status', 'Status'],
    ['department', 'Dept'],
    ['severity', 'Severity'],
    ['humanRisk', 'Risk'],
    ['alarmType', 'Type'],
    ['owner', 'Owner'],
    ['machineId', 'Machine'],
    ['chamberId', 'Chamber'],
    ['product', 'Product'],
    ['operation', 'Operation'],
    ['labels', 'Label'],
  ];
  for (const [key, label] of arrayDims) {
    const arr = filters[key];
    if (Array.isArray(arr)) {
      for (const v of arr) {
        entries.push({ key, label, value: v as string });
      }
    }
  }
  if (filters.active) {
    entries.push({ key: 'active', label: 'Active', value: filters.active === 'active' ? 'Active' : 'Recovered' });
  }
  return entries;
}

export function AlarmFilterBar({
  filters,
  sortKey,
  views,
  activeViewName,
  onFiltersChange,
  onSortChange,
  onSelectView,
  onSaveView,
  onDeleteView,
  onClear,
  departments,
  owners,
  machines,
  chambers,
  products,
  operations,
}: AlarmFilterBarProps) {
  const [saveInput, setSaveInput] = useState('');
  const [showSaveInput, setShowSaveInput] = useState(false);
  const chips = chipEntries(filters);
  const hasFilters = chips.length > 0 || filters.search;

  const customViews = views.filter((v) => !v.builtin);

  function handleRemoveChip(key: keyof AlarmFilters, value: string) {
    if (key === 'active') {
      const { active: _, ...rest } = filters;
      onFiltersChange(rest);
    } else {
      onFiltersChange(toggleArrayFilter(filters, key, value));
    }
  }

  function handleToggleFilter(key: keyof AlarmFilters, value: string) {
    onFiltersChange(toggleArrayFilter(filters, key, value));
  }

  function handleSave() {
    const name = saveInput.trim();
    if (!name) return;
    onSaveView(name);
    setSaveInput('');
    setShowSaveInput(false);
  }

  return (
    <div className="space-y-2">
      {/* Row 1: Saved views selector */}
      <div className="flex items-center gap-1.5 flex-wrap">
        {views.map((view) => (
          <div key={view.name} className="flex items-center">
            <button
              onClick={() => onSelectView(view)}
              className={`px-2.5 py-1 rounded-md text-[11px] font-medium transition-colors ${
                activeViewName === view.name
                  ? 'bg-accent-subtle text-theme-accent border border-theme-accent/30'
                  : 'bg-surface-overlay/30 text-theme-secondary border border-border-subtle/40 hover:border-border-default hover:text-theme-primary'
              }`}
            >
              {view.name}
            </button>
            {!view.builtin && (
              <button
                onClick={() => onDeleteView(view.name)}
                className="ml-0.5 p-0.5 rounded hover:bg-red-500/15 text-theme-muted hover:text-red-400 transition-colors"
                title={`Delete "${view.name}"`}
              >
                <Trash2 size={10} />
              </button>
            )}
          </div>
        ))}

        <div className="w-px h-4 bg-border-subtle" />

        {showSaveInput ? (
          <div className="flex items-center gap-1">
            <input
              type="text"
              value={saveInput}
              onChange={(e) => setSaveInput(e.target.value)}
              onKeyDown={(e) => e.key === 'Enter' && handleSave()}
              placeholder="View name..."
              className="input-base text-[11px] w-28 py-0.5 px-2"
              autoFocus
            />
            <button onClick={handleSave} className="btn-ghost text-[11px] py-0.5">Save</button>
            <button onClick={() => setShowSaveInput(false)} className="btn-ghost text-[11px] py-0.5">
              <X size={10} />
            </button>
          </div>
        ) : (
          <button
            onClick={() => setShowSaveInput(true)}
            className="btn-ghost text-[11px]"
            title="Save current filters as a view"
          >
            <Save size={11} />
            Save view
          </button>
        )}
      </div>

      {/* Row 2: Search + primary chips + add filter + sort + clear */}
      <div className="flex gap-2 flex-wrap items-center">
        <div className="relative flex-1 min-w-[180px] max-w-xs">
          <Search
            size={13}
            className="absolute left-2.5 top-1/2 -translate-y-1/2 text-theme-muted pointer-events-none"
          />
          <input
            type="text"
            placeholder="Search id, message, type, machine..."
            value={filters.search ?? ''}
            onChange={(e) => onFiltersChange({ ...filters, search: e.target.value || undefined })}
            className="input-base pl-8 text-[11px]"
          />
        </div>

        <AddFilterPopover
          filters={filters}
          onToggleFilter={handleToggleFilter}
          departments={departments}
          owners={owners}
          machines={machines}
          chambers={chambers}
          products={products}
          operations={operations}
        />

        <select
          value={sortKey}
          onChange={(e) => onSortChange(e.target.value as AlarmSortKey)}
          className="input-base w-auto text-[11px]"
        >
          {SORT_OPTIONS.map((o) => (
            <option key={o.key} value={o.key}>{o.label}</option>
          ))}
        </select>

        {hasFilters && (
          <button onClick={onClear} className="btn-ghost text-[11px]">
            <X size={12} />
            Clear
          </button>
        )}
      </div>

      {/* Row 3: Active filter chips */}
      {chips.length > 0 && (
        <div className="flex flex-wrap gap-1">
          {chips.map((c) => (
            <FilterChip
              key={`${c.key}-${c.value}`}
              label={c.label}
              value={c.value}
              onRemove={() => handleRemoveChip(c.key, c.value)}
            />
          ))}
        </div>
      )}
    </div>
  );
}
