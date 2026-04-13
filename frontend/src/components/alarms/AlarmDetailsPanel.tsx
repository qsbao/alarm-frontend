import type { Alarm } from '../../types';
import { SpcOocPanel } from './SpcOocPanel';
import { TempSpikePanel } from './TempSpikePanel';

export function AlarmDetailsPanel({ alarm }: { alarm: Alarm }) {
  const details = alarm.details;

  if (!details) {
    return null;
  }

  switch (details.kind) {
    case 'spc_ooc':
      return <SpcOocPanel details={details} />;
    case 'TempSpike':
      return <TempSpikePanel details={details} />;
    default:
      // For unknown details kinds, don't render anything
      return null;
  }
}
