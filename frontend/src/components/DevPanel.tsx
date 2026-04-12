import { Clock, Zap, HeartPulse, RotateCcw, FastForward } from 'lucide-react';
import { useCallback, useEffect, useState } from 'react';
import { useLocation } from 'react-router-dom';
import { useAlarmStore } from '../stores/alarmStore';
import { useMockClockStore } from '../stores/mockClockStore';
import { generateRandomAlarm } from '../lib/mockAlarmGenerator';
import { isActive } from '../lib/alarmFiltering';
import { findNextAdvanceAction } from '../lib/devPanelHelpers';
import { refreshEvents } from '../lib/refreshEvents';
import { api } from '../api/client';
import { getDefinition } from '../lib/workflows/registry';
import type { Issue } from '../types';

const THIRTY_MINUTES = 30 * 60 * 1000;

function useCurrentIssueId(): string | undefined {
  const location = useLocation();
  const match = location.pathname.match(/^\/issues\/(iss-\d+)$/);
  return match?.[1];
}

function useCurrentIssue(issueId: string | undefined): Issue | undefined {
  const [issue, setIssue] = useState<Issue | undefined>(undefined);

  const load = useCallback(async () => {
    if (!issueId) {
      setIssue(undefined);
      return;
    }
    const found = await api.getIssue(issueId);
    setIssue(found);
  }, [issueId]);

  useEffect(() => {
    load();
  }, [load]);

  useEffect(() => refreshEvents.subscribe(() => load()), [load]);

  return issue;
}

export function DevPanel() {
  const advance = useMockClockStore((s) => s.advance);
  const now = useMockClockStore((s) => s.now);
  const alarms = useAlarmStore((s) => s.alarms);
  const addAlarm = useAlarmStore((s) => s.addAlarm);
  const recoverAlarm = useAlarmStore((s) => s.recoverAlarm);
  const currentIssueId = useCurrentIssueId();
  const currentIssue = useCurrentIssue(currentIssueId);

  const workflow = currentIssue?.workflow;
  const definition = workflow ? getDefinition(workflow.definitionId) : undefined;

  const canAdvance =
    !!currentIssue && !!workflow && !!definition &&
    !!findNextAdvanceAction(currentIssue, definition, workflow);

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

  function handleResetWorkflows() {
    api.resetAllWorkflows();
    refreshEvents.emit();
  }

  async function handleAdvanceWorkflow() {
    if (!currentIssue?.workflow || !definition) return;

    const info = findNextAdvanceAction(currentIssue, definition, currentIssue.workflow);
    if (!info) return;

    await api.completeStep(currentIssue.id, info.step.id, info.actorId, info.payload);
    refreshEvents.emit();
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

      <div className="border-t border-border-subtle pt-2 mt-0.5">
        <div className="text-[10px] font-semibold uppercase tracking-wider text-theme-muted mb-1.5">Workflows</div>

        <button
          onClick={handleResetWorkflows}
          className="flex items-center gap-2 px-2.5 py-1.5 rounded-md text-left text-theme-secondary hover:text-theme-primary hover:bg-surface-raised transition-colors w-full"
        >
          <RotateCcw className="w-3.5 h-3.5 shrink-0" />
          Reset all workflows
        </button>

        <button
          onClick={handleAdvanceWorkflow}
          disabled={!canAdvance}
          className="flex items-center gap-2 px-2.5 py-1.5 rounded-md text-left text-theme-secondary hover:text-theme-primary hover:bg-surface-raised transition-colors w-full disabled:opacity-40 disabled:cursor-not-allowed"
        >
          <FastForward className="w-3.5 h-3.5 shrink-0" />
          Advance current workflow
        </button>
      </div>
    </div>
  );
}
