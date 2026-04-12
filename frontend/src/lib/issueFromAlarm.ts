import type { Alarm, HumanRisk, Issue, RiskLevel, User } from '../types';
import { getUserByName } from '../mocks/users';

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

  const ownerUser = getUserByName(alarm.owner);
  const ownerId = ownerUser?.id ?? alarm.owner;

  return {
    title: alarm.message,
    description:
      `Escalated from alarm ${alarm.id}: ${alarm.message}. ` +
      `Machine: ${alarm.machineId}. Product: ${alarm.product}. Operation: ${alarm.operation}. ` +
      `Department: ${alarm.department}. Owner: ${alarm.owner}.`,
    date: now,
    alarmType: alarm.type,
    riskLevel,
    status: 'Triage',
    issueTime: alarm.time,
    operation: alarm.operation,
    product: alarm.product,
    ownerId,
    department: alarm.department,
  };
}
