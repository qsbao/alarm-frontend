import { Wind, Gauge, Box } from 'lucide-react';
import type { AlarmTypeSpec } from '../../../../frontend/src/lib/alarms/alarmTypeRegistry';

export interface ChamberLeakDetails {
  kind: 'example-plugin:ChamberLeak';
  leakRate: number;
  threshold: number;
  chamberId: string;
  testMethod: string;
}

function ChamberLeakPanel({ details }: { details: ChamberLeakDetails }) {
  return (
    <div className="card p-4">
      <h3 className="text-[10px] font-semibold uppercase tracking-wider text-theme-muted mb-3 flex items-center gap-1">
        <Wind size={12} />
        Chamber Leak Details
      </h3>
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-xs">
        <div className="space-y-1">
          <div className="flex items-center gap-2">
            <Gauge size={12} className="text-theme-muted" />
            <span className="text-theme-muted">Leak Rate:</span>
            <span className="font-medium text-red-500">{details.leakRate.toFixed(2)} sccm</span>
          </div>
          <div className="flex items-center gap-2">
            <span className="text-theme-muted">Threshold:</span>
            <span className="font-medium text-theme-primary">{details.threshold.toFixed(2)} sccm</span>
          </div>
        </div>
        <div className="space-y-1">
          <div className="flex items-center gap-2">
            <Box size={12} className="text-theme-muted" />
            <span className="text-theme-muted">Chamber:</span>
            <span className="font-medium text-theme-primary">{details.chamberId}</span>
          </div>
          <div className="flex items-center gap-2">
            <span className="text-theme-muted">Test Method:</span>
            <span className="font-medium text-theme-primary">{details.testMethod}</span>
          </div>
        </div>
      </div>
    </div>
  );
}

const spec: AlarmTypeSpec = {
  kind: 'example-plugin:ChamberLeak',
  panel: ChamberLeakPanel,
  label: 'Chamber Leak',
  icon: Wind,
};

export default spec;
