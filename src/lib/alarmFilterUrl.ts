import type { AlarmFilters, AlarmSortKey } from '../types';

const ARRAY_KEYS = [
  'status', 'department', 'severity', 'humanRisk', 'alarmType',
  'owner', 'machineId', 'chamberId', 'product', 'operation', 'labels',
] as const;

const VALID_SORT_KEYS: AlarmSortKey[] = ['time', 'severity', 'type', 'department'];
const VALID_ACTIVE = ['active', 'recovered'] as const;

/** Serialize AlarmFilters + sortKey into URLSearchParams. */
export function filtersToParams(filters: AlarmFilters, sortKey?: AlarmSortKey): URLSearchParams {
  const params = new URLSearchParams();

  if (filters.search) params.set('q', filters.search);

  for (const key of ARRAY_KEYS) {
    const val = filters[key];
    if (val && val.length > 0) {
      params.set(key, val.join(','));
    }
  }

  if (filters.active) params.set('active', filters.active);
  if (sortKey && sortKey !== 'time') params.set('sort', sortKey);

  return params;
}

/** Deserialize URLSearchParams into AlarmFilters + sortKey. Unknown params are ignored. */
export function paramsToFilters(params: URLSearchParams): { filters: AlarmFilters; sortKey: AlarmSortKey } {
  const filters: AlarmFilters = {};

  const q = params.get('q');
  if (q) filters.search = q;

  for (const key of ARRAY_KEYS) {
    const val = params.get(key);
    if (val) {
      (filters as Record<string, string[]>)[key] = val.split(',');
    }
  }

  const active = params.get('active');
  if (active && (VALID_ACTIVE as readonly string[]).includes(active)) {
    filters.active = active as 'active' | 'recovered';
  }

  const sort = params.get('sort');
  const sortKey: AlarmSortKey = sort && (VALID_SORT_KEYS as string[]).includes(sort)
    ? (sort as AlarmSortKey)
    : 'time';

  return { filters, sortKey };
}
