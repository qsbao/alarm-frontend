import { FastForward, RotateCcw } from 'lucide-react';
import { useCallback, useEffect, useState } from 'react';
import { useLocation } from 'react-router-dom';
import { backend } from '../api/backendClient';
import { refreshEvents } from '../lib/refreshEvents';
import { getDefinition } from '../lib/workflows/definitions';
import { findNextAdvanceAction } from '../lib/devPanelHelpers';
import type { Issue } from '../types';
import type { WorkflowInstance } from '../lib/workflows/types';

function useCurrentIssueId(): string | undefined {
  const location = useLocation();
  const match = location.pathname.match(/^\/issues\/(iss-\d+)$/);
  return match?.[1];
}

interface BackendIssue {
  id: string;
  title: string;
  date: string;
  riskLevel: string;
  status: string;
  issueTime: string;
  operName?: string;
  operNo?: string;
  module?: string;
  labels: string[];
  product: string;
  ownerId: string;
  department: string;
  description: string;
}

function useCurrentIssue(issueId: string | undefined): Issue | undefined {
  const [issue, setIssue] = useState<Issue | undefined>(undefined);

  const load = useCallback(async () => {
    if (!issueId) {
      setIssue(undefined);
      return;
    }
    const { data } = await backend.GET('/api/issues/{id}', {
      params: { path: { id: issueId } },
    });
    if (data) {
      const raw = data as unknown as BackendIssue;
      const found: Issue = {
        id: raw.id,
        title: raw.title,
        date: raw.date,
        riskLevel: raw.riskLevel as Issue['riskLevel'],
        status: raw.status as Issue['status'],
        issueTime: raw.issueTime,
        operName: raw.operName,
        operNo: raw.operNo,
        module: raw.module as Issue['module'],
        labels: (raw.labels ?? []) as Issue['labels'],
        product: raw.product,
        ownerId: raw.ownerId,
        department: raw.department,
        description: raw.description ?? '',
        activity: [],
      };

      // Fetch workflow
      try {
        const wfRes = await backend.GET('/api/issues/{id}/workflow' as any, {
          params: { path: { id: issueId } },
        });
        if (wfRes.data) {
          found.workflow = wfRes.data as unknown as WorkflowInstance;
        }
      } catch {
        // No workflow
      }

      setIssue(found);
    } else {
      setIssue(undefined);
    }
  }, [issueId]);

  useEffect(() => {
    load();
  }, [load]);

  useEffect(() => refreshEvents.subscribe(() => load()), [load]);

  return issue;
}

export function DevPanel() {
  const currentIssueId = useCurrentIssueId();
  const currentIssue = useCurrentIssue(currentIssueId);

  const workflow = currentIssue?.workflow;
  const definition = workflow ? getDefinition(workflow.definitionId) : undefined;

  const canAdvance =
    !!currentIssue && !!workflow && !!definition &&
    !!findNextAdvanceAction(currentIssue, definition, workflow);

  async function handleAdvanceWorkflow() {
    if (!currentIssue?.workflow || !definition) return;

    const info = findNextAdvanceAction(currentIssue, definition, currentIssue.workflow);
    if (!info) return;

    await backend.POST('/api/issues/{id}/workflow/steps/{stepId}/complete' as any, {
      params: { path: { id: currentIssue.id, stepId: info.step.id } },
      body: info.payload as any,
    });
    refreshEvents.emit();
  }

  return (
    <div className="fixed bottom-4 right-4 z-50 flex flex-col gap-2 p-3 rounded-lg border border-border-subtle bg-surface-overlay shadow-lg text-xs w-64">
      <div className="flex items-center gap-1.5 font-semibold text-theme-primary border-b border-border-subtle pb-2 mb-0.5">
        <span className="text-[10px] font-mono bg-amber-500/15 text-amber-600 dark:text-amber-400 px-1.5 py-0.5 rounded">DEV</span>
        <span>Dev Panel</span>
      </div>

      <div className="text-[10px] font-semibold uppercase tracking-wider text-theme-muted mb-1.5">Workflows</div>

      <button
        onClick={handleAdvanceWorkflow}
        disabled={!canAdvance}
        className="flex items-center gap-2 px-2.5 py-1.5 rounded-md text-left text-theme-secondary hover:text-theme-primary hover:bg-surface-raised transition-colors w-full disabled:opacity-40 disabled:cursor-not-allowed"
      >
        <FastForward className="w-3.5 h-3.5 shrink-0" />
        Advance current workflow
      </button>
    </div>
  );
}
