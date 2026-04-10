import { create } from 'zustand';
import type { Alarm } from '../types';
import { MOCK_ALARMS } from '../mocks/alarms';

interface AlarmStore {
  alarms: Alarm[];
}

export const useAlarmStore = create<AlarmStore>()(() => ({
  alarms: MOCK_ALARMS,
}));
