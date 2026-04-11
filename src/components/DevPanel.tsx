import { Clock, Zap, HeartPulse, RotateCcw, FastForward, Undo2 } from 'lucide-react';
import { useLocation } from 'react-router-dom';
import { useAlarmStore } from '../stores/alarmStore';
import { useMockClockStore } from '../stores/mockClockStore';
import { generateRandomAlarm } from '../lib/mockAlarmGenerator';
import { isActive } from '../lib/alarmFiltering';
import { api } from '../api/client';
import { getDefinition } from '../lib/workflows/registry';

const THIRTY_MINUTES = 30 * 60 * 1000;

function useCurrentIssueId(): string | undefined {
  const location = useLocation();
  const match = location.pathname.match(/^\/issues\/(iss-\d+)$/);
  return match?.[1];
}

export function DevPanel() {
  const advance = useMockClockStore((s) => s.advance);
  const now = useMockClockStore((s) => s.now);
  const alarms = useAlarmStore((s) => s.alarms);
  const addAlarm = useAlarmStore((s) => s.addAlarm);
  const recoverAlarm = useAlarmStore((s) => s.recoverAlarm);
  const currentIssueId = useCurrentIssueId();

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
    // Force reload to reflect reset
    window.location.reload();
  }

  async function handleAdvanceWorkflow() {
    if (!currentIssueId) return;
    const issue = await api.getIssue(currentIssueId);
    if (!issue?.workflow || issue.workflow.completedAt) return;

    const def = getDefinition(issue.workflow.definitionId);
    if (!def) return;

    const currentPhase = def.phases.find((p) => p.id === issue.workflow!.currentPhaseId);
    if (!currentPhase) return;

    const completedIds = new Set(
      (issue.workflow.completedActions[issue.workflow.currentPhaseId] ?? []).map((r) => r.actionId),
    );

    // Find the next available required action (skip optional/sendsBackTo)
    const nextAction = currentPhase.actions.find(
      (a) => !completedIds.has(a.id) && a.required && !a.sendsBackTo,
    );
    if (!nextAction) return;

    // Find the actor who passes the gate
    const actor = issue.workflow.actors.find((a) =>
      nextAction.gate({ user: { id: a.userId }, instance: issue.workflow!, issue }),
    );
    if (!actor) return;

    // Build synthetic payload
    const payload: Record<string, unknown> = {};
    for (const [key, schema] of Object.entries(nextAction.payloadSchema)) {
      if (schema.required) {
        if (schema.kind === 'enum' && schema.options?.length) {
          payload[key] = schema.options[0];
        } else {
          payload[key] = `[Dev panel auto-fill for ${key}]`;
        }
      }
    }

    await api.fireWorkflowAction(currentIssueId, nextAction.id, actor.userId, payload);
    window.location.reload();
  }

  async function handleTriggerSendback() {
    if (!currentIssueId) return;
    const issue = await api.getIssue(currentIssueId);
    if (!issue?.workflow || issue.workflow.completedAt) return;

    const def = getDefinition(issue.workflow.definitionId);
    if (!def) return;

    const currentPhase = def.phases.find((p) => p.id === issue.workflow!.currentPhaseId);
    if (!currentPhase) return;

    const completedIds = new Set(
      (issue.workflow.completedActions[issue.workflow.currentPhaseId] ?? []).map((r) => r.actionId),
    );

    // Find a sendsBackTo action
    const sendbackAction = currentPhase.actions.find(
      (a) => !completedIds.has(a.id) && a.sendsBackTo,
    );
    if (!sendbackAction) return;

    const actor = issue.workflow.actors.find((a) =>
      sendbackAction.gate({ user: { id: a.userId }, instance: issue.workflow!, issue }),
    );
    if (!actor) return;

    const payload: Record<string, unknown> = {};
    for (const [key, schema] of Object.entries(sendbackAction.payloadSchema)) {
      if (schema.required) {
        payload[key] = `[Dev panel send-back reason]`;
      }
    }

    await api.fireWorkflowAction(currentIssueId, sendbackAction.id, actor.userId, payload);
    window.location.reload();
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

      {/* Workflow controls */}
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
          disabled={!currentIssueId}
          className="flex items-center gap-2 px-2.5 py-1.5 rounded-md text-left text-theme-secondary hover:text-theme-primary hover:bg-surface-raised transition-colors w-full disabled:opacity-40 disabled:cursor-not-allowed"
        >
          <FastForward className="w-3.5 h-3.5 shrink-0" />
          Advance current workflow
        </button>

        <button
          onClick={handleTriggerSendback}
          disabled={!currentIssueId}
          className="flex items-center gap-2 px-2.5 py-1.5 rounded-md text-left text-theme-secondary hover:text-theme-primary hover:bg-surface-raised transition-colors w-full disabled:opacity-40 disabled:cursor-not-allowed"
        >
          <Undo2 className="w-3.5 h-3.5 shrink-0" />
          Trigger send-back
        </button>
      </div>
    </div>
  );
}
