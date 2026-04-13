# Onboarding a New Alarm Type

This guide walks through end-to-end onboarding of a new alarm type in the fab-alarm-frontend system. We'll use `TempSpike` as a worked example.

## Overview

Adding a new alarm type involves:
1. Backend: Add enum entry + sealed details class
2. Backend: Register with Jackson polymorphic ser/des
3. Backend: Update ingest projector for value/unit derivation
4. Backend: Add tests
5. Frontend: Add TypeScript types
6. Frontend: Add details panel component
7. Frontend: Register panel in the dispatch registry
8. (Optional) Add seed data for development

---

## Step 1: Add `AlarmType` enum entry (Backend)

**File**: `backend/src/main/java/com/fabalarm/model/AlarmType.java`

Add your new type to the enum. Use snake_case or camelCase consistently with existing entries.

```java
public enum AlarmType {
    spc_ooc,
    TempSpike,        // <-- NEW
    ChamberLeak
}
```

**Worked example**: `TempSpike` added alongside existing types.

---

## Step 2: Define the `AlarmDetails` sealed subclass (Backend)

**File**: Create new file `backend/src/main/java/com/fabalarm/model/TempSpikeDetails.java`

Create a record (immutable data class) that implements `AlarmDetails`. Use meaningful, type-specific fields.

```java
package com.fabalarm.model;

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

**Worked example**: `TempSpikeDetails` includes temperature readings, sensor ID, and timing.

---

## Step 3: Register with Jackson `@JsonSubTypes` (Backend)

**File**: `backend/src/main/java/com/fabalarm/model/AlarmDetails.java`

Add your new type to the `@JsonSubTypes` annotation and the `permits` clause. The `name` must exactly match the `AlarmType` enum entry.

```java
@JsonTypeInfo(use = JsonTypeInfo.Id.NAME, property = "kind")
@JsonSubTypes({
    @JsonSubTypes.Type(value = SpcOocDetails.class, name = "spc_ooc"),
    @JsonSubTypes.Type(value = TempSpikeDetails.class, name = "TempSpike")  // <-- NEW
})
public sealed interface AlarmDetails permits SpcOocDetails, TempSpikeDetails {  // <-- NEW
}
```

**Worked example**: `TempSpikeDetails` registered with kind `"TempSpike"`.

---

## Step 4: Update the ingest projector (Backend)

**File**: `backend/src/main/java/com/fabalarm/service/IngestProjector.java`

Add a case to derive the common `value`/`unit` pair from your new details type. This keeps list pages, filters, and exports working consistently across all alarm types.

```java
@Component
public class IngestProjector {

    public void projectValueAndUnit(Alarm alarm) {
        AlarmDetails details = alarm.getDetails();
        if (details instanceof SpcOocDetails spcOoc) {
            // ... existing spc_ooc logic ...
        } else if (details instanceof TempSpikeDetails tempSpike) {  // <-- NEW
            double delta = tempSpike.currentTemp() - tempSpike.thresholdTemp();
            alarm.setValue(delta);
            alarm.setUnit("°C");
        }
    }
}
```

**Worked example**: For `TempSpike`, we project temperature delta (over threshold) in °C.

---

## Step 5: Add backend tests (Backend)

**File**: `backend/src/test/java/com/fabalarm/AlarmDetailsTest.java`

Add two test cases:
1. JSON round-trip serialization/deserialization
2. Ingest projector value/unit derivation

```java
@Test
void testTempSpikeDetailsJsonRoundTrip() throws Exception {
    TempSpikeDetails original = new TempSpikeDetails(
            125.5,
            120.0,
            "SENSOR-ETCH-01",
            Instant.parse("2026-04-13T10:00:00Z"),
            45
    );

    String json = objectMapper.writeValueAsString(original);
    assertTrue(json.contains("\"kind\":\"TempSpike\""));

    AlarmDetails deserialized = objectMapper.readValue(json, AlarmDetails.class);
    assertInstanceOf(TempSpikeDetails.class, deserialized);
    TempSpikeDetails tempSpike = (TempSpikeDetails) deserialized;
    assertEquals(original.currentTemp(), tempSpike.currentTemp());
    // ... assert other fields ...
}

@Test
void testIngestProjectorTempSpike() {
    Alarm alarm = new Alarm();
    alarm.setDetails(new TempSpikeDetails(
            125.5, 120.0, "SENSOR-ETCH-01",
            Instant.parse("2026-04-13T10:00:00Z"), 45
    ));

    ingestProjector.projectValueAndUnit(alarm);

    assertEquals(5.5, alarm.getValue(), 0.001);
    assertEquals("°C", alarm.getUnit());
}
```

**Worked example**: Tests verify JSON ser/des and projector logic for `TempSpike`.

---

## Step 6: Add frontend TypeScript types (Frontend)

**File**: `frontend/src/types.ts`

Add a TypeScript interface for your details type, and add it to the `AlarmDetails` discriminated union. The `kind` discriminator must exactly match the backend enum value.

```typescript
export interface TempSpikeDetails {
  kind: 'TempSpike';  // <-- Must match backend
  currentTemp: number;
  thresholdTemp: number;
  sensorId: string;
  spikeStartTime: string; // ISO 8601
  durationSeconds: number;
}

export type AlarmDetails = SpcOocDetails | TempSpikeDetails;  // <-- Add here
```

**Worked example**: `TempSpikeDetails` interface added to frontend types.

---

## Step 7: Add details-panel component (Frontend)

**File**: Create new file `frontend/src/components/alarms/TempSpikePanel.tsx`

Create a React component that renders your type-specific details. Follow the pattern in `SpcOocPanel.tsx` for consistency.

```tsx
import { Thermometer, Clock, Activity, Calendar } from 'lucide-react';
import type { TempSpikeDetails } from '../../types';

function formatDateTime(iso: string): string {
  const d = new Date(iso);
  return `${d.toISOString().slice(0, 10)} ${d.toISOString().slice(11, 16)}`;
}

export function TempSpikePanel({ details }: { details: TempSpikeDetails }) {
  return (
    <div className="card p-4">
      <h3 className="text-[10px] font-semibold uppercase tracking-wider text-theme-muted mb-3 flex items-center gap-1">
        <Thermometer size={12} />
        Temperature Spike Details
      </h3>
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-xs">
        <div className="space-y-1">
          <div className="flex items-center gap-2">
            <Thermometer size={12} className="text-theme-muted" />
            <span className="text-theme-muted">Current:</span>
            <span className="font-medium text-theme-primary">{details.currentTemp.toFixed(1)}°C</span>
          </div>
          <div className="flex items-center gap-2">
            <Activity size={12} className="text-theme-muted" />
            <span className="text-theme-muted">Threshold:</span>
            <span className="font-medium text-theme-primary">{details.thresholdTemp.toFixed(1)}°C</span>
          </div>
          <div className="flex items-center gap-2">
            <span className="text-theme-muted">Delta:</span>
            <span className="font-medium text-red-500">+{(details.currentTemp - details.thresholdTemp).toFixed(1)}°C</span>
          </div>
        </div>
        <div className="space-y-1">
          <div className="flex items-center gap-2">
            <Calendar size={12} className="text-theme-muted" />
            <span className="text-theme-muted">Start Time:</span>
            <span className="font-medium text-theme-primary">{formatDateTime(details.spikeStartTime)}</span>
          </div>
          <div className="flex items-center gap-2">
            <Clock size={12} className="text-theme-muted" />
            <span className="text-theme-muted">Duration:</span>
            <span className="font-medium text-theme-primary">{details.durationSeconds}s</span>
          </div>
          <div className="flex items-center gap-2">
            <span className="text-theme-muted">Sensor:</span>
            <span className="font-medium text-theme-primary">{details.sensorId}</span>
          </div>
        </div>
      </div>
    </div>
  );
}
```

**Worked example**: `TempSpikePanel` follows the same card layout, icon usage, and typography as `SpcOocPanel`.

---

## Step 8: Register panel in dispatch registry (Frontend)

**File**: `frontend/src/components/alarms/AlarmDetailsPanel.tsx`

Add a case to the switch statement that routes your new `kind` to your new panel component.

```tsx
import type { Alarm } from '../../types';
import { SpcOocPanel } from './SpcOocPanel';
import { TempSpikePanel } from './TempSpikePanel';  // <-- NEW

export function AlarmDetailsPanel({ alarm }: { alarm: Alarm }) {
  const details = alarm.details;

  if (!details) {
    return null;
  }

  switch (details.kind) {
    case 'spc_ooc':
      return <SpcOocPanel details={details} />;
    case 'TempSpike':  // <-- NEW
      return <TempSpikePanel details={details} />;
    default:
      return null;
  }
}
```

**Worked example**: `TempSpikePanel` registered for `kind: 'TempSpike'`.

---

## Step 9 (Optional): Add seed data (Backend)

**File**: `backend/src/main/resources/data.sql`

Add example alarms to the seed data for local development. Include:
- A native alarm (no `source`)
- An external alarm (with `source`, `sourceAlarmId`)
- At least one with `externalStatus` for parallel-status UI testing

```sql
INSERT INTO alarm (id, type, severity, message, alarm_value, unit, alarm_time, event_time, alarm_date, recovery_time, eqp_id, chamber_id, product_id, oper_name, oper_no, technology_id, product_group_id, process_oper_name, process_oper_no, lot_id, lot_priority, wafer_id, recipe_id, route_id, module, module_owner, pi_owner, owner, department, status, risk_level, details, source, source_alarm_id)
VALUES ('alm-003', 'TempSpike', 'P2', 'Chamber temperature exceeded threshold during deposition', 5.5, '°C', '2026-04-13 09:45:00+00:00', '2026-04-13 09:40:00+00:00', '2026-04-13', NULL, 'CVD-03', 'C', 'B3-ETCH', 'Deposition step', 'OP-012', 'TECH-10nm', 'PG-B3', 'Deposition step', 'OP-012', 'LOT-9012', 1, 'WF-008', 'RCP-CVD-03', 'RT-CVD-03', 'CVD', 'L. Rossi', 'N. Sato', 'L. Rossi', 'Litho', 'Open', 'P2', '{"kind":"TempSpike","currentTemp":125.5,"thresholdTemp":120.0,"sensorId":"SENSOR-CVD-03","spikeStartTime":"2026-04-13T09:40:00Z","durationSeconds":45}', 'SENSOR_HUB', 'SNSR-12345');
```

**Worked example**: `TempSpike` alarm with both native and external variants in seed data.

---

## Step 10: Regenerate API types (Frontend)

If you modified backend API contracts (you shouldn't need to for just adding an alarm type, since `details` is JSON and the DTO passes it through), regenerate the frontend types:

```bash
# Start backend on :8080 first
cd backend
./mvnw spring-boot:run

# Then in another terminal:
pnpm generate-api
```

The generated file `frontend/src/api/generated.d.ts` is gitignored — don't commit it.

---

## Verify Everything Works

1. **Start backend**: `cd backend && ./mvnw spring-boot:run`
2. **Start frontend**: `pnpm dev:fe`
3. **Run backend tests**: `cd backend && ./mvnw test`
4. **Run frontend tests**: `pnpm test:fe`
5. **Manually verify**: Visit the alarm detail page for your new alarm type and confirm the details panel renders correctly.

---

## Checklist

Use this to make sure you didn't miss anything:

- [ ] `AlarmType` enum has new entry
- [ ] New `AlarmDetails` record implements the interface
- [ ] `@JsonSubTypes` includes the new type with matching `name`
- [ ] `permits` clause on `AlarmDetails` includes the new type
- [ ] `IngestProjector` has a case for the new type
- [ ] Backend tests added: JSON round-trip + ingest projection
- [ ] Frontend TypeScript interface added with correct `kind` discriminator
- [ ] Frontend details panel component created
- [ Panel registered in `AlarmDetailsPanel` switch
- [ ] (Optional) Seed data added for local dev
- [ ] Backend tests pass
- [ ] Frontend tests pass
- [ ] Manual verification in browser shows details panel

---

## Reference Files

This guide was written using these worked examples:

- Backend model: `backend/src/main/java/com/fabalarm/model/TempSpikeDetails.java`
- Jackson registration: `backend/src/main/java/com/fabalarm/model/AlarmDetails.java`
- Ingest projector: `backend/src/main/java/com/fabalarm/service/IngestProjector.java`
- Backend tests: `backend/src/test/java/com/fabalarm/AlarmDetailsTest.java`
- Frontend types: `frontend/src/types.ts`
- Frontend panel: `frontend/src/components/alarms/TempSpikePanel.tsx`
- Panel registry: `frontend/src/components/alarms/AlarmDetailsPanel.tsx`
- Seed data: `backend/src/main/resources/data.sql` (look for `TempSpike` alarms)
