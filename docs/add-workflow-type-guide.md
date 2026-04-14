# Add New Workflow Type Guide

How to add a new workflow type end-to-end. There are two approaches:

1. **Core workflow** — modify core files (6 files, as described below)
2. **Plugin workflow** — create a self-contained plugin in the `plugins/` directory (recommended for external teams)

---

## Plugin Approach (Recommended for External Teams)

Create a plugin directory in `plugins/`:

```
plugins/my-custom-workflow/
├── plugin.json       # Plugin manifest
├── frontend/         # Frontend code
│   ├── definition.ts # Workflow definition (TypeScript)
│   └── index.ts      # Entry point (exports definitions array)
└── backend/          # Backend code (optional)
    └── src/...       # Java sources, compiled to JAR
```

See `plugins/example-workflow/` for a complete working example.

**Frontend plugin loading**: The frontend uses `import.meta.glob` to automatically discover and load all plugins at build time.

**Backend plugin loading**: The backend scans the plugins directory for JAR files and loads any class with a `public static final WorkflowDefinition INSTANCE` field.

---

## Core Approach

How to add a new workflow type end-to-end to the core system. There are exactly 6 files to create or edit.

---

## Concepts

A workflow is a DAG of steps. Each step has:
- `preSteps` — step IDs that must be completed/skipped before this step activates
- `gate` — optional predicate `({ user, instance, issue }) => boolean` controlling who can act
- `payloadSchema` — optional fields the actor fills in when completing the step
- `impliesStatus` — optional `IssueStatus` the issue transitions to when this step completes
- `defaultSkipIf` — auto-skip predicate evaluated at workflow attach time
- `skippableIf` — manual-skip predicate evaluated at runtime

Step lifecycle: `pending → ongoing → completed` or `ongoing → skipped → (revivable) → ongoing`

---

## Step-by-step

### 1. Frontend definition — create `frontend/src/lib/workflows/definitions/myWorkflow.ts`

Copy the pattern from `genericLinear.ts` (linear) or `spcOocBranching.ts` (branching DAG).

```typescript
import type { WorkflowDefinition } from '../types';

export const myWorkflowDefinition: WorkflowDefinition = {
  id: 'my_workflow_v1',          // snake_case, versioned
  name: 'My Workflow',
  version: '1',
  steps: [
    {
      id: 'first_step',
      label: 'First Step',
      order: 1,
      preSteps: [],              // root step — no dependencies
      impliesStatus: 'Investigating',
    },
    {
      id: 'second_step',
      label: 'Second Step',
      order: 2,
      preSteps: ['first_step'],
      gate: ({ user, issue }) => user.id === issue.ownerId,  // owner-only
      payloadSchema: {
        comment: { kind: 'text', label: 'Comment', required: true, minLength: 10 },
      },
      impliesStatus: 'Resolved',
    },
    {
      id: 'closed',
      label: 'Closed',
      order: 3,
      preSteps: ['second_step'],
      gate: ({ user, issue }) => user.id === issue.ownerId,
      impliesStatus: 'Closed',
    },
  ],
  requiredRoles: [],
};
```

**Payload field kinds** (must match backend `PayloadFieldSchema` factory methods):

| kind | Frontend renders | Backend factory |
|---|---|---|
| `text` | textarea | `PayloadFieldSchema.text(label, required, minLength)` |
| `enum` | select | `PayloadFieldSchema.enumField(label, required, List.of(...))` |
| `report-reference` | ReportReferenceField | `PayloadFieldSchema.reportReference(label, required)` |
| `calibration-reference` | CalibrationReferenceField | `PayloadFieldSchema.calibrationReference(label, required)` |
| `lot-disposition` | LotDispositionField | `PayloadFieldSchema.lotDisposition(label, required)` |

---

### 2. Frontend registry — edit `frontend/src/lib/workflows/definitions/index.ts`

```typescript
import { myWorkflowDefinition } from './myWorkflow';          // add import

definitions.set(myWorkflowDefinition.id, myWorkflowDefinition); // add registration
```

---

### 3. Frontend test — create `frontend/src/lib/workflows/definitions/myWorkflow.test.ts`

```typescript
import { describe, expect, it } from 'vitest';
import { myWorkflowDefinition } from './myWorkflow';

describe('myWorkflowDefinition', () => {
  it('has the correct id', () => {
    expect(myWorkflowDefinition.id).toBe('my_workflow_v1');
  });

  it('has steps in correct order with correct preSteps', () => {
    const ids = myWorkflowDefinition.steps.map(s => s.id);
    expect(ids).toEqual(['first_step', 'second_step', 'closed']);
    expect(myWorkflowDefinition.steps[0].preSteps).toEqual([]);
    expect(myWorkflowDefinition.steps[1].preSteps).toEqual(['first_step']);
  });

  // test gates, skippableIf, defaultSkipIf, payloadSchema as needed
});
```

---

### 4. Backend definition — create `backend/src/main/java/com/fabalarm/workflow/MyWorkflowDefinition.java`

Mirror the frontend definition exactly — same step IDs, same order, same logic.

```java
package com.fabalarm.workflow;

import com.fabalarm.model.IssueStatus;
import java.util.List;
import java.util.Map;

public final class MyWorkflowDefinition {

    public static final WorkflowDefinition INSTANCE = new WorkflowDefinition(
            "my_workflow_v1",
            "My Workflow",
            "1",
            List.of(
                    StepDefinition.builder("first_step", "First Step", 1)
                            .impliesStatus(IssueStatus.Investigating)
                            .build(),
                    StepDefinition.builder("second_step", "Second Step", 2)
                            .preSteps("first_step")
                            .gate((userId, issue) -> userId.equals(issue.getOwnerId()))
                            .payloadSchema(Map.of(
                                    "comment", PayloadFieldSchema.text("Comment", true, 10)
                            ))
                            .impliesStatus(IssueStatus.Resolved)
                            .build(),
                    StepDefinition.builder("closed", "Closed", 3)
                            .preSteps("second_step")
                            .gate((userId, issue) -> userId.equals(issue.getOwnerId()))
                            .impliesStatus(IssueStatus.Closed)
                            .build()
            )
    );

    private MyWorkflowDefinition() {}
}
```

**Builder methods available on `StepDefinition.builder(...)`:**

| Method | Type | Notes |
|---|---|---|
| `.preSteps(String...)` | varargs | step IDs that must finish first |
| `.gate(BiPredicate<String, Issue>)` | `(userId, issue) -> bool` | who can act |
| `.payloadSchema(Map<String, PayloadFieldSchema>)` | map | fields to fill in |
| `.impliesStatus(IssueStatus)` | enum | status transition on complete |
| `.defaultSkipIf(Predicate<Issue>)` | `issue -> bool` | auto-skip at attach time |
| `.skippableIf(Predicate<Issue>)` | `issue -> bool` | manual skip allowed |

---

### 5. Backend registry — edit `backend/src/main/java/com/fabalarm/workflow/WorkflowRegistry.java`

```java
public WorkflowRegistry() {
    register(GenericLinearDefinition.INSTANCE);
    register(SpcOocBranchingDefinition.INSTANCE);
    register(MyWorkflowDefinition.INSTANCE);   // add this line
}
```

---

### 6. Wire up the attach button — edit `frontend/src/components/issue-detail/WorkflowPanel.tsx`

The "no workflow attached" panel has hardcoded buttons. Add one for the new type:

```tsx
<Button variant="outline" size="sm"
  onClick={() => onAttachWorkflow('my_workflow_v1')}>
  My Workflow
</Button>
```

**Skip this step** if the workflow is always auto-assigned via `workflowDefaults.ts` (see below).

---

## Optional: auto-assign by alarm type

If the new workflow should be the default for certain alarm types, edit `frontend/src/lib/workflows/workflowDefaults.ts`:

```typescript
const MY_ALARM_TYPES: AlarmType[] = ['TempSpike', 'ChamberLeak'];

export function getDefaultWorkflowId(alarmType: AlarmType | undefined): string | undefined {
  if (!alarmType) return undefined;
  if (MY_ALARM_TYPES.includes(alarmType)) return 'my_workflow_v1';
  if (SPC_OOC_ALARM_TYPES.includes(alarmType)) return 'spc_ooc_branching_v1';
  return 'generic_linear_v1';
}
```

Also update `frontend/src/lib/workflows/definitions/workflowDefaults.test.ts` to cover the new mapping.

---

## Checklist

- [ ] `frontend/src/lib/workflows/definitions/myWorkflow.ts` — definition
- [ ] `frontend/src/lib/workflows/definitions/index.ts` — register in Map
- [ ] `frontend/src/lib/workflows/definitions/myWorkflow.test.ts` — unit tests
- [ ] `backend/.../workflow/MyWorkflowDefinition.java` — backend mirror
- [ ] `backend/.../workflow/WorkflowRegistry.java` — register INSTANCE
- [ ] `frontend/src/components/issue-detail/WorkflowPanel.tsx` — attach button (if manual)
- [ ] `frontend/src/lib/workflows/workflowDefaults.ts` — auto-assign mapping (if auto)

---

## Key invariant

Frontend and backend definitions must stay in sync:
- Same `id` string
- Same step IDs
- Same `preSteps` DAG
- Same `gate` logic (backend uses `userId` string; frontend uses `user.id`)
- Same `payloadSchema` field keys and kinds

The backend is authoritative for execution; the frontend is authoritative for display. A mismatch causes silent UI/API divergence.
