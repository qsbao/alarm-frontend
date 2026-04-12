package com.fabalarm.controller;

import com.fabalarm.model.*;
import com.fabalarm.service.AlarmService;
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

    @Operation(summary = "List alarms", description = "Returns alarms within mandatory date range, with optional filters")
    @GetMapping
    public ResponseEntity<?> listAlarms(
            @RequestParam(required = false) String from,
            @RequestParam(required = false) String to,
            @RequestParam(required = false) String search,
            @RequestParam(required = false) List<String> status,
            @RequestParam(required = false) List<String> department,
            @RequestParam(required = false) List<String> severity,
            @RequestParam(required = false) List<String> humanRisk,
            @RequestParam(required = false) List<String> alarmType,
            @RequestParam(required = false) List<String> owner,
            @RequestParam(required = false) List<String> machineId,
            @RequestParam(required = false) List<String> chamberId,
            @RequestParam(required = false) List<String> product,
            @RequestParam(required = false) List<String> operation,
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
        List<HumanRisk> humanRiskFilter = parseEnums(humanRisk, HumanRisk.class);
        List<AlarmType> alarmTypeFilter = parseEnums(alarmType, AlarmType.class);
        List<AlarmLabel> labelsFilter = parseEnums(labels, AlarmLabel.class);

        List<Alarm> alarms = alarmService.findByDateRange(
                fromInstant, toInstant, search,
                statusFilter, department, severityFilter,
                humanRiskFilter, alarmTypeFilter,
                owner, machineId, chamberId, product, operation,
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

    private Map<String, Object> toDto(Alarm a) {
        Map<String, Object> dto = new LinkedHashMap<>();
        dto.put("id", a.getId());
        dto.put("type", a.getType().name());
        dto.put("severity", a.getSeverity().name());
        dto.put("message", a.getMessage());
        if (a.getValue() != null) dto.put("value", a.getValue());
        if (a.getUnit() != null) dto.put("unit", a.getUnit());
        dto.put("time", a.getTime().toString());
        if (a.getRecoveryTime() != null) dto.put("recoveryTime", a.getRecoveryTime().toString());
        dto.put("machineId", a.getMachineId());
        if (a.getChamberId() != null) dto.put("chamberId", a.getChamberId());
        dto.put("product", a.getProduct());
        dto.put("operation", a.getOperation());
        dto.put("owner", a.getOwner());
        dto.put("department", a.getDepartment());
        if (a.getChartOwnerId() != null) dto.put("chartOwnerId", a.getChartOwnerId());
        dto.put("status", a.getStatus().name());
        if (a.getHumanRisk() != null) dto.put("humanRisk", a.getHumanRisk().name());
        dto.put("labels", a.getLabels().stream().map(AlarmLabel::name).sorted().collect(Collectors.toList()));
        return dto;
    }

    private <E extends Enum<E>> List<E> parseEnums(List<String> values, Class<E> enumClass) {
        if (values == null || values.isEmpty()) return null;
        return values.stream()
                .map(v -> Enum.valueOf(enumClass, v))
                .collect(Collectors.toList());
    }
}
