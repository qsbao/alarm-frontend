import type { Alarm, HumanRisk, Issue, RiskLevel, User } from '../types';

const HUMAN_RISK_TO_RISK_LEVEL: Record<HumanRisk, RiskLevel> = {
  high: 'High',
  middle: 'Medium',
  low: 'Low',
};

export type IssueDraft = Omit<Issue, 'id' | 'activity'>;

export function buildIssueFromAlarm(alarm: Alarm, _currentUser: User, now: string): IssueDraft {
  const riskLevel: RiskLevel = alarm.humanRisk
    ? HUMAN_RISK_TO_RISK_LEVEL[alarm.humanRisk]
    : alarm.severity;

  return {
    title: alarm.message,
    description:
      `Escalated from alarm ${alarm.id}: ${alarm.message}. ` +
      `Machine: ${alarm.machineId}. Product: ${alarm.product}. Operation: ${alarm.operation}. ` +
      `Department: ${alarm.department}. Owner: ${alarm.owner}.`,
    date: now,
    alarmType: alarm.type,
    riskLevel,
    status: 'New',
    issueTime: alarm.time,
    operation: alarm.operation,
    product: alarm.product,
    owner: alarm.owner,
    department: alarm.department,
    relatedAlarmIds: [alarm.id],
  };
}
