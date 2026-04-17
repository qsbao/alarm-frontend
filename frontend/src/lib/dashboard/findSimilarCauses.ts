import type { Alarm, Issue } from '../../types';

export function findSimilarCauses(newAlarm: Alarm, candidateIssues: Issue[]): Issue[] {
  const alarmDate = newAlarm.alarmDate;
  const department = newAlarm.department;
  const tool = newAlarm.module;
  const product = newAlarm.productId;

  const matched = candidateIssues.filter((issue) => {
    if (!alarmDate || !sameDay(issue.date, alarmDate)) return false;
    if (issue.department !== department) return false;
    const toolMatch = !!tool && issue.module === tool;
    const productMatch = issue.product === product;
    return toolMatch || productMatch;
  });

  return [...matched].sort((a, b) => {
    const aTool = !!tool && a.module === tool;
    const bTool = !!tool && b.module === tool;
    if (aTool !== bTool) return aTool ? -1 : 1;
    return Date.parse(b.date) - Date.parse(a.date);
  });
}

function sameDay(issueDateIso: string, alarmDate: string): boolean {
  return issueDateIso.slice(0, 10) === alarmDate.slice(0, 10);
}
