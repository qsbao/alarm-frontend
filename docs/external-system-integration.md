# External System Integration Guide

How to integrate external systems (SPC, MES, Sensor Hub) with the Fab Alarm API.

## Authentication

External systems authenticate using **service accounts**. Each system has a pre-provisioned user ID:

| System     | `X-User-Id` header value |
|------------|--------------------------|
| SPC System | `SPC_SYSTEM`             |
| MES Alerts | `MES_ALERTS`             |
| Sensor Hub | `SENSOR_HUB`             |

Every API request must include the `X-User-Id` header.

---

## API Reference

Base URL: `http://<host>:8080`

### 1. Create Alarm

Creates a new alarm. Returns `409 Conflict` if the alarm ID already exists.

```
POST /api/alarms
```

**Example:**

```bash
curl -X POST http://localhost:8080/api/alarms \
  -H "Content-Type: application/json" \
  -H "X-User-Id: SPC_SYSTEM" \
  -d '{
    "id": "SPC-20260413-001",
    "type": "spc_ooc",
    "severity": "P1",
    "message": "Chart XBar-R limit exceeded on CVD-04 chamber A",
    "alarmTime": "2026-04-13T08:30:00Z",
    "eqpId": "CVD-04",
    "chamberId": "A",
    "productId": "A7-Litho",
    "operName": "Deposition",
    "owner": "H. Tanaka",
    "department": "Litho",
    "status": "Open",
    "source": "SPC_SYSTEM",
    "sourceAlarmId": "OOC-2026-04-13-001",
    "details": {
      "kind": "spc_ooc",
      "chartName": "XBar-R Temperature",
      "chartNo": "CHT-001",
      "chartLevel": "L3",
      "holdCode": "HOLD-SPC",
      "txDatetime": "2026-04-13T08:30:00Z",
      "waferCount": 25,
      "oocCount": 3
    }
  }'
```

**Responses:**

| Status | Meaning                                |
|--------|----------------------------------------|
| `201`  | Alarm created successfully             |
| `409`  | Alarm with this ID already exists      |
| `401`  | Missing or invalid `X-User-Id` header  |

**Required fields:** `id`, `type`, `severity`, `message`, `alarmTime`, `eqpId`, `productId`, `owner`, `department`, `status`

**Optional fields:** `chamberId`, `operName`, `operNo`, `value`, `unit`, `eventTime`, `recoveryTime`, `riskLevel`, `source`, `sourceAlarmId`, `sourceAlarmBody`, `details`, `module`, `moduleOwner`, `piOwner`, `chartOwnerId`, `technologyId`, `productGroupId`, `processOperName`, `processOperNo`, `lotId`, `lotPriority`, `waferId`, `recipeId`, `routeId`

**Alarm types:** `spc_ooc`, `TempSpike`, `ChamberLeak`

**Severity levels:** `P0`, `P1`, `P2`, `P3`

---

### 2. Create Issue (with optional workflow and alarm)

Creates a new issue. Optionally links an alarm and attaches a workflow in a single call.

```
POST /api/issues
```

**Example:**

```bash
curl -X POST http://localhost:8080/api/issues \
  -H "Content-Type: application/json" \
  -H "X-User-Id: SPC_SYSTEM" \
  -d '{
    "id": "ISS-20260413-001",
    "title": "SPC OOC on CVD-04 chamber A - temperature excursion",
    "riskLevel": "P1",
    "issueTime": "2026-04-13T08:30:00Z",
    "operName": "Deposition",
    "operNo": "OP-3030",
    "module": "CVD",
    "product": "A7-Litho",
    "ownerId": "user-tanaka",
    "department": "Litho",
    "description": "SPC chart XBar-R flagged 3 OOC points on CVD-04 chamber A during deposition.",
    "alarmId": "SPC-20260413-001",
    "workflowDefinitionId": "spc_ooc_branching_v1"
  }'
```

**Responses:**

| Status | Meaning                                |
|--------|----------------------------------------|
| `201`  | Issue created successfully             |
| `401`  | Missing or invalid `X-User-Id` header  |

**Required fields:** `id`, `title`, `riskLevel`, `issueTime`, `product`, `ownerId`, `department`

**Optional fields:** `operName`, `operNo`, `module`, `labels`, `description`, `alarmId`, `workflowDefinitionId`

**Workflow definitions:** `generic_linear_v1`, `spc_ooc_branching_v1`

**Risk levels:** `P0`, `P1`, `P2`, `P3`

**Modules:** `LITHO`, `ETCH`, `CVD`, `PVD`, `DIFFUSION`, `IMPLANT`, `CMP`, `METROLOGY`, `CLEAN`, `WET`, `TEST`

---

### 3. Add Alarm to Existing Issue

Links an alarm to an issue that already exists.

```
POST /api/issues/{issueId}/alarms/{alarmId}
```

**Example:**

```bash
curl -X POST http://localhost:8080/api/issues/ISS-20260413-001/alarms/SPC-20260413-002 \
  -H "X-User-Id: SPC_SYSTEM"
```

**Responses:**

| Status | Meaning                                       |
|--------|-----------------------------------------------|
| `201`  | Alarm linked to issue                         |
| `400`  | Alarm already linked to another issue          |
| `404`  | Issue or alarm not found                       |
| `401`  | Missing or invalid `X-User-Id` header          |

---

### 4. Other Useful Endpoints

These existing endpoints may be useful for external systems after creating alarms/issues:

| Action                | Method | Endpoint                          | Body                                    |
|-----------------------|--------|-----------------------------------|-----------------------------------------|
| Acknowledge alarm     | POST   | `/api/alarms/{id}/ack`            | `{"note": "Auto-acked by SPC system"}` |
| Recover alarm         | POST   | `/api/alarms/{id}/recover`        | (empty)                                 |
| Set alarm risk level  | POST   | `/api/alarms/{id}/risk`           | `{"risk": "P1"}`                       |
| Add alarm label       | POST   | `/api/alarms/{id}/label`          | `{"action": "add", "label": "Recurring"}` |
| Get alarm by ID       | GET    | `/api/alarms/{id}`                | -                                       |
| Get issue by ID       | GET    | `/api/issues/{id}`                | -                                       |

---

## Error Handling

All error responses return JSON with an `error` field:

```json
{ "error": "Alarm already exists: SPC-20260413-001" }
```

| Status | Meaning                         | Action                                |
|--------|---------------------------------|---------------------------------------|
| `401`  | Invalid or missing `X-User-Id`  | Check header value matches a service account |
| `404`  | Resource not found              | Verify the alarm/issue ID exists       |
| `409`  | Alarm ID already exists         | Alarm was already ingested; skip or log |
| `400`  | Bad request                     | Check required fields and enum values  |

---

## Typical Integration Flow

```
1. External system detects alarm condition
2. POST /api/alarms  (create the alarm)
   - If 409 → alarm already ingested, skip
3. POST /api/issues  (create issue with alarmId + workflowDefinitionId)
   - Links alarm and attaches workflow atomically
4. (Later) Additional alarms fire for same issue
   - POST /api/alarms  (create each new alarm)
   - POST /api/issues/{issueId}/alarms/{alarmId}  (link to existing issue)
```
