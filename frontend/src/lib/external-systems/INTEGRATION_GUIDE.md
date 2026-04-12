# External System Integration Guide

How to add a new external system integration (a new `PayloadFieldSchema.kind`) to the workflow system. This guide walks through every registration point using the three existing integrations as concrete examples.

## Overview

Each external system gets its own `kind` value. The architecture is intentionally simple: no generic abstraction, no shared fetch layer. Each integration is a self-contained vertical slice.

**Existing integrations and their input patterns:**

| Kind | Input Pattern | Component | Example |
|------|--------------|-----------|---------|
| `report-reference` | **Manual ID input** — user types a report ID | `ReportReferenceField` | User pastes `RPT-1001` |
| `calibration-reference` | **Pre-populated** — auto-resolved from issue's linked alarm | `CalibrationReferenceField` | Resolved from `machineId`/`chamberId` |
| `lot-disposition` | **Search/picker** — user searches lots, selects from dropdown | `LotDispositionField` | User searches by product, picks `LOT-2024-0001` |

## Step 1: Create the mock module

Create a new file under `frontend/src/lib/external-systems/`. Each module contains five parts: types, mock data, API functions, URL builder, and React hook(s).

### File structure

```
frontend/src/lib/external-systems/
  reports.ts              # Pattern A: manual input
  calibration.ts          # Pattern C: pre-populated
  lotDisposition.ts       # Pattern B: search/picker
  yourSystem.ts           # <-- your new module
```

### 1a. Define types

Export a status union type and a resource interface. The resource must have an `id` field (the foreign key stored in the workflow payload).

```ts
// reports.ts
export type ReportStatus = 'Draft' | 'In Review' | 'Published';

export interface Report {
  id: string;
  title: string;
  version: number;
  status: ReportStatus;
  updatedAt: string; // ISO 8601
}
```

```ts
// calibration.ts — includes equipment identifiers for lookup
export interface Calibration {
  id: string;
  machineId: string;
  chamberId: string;
  status: CalibrationStatus;
  lastCalibrated: string;
  nextDue: string;
}
```

```ts
// lotDisposition.ts — includes product for filtering
export interface Lot {
  id: string;
  product: string;
  quantity: number;
  status: LotStatus;
  updatedAt: string;
}
```

### 1b. Add mock data

Use timestamps relative to `Date.now()` so they always appear recent:

```ts
const now = Date.now();
const day = 24 * 60 * 60 * 1000;

const MOCK_ITEMS: YourResource[] = [
  { id: 'RES-001', ..., updatedAt: new Date(now - 2 * day).toISOString() },
  // 3-8 entries is typical
];

const SIMULATED_LATENCY_MS = 80;
```

### 1c. Add API functions

Every module needs at minimum a **fetch-by-ID** function. Additional functions depend on the input pattern.

```ts
// Fetch by ID — every module needs this
export async function fetchYourResource(id: string): Promise<YourResource | null> {
  await new Promise((r) => setTimeout(r, SIMULATED_LATENCY_MS));
  if (!id) return null;
  return MOCK_ITEMS.find((item) => item.id === id) ?? null;
}
```

**Pattern B (search/picker)** also needs a search function:

```ts
// lotDisposition.ts
export async function searchLots(params: { product?: string; query?: string }): Promise<Lot[]> {
  await new Promise((r) => setTimeout(r, SIMULATED_LATENCY_MS));
  return MOCK_LOTS.filter((lot) => {
    if (params.product && lot.product !== params.product) return false;
    if (params.query && !lot.id.toLowerCase().includes(params.query.toLowerCase())) return false;
    return true;
  });
}
```

**Pattern C (pre-populated)** also needs a lookup function:

```ts
// calibration.ts
export async function lookupCalibrationByEquipment(
  machineId: string, chamberId?: string
): Promise<Calibration | null> {
  await new Promise((r) => setTimeout(r, SIMULATED_LATENCY_MS));
  if (!machineId) return null;
  return MOCK_CALIBRATIONS.find((c) =>
    c.machineId === machineId && (!chamberId || c.chamberId === chamberId)
  ) ?? null;
}
```

### 1d. Add URL builder

Each module exports a function that builds a link to the external system:

```ts
export function getYourResourceUrl(id: string): string {
  return `https://your-system.fab.internal/resources/${id}`;
}
```

### 1e. Add React hook with focus-refetch

Every hook follows the same three-part pattern: fetch state, initial fetch + dependency tracking, and focus-refetch via `visibilitychange`.

```ts
import { useState, useEffect, useCallback } from 'react';

export function useYourResource(resourceId: string) {
  const [resource, setResource] = useState<YourResource | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const fetch = useCallback(async () => {
    if (!resourceId) {
      setResource(null);
      setError(null);
      return;
    }
    setLoading(true);
    setError(null);
    try {
      const result = await fetchYourResource(resourceId);
      setResource(result);
    } catch {
      setError('Could not load resource');
    } finally {
      setLoading(false);
    }
  }, [resourceId]);

  // Initial fetch + refetch on param change
  useEffect(() => {
    fetch();
  }, [fetch]);

  // Focus-refetch: refetch when tab becomes visible
  useEffect(() => {
    const handler = () => {
      if (document.visibilityState === 'visible') {
        fetch();
      }
    };
    document.addEventListener('visibilitychange', handler);
    return () => document.removeEventListener('visibilitychange', handler);
  }, [fetch]);

  return { resource, loading, error, refetch: fetch };
}
```

Key points:
- `useCallback` with the ID in the dependency array ensures fetch is stable
- First `useEffect` triggers on mount and whenever the ID changes
- Second `useEffect` adds the `visibilitychange` listener for tab-back refetch
- `refetch` is exposed for the manual refresh button in the component
- Error state is a string, not thrown — the component renders it inline

## Step 2: Write tests for the mock module

Create a test file alongside the module. Test the API functions (not the hooks — those are verified manually).

```ts
// yourSystem.test.ts
import { describe, expect, it } from 'vitest';
import { fetchYourResource, getYourResourceUrl } from './yourSystem';

describe('yourSystem mock module', () => {
  it('returns data for a valid ID', async () => {
    const result = await fetchYourResource('RES-001');
    expect(result).not.toBeNull();
    expect(result!.id).toBe('RES-001');
  });

  it('returns null for an invalid ID', async () => {
    expect(await fetchYourResource('RES-9999')).toBeNull();
  });

  it('returns null for empty string', async () => {
    expect(await fetchYourResource('')).toBeNull();
  });

  it('timestamps are within the last 30 days', async () => {
    const result = await fetchYourResource('RES-001');
    const age = Date.now() - new Date(result!.updatedAt).getTime();
    expect(age).toBeLessThanOrEqual(30 * 24 * 60 * 60 * 1000);
  });

  it('URL builder includes the ID', () => {
    expect(getYourResourceUrl('RES-001')).toContain('RES-001');
  });
});
```

## Step 3: Register the new field kind

### 3a. Backend: add factory method to `PayloadFieldSchema.java`

Add a static factory method in `backend/src/main/java/com/fabalarm/workflow/PayloadFieldSchema.java`:

```java
public static PayloadFieldSchema yourReference(String label, boolean required) {
    return new PayloadFieldSchema("your-reference", label, required, null, null);
}
```

No structural validation is needed beyond the `required` check — `WorkflowEngine.validatePayload()` already handles this for all kinds.

### 3b. Frontend: extend the kind type union

In `frontend/src/lib/workflows/types.ts`, add your kind to the `PayloadFieldSchema` interface:

```ts
export interface PayloadFieldSchema {
  kind: 'enum' | 'text' | 'report-reference' | 'calibration-reference'
      | 'lot-disposition' | 'your-reference';  // <-- add here
  label: string;
  required: boolean;
  options?: string[];
  minLength?: number;
}
```

### 3c. Frontend: add routing in `SchemaField`

In `frontend/src/components/issue-detail/WorkflowPanel.tsx`, add a branch in the `SchemaField` function (before the default `enum`/`text` fallback):

```tsx
if (schema.kind === 'your-reference') {
  return (
    <YourReferenceField
      value={value}
      onChange={onChange}
      readOnly={stepStatus === 'completed' || stepStatus === 'skipped'}
      stepStatus={stepStatus}
      issue={issue}  // include if your component needs issue context
    />
  );
}
```

## Step 4: Build the component

Create a new file in `frontend/src/components/issue-detail/`. All rich field components implement this props contract:

### Component props contract

```ts
interface YourReferenceFieldProps {
  value: string;          // the foreign key stored in payload
  onChange: (v: string) => void;  // called when user selects/enters a reference
  readOnly: boolean;      // true when step is completed or skipped
  stepStatus: StepStatus; // current step status for adaptive display
  issue: Issue;           // full issue for context (linked alarms, product, etc.)
}
```

| Prop | Purpose | Used by |
|------|---------|---------|
| `value` | Foreign key stored in workflow payload | All components |
| `onChange` | Update the payload value | All components |
| `readOnly` | Disable editing (completed/skipped steps) | All components |
| `stepStatus` | Adaptive display based on step lifecycle | All components |
| `issue` | Contextual data (linked alarms, product) | `CalibrationReferenceField` (alarm lookup), `LotDispositionField` (product filter) |

### Component structure

Every component has two render paths: **read-only** (completed/skipped) and **editable** (ongoing).

```tsx
export function YourReferenceField({ value, onChange, readOnly, stepStatus, issue }: Props) {
  const { resource, loading, error, refetch } = useYourResource(value);

  // Read-only card
  if (readOnly) {
    return (
      <div>
        {resource && <StatusCard resource={resource} />}
        {loading && <LoadingIndicator />}
        {error && <ErrorWithRetry error={error} onRetry={refetch} />}
        {!value && <span>No resource attached</span>}
      </div>
    );
  }

  // Editable form — varies by input pattern
  return (
    <div>
      {/* Input UI: text field, search picker, or auto-resolve */}
      {/* Live status card with refresh button */}
      {/* Error with retry button */}
    </div>
  );
}
```

### Error handling pattern

Errors are **inline and non-blocking**. The step remains fully actionable — completion is never blocked by an external system failure.

```tsx
{error && (
  <div className="flex items-center gap-1.5 text-[10px] text-red-500">
    <AlertCircle size={10} />
    {error}
    <button onClick={refetch} className="underline ml-1">Retry</button>
  </div>
)}
```

### Refresh strategy

Two mechanisms, no polling:

1. **Focus-refetch** — handled by the hook's `visibilitychange` listener (automatic)
2. **Manual refresh** — button in the component that calls `refetch`:

```tsx
<button onClick={refetch} title="Refresh status">
  <RefreshCw size={10} />
</button>
```

## Step 5: Add a step to a workflow definition

### 5a. Backend: add step to the definition

In the relevant definition file (e.g., `SpcOocBranchingDefinition.java`), add a step using the builder:

```java
StepDefinition.builder("your_step_id", "Your Step Label", 5)
    .preSteps("chart_owner_comment")  // DAG dependency
    .skippableIf(issue -> true)       // optional: make skippable
    .payloadSchema(Map.of(
        "yourFieldKey", PayloadFieldSchema.yourReference("Your Field Label", false)
    ))
    .build(),
```

Make sure to update `preSteps` of downstream steps if this step should be a prerequisite (e.g., `meeting` requires `attach_report`, `verify_calibration`, etc.).

### 5b. Frontend: mirror in the TypeScript definition

In `frontend/src/lib/workflows/definitions/spcOocBranching.ts`:

```ts
{
  id: 'your_step_id',
  label: 'Your Step Label',
  order: 5,
  preSteps: ['chart_owner_comment'],
  skippableIf: () => true,
  payloadSchema: {
    yourFieldKey: {
      kind: 'your-reference',
      label: 'Your Field Label',
      required: false,
    },
  },
},
```

The frontend and backend definitions must stay in sync: same step IDs, same `preSteps`, same `payloadSchema` keys and kinds.

### 5c. Update definition tests

Update the expected step count in definition tests after adding new steps.

## Step 6: Seed test data

In `backend/src/main/resources/data.sql`, add workflow step rows with completed payloads referencing your mock data IDs:

```sql
INSERT INTO workflow_step (instance_id, step_id, status, actor_id, completed_at, payload)
VALUES (4, 'your_step_id', 'completed', 'user-chen', '2026-04-10T17:00:00Z',
        '{"yourFieldKey":"RES-001"}');
```

Use IDs that exist in your mock data so the live status display works when viewing seeded issues.

## Checklist

When adding a fourth integration, verify:

- [ ] Mock module created under `external-systems/` with types, data, API functions, URL builder, hook
- [ ] Tests written for API functions (fetch, search if applicable)
- [ ] `PayloadFieldSchema.java` — factory method added
- [ ] `types.ts` — kind added to union type
- [ ] `SchemaField` in `WorkflowPanel.tsx` — routing branch added
- [ ] Component created with standard props contract (`value`, `onChange`, `readOnly`, `stepStatus`, `issue`)
- [ ] Component handles read-only and editable states
- [ ] Error handling is inline, non-blocking, with retry button
- [ ] Hook uses focus-refetch (`visibilitychange`) and exposes `refetch` for manual refresh
- [ ] Backend definition updated with new step and `payloadSchema`
- [ ] Frontend definition mirrors backend (same step ID, preSteps, payloadSchema)
- [ ] `data.sql` seeded with completed step rows referencing mock data IDs
- [ ] Definition tests updated for new step count
