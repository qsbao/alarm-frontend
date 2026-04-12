export interface IssueAlarm {
  id: string;
  issueId: string;
  alarmId: string;
  attachedAt: string;
  attachedBy: string;
  mergedAt?: string;
  mergedBy?: string;
  mergedToIssueId?: string;
}

let rows: IssueAlarm[] = [];
let nextId = 1;

export function attachAlarm(issueId: string, alarmId: string, attachedBy: string): IssueAlarm {
  const existing = rows.find(
    (r) => r.issueId === issueId && r.alarmId === alarmId && !r.mergedAt,
  );
  if (existing) return existing;

  const row: IssueAlarm = {
    id: `ia-${nextId++}`,
    issueId,
    alarmId,
    attachedAt: new Date().toISOString(),
    attachedBy,
  };
  rows.push(row);
  return row;
}

export function detachAlarm(issueId: string, alarmId: string): boolean {
  const idx = rows.findIndex(
    (r) => r.issueId === issueId && r.alarmId === alarmId && !r.mergedAt,
  );
  if (idx < 0) return false;
  rows.splice(idx, 1);
  return true;
}

export function getActiveAlarmsForIssue(issueId: string): IssueAlarm[] {
  return rows.filter((r) => r.issueId === issueId && !r.mergedAt);
}

export function getActiveIssueForAlarm(alarmId: string): IssueAlarm | undefined {
  return rows.find((r) => r.alarmId === alarmId && !r.mergedAt);
}

export function getHistoricalAlarmsForIssue(issueId: string): IssueAlarm[] {
  return rows.filter((r) => r.issueId === issueId && r.mergedAt != null);
}

export interface MoveAlarmOpts {
  by: string;
  sourceDepartment: string;
  targetDepartment: string;
  userDepartment: string;
}

export type MoveAlarmResult =
  | { ok: true; fromIssueId: string; toIssueId: string }
  | { ok: false; reason: 'not_found' | 'permission_denied' };

export function moveAlarm(alarmId: string, targetIssueId: string, opts: MoveAlarmOpts): MoveAlarmResult {
  if (opts.userDepartment !== opts.sourceDepartment || opts.userDepartment !== opts.targetDepartment) {
    return { ok: false, reason: 'permission_denied' };
  }

  const row = rows.find((r) => r.alarmId === alarmId && !r.mergedAt);
  if (!row) return { ok: false, reason: 'not_found' };

  const fromIssueId = row.issueId;

  // Atomic: mark old row as historical and create new active row in one go
  row.mergedAt = new Date().toISOString();
  row.mergedBy = opts.by;
  row.mergedToIssueId = targetIssueId;

  const newRow: IssueAlarm = {
    id: `ia-${nextId++}`,
    issueId: targetIssueId,
    alarmId,
    attachedAt: new Date().toISOString(),
    attachedBy: opts.by,
  };
  rows.push(newRow);

  return { ok: true, fromIssueId, toIssueId: targetIssueId };
}

export function resetIssueAlarms(): void {
  rows = [];
  nextId = 1;
}

/**
 * Bulk-load rows (used during mock initialization).
 */
export function loadIssueAlarms(seed: IssueAlarm[]): void {
  rows = [...seed];
  const maxNum = rows.reduce((max, r) => {
    const num = parseInt(r.id.replace('ia-', ''), 10);
    return num > max ? num : max;
  }, 0);
  nextId = maxNum + 1;
}
