# Plugin Guide

How to extend the fab-alarm system with a plugin. Plugins are self-contained directories under `plugins/` that add workflow types, field kinds, and alarm types without modifying core code.

See `plugins/example-plugin/` for a complete working reference.

---

## What You Can Extend

A plugin can contribute any of three extension points (all optional):

| Extension point | What it adds | Frontend | Backend |
| --- | --- | --- | --- |
| **Workflow definitions** | Step-based processes (investigation → resolve → close) | required | optional |
| **Field kinds** | Custom form fields inside workflow steps | required | — |
| **Alarm types** | Custom alarm detail panels + server-side projection | required | required |

For deeper dives on each, see:
- [add-workflow-type-guide.md](./add-workflow-type-guide.md)
- [add-workflow-field-kind-guide.md](./add-workflow-field-kind-guide.md)
- [ALARM_TYPE_ONBOARDING.md](./ALARM_TYPE_ONBOARDING.md)

---

## Directory Layout

```
plugins/my-plugin/
├── plugin.json                      # Manifest (required)
├── frontend/
│   ├── index.ts                     # Exports `definitions` array
│   ├── fieldKinds/myField.tsx       # default export FieldKindSpec
│   └── alarmTypes/myAlarm.tsx       # default export AlarmTypeSpec
└── backend/
    └── src/com/fabalarm/plugins/
        └── MyAlarmType.java         # implements AlarmTypeSpec
```

---

## 1. Manifest: `plugin.json`

The manifest declares every entry point. IDs must be globally unique — prefix with the plugin id (e.g. `my-plugin:TempSpike`).

```json
{
  "id": "my-plugin",
  "name": "My Plugin",
  "version": "1.0.0",
  "workflows": [
    {
      "id": "my_linear_v1",
      "frontendEntry": "./frontend/index.ts",
      "backendClass": "com.fabalarm.plugins.MyLinearDefinition"
    }
  ],
  "fieldKinds": [
    {
      "id": "my-plugin:lot-disposition",
      "frontendEntry": "./frontend/fieldKinds/lotDisposition.tsx"
    }
  ],
  "alarmTypes": [
    {
      "kind": "my-plugin:TempSpike",
      "frontendEntry": "./frontend/alarmTypes/tempSpike.tsx",
      "backendClass": "com.fabalarm.plugins.TempSpikeAlarmType"
    }
  ]
}
```

---

## 2. Frontend: Workflow Definitions

Export a `definitions` array from `frontend/index.ts`. Each entry implements `WorkflowDefinition` from `frontend/src/lib/workflows/types.ts`:

```typescript
import type { WorkflowDefinition } from '../../../frontend/src/lib/workflows/types';

const myLinear: WorkflowDefinition = {
  id: 'my_linear_v1',
  name: 'My Linear Workflow',
  version: '1',
  requiredRoles: [/* ... */],
  steps: [
    {
      id: 'investigate',
      label: 'Investigate',
      order: 1,
      preSteps: [],
      payloadSchema: {
        finding: { kind: 'text', label: 'Finding', required: true, minLength: 10 },
      },
    },
    // ...
  ],
};

export const definitions = [myLinear];
```

Key fields: `preSteps` defines the DAG; `payloadSchema` maps field name → kind (`text`, `enum`, or a custom `fieldKinds[].id`); `gate` / `skippableIf` / `impliesStatus` control progression.

---

## 3. Frontend: Field Kinds

A field kind is a React component registered under an id. Default-export a `FieldKindSpec`:

```typescript
import type { FieldKindSpec } from '../../../../frontend/src/lib/workflows/fieldKindRegistry';

const MyField: FC<FieldProps> = ({ value, onChange, readOnly, stepStatus, issue }) => {
  return <input value={value} onChange={e => onChange(e.target.value)} readOnly={readOnly} />;
};

export default { component: MyField } satisfies FieldKindSpec;
```

`FieldProps` gives you the current value, a change handler, read-only flag, step status, and the full `Issue` — enough to render async lookups against external systems.

---

## 4. Frontend: Alarm Types

Default-export an `AlarmTypeSpec` from `frontend/src/lib/alarms/alarmTypeRegistry.ts`:

```typescript
import { Thermometer } from 'lucide-react';
import type { AlarmTypeSpec } from '../../../../frontend/src/lib/alarms/alarmTypeRegistry';

const TempSpikePanel: FC<{ details: any }> = ({ details }) => (
  <div>Delta: {details.delta} °C</div>
);

const spec: AlarmTypeSpec = {
  kind: 'my-plugin:TempSpike',
  label: 'Temp Spike',
  icon: Thermometer,
  panel: TempSpikePanel,
};
export default spec;
```

`kind` must match the manifest. `panel` renders in the issue detail view.

---

## 5. Backend: Alarm Types

Each backend alarm type is a Java class that implements `AlarmTypeSpec` and exposes a `public static final INSTANCE`:

```java
package com.fabalarm.plugins;

public class TempSpikeAlarmType implements AlarmTypeSpec {
    public static final TempSpikeAlarmType INSTANCE = new TempSpikeAlarmType();

    @Override public String kind() { return "my-plugin:TempSpike"; }
    @Override public Class<? extends AlarmDetails> detailsClass() { return TempSpikeDetails.class; }
    @Override public ValueUnit project(AlarmDetails details) {
        return new ValueUnit(((TempSpikeDetails) details).delta, "°C");
    }
}
```

`AlarmTypePluginLoader` scans `plugins/*/plugin.json` at Spring startup and instantiates each `backendClass` via its `INSTANCE` field.

### Register on the classpath

Add your plugin's source root to `backend/pom.xml` under `build-helper-maven-plugin`:

```xml
<sources>
  <source>../plugins/example-plugin/backend/src</source>
  <source>../plugins/my-plugin/backend/src</source>
</sources>
```

---

## 6. Build & Run

The frontend discovers plugins at build time via Vite's `import.meta.glob('/plugins/*/plugin.json')` — no registration step needed:

```bash
pnpm install
pnpm dev:fe                       # frontend picks up plugins automatically
cd backend && ./mvnw spring-boot:run
```

---

## Checklist

- [ ] `plugin.json` created with unique, prefixed IDs
- [ ] Frontend entry files exist and match `frontendEntry` paths
- [ ] Workflow `index.ts` exports `definitions` array
- [ ] Field kinds and alarm types use `default export`
- [ ] `AlarmTypeSpec.kind` on frontend equals `alarmTypes[].kind` in manifest equals `kind()` on backend class
- [ ] Backend class has `public static final INSTANCE`
- [ ] `backend/pom.xml` includes your plugin's `backend/src` source path
- [ ] Frontend dev server shows the new workflow/field/alarm without changes to core files
