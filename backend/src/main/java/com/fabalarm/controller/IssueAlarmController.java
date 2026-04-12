package com.fabalarm.controller;

import com.fabalarm.auth.CurrentUserHolder;
import com.fabalarm.model.*;
import com.fabalarm.service.IssueAlarmService;
import io.swagger.v3.oas.annotations.Operation;
import io.swagger.v3.oas.annotations.tags.Tag;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.util.LinkedHashMap;
import java.util.List;
import java.util.Map;
import java.util.stream.Collectors;

@RestController
@Tag(name = "IssueAlarms", description = "Link, unlink, and move alarms between issues")
public class IssueAlarmController {

    private final IssueAlarmService issueAlarmService;

    public IssueAlarmController(IssueAlarmService issueAlarmService) {
        this.issueAlarmService = issueAlarmService;
    }

    @Operation(summary = "List active alarms for an issue")
    @GetMapping("/api/issues/{id}/alarms")
    public ResponseEntity<?> getActiveAlarms(@PathVariable String id) {
        List<IssueAlarm> alarms = issueAlarmService.getActiveAlarms(id);
        return ResponseEntity.ok(alarms.stream().map(this::toDto).collect(Collectors.toList()));
    }

    @Operation(summary = "List historical (moved/merged) alarms for an issue")
    @GetMapping("/api/issues/{id}/alarms/historical")
    public ResponseEntity<?> getHistoricalAlarms(@PathVariable String id) {
        List<IssueAlarm> alarms = issueAlarmService.getHistoricalAlarms(id);
        return ResponseEntity.ok(alarms.stream().map(this::toDto).collect(Collectors.toList()));
    }

    @Operation(summary = "Link an alarm to an issue")
    @PostMapping("/api/issues/{id}/alarms/{alarmId}")
    public ResponseEntity<?> linkAlarm(@PathVariable String id, @PathVariable String alarmId) {
        User user = CurrentUserHolder.get();
        try {
            IssueAlarm ia = issueAlarmService.link(id, alarmId, user);
            return ResponseEntity.status(201).body(toDto(ia));
        } catch (IllegalArgumentException e) {
            return ResponseEntity.notFound().build();
        } catch (IllegalStateException e) {
            return ResponseEntity.badRequest().body(Map.of("error", e.getMessage()));
        }
    }

    @Operation(summary = "Unlink an alarm from an issue")
    @DeleteMapping("/api/issues/{id}/alarms/{alarmId}")
    public ResponseEntity<?> unlinkAlarm(@PathVariable String id, @PathVariable String alarmId) {
        User user = CurrentUserHolder.get();
        try {
            issueAlarmService.unlink(id, alarmId, user);
            return ResponseEntity.noContent().build();
        } catch (IllegalArgumentException e) {
            return ResponseEntity.notFound().build();
        }
    }

    @Operation(summary = "Move an alarm to a different issue")
    @PostMapping("/api/alarms/{alarmId}/move")
    public ResponseEntity<?> moveAlarm(@PathVariable String alarmId, @RequestBody Map<String, String> body) {
        String targetIssueId = body.get("targetIssueId");
        if (targetIssueId == null || targetIssueId.isBlank()) {
            return ResponseEntity.badRequest().body(Map.of("error", "targetIssueId is required"));
        }
        User user = CurrentUserHolder.get();
        try {
            IssueAlarm ia = issueAlarmService.move(alarmId, targetIssueId, user);
            return ResponseEntity.ok(toDto(ia));
        } catch (IllegalArgumentException e) {
            return ResponseEntity.notFound().build();
        }
    }

    @Operation(summary = "Get the active issue-alarm link for an alarm (if any)")
    @GetMapping("/api/alarms/{alarmId}/issue")
    public ResponseEntity<?> getLinkedIssue(@PathVariable String alarmId) {
        return issueAlarmService.getActiveLink(alarmId)
                .map(ia -> ResponseEntity.ok(toDto(ia)))
                .orElse(ResponseEntity.notFound().build());
    }

    private Map<String, Object> toDto(IssueAlarm ia) {
        Map<String, Object> dto = new LinkedHashMap<>();
        dto.put("id", ia.getId());
        dto.put("issueId", ia.getIssueId());
        dto.put("alarmId", ia.getAlarmId());
        dto.put("attachedAt", ia.getAttachedAt().toString());
        dto.put("attachedBy", ia.getAttachedBy());
        if (ia.getMergedAt() != null) dto.put("mergedAt", ia.getMergedAt().toString());
        if (ia.getMergedBy() != null) dto.put("mergedBy", ia.getMergedBy());
        if (ia.getMergedToIssueId() != null) dto.put("mergedToIssueId", ia.getMergedToIssueId());
        return dto;
    }
}
