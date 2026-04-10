import { Clock, Zap, HeartPulse } from 'lucide-react';
import { useAlarmStore } from '../stores/alarmStore';
import { useMockClockStore } from '../stores/mockClockStore';
import { generateRandomAlarm } from '../lib/mockAlarmGenerator';
import { isActive } from '../lib/alarmFiltering';

const THIRTY_MINUTES = 30 * 60 * 1000;

export function DevPanel() {
  const advance = useMockClockStore((s) => s.advance);
  const now = useMockClockStore((s) => s.now);
  const alarms = useAlarmStore((s) => s.alarms);
  const addAlarm = useAlarmStore((s) => s.addAlarm);
  const recoverAlarm = useAlarmStore((s) => s.recoverAlarm);

  function handleAdvanceTime() {
    advance(THIRTY_MINUTES);
  }

  function handleFireRandom() {
    const alarm = generateRandomAlarm(useMockClockStore.getState().now);
    addAlarm(alarm);
  }

  function handleRecoverOldest() {
    const clockNow = useMockClockStore.getState().now;
    const oldest = [...alarms]
      .filter((a) => isActive(a, clockNow))
      .sort((a, b) => Date.parse(a.time) - Date.parse(b.time))[0];
    if (oldest) {
      recoverAlarm(oldest.id);
    }
  }

  return (
    <div className="fixed bottom-4 right-4 z-50 flex flex-col gap-2 p-3 rounded-lg border border-border-subtle bg-surface-overlay shadow-lg text-xs w-64">
      <div className="flex items-center gap-1.5 font-semibold text-theme-primary border-b border-border-subtle pb-2 mb-0.5">
        <span className="text-[10px] font-mono bg-amber-500/15 text-amber-600 dark:text-amber-400 px-1.5 py-0.5 rounded">DEV</span>
        <span>Dev Panel</span>
        <span className="ml-auto text-[10px] text-theme-tertiary font-mono">
          {new Date(now).toLocaleTimeString()}
        </span>
      </div>

      <button
        onClick={handleAdvanceTime}
        className="flex items-center gap-2 px-2.5 py-1.5 rounded-md text-left text-theme-secondary hover:text-theme-primary hover:bg-surface-raised transition-colors"
      >
        <Clock className="w-3.5 h-3.5 shrink-0" />
        Advance mock time by 30m
      </button>

      <button
        onClick={handleFireRandom}
        className="flex items-center gap-2 px-2.5 py-1.5 rounded-md text-left text-theme-secondary hover:text-theme-primary hover:bg-surface-raised transition-colors"
      >
        <Zap className="w-3.5 h-3.5 shrink-0" />
        Fire random alarm
      </button>

      <button
        onClick={handleRecoverOldest}
        className="flex items-center gap-2 px-2.5 py-1.5 rounded-md text-left text-theme-secondary hover:text-theme-primary hover:bg-surface-raised transition-colors"
      >
        <HeartPulse className="w-3.5 h-3.5 shrink-0" />
        Recover oldest active alarm
      </button>
    </div>
  );
}
