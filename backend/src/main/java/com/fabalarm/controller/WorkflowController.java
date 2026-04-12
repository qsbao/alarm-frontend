package com.fabalarm.controller;

import com.fabalarm.auth.CurrentUserHolder;
import com.fabalarm.model.User;
import com.fabalarm.service.WorkflowEngine;
import com.fabalarm.workflow.WorkflowDefinition;
import com.fabalarm.workflow.WorkflowRegistry;
import com.fabalarm.workflow.PayloadFieldSchema;
import com.fabalarm.workflow.StepDefinition;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.util.*;

@RestController
@RequestMapping("/api")
public class WorkflowController {

    private final WorkflowEngine engine;
    private final WorkflowRegistry registry;

    public WorkflowController(WorkflowEngine engine, WorkflowRegistry registry) {
        this.engine = engine;
        this.registry = registry;
    }

    @PostMapping("/issues/{id}/workflow")
    public ResponseEntity<?> attachWorkflow(@PathVariable String id,
                                            @RequestBody Map<String, String> body) {
        User user = CurrentUserHolder.get();
        String definitionId = body.get("definitionId");
        if (definitionId == null) {
            return ResponseEntity.badRequest().body(Map.of("error", "definitionId is required"));
        }
        try {
            Map<String, Object> result = engine.attachWorkflow(id, definitionId, user);
            return ResponseEntity.status(HttpStatus.CREATED).body(result);
        } catch (IllegalArgumentException e) {
            return ResponseEntity.badRequest().body(Map.of("error", e.getMessage()));
        } catch (IllegalStateException e) {
            return ResponseEntity.status(HttpStatus.CONFLICT).body(Map.of("error", e.getMessage()));
        }
    }

    @GetMapping("/issues/{id}/workflow")
    public ResponseEntity<?> getWorkflow(@PathVariable String id) {
        Map<String, Object> result = engine.getWorkflow(id);
        if (result == null) {
            return ResponseEntity.notFound().build();
        }
        return ResponseEntity.ok(result);
    }

    @PostMapping("/issues/{id}/workflow/steps/{stepId}/complete")
    public ResponseEntity<?> completeStep(@PathVariable String id,
                                          @PathVariable String stepId,
                                          @RequestBody(required = false) Map<String, Object> body) {
        User user = CurrentUserHolder.get();
        Map<String, Object> payload = body != null ? body : Map.of();
        try {
            Map<String, Object> result = engine.completeStep(id, stepId, user, payload);
            return ResponseEntity.ok(result);
        } catch (IllegalArgumentException e) {
            return ResponseEntity.badRequest().body(Map.of("error", e.getMessage()));
        } catch (IllegalStateException e) {
            return ResponseEntity.status(HttpStatus.CONFLICT).body(Map.of("error", e.getMessage()));
        } catch (SecurityException e) {
            return ResponseEntity.status(HttpStatus.FORBIDDEN).body(Map.of("error", e.getMessage()));
        }
    }

    @PostMapping("/issues/{id}/workflow/steps/{stepId}/skip")
    public ResponseEntity<?> skipStep(@PathVariable String id,
                                      @PathVariable String stepId) {
        User user = CurrentUserHolder.get();
        try {
            Map<String, Object> result = engine.skipStep(id, stepId, user);
            return ResponseEntity.ok(result);
        } catch (IllegalArgumentException e) {
            return ResponseEntity.badRequest().body(Map.of("error", e.getMessage()));
        } catch (IllegalStateException e) {
            return ResponseEntity.status(HttpStatus.CONFLICT).body(Map.of("error", e.getMessage()));
        }
    }

    @PostMapping("/issues/{id}/workflow/steps/{stepId}/revive")
    public ResponseEntity<?> reviveStep(@PathVariable String id,
                                        @PathVariable String stepId) {
        User user = CurrentUserHolder.get();
        try {
            Map<String, Object> result = engine.reviveStep(id, stepId, user);
            return ResponseEntity.ok(result);
        } catch (IllegalArgumentException e) {
            return ResponseEntity.badRequest().body(Map.of("error", e.getMessage()));
        } catch (IllegalStateException e) {
            return ResponseEntity.status(HttpStatus.CONFLICT).body(Map.of("error", e.getMessage()));
        }
    }

    @PostMapping("/issues/{id}/workflow/steps/{stepId}/edit")
    public ResponseEntity<?> editStep(@PathVariable String id,
                                      @PathVariable String stepId,
                                      @RequestBody(required = false) Map<String, Object> body) {
        User user = CurrentUserHolder.get();
        Map<String, Object> payload = body != null ? body : Map.of();
        try {
            Map<String, Object> result = engine.editStep(id, stepId, user, payload);
            return ResponseEntity.ok(result);
        } catch (IllegalArgumentException e) {
            return ResponseEntity.badRequest().body(Map.of("error", e.getMessage()));
        } catch (IllegalStateException e) {
            return ResponseEntity.status(HttpStatus.CONFLICT).body(Map.of("error", e.getMessage()));
        } catch (SecurityException e) {
            return ResponseEntity.status(HttpStatus.FORBIDDEN).body(Map.of("error", e.getMessage()));
        }
    }

    @GetMapping("/workflow-definitions")
    public ResponseEntity<List<Map<String, Object>>> listDefinitions() {
        List<Map<String, Object>> result = new ArrayList<>();
        for (WorkflowDefinition def : registry.getAllDefinitions()) {
            Map<String, Object> dto = new LinkedHashMap<>();
            dto.put("id", def.getId());
            dto.put("name", def.getName());
            dto.put("version", def.getVersion());

            List<Map<String, Object>> steps = new ArrayList<>();
            for (StepDefinition step : def.getSteps()) {
                Map<String, Object> stepDto = new LinkedHashMap<>();
                stepDto.put("id", step.getId());
                stepDto.put("label", step.getLabel());
                stepDto.put("order", step.getOrder());
                stepDto.put("preSteps", step.getPreSteps());
                stepDto.put("hasGate", step.getGate() != null);
                stepDto.put("skippable", step.getSkippableIf() != null);
                if (step.getImpliesStatus() != null) {
                    stepDto.put("impliesStatus", step.getImpliesStatus().name());
                }
                if (step.getPayloadSchema() != null) {
                    Map<String, Object> schema = new LinkedHashMap<>();
                    for (Map.Entry<String, PayloadFieldSchema> e : step.getPayloadSchema().entrySet()) {
                        Map<String, Object> fieldDto = new LinkedHashMap<>();
                        fieldDto.put("kind", e.getValue().getKind());
                        fieldDto.put("label", e.getValue().getLabel());
                        fieldDto.put("required", e.getValue().isRequired());
                        if (e.getValue().getOptions() != null) {
                            fieldDto.put("options", e.getValue().getOptions());
                        }
                        if (e.getValue().getMinLength() != null) {
                            fieldDto.put("minLength", e.getValue().getMinLength());
                        }
                        schema.put(e.getKey(), fieldDto);
                    }
                    stepDto.put("payloadSchema", schema);
                }
                steps.add(stepDto);
            }
            dto.put("steps", steps);
            result.add(dto);
        }
        return ResponseEntity.ok(result);
    }
}
