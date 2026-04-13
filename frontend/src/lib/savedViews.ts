import type { AlarmFilters, AlarmSortKey } from '../types';

export interface SavedView {
  name: string;
  filters: AlarmFilters;
  sortKey?: AlarmSortKey;
  builtin: boolean;
}

const STORAGE_KEY = 'fab-alarm-saved-views';

export const BUILTIN_VIEWS: SavedView[] = [
  { name: 'Needs attention', filters: { status: ['Open'], active: 'active' }, sortKey: 'alarmTime', builtin: true },
  { name: 'In progress', filters: { status: ['Acked'], active: 'active' }, sortKey: 'alarmTime', builtin: true },
  { name: 'Missed', filters: { status: ['Open'], active: 'recovered' }, sortKey: 'alarmTime', builtin: true },
  { name: 'Resolved', filters: { status: ['Acked'], active: 'recovered' }, sortKey: 'alarmTime', builtin: true },
];

const BUILTIN_NAMES = new Set(BUILTIN_VIEWS.map((v) => v.name));

let customViewsCache: SavedView[] | null = null;

function loadCustomViews(): SavedView[] {
  if (customViewsCache) return customViewsCache;
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return [];
    customViewsCache = JSON.parse(raw) as SavedView[];
    return customViewsCache;
  } catch {
    return [];
  }
}

function persistCustomViews(views: SavedView[]) {
  customViewsCache = views;
  localStorage.setItem(STORAGE_KEY, JSON.stringify(views));
}

/** Reset in-memory cache (for tests). */
export function resetCustomViews() {
  customViewsCache = null;
}

/** Get all views: builtins first, then custom. */
export function getViews(): SavedView[] {
  return [...BUILTIN_VIEWS, ...loadCustomViews()];
}

/** Save a custom view. Throws if name collides with a builtin. */
export function saveView(name: string, filters: AlarmFilters, sortKey?: AlarmSortKey) {
  if (BUILTIN_NAMES.has(name)) throw new Error(`Cannot overwrite builtin view "${name}"`);
  const custom = loadCustomViews().filter((v) => v.name !== name);
  custom.push({ name, filters, sortKey, builtin: false });
  persistCustomViews(custom);
}

/** Delete a custom view by name. Throws if it's a builtin. */
export function deleteView(name: string) {
  if (BUILTIN_NAMES.has(name)) throw new Error(`Cannot delete builtin view "${name}"`);
  const custom = loadCustomViews().filter((v) => v.name !== name);
  persistCustomViews(custom);
}
