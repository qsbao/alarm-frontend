import type { Alarm } from '../types';

/**
 * Derives `active` from `recoveryTime`. An alarm is active if it has no
 * recoveryTime, or if now hasn't reached recoveryTime yet.
 */
export function isActive(alarm: Alarm, now: number): boolean {
  if (!alarm.recoveryTime) return true;
  return Date.parse(alarm.recoveryTime) > now;
}
