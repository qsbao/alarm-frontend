package com.fabalarm.controller;

import com.fabalarm.auth.CurrentUserHolder;
import com.fabalarm.model.*;
import com.fabalarm.service.IssueAlarmService;
import com.fabalarm.service.IssueService;
import io.swagger.v3.oas.annotations.Operation;
import io.swagger.v3.oas.annotations.tags.Tag;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.time.Instant;
import java.util.*;
import java.util.stream.Collectors;

@RestController
@RequestMapping("/api/issues")
@Tag(name = "Issues", description = "Issue CRUD, owner assignment, comments, and activity")
public class IssueController {

    private final IssueService issueService;
    private final IssueAlarmService issueAlarmService;

    public IssueController(IssueService issueService, IssueAlarmService issueAlarmService) {
        this.issueService = issueService;
        this.issueAlarmService = issueAlarmService;
    }

    @Operation(summary = "List issues", description = "Returns all issues with optional filtering")
    @GetMapping
    public ResponseEntity<?> listIssues(
            @RequestParam(required = false) String search,
            @RequestParam(required = false) List<String> status,
            @RequestParam(required = false) List<String> riskLevel,
            @RequestParam(required = false) List<String> alarmType) {

        List<IssueStatus> statusFilter = parseEnums(status, IssueStatus.class);
        List<RiskLevel> riskFilter = parseEnums(riskLevel, RiskLevel.class);
        List<AlarmType> typeFilter = parseEnums(alarmType, AlarmType.class);

        List<Issue> issues = issueService.findAll(search, statusFilter, riskFilter, typeFilter);

        List<Map<String, Object>> result = issues.stream()
                .map(this::toDto)
                .collect(Collectors.toList());

        return ResponseEntity.ok(result);
    }

    @Operation(summary = "Get issue by ID", description = "Returns a single issue with details")
    @GetMapping("/{id}")
    public ResponseEntity<?> getIssue(@PathVariable String id) {
        return issueService.findById(id)
                .map(i -> ResponseEntity.ok(toDto(i)))
                .orElse(ResponseEntity.notFound().build());
    }

    @Operation(summary = "Create issue", description = "Creates a new issue")
    @PostMapping
    public ResponseEntity<?> createIssue(@RequestBody Map<String, String> body) {
        Issue issue = new Issue();
        issue.setId(body.get("id"));
        issue.setTitle(body.get("title"));
        issue.setAlarmType(AlarmType.valueOf(body.get("alarmType")));
        issue.setRiskLevel(RiskLevel.valueOf(body.get("riskLevel")));
        issue.setIssueTime(Instant.parse(body.get("issueTime")));
        issue.setOperation(body.get("operation"));
        issue.setProduct(body.get("product"));
        issue.setOwnerId(body.get("ownerId"));
        issue.setDepartment(body.get("department"));
        issue.setDescription(body.getOrDefault("description", ""));

        User user = CurrentUserHolder.get();
        Issue created = issueService.create(issue, user);

        // If alarmId provided, link the alarm to the new issue in the same transaction
        String alarmId = body.get("alarmId");
        if (alarmId != null && !alarmId.isBlank()) {
            try {
                issueAlarmService.link(created.getId(), alarmId, user);
            } catch (Exception e) {
                // If linking fails, still return the created issue
            }
        }

        return ResponseEntity.status(201).body(toDto(created));
    }

    @Operation(summary = "Reassign issue owner", description = "Reassigns issue owner and logs activity")
    @PutMapping("/{id}/owner")
    public ResponseEntity<?> assignOwner(@PathVariable String id, @RequestBody Map<String, String> body) {
        String ownerId = body.get("ownerId");
        User user = CurrentUserHolder.get();
        Issue updated = issueService.assignOwner(id, ownerId, user);
        if (updated == null) return ResponseEntity.notFound().build();
        return ResponseEntity.ok(toDto(updated));
    }

    @Operation(summary = "Add comment to issue", description = "Adds a comment and logs activity")
    @PostMapping("/{id}/comments")
    public ResponseEntity<?> addComment(@PathVariable String id, @RequestBody Map<String, String> body) {
        String text = body.get("text");
        User user = CurrentUserHolder.get();
        Issue updated = issueService.addComment(id, text, user);
        if (updated == null) return ResponseEntity.notFound().build();
        return ResponseEntity.ok(toDto(updated));
    }

    @Operation(summary = "Get issue activity", description = "Returns ordered activity timeline for an issue")
    @GetMapping("/{id}/activity")
    public ResponseEntity<?> getActivity(@PathVariable String id) {
        if (issueService.findById(id).isEmpty()) {
            return ResponseEntity.notFound().build();
        }
        List<IssueActivity> activities = issueService.getActivity(id);
        List<Map<String, Object>> result = activities.stream()
                .map(this::toActivityDto)
                .collect(Collectors.toList());
        return ResponseEntity.ok(result);
    }

    private Map<String, Object> toDto(Issue i) {
        Map<String, Object> dto = new LinkedHashMap<>();
        dto.put("id", i.getId());
        dto.put("title", i.getTitle());
        dto.put("date", i.getDate().toString());
        dto.put("alarmType", i.getAlarmType().name());
        dto.put("riskLevel", i.getRiskLevel().name());
        dto.put("status", i.getStatus().name());
        dto.put("issueTime", i.getIssueTime().toString());
        dto.put("operation", i.getOperation());
        dto.put("product", i.getProduct());
        dto.put("ownerId", i.getOwnerId());
        dto.put("department", i.getDepartment());
        dto.put("description", i.getDescription() != null ? i.getDescription() : "");
        return dto;
    }

    private Map<String, Object> toActivityDto(IssueActivity a) {
        Map<String, Object> dto = new LinkedHashMap<>();
        dto.put("id", a.getId());
        dto.put("issueId", a.getIssueId());
        dto.put("type", a.getType().name());
        dto.put("timestamp", a.getTimestamp().toString());
        dto.put("author", a.getAuthor());
        if (a.getText() != null) dto.put("text", a.getText());
        if (a.getAssignedTo() != null) dto.put("assignedTo", a.getAssignedTo());
        if (a.getAlarmId() != null) dto.put("alarmId", a.getAlarmId());
        return dto;
    }

    private <E extends Enum<E>> List<E> parseEnums(List<String> values, Class<E> enumClass) {
        if (values == null || values.isEmpty()) return null;
        return values.stream()
                .map(v -> Enum.valueOf(enumClass, v))
                .collect(Collectors.toList());
    }
}
