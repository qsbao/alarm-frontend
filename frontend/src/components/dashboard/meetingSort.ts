import type { EnrichedAlarmRow } from '../../hooks/useDashboardData';

export function isMeetingTbd(row: EnrichedAlarmRow): boolean {
  return row.meetingBound && !row.meetingTime;
}

export function formatMeetingLabel(meetingTime: string | undefined): string {
  if (!meetingTime) return 'Meeting TBD';
  const d = new Date(meetingTime);
  const date = d.toISOString().slice(0, 10);
  const time = d.toISOString().slice(11, 16);
  return `${date} ${time}`;
}

export function sortMeetingRows(rows: EnrichedAlarmRow[]): EnrichedAlarmRow[] {
  const indexed = rows.map((row, index) => ({ row, index }));
  indexed.sort((a, b) => {
    const aTbd = isMeetingTbd(a.row);
    const bTbd = isMeetingTbd(b.row);
    if (aTbd !== bTbd) return aTbd ? 1 : -1;
    if (!aTbd && !bTbd) {
      const aTime = a.row.meetingTime ?? '';
      const bTime = b.row.meetingTime ?? '';
      if (aTime < bTime) return -1;
      if (aTime > bTime) return 1;
    }
    return a.index - b.index;
  });
  return indexed.map((entry) => entry.row);
}
