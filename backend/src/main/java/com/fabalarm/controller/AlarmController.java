package com.fabalarm.controller;

import com.fabalarm.auth.CurrentUserHolder;
import com.fabalarm.model.*;
import com.fabalarm.service.AlarmAlreadyExistsException;
import com.fabalarm.service.AlarmService;
import com.fabalarm.service.PermissionDeniedException;
import io.swagger.v3.oas.annotations.Operation;
import io.swagger.v3.oas.annotations.tags.Tag;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.time.Instant;
import java.util.*;
import java.util.stream.Collectors;

@RestController
@RequestMapping("/api/alarms")
@Tag(name = "Alarms", description = "Alarm CRUD and filtering")
public class AlarmController {

    private final AlarmService alarmService;

    public AlarmController(AlarmService alarmService) {
        this.alarmService = alarmService;
    }

    @Operation(summary = "Create alarm", description = "Create a new alarm with optional type-specific details. Returns 409 if alarm ID already exists.")
    @PostMapping
    public ResponseEntity<?> createAlarm(@RequestBody Alarm alarm) {
        try {
            Alarm created = alarmService.create(alarm);
            return ResponseEntity.status(201).body(toDto(created));
        } catch (AlarmAlreadyExistsException e) {
            return ResponseEntity.status(409).body(Map.of("error", e.getMessage()));
        }
    }

    @Operation(summary = "List alarms", description = "Returns alarms within mandatory date range, with optional filters")
    @GetMapping
    public ResponseEntity<?> listAlarms(
            @RequestParam(required = false) String from,
            @RequestParam(required = false) String to,
            @RequestParam(required = false) String search,
            @RequestParam(required = false) List<String> status,
            @RequestParam(required = false) List<String> department,
            @RequestParam(required = false) List<String> severity,
            @RequestParam(required = false) List<String> riskLevel,
            @RequestParam(required = false) List<String> alarmType,
            @RequestParam(required = false) List<String> owner,
            @RequestParam(required = false) List<String> eqpId,
            @RequestParam(required = false) List<String> chamberId,
            @RequestParam(required = false) List<String> productId,
            @RequestParam(required = false) List<String> operName,
            @RequestParam(required = false) List<String> labels,
            @RequestParam(required = false) String active) {

        if (from == null || from.isBlank() || to == null || to.isBlank()) {
            return ResponseEntity.badRequest().body(Map.of("error", "Both 'from' and 'to' date-range parameters are required"));
        }

        Instant fromInstant;
        Instant toInstant;
        try {
            fromInstant = Instant.parse(from);
            toInstant = Instant.parse(to);
        } catch (Exception e) {
            return ResponseEntity.badRequest().body(Map.of("error", "Invalid date format. Use ISO 8601 (e.g. 2025-01-01T00:00:00Z)"));
        }

        List<AlarmStatus> statusFilter = parseEnums(status, AlarmStatus.class);
        List<RiskLevel> severityFilter = parseEnums(severity, RiskLevel.class);
        List<HumanRiskLevel> riskLevelFilter = parseEnums(riskLevel, HumanRiskLevel.class);
        List<AlarmType> alarmTypeFilter = parseEnums(alarmType, AlarmType.class);
        List<AlarmLabel> labelsFilter = parseEnums(labels, AlarmLabel.class);

        List<Alarm> alarms = alarmService.findByDateRange(
                fromInstant, toInstant, search,
                statusFilter, department, severityFilter,
                riskLevelFilter, alarmTypeFilter,
                owner, eqpId, chamberId, productId, operName,
                labelsFilter, active);

        List<Map<String, Object>> result = alarms.stream()
                .map(this::toDto)
                .collect(Collectors.toList());

        return ResponseEntity.ok(result);
    }

    @Operation(summary = "Get alarm by ID", description = "Returns a single alarm with labels")
    @GetMapping("/{id}")
    public ResponseEntity<?> getAlarm(@PathVariable String id) {
        return alarmService.findById(id)
                .map(a -> ResponseEntity.ok(toDto(a)))
                .orElse(ResponseEntity.notFound().build());
    }

    @Operation(summary = "Acknowledge alarm", description = "Ack an alarm (same-department permission required)")
    @PostMapping("/{id}/ack")
    public ResponseEntity<?> ackAlarm(@PathVariable String id, @RequestBody(required = false) Map<String, String> body) {
        try {
            String note = body != null ? body.get("note") : null;
            Alarm alarm = alarmService.ack(id, CurrentUserHolder.get(), note);
            if (alarm == null) return ResponseEntity.notFound().build();
            return ResponseEntity.ok(toDto(alarm));
        } catch (PermissionDeniedException e) {
            return ResponseEntity.status(403).body(Map.of("error", e.getMessage()));
        }
    }

    @Operation(summary = "Set label on alarm", description = "Add or remove a label from an alarm")
    @PostMapping("/{id}/label")
    public ResponseEntity<?> setLabel(@PathVariable String id, @RequestBody Map<String, String> body) {
        String action = body.get("action");
        AlarmLabel label = AlarmLabel.valueOf(body.get("label"));
        Alarm alarm = alarmService.setLabel(id, CurrentUserHolder.get(), action, label);
        if (alarm == null) return ResponseEntity.notFound().build();
        return ResponseEntity.ok(toDto(alarm));
    }

    @Operation(summary = "Set risk level on alarm", description = "Set risk level assessment on an alarm")
    @PostMapping("/{id}/risk")
    public ResponseEntity<?> setRisk(@PathVariable String id, @RequestBody Map<String, String> body) {
        HumanRiskLevel risk = HumanRiskLevel.valueOf(body.get("risk"));
        Alarm alarm = alarmService.setRisk(id, CurrentUserHolder.get(), risk);
        if (alarm == null) return ResponseEntity.notFound().build();
        return ResponseEntity.ok(toDto(alarm));
    }

    @Operation(summary = "Recover alarm", description = "Set recovery time on an active alarm")
    @PostMapping("/{id}/recover")
    public ResponseEntity<?> recoverAlarm(@PathVariable String id, @RequestBody(required = false) Map<String, String> body) {
        try {
            Alarm alarm = alarmService.recover(id, CurrentUserHolder.get());
            if (alarm == null) return ResponseEntity.notFound().build();
            return ResponseEntity.ok(toDto(alarm));
        } catch (IllegalStateException e) {
            return ResponseEntity.badRequest().body(Map.of("error", e.getMessage()));
        }
    }

    @Operation(summary = "Get alarm activity", description = "Returns ordered activity entries for an alarm")
    @GetMapping("/{id}/activity")
    public ResponseEntity<?> getActivity(@PathVariable String id) {
        if (alarmService.findById(id).isEmpty()) {
            return ResponseEntity.notFound().build();
        }
        List<AlarmActivity> activities = alarmService.getActivity(id);
        List<Map<String, Object>> result = activities.stream()
                .map(this::toActivityDto)
                .collect(Collectors.toList());
        return ResponseEntity.ok(result);
    }

    private Map<String, Object> toActivityDto(AlarmActivity a) {
        Map<String, Object> dto = new LinkedHashMap<>();
        dto.put("id", a.getId());
        dto.put("alarmId", a.getAlarmId());
        dto.put("type", a.getType().name());
        dto.put("timestamp", a.getTimestamp().toString());
        dto.put("author", a.getAuthor());
        if (a.getNote() != null) dto.put("note", a.getNote());
        if (a.getLabel() != null) dto.put("label", a.getLabel().name());
        if (a.getFromRisk() != null) dto.put("fromRisk", a.getFromRisk().name());
        if (a.getToRisk() != null) dto.put("toRisk", a.getToRisk().name());
        return dto;
    }

    private Map<String, Object> toDto(Alarm a) {
        Map<String, Object> dto = new LinkedHashMap<>();
        dto.put("id", a.getId());
        dto.put("type", a.getType().name());
        dto.put("severity", a.getSeverity().name());
        dto.put("message", a.getMessage());
        if (a.getValue() != null) dto.put("value", a.getValue());
        if (a.getUnit() != null) dto.put("unit", a.getUnit());
        dto.put("alarmTime", a.getAlarmTime().toString());
        if (a.getEventTime() != null) dto.put("eventTime", a.getEventTime().toString());
        if (a.getAlarmDate() != null) dto.put("alarmDate", a.getAlarmDate().toString());
        if (a.getRecoveryTime() != null) dto.put("recoveryTime", a.getRecoveryTime().toString());
        dto.put("eqpId", a.getEqpId());
        if (a.getChamberId() != null) dto.put("chamberId", a.getChamberId());
        dto.put("productId", a.getProductId());
        if (a.getOperName() != null) dto.put("operName", a.getOperName());
        if (a.getOperNo() != null) dto.put("operNo", a.getOperNo());
        if (a.getTechnologyId() != null) dto.put("technologyId", a.getTechnologyId());
        if (a.getProductGroupId() != null) dto.put("productGroupId", a.getProductGroupId());
        if (a.getProcessOperName() != null) dto.put("processOperName", a.getProcessOperName());
        if (a.getProcessOperNo() != null) dto.put("processOperNo", a.getProcessOperNo());
        if (a.getLotId() != null) dto.put("lotId", a.getLotId());
        if (a.getLotPriority() != null) dto.put("lotPriority", a.getLotPriority());
        if (a.getWaferId() != null) dto.put("waferId", a.getWaferId());
        if (a.getRecipeId() != null) dto.put("recipeId", a.getRecipeId());
        if (a.getRouteId() != null) dto.put("routeId", a.getRouteId());
        if (a.getModule() != null) dto.put("module", a.getModule().name());
        if (a.getModuleOwner() != null) dto.put("moduleOwner", a.getModuleOwner());
        if (a.getPiOwner() != null) dto.put("piOwner", a.getPiOwner());
        dto.put("owner", a.getOwner());
        dto.put("department", a.getDepartment());
        if (a.getChartOwnerId() != null) dto.put("chartOwnerId", a.getChartOwnerId());
        dto.put("status", a.getStatus().name());
        if (a.getRiskLevel() != null) dto.put("riskLevel", a.getRiskLevel().name());
        dto.put("labels", a.getLabels().stream().map(AlarmLabel::name).sorted().collect(Collectors.toList()));
        if (a.getDetails() != null) dto.put("details", a.getDetails());
        if (a.getSource() != null) dto.put("source", a.getSource().name());
        if (a.getSourceAlarmId() != null) dto.put("sourceAlarmId", a.getSourceAlarmId());
        if (a.getSourceAlarmBody() != null) dto.put("sourceAlarmBody", a.getSourceAlarmBody());
        if (a.getExternalStatus() != null) dto.put("externalStatus", a.getExternalStatus());
        if (a.getExternalStatusUpdatedAt() != null) dto.put("externalStatusUpdatedAt", a.getExternalStatusUpdatedAt().toString());
        return dto;
    }

    private <E extends Enum<E>> List<E> parseEnums(List<String> values, Class<E> enumClass) {
        if (values == null || values.isEmpty()) return null;
        return values.stream()
                .map(v -> Enum.valueOf(enumClass, v))
                .collect(Collectors.toList());
    }
}
