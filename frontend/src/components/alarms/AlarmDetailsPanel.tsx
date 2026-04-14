import type { Alarm } from '../../types';
import { getAlarmType } from '../../lib/alarms/alarmTypeRegistry';
import { UnknownAlarmPanel } from './UnknownAlarmPanel';

export function AlarmDetailsPanel({ alarm }: { alarm: Alarm }) {
  const details = alarm.details;

  if (!details) {
    return null;
  }

  const spec = getAlarmType(details.kind);
  if (spec) {
    const Panel = spec.panel;
    return <Panel details={details} />;
  }

  return <UnknownAlarmPanel kind={details.kind} />;
}
