import { mockClock } from '../lib/mockClock';
import { generateAlarms } from '../lib/mockAlarmGenerator';

export const MOCK_ALARMS = generateAlarms(mockClock.now());
