# Adding Alarm Types to Your Plugin

This guide walks through adding a new alarm type to a plugin. We use `example-plugin:TempSpike` as a worked example — see `plugins/example-plugin/` for the complete code.

## Overview

Adding a plugin-contributed alarm type involves:
1. Backend: Create a details record implementing `AlarmDetails`
2. Backend: Create an `AlarmTypeSpec` implementation
3. Frontend: Create a panel component and alarm type spec
4. Manifest: Register in `plugin.json`'s `alarmTypes[]`
5. (Optional) Add seed data for development

---

## Step 1: Create the details record (Backend)

**File**: `plugins/your-plugin/backend/src/com/your/plugin/TempSpikeDetails.java`

Create a Java record implementing `AlarmDetails`. Include all fields the alarm carries.

```java
package com.your.plugin;

import com.fabalarm.model.AlarmDetails;
import java.time.Instant;

public record TempSpikeDetails(
    double currentTemp,
    double thresholdTemp,
    String sensorId,
    Instant spikeStartTime,
    int durationSeconds
) implements AlarmDetails {
}
```

---

## Step 2: Create the `AlarmTypeSpec` implementation (Backend)

**File**: `plugins/your-plugin/backend/src/com/your/plugin/TempSpikeAlarmType.java`

Implement the `AlarmTypeSpec` interface. The `kind()` must return the namespaced kind string (`pluginId:TypeName`). Expose a `public static final INSTANCE` field for the plugin loader.

```java
package com.your.plugin;

import com.fabalarm.alarm.AlarmTypeSpec;
import com.fabalarm.model.AlarmDetails;
import com.fabalarm.model.ValueUnit;

public class TempSpikeAlarmType implements AlarmTypeSpec {
    public static final TempSpikeAlarmType INSTANCE = new TempSpikeAlarmType();

    @Override
    public String kind() {
        return "your-plugin:TempSpike";
    }

    @Override
    public Class<? extends AlarmDetails> detailsClass() {
        return TempSpikeDetails.class;
    }

    @Override
    public ValueUnit project(AlarmDetails details) {
        TempSpikeDetails ts = (TempSpikeDetails) details;
        double delta = ts.currentTemp() - ts.thresholdTemp();
        return new ValueUnit(delta, "°C");
    }
}
```

The `project()` method derives the common `value`/`unit` pair shown in list views and filters.

---

## Step 3: Create the frontend panel and spec

**File**: `plugins/your-plugin/frontend/alarmTypes/tempSpike.ts`

Export a default `AlarmTypeSpec` object with `kind`, `panel`, `label`, and `icon`.

```tsx
import { Thermometer } from 'lucide-react';
import type { AlarmTypeSpec } from '../../../../frontend/src/lib/alarms/alarmTypeRegistry';

interface TempSpikeDetails {
  kind: 'your-plugin:TempSpike';
  currentTemp: number;
  thresholdTemp: number;
  sensorId: string;
  spikeStartTime: string;
  durationSeconds: number;
}

function TempSpikePanel({ details }: { details: TempSpikeDetails }) {
  return (
    <div className="card p-4">
      {/* render details fields */}
    </div>
  );
}

const spec: AlarmTypeSpec = {
  kind: 'your-plugin:TempSpike',
  panel: TempSpikePanel,
  label: 'Temp Spike',
  icon: Thermometer,
};

export default spec;
```

The `label` and `icon` are used in filter dropdowns and alarm list rows.

---

## Step 4: Register in `plugin.json`

Add an entry to the `alarmTypes[]` array in your plugin manifest:

```json
{
  "id": "your-plugin",
  "workflows": [],
  "fieldKinds": [],
  "alarmTypes": [
    {
      "kind": "your-plugin:TempSpike",
      "frontendEntry": "./frontend/alarmTypes/tempSpike.ts",
      "backendClass": "com.your.plugin.TempSpikeAlarmType"
    }
  ]
}
```

The `kind` string must be prefixed with your plugin id to avoid collisions.

---

## Step 5: Ensure source root is registered (Backend)

Your plugin's backend source must be compiled. In `backend/pom.xml`, confirm your plugin directory is listed as a source root:

```xml
<plugin>
  <groupId>org.codehaus.mojo</groupId>
  <artifactId>build-helper-maven-plugin</artifactId>
  <configuration>
    <sources>
      <source>../plugins/your-plugin/backend/src</source>
    </sources>
  </configuration>
</plugin>
```

---

## Step 6 (Optional): Add seed data

Update `backend/src/main/resources/data.sql` with example alarms using the namespaced kind:

```sql
INSERT INTO alarm (id, type, severity, message, ...) VALUES
  ('alm-xxx', 'your-plugin:TempSpike', 'P1', 'Temperature spike detected', ...);
```

---

## How it works at runtime

1. **Backend**: `AlarmTypePluginLoader` scans each plugin's `plugin.json` at startup. For each `alarmTypes[]` entry, it loads the `backendClass`, gets the `INSTANCE` field, and registers the alarm type with `AlarmTypeRegistry` (Jackson polymorphic subtype + projector function).

2. **Frontend**: The plugin loader in `frontend/src/lib/workflows/definitions/index.ts` uses `import.meta.glob` to discover plugin alarm type specs and registers them with the frontend `alarmTypeRegistry`.

3. **Dispatch**: `AlarmDetailsPanel` looks up the registered spec by `details.kind` and renders the panel. Unregistered kinds fall back to `UnknownAlarmPanel`.

---

## Testing

Add tests that verify:
1. **JSON round-trip**: Serialize your details record, deserialize it back as `AlarmDetails`, and assert the fields match. Verify the `"kind"` field in the JSON matches your namespaced kind.
2. **Projector**: Create an `Alarm`, set the type and details, call `ingestProjector.projectValueAndUnit()`, and assert `value` and `unit`.

See `backend/src/test/java/com/fabalarm/AlarmDetailsTest.java` for working examples.

---

## Reference

- Plugin example: `plugins/example-plugin/`
- Backend alarm type spec interface: `backend/.../alarm/AlarmTypeSpec.java`
- Backend registry: `backend/.../alarm/AlarmTypeRegistry.java`
- Backend plugin loader: `backend/.../alarm/AlarmTypePluginLoader.java`
- Frontend registry: `frontend/src/lib/alarms/alarmTypeRegistry.ts`
- Frontend plugin loading: `frontend/src/lib/workflows/definitions/index.ts`
