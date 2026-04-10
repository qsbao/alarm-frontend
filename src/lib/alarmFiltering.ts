import type { Alarm, AlarmFilters, AlarmSortKey, RiskLevel } from '../types';

/**
 * Derives `active` from `recoveryTime`. An alarm is active if it has no
 * recoveryTime, or if now hasn't reached recoveryTime yet.
 */
export function isActive(alarm: Alarm, now: number): boolean {
  if (!alarm.recoveryTime) return true;
  return Date.parse(alarm.recoveryTime) > now;
}

/** An alarm is "missed" if it's Open and recovered (no one acked before recovery). */
export function isMissed(alarm: Alarm, now: number): boolean {
  return alarm.status === 'Open' && !isActive(alarm, now);
}

const SEVERITY_ORDER: Record<RiskLevel, number> = {
  Critical: 0,
  High: 1,
  Medium: 2,
  Low: 3,
};

/** Filter alarms by all dimensions in AlarmFilters. All filters combine with AND. */
export function filterAlarms(alarms: Alarm[], filters: AlarmFilters, now: number): Alarm[] {
  return alarms.filter((alarm) => {
    if (filters.search) {
      const q = filters.search.toLowerCase();
      const haystack = `${alarm.id} ${alarm.message} ${alarm.type} ${alarm.machineId} ${alarm.owner}`.toLowerCase();
      if (!haystack.includes(q)) return false;
    }
    if (filters.status?.length && !filters.status.includes(alarm.status)) return false;
    if (filters.department?.length && !filters.department.includes(alarm.department)) return false;
    if (filters.severity?.length && !filters.severity.includes(alarm.severity)) return false;
    if (filters.humanRisk?.length && (!alarm.humanRisk || !filters.humanRisk.includes(alarm.humanRisk))) return false;
    if (filters.alarmType?.length && !filters.alarmType.includes(alarm.type)) return false;
    if (filters.owner?.length && !filters.owner.includes(alarm.owner)) return false;
    if (filters.machineId?.length && !filters.machineId.includes(alarm.machineId)) return false;
    if (filters.chamberId?.length && (!alarm.chamberId || !filters.chamberId.includes(alarm.chamberId))) return false;
    if (filters.product?.length && !filters.product.includes(alarm.product)) return false;
    if (filters.operation?.length && !filters.operation.includes(alarm.operation)) return false;
    if (filters.labels?.length && !filters.labels.some((l) => alarm.labels.includes(l))) return false;
    if (filters.active === 'active' && !isActive(alarm, now)) return false;
    if (filters.active === 'recovered' && isActive(alarm, now)) return false;
    return true;
  });
}

/** Sort alarms by the given key. Returns a new array. */
export function sortAlarms(alarms: Alarm[], sortKey: AlarmSortKey): Alarm[] {
  return [...alarms].sort((a, b) => {
    switch (sortKey) {
      case 'time':
        return Date.parse(b.time) - Date.parse(a.time); // newest first
      case 'severity':
        return SEVERITY_ORDER[a.severity] - SEVERITY_ORDER[b.severity]; // Critical first
      case 'type':
        return a.type.localeCompare(b.type);
      case 'department':
        return a.department.localeCompare(b.department);
    }
  });
}
