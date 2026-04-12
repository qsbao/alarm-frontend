/**
 * Post-processes all 40 mock issues to attach the genericLinear workflow.
 *
 * All issues use genericLinear (chart_owner_comment → resolved → closed),
 * distributed across stages so the issue list shows a mix of statuses:
 *   mod 3: 0 → chart_owner_comment ongoing (Investigating)
 *          1 → resolved ongoing (Investigating)
 *          2 → closed (terminal)
 */
import type { Issue } from '../types';
import type { WorkflowDefinition, WorkflowInstance } from '../lib/workflows/types';
import { attachWorkflow, completeStep, deriveStatus } from '../lib/workflows/engine';
import { genericLinearDefinition } from '../lib/workflows/definitions/genericLinear';
import { spcOocBranchingDefinition } from '../lib/workflows/definitions/spcOocBranching';
import { getDefaultWorkflowId } from '../lib/workflows/workflowDefaults';

/** Reads the derived status from the workflow's current step states. */
function statusFromWorkflow(definition: WorkflowDefinition, instance: WorkflowInstance) {
  return deriveStatus(definition, instance) ?? 'Triage';
}

const ts = '2025-06-01T10:00:00Z';

/** Linear steps to advance through for genericLinear */
const LINEAR_ADVANCE: string[][] = [
  [], // stage 0: chart_owner_comment ongoing
  ['chart_owner_comment'], // stage 1: resolved ongoing
  ['chart_owner_comment', 'resolved', 'closed'], // stage 2: terminal
];

/** SPC OOC steps to advance through (parallel tracks) */
const SPC_OOC_ADVANCE: string[][] = [
  [], // stage 0: chart_owner_comment ongoing
  ['chart_owner_comment'], // stage 1: l5_review + pi_comment ongoing (parallel)
  ['chart_owner_comment', 'l5_review', 'pi_comment', 'l4_review', 'meeting', 'resolved', 'closed'], // stage 2: terminal
];

/**
 * Attaches workflows to all issues, distributed across stages.
 * SPC OOC issues (EndpointDrift) use spcOocBranching; others use genericLinear.
 */
export function applyCuratedWorkflows(issues: Issue[]): void {
  for (let i = 0; i < issues.length; i++) {
    const issue = issues[i];
    const defId = getDefaultWorkflowId(issue.alarmType);
    const definition = defId === 'spc_ooc_branching_v1'
      ? spcOocBranchingDefinition
      : genericLinearDefinition;

    const attached = attachWorkflow(definition, issue, {}, ts);
    if ('error' in attached) {
      throw new Error(`Failed to attach workflow to ${issue.id}: ${attached.error}`);
    }
    let instance = attached.instance;

    const stage = i % 3;
    const advanceSteps = definition === spcOocBranchingDefinition
      ? SPC_OOC_ADVANCE[stage]
      : LINEAR_ADVANCE[stage];

    for (const stepId of advanceSteps) {
      const r = completeStep(definition, instance, issue, {
        stepId,
        actorId: issue.ownerId,
        timestamp: ts,
        payload: stepId === 'closed' ? { comment: 'Auto-closed during seed' } : {},
      });
      if ('error' in r) throw new Error(`${stepId} failed for ${issue.id}: ${r.error}`);
      instance = r.instance;
    }

    issue.workflow = instance;
    issue.status = statusFromWorkflow(definition, instance);
  }
}
