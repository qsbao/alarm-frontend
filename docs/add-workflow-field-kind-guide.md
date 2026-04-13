# Add New Workflow Field Kind Guide

> The canonical guide lives at `frontend/src/lib/external-systems/INTEGRATION_GUIDE.md`.
> Read that file — it is the authoritative, fully detailed reference.

This document is a quick orientation and cross-reference.

---

## What is a "field kind"?

A field kind is the `kind` discriminator on `PayloadFieldSchema` (defined in `frontend/src/lib/workflows/types.ts`). It controls how a workflow step's payload field is rendered and validated.

Existing kinds:

| kind | Input pattern | Component | External system |
|---|---|---|---|
| `text` | textarea | inline in WorkflowPanel | none |
| `enum` | select dropdown | inline in WorkflowPanel | none |
| `report-reference` | manual ID input | `ReportReferenceField` | reports.fab.internal |
| `calibration-reference` | auto-resolved from linked alarm | `CalibrationReferenceField` | calibration.fab.internal |
| `lot-disposition` | search/picker | `LotDispositionField` | lot system |

`text` and `enum` are built into `WorkflowPanel.tsx` directly. The three reference kinds each have a dedicated component and a mock module under `frontend/src/lib/external-systems/`.

---

## Files to touch (summary)

1. `frontend/src/lib/external-systems/yourSystem.ts` — mock module (types, data, API functions, URL builder, hook)
2. `frontend/src/lib/external-systems/yourSystem.test.ts` — tests for API functions
3. `backend/.../workflow/PayloadFieldSchema.java` — add static factory method
4. `frontend/src/lib/workflows/types.ts` — add kind to union type
5. `frontend/src/components/issue-detail/WorkflowPanel.tsx` — add branch in `SchemaField`
6. `frontend/src/components/issue-detail/YourReferenceField.tsx` — new component
7. Backend workflow definition — add step with `payloadSchema` using new factory
8. Frontend workflow definition — mirror the step
9. `backend/src/main/resources/data.sql` — seed completed step rows
10. Definition test file — update expected step count

See `frontend/src/lib/external-systems/INTEGRATION_GUIDE.md` for the full walkthrough with code templates for each file.

---

## Key invariants

- The `kind` string in `types.ts`, the `SchemaField` branch in `WorkflowPanel.tsx`, and the backend factory method name must all agree.
- External system failures must be **inline and non-blocking** — never prevent step completion.
- Hooks must implement focus-refetch via `visibilitychange` and expose `refetch` for the manual refresh button.
- The `value` stored in the workflow payload is always a plain string (the foreign key / ID). The component resolves it to a rich object for display only.
