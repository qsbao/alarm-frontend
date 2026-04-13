import type { AlarmSource } from '../../types';

export function getAlarmSourceUrl(source: AlarmSource, sourceAlarmId: string): string {
  switch (source) {
    case 'SPC_SYSTEM':
      return `https://spc.fab.internal/alarms/${sourceAlarmId}`;
    case 'MES_ALERTS':
      return `https://mes.fab.internal/alerts/${sourceAlarmId}`;
    case 'SENSOR_HUB':
      return `https://sensor.fab.internal/events/${sourceAlarmId}`;
  }
}

export function getAlarmSourceLabel(source: AlarmSource): string {
  switch (source) {
    case 'SPC_SYSTEM':
      return 'SPC System';
    case 'MES_ALERTS':
      return 'MES Alerts';
    case 'SENSOR_HUB':
      return 'Sensor Hub';
  }
}
