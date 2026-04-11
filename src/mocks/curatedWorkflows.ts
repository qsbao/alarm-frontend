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

/** Reads the derived status from the workflow's current step states. */
function statusFromWorkflow(definition: WorkflowDefinition, instance: WorkflowInstance) {
  return deriveStatus(definition, instance) ?? 'New';
}

const ts = '2025-06-01T10:00:00Z';

/**
 * Attaches genericLinear workflows to all issues, distributed across stages.
 */
export function applyCuratedWorkflows(issues: Issue[]): void {
  for (let i = 0; i < issues.length; i++) {
    const issue = issues[i];
    const attached = attachWorkflow(genericLinearDefinition, issue, {}, ts);
    if ('error' in attached) {
      throw new Error(`Failed to attach workflow to ${issue.id}: ${attached.error}`);
    }
    let instance = attached.instance;

    // Mod 3 distribution: 0 → ongoing at step 1, 1 → ongoing at step 2, 2 → terminal
    const stage = i % 3;

    if (stage >= 1) {
      // Complete chart_owner_comment to advance to resolved
      const r1 = completeStep(genericLinearDefinition, instance, issue, {
        stepId: 'chart_owner_comment',
        actorId: issue.ownerId,
        timestamp: ts,
        payload: {},
      });
      if ('error' in r1) throw new Error(`chart_owner_comment failed for ${issue.id}: ${r1.error}`);
      instance = r1.instance;
    }
    if (stage >= 2) {
      // Complete resolved
      const r2 = completeStep(genericLinearDefinition, instance, issue, {
        stepId: 'resolved',
        actorId: issue.ownerId,
        timestamp: ts,
        payload: {},
      });
      if ('error' in r2) throw new Error(`resolved failed for ${issue.id}: ${r2.error}`);
      instance = r2.instance;

      // Complete closed
      const r3 = completeStep(genericLinearDefinition, instance, issue, {
        stepId: 'closed',
        actorId: issue.ownerId,
        timestamp: ts,
        payload: { comment: 'Auto-closed during seed' },
      });
      if ('error' in r3) throw new Error(`closed failed for ${issue.id}: ${r3.error}`);
      instance = r3.instance;
    }

    issue.workflow = instance;
    issue.status = statusFromWorkflow(genericLinearDefinition, instance);
  }
}
