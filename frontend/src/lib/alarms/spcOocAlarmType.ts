import { BarChart3 } from 'lucide-react';
import { SpcOocPanel } from '../../components/alarms/SpcOocPanel';
import type { AlarmTypeSpec } from './alarmTypeRegistry';

export const spcOocAlarmType: AlarmTypeSpec = {
  kind: 'spc_ooc',
  panel: SpcOocPanel,
  label: 'SPC OOC',
  icon: BarChart3,
};
