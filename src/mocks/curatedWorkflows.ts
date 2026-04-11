/**
 * Post-processes all 40 mock issues to attach workflows.
 *
 * 8 issues are curated with the SPC OOC workflow at various phase states.
 * The remaining 32 issues are attached to the generic issue workflow,
 * distributed across triage / in_progress / closed phases.
 *
 * All workflows are constructed through attachWorkflow/applyAction so the
 * mock data stays valid as the engine evolves.
 *
 * Deliberate alarm type order (indices 0-9):
 *   0:TempSpike  1:PressureDrop  2:ChamberLeak  3:VoltageSag  4:FlowAnomaly
 *   5:ParticleCount  6:VacuumFault  7:RFMismatch  8:GasFlowDeviation  9:EndpointDrift
 *
 * chartOwnerId per alarm (from alarmRouting):
 *   0:user-rossi  1:user-patel  2:user-smith  3:user-tanaka  4:user-kim
 *   5:user-muller  6:user-chen  7:user-garcia  8:user-park  9:user-patel
 */
import type { Alarm, Issue } from '../types';
import type { WorkflowDefinition, WorkflowInstance } from '../lib/workflows/types';
import { attachWorkflow, applyAction } from '../lib/workflows/engine';
import { spcOocDefinition } from '../lib/workflows/definitions/spcOoc';
import { genericIssueDefinition } from '../lib/workflows/definitions/genericIssue';
import { MANAGER_CHAIN } from './managerChain';
import { PI_BY_DEPARTMENT } from './piByDepartment';

/** Reads the status tag of the workflow's current phase. */
function statusFromWorkflow(definition: WorkflowDefinition, instance: WorkflowInstance) {
  const phase = definition.phases.find((p) => p.id === instance.currentPhaseId);
  return phase!.status;
}

// Indices of the 8 issues to curate
const CURATED_INDICES = [1, 3, 4, 7, 8, 11, 15, 16];

interface CurationSpec {
  department: string;
  ownerId: string;
  alarmIdx: number;
  build: (instance: WorkflowInstance, issue: Issue) => WorkflowInstance;
}

const ts = '2025-06-01T10:00:00Z';

function identity(instance: WorkflowInstance): WorkflowInstance {
  return instance;
}

function advanceTo(
  instance: WorkflowInstance,
  issue: Issue,
  steps: Array<{ actionId: string; actorId: string; payload: Record<string, unknown> }>,
): WorkflowInstance {
  let current = instance;
  for (const step of steps) {
    const result = applyAction(spcOocDefinition, current, issue, {
      actionId: step.actionId,
      actorId: step.actorId,
      timestamp: ts,
      payload: step.payload,
    });
    if ('error' in result) {
      throw new Error(`Curated workflow build failed: ${result.error}`);
    }
    current = result.instance;
  }
  return current;
}

/**
 * Applies curated workflows to 8 issues in-place.
 */
export function applyCuratedWorkflows(issues: Issue[], alarms: Alarm[]): void {
  const specs: CurationSpec[] = [
    // --- 2 in P1 fresh ---
    // Alarm 0: TempSpike → chartOwner=user-rossi
    // owner=user-tanaka → L5=user-yamamoto, L4=user-nakamura; PI(Litho)=user-sato
    {
      department: 'Litho',
      ownerId: 'user-tanaka',
      alarmIdx: 0,
      build: identity,
    },
    // Alarm 1: PressureDrop → chartOwner=user-patel
    // owner=user-chen → L5=user-lee, L4=user-wang; PI(Etch)=user-kumar
    {
      department: 'Etch',
      ownerId: 'user-chen',
      alarmIdx: 1,
      build: identity,
    },

    // --- 2 in P2 mixed pending (chart_owner done, both PI and L5 pending) ---
    // Alarm 3: VoltageSag → chartOwner=user-tanaka
    // owner=user-rossi → L5=user-yamamoto, L4=user-nakamura; PI(Litho)=user-sato
    {
      department: 'Litho',
      ownerId: 'user-rossi',
      alarmIdx: 3,
      build: (inst, iss) => advanceTo(inst, iss, [
        { actionId: 'chart_owner_comment', actorId: 'user-tanaka', payload: { ooc_reason_type: 'Tool', comment: 'Voltage drift detected after PM' } },
      ]),
    },
    // Alarm 6: VacuumFault → chartOwner=user-chen
    // owner=user-patel → L5=user-lee, L4=user-wang; PI(Etch)=user-kumar
    {
      department: 'Etch',
      ownerId: 'user-patel',
      alarmIdx: 6,
      build: (inst, iss) => advanceTo(inst, iss, [
        { actionId: 'chart_owner_comment', actorId: 'user-chen', payload: { ooc_reason_type: 'Process', comment: 'Pump speed deviated during recipe' } },
      ]),
    },

    // --- 1 in P2 with chart_owner + PI done but L5 pending ---
    // Alarm 2: ChamberLeak → chartOwner=user-smith
    // owner=user-muller → L5=user-hoffman, L4=user-anderson; PI(Facilities)=user-fischer
    {
      department: 'Facilities',
      ownerId: 'user-muller',
      alarmIdx: 2,
      build: (inst, iss) => advanceTo(inst, iss, [
        { actionId: 'chart_owner_comment', actorId: 'user-smith', payload: { ooc_reason_type: 'Material', comment: 'O-ring degradation suspected' } },
        { actionId: 'pi_comment', actorId: 'user-fischer', payload: { comment: 'Confirmed — helium leak test shows 2x baseline' } },
      ]),
    },

    // --- 1 in P3 ---
    // Alarm 9: EndpointDrift → chartOwner=user-patel
    // owner=user-kim → L5=user-lee, L4=user-wang; PI(Etch)=user-kumar
    {
      department: 'Etch',
      ownerId: 'user-kim',
      alarmIdx: 9,
      build: (inst, iss) => advanceTo(inst, iss, [
        { actionId: 'chart_owner_comment', actorId: 'user-patel', payload: { ooc_reason_type: 'Measurement', comment: 'Endpoint detector calibration off' } },
        { actionId: 'pi_comment', actorId: 'user-kumar', payload: { comment: 'Recalibration scheduled for next PM window' } },
        { actionId: 'l5_approve', actorId: 'user-lee', payload: { comment: 'Approved — proceed to L4' } },
      ]),
    },

    // --- 1 terminal ---
    // Alarm 7: RFMismatch → chartOwner=user-garcia
    // owner=user-garcia → L5=user-yamamoto, L4=user-nakamura; PI(Litho)=user-sato
    {
      department: 'Litho',
      ownerId: 'user-garcia',
      alarmIdx: 7,
      build: (inst, iss) => advanceTo(inst, iss, [
        { actionId: 'chart_owner_comment', actorId: 'user-garcia', payload: { ooc_reason_type: 'Other', comment: 'RF matching network tuned post-PM' } },
        { actionId: 'pi_comment', actorId: 'user-sato', payload: { comment: 'No lot impact — contained to single wafer' } },
        { actionId: 'l5_approve', actorId: 'user-yamamoto', payload: { comment: 'Approved' } },
        { actionId: 'l4_approve', actorId: 'user-nakamura', payload: { comment: 'Final approval granted' } },
      ]),
    },

    // --- 1 with sendsBackTo reset visible in history ---
    // Alarm 8: GasFlowDeviation → chartOwner=user-park
    // owner=user-patel → L5=user-lee, L4=user-wang; PI(Etch)=user-kumar
    {
      department: 'Etch',
      ownerId: 'user-patel',
      alarmIdx: 8,
      build: (inst, iss) => advanceTo(inst, iss, [
        { actionId: 'chart_owner_comment', actorId: 'user-park', payload: { ooc_reason_type: 'Tool', comment: 'MFC drift on gas line 3' } },
        { actionId: 'l5_request_info', actorId: 'user-lee', payload: { reason: 'Please include MFC calibration date and flow readings' } },
        { actionId: 'chart_owner_comment', actorId: 'user-park', payload: { ooc_reason_type: 'Tool', comment: 'MFC drift on gas line 3. Cal date: 2025-04-01. Flow: 58.2 sccm vs 60.0 setpoint.' } },
      ]),
    },
  ];

  for (let s = 0; s < specs.length; s++) {
    const spec = specs[s];
    const issueIdx = CURATED_INDICES[s];
    const issue = issues[issueIdx];

    // Override fields for workflow resolution
    issue.department = spec.department;
    issue.ownerId = spec.ownerId;
    issue.relatedAlarmIds = [alarms[spec.alarmIdx].id];

    // Build mocks for role resolution
    const mocks = {
      alarms: alarms.map((a) => ({ id: a.id, chartOwnerId: a.chartOwnerId })),
      piByDepartment: PI_BY_DEPARTMENT,
      managerChain: MANAGER_CHAIN,
    };

    // Attach workflow via engine
    const attachResult = attachWorkflow(spcOocDefinition, issue, mocks, ts);
    if ('error' in attachResult) {
      throw new Error(`Failed to attach workflow to ${issue.id}: ${attachResult.error}`);
    }

    // Build to target state
    const workflow = spec.build(attachResult.instance, issue);
    issue.workflow = workflow;
    issue.status = statusFromWorkflow(spcOocDefinition, workflow);
  }

  // Attach the generic issue workflow to every remaining issue, distributed
  // across phases so the issue list shows a mix of New / Investigating / Closed.
  const curatedSet = new Set(CURATED_INDICES);
  for (let i = 0; i < issues.length; i++) {
    if (curatedSet.has(i)) continue;
    const issue = issues[i];
    const attached = attachWorkflow(genericIssueDefinition, issue, {}, ts);
    if ('error' in attached) {
      throw new Error(`Failed to attach generic workflow to ${issue.id}: ${attached.error}`);
    }
    let instance = attached.instance;

    // Mod 3 distribution: 0 → triage (New), 1 → in_progress (Investigating), 2 → closed (Closed)
    const stage = i % 3;

    if (stage >= 1) {
      const r1 = applyAction(genericIssueDefinition, instance, issue, {
        actionId: 'start_investigation',
        actorId: 'system',
        timestamp: ts,
        payload: {},
      });
      if ('error' in r1) throw new Error(`generic start failed for ${issue.id}: ${r1.error}`);
      instance = r1.instance;
    }
    if (stage >= 2) {
      const r2 = applyAction(genericIssueDefinition, instance, issue, {
        actionId: 'close',
        actorId: 'system',
        timestamp: ts,
        payload: { resolution: 'Auto-resolved during seed' },
      });
      if ('error' in r2) throw new Error(`generic close failed for ${issue.id}: ${r2.error}`);
      instance = r2.instance;
    }

    issue.workflow = instance;
    issue.status = statusFromWorkflow(genericIssueDefinition, instance);
  }
}
