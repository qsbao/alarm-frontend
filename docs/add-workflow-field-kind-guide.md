# Adding Field Kinds to Your Plugin

> The canonical external-system integration guide lives at `frontend/src/lib/external-systems/INTEGRATION_GUIDE.md`.
> Read that file for the fully detailed reference on mock modules and hook patterns.

This document covers how to add a custom field kind to a plugin.

---

## What is a field kind?

A field kind is the `kind` discriminator on `PayloadFieldSchema` (defined in `frontend/src/lib/workflows/types.ts`). It controls how a workflow step's payload field is rendered and validated.

### Built-in kinds (in core)

| Kind | Input pattern | Component |
|---|---|---|
| `text` | textarea | inline in `WorkflowPanel` |
| `enum` | select dropdown | inline in `WorkflowPanel` |

### Plugin-contributed kinds (in `example-plugin`)

| Kind | Input pattern | Component | External system |
|---|---|---|---|
| `example-plugin:calibration-reference` | auto-resolved from linked alarm | `CalibrationReferenceField` | calibration.fab.internal |
| `example-plugin:lot-disposition` | search/picker | `LotDispositionField` | lot system |
| `example-plugin:report-reference` | manual ID input | `ReportReferenceField` | reports.fab.internal |

---

## Plugin file layout

```
plugins/your-plugin/
├── plugin.json
├── backend/src/com/your/plugin/
│   └── YourFieldKinds.java          # factory methods for PayloadFieldSchema
└── frontend/
    ├── fieldKinds/
    │   └── yourFieldKind.ts          # FieldKindSpec default export
    └── externalSystems/
        └── yourSystem.ts             # mock external-system module
```

---

## Step 1: Create the external-system module (if needed)

**File**: `plugins/your-plugin/frontend/externalSystems/yourSystem.ts`

If your field kind resolves data from an external system, create a mock module with types, data, API functions, and a URL builder. Follow the pattern in `plugins/example-plugin/frontend/externalSystems/`.

---

## Step 2: Create the field kind component

**File**: `plugins/your-plugin/frontend/fieldKinds/yourFieldKind.ts`

Export a default `FieldKindSpec` object. The component receives `FieldProps` with `field`, `value`, `onChange`, and `alarm`.

```tsx
import type { FieldKindSpec } from '../../../../frontend/src/lib/workflows/fieldKindRegistry';

function YourField({ field, value, onChange }: FieldProps) {
  return <input value={value ?? ''} onChange={(e) => onChange(e.target.value)} />;
}

const spec: FieldKindSpec = {
  component: YourField,
};

export default spec;
```

---

## Step 3: Register in `plugin.json`

Add an entry to the `fieldKinds[]` array:

```json
{
  "fieldKinds": [
    {
      "id": "your-plugin:your-field-kind",
      "frontendEntry": "./frontend/fieldKinds/yourFieldKind.ts"
    }
  ]
}
```

The `id` must be prefixed with your plugin id. No `backendClass` is needed — the backend does not dispatch on field kind.

---

## Step 4: Add backend factory method (optional)

**File**: `plugins/your-plugin/backend/src/com/your/plugin/YourFieldKinds.java`

If your plugin's workflow definitions reference this field kind, add a factory method:

```java
public final class YourFieldKinds {
    public static PayloadFieldSchema yourFieldKind(String label) {
        return new PayloadFieldSchema("your-plugin:your-field-kind", label, null, null, null);
    }
}
```

---

## Key invariants

- The `id` in `plugin.json` must match the kind string used in `PayloadFieldSchema` and in the frontend registry.
- Field kind ids from plugins must be namespaced with the plugin id (e.g., `example-plugin:lot-disposition`).
- External-system failures must be **inline and non-blocking** — never prevent step completion.
- Hooks should implement focus-refetch via `visibilitychange` and expose `refetch` for the manual refresh button.
- The `value` stored in the workflow payload is always a plain string (the foreign key / ID). The component resolves it to a rich object for display only.
- Unknown field kinds at render time show a "Plugin not loaded" placeholder, preventing silent data loss.

---

## Reference

- Plugin example: `plugins/example-plugin/`
- Field kind registry: `frontend/src/lib/workflows/fieldKindRegistry.ts`
- Plugin loading: `frontend/src/lib/workflows/definitions/index.ts`
- External system guide: `frontend/src/lib/external-systems/INTEGRATION_GUIDE.md`
