package com.fabalarm.controller;

import com.fabalarm.auth.CurrentUserHolder;
import com.fabalarm.model.*;
import com.fabalarm.service.RelationService;
import com.fabalarm.repository.IssueRepository;
import io.swagger.v3.oas.annotations.Operation;
import io.swagger.v3.oas.annotations.tags.Tag;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.util.*;
import java.util.stream.Collectors;

@RestController
@Tag(name = "Relations", description = "Issue-to-issue relations (blockers and highlights)")
public class RelationController {

    private final RelationService relationService;
    private final IssueRepository issueRepository;

    public RelationController(RelationService relationService, IssueRepository issueRepository) {
        this.relationService = relationService;
        this.issueRepository = issueRepository;
    }

    // --- Blockers ---

    @Operation(summary = "Add blocker", description = "Adds a blocker relation to the issue")
    @PostMapping("/api/issues/{id}/blockers")
    public ResponseEntity<?> addBlocker(@PathVariable String id, @RequestBody Map<String, String> body) {
        if (issueRepository.findById(id).isEmpty()) return ResponseEntity.notFound().build();
        String toIssueId = body.get("toIssueId");
        if (toIssueId == null || toIssueId.isBlank()) {
            return ResponseEntity.badRequest().body(Map.of("error", "toIssueId is required"));
        }
        if (issueRepository.findById(toIssueId).isEmpty()) {
            return ResponseEntity.badRequest().body(Map.of("error", "Target issue not found: " + toIssueId));
        }
        User user = CurrentUserHolder.get();
        IssueRelation rel = relationService.addBlocker(id, toIssueId, user);
        return ResponseEntity.status(201).body(toRelationDto(rel));
    }

    @Operation(summary = "Remove blocker", description = "Removes a blocker relation from the issue")
    @DeleteMapping("/api/issues/{id}/blockers/{targetId}")
    public ResponseEntity<?> removeBlocker(@PathVariable String id, @PathVariable String targetId) {
        if (issueRepository.findById(id).isEmpty()) return ResponseEntity.notFound().build();
        User user = CurrentUserHolder.get();
        relationService.removeBlocker(id, targetId, user);
        return ResponseEntity.noContent().build();
    }

    @Operation(summary = "List blockers", description = "Returns blocker issues with title and status")
    @GetMapping("/api/issues/{id}/blockers")
    public ResponseEntity<?> listBlockers(@PathVariable String id) {
        if (issueRepository.findById(id).isEmpty()) return ResponseEntity.notFound().build();
        List<IssueRelation> blockers = relationService.getBlockers(id);
        List<Map<String, Object>> result = blockers.stream()
                .map(rel -> {
                    Map<String, Object> dto = new LinkedHashMap<>();
                    dto.put("issueId", rel.getToIssueId());
                    Issue blocker = issueRepository.findById(rel.getToIssueId()).orElse(null);
                    dto.put("title", blocker != null ? blocker.getTitle() : "Unknown");
                    dto.put("status", blocker != null ? blocker.getStatus().name() : "Unknown");
                    return dto;
                })
                .collect(Collectors.toList());
        return ResponseEntity.ok(result);
    }

    // --- Highlights ---

    @Operation(summary = "Link existing issue as highlight", description = "Links an existing issue as a highlight relation")
    @PostMapping("/api/issues/{id}/highlights")
    public ResponseEntity<?> addHighlight(@PathVariable String id, @RequestBody Map<String, String> body) {
        if (issueRepository.findById(id).isEmpty()) return ResponseEntity.notFound().build();
        String toIssueId = body.get("toIssueId");
        if (toIssueId == null || toIssueId.isBlank()) {
            return ResponseEntity.badRequest().body(Map.of("error", "toIssueId is required"));
        }
        if (issueRepository.findById(toIssueId).isEmpty()) {
            return ResponseEntity.badRequest().body(Map.of("error", "Target issue not found: " + toIssueId));
        }
        User user = CurrentUserHolder.get();
        IssueRelation rel = relationService.addHighlight(id, toIssueId, user);
        return ResponseEntity.status(201).body(toRelationDto(rel));
    }

    @Operation(summary = "Create highlighted issue", description = "Creates a new issue and links it as a highlight")
    @PostMapping("/api/issues/{id}/highlights/create")
    public ResponseEntity<?> createHighlightedIssue(@PathVariable String id,
                                                     @RequestBody Map<String, String> body) {
        if (issueRepository.findById(id).isEmpty()) return ResponseEntity.notFound().build();
        String targetOperationId = body.get("targetOperationId");
        if (targetOperationId == null || targetOperationId.isBlank()) {
            return ResponseEntity.badRequest().body(Map.of("error", "targetOperationId is required"));
        }
        User user = CurrentUserHolder.get();
        try {
            Map<String, Object> result = relationService.createHighlightedIssue(id, targetOperationId, user);
            return ResponseEntity.status(201).body(result);
        } catch (IllegalArgumentException e) {
            return ResponseEntity.badRequest().body(Map.of("error", e.getMessage()));
        }
    }

    @Operation(summary = "Get highlight candidates", description = "Discovers issues on the same product route")
    @GetMapping("/api/issues/{id}/highlight-candidates")
    public ResponseEntity<?> listHighlightCandidates(@PathVariable String id) {
        if (issueRepository.findById(id).isEmpty()) return ResponseEntity.notFound().build();
        List<Map<String, Object>> candidates = relationService.listHighlightCandidates(id);
        return ResponseEntity.ok(candidates);
    }

    private Map<String, Object> toRelationDto(IssueRelation rel) {
        Map<String, Object> dto = new LinkedHashMap<>();
        dto.put("id", rel.getId());
        dto.put("fromIssueId", rel.getFromIssueId());
        dto.put("toIssueId", rel.getToIssueId());
        dto.put("type", rel.getType().name());
        dto.put("createdBy", rel.getCreatedBy());
        dto.put("createdAt", rel.getCreatedAt().toString());
        return dto;
    }
}
