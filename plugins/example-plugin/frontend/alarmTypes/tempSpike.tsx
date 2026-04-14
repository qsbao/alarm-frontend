import { Thermometer, Clock, Activity, Calendar } from 'lucide-react';
import type { AlarmTypeSpec } from '../../../../frontend/src/lib/alarms/alarmTypeRegistry';

export interface TempSpikeDetails {
  kind: 'example-plugin:TempSpike';
  currentTemp: number;
  thresholdTemp: number;
  sensorId: string;
  spikeStartTime: string;
  durationSeconds: number;
}

function formatDateTime(iso: string): string {
  const d = new Date(iso);
  return `${d.toISOString().slice(0, 10)} ${d.toISOString().slice(11, 16)}`;
}

function TempSpikePanel({ details }: { details: TempSpikeDetails }) {
  return (
    <div className="card p-4">
      <h3 className="text-[10px] font-semibold uppercase tracking-wider text-theme-muted mb-3 flex items-center gap-1">
        <Thermometer size={12} />
        Temperature Spike Details
      </h3>
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-xs">
        <div className="space-y-1">
          <div className="flex items-center gap-2">
            <Thermometer size={12} className="text-theme-muted" />
            <span className="text-theme-muted">Current:</span>
            <span className="font-medium text-theme-primary">{details.currentTemp.toFixed(1)}°C</span>
          </div>
          <div className="flex items-center gap-2">
            <Activity size={12} className="text-theme-muted" />
            <span className="text-theme-muted">Threshold:</span>
            <span className="font-medium text-theme-primary">{details.thresholdTemp.toFixed(1)}°C</span>
          </div>
          <div className="flex items-center gap-2">
            <span className="text-theme-muted">Delta:</span>
            <span className="font-medium text-red-500">+{(details.currentTemp - details.thresholdTemp).toFixed(1)}°C</span>
          </div>
        </div>
        <div className="space-y-1">
          <div className="flex items-center gap-2">
            <Calendar size={12} className="text-theme-muted" />
            <span className="text-theme-muted">Start Time:</span>
            <span className="font-medium text-theme-primary">{formatDateTime(details.spikeStartTime)}</span>
          </div>
          <div className="flex items-center gap-2">
            <Clock size={12} className="text-theme-muted" />
            <span className="text-theme-muted">Duration:</span>
            <span className="font-medium text-theme-primary">{details.durationSeconds}s</span>
          </div>
          <div className="flex items-center gap-2">
            <span className="text-theme-muted">Sensor:</span>
            <span className="font-medium text-theme-primary">{details.sensorId}</span>
          </div>
        </div>
      </div>
    </div>
  );
}

const spec: AlarmTypeSpec = {
  kind: 'example-plugin:TempSpike',
  panel: TempSpikePanel,
  label: 'Temp Spike',
  icon: Thermometer,
};

export default spec;
