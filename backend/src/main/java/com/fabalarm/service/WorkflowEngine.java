package com.fabalarm.service;

import com.fabalarm.model.*;
import com.fabalarm.repository.*;
import com.fabalarm.workflow.*;
import com.fasterxml.jackson.core.JsonProcessingException;
import com.fasterxml.jackson.core.type.TypeReference;
import com.fasterxml.jackson.databind.ObjectMapper;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.time.Instant;
import java.util.*;
import java.util.stream.Collectors;

@Service
public class WorkflowEngine {

    private final WorkflowRegistry registry;
    private final WorkflowInstanceRepository instanceRepository;
    private final WorkflowStepRepository stepRepository;
    private final IssueRepository issueRepository;
    private final IssueActivityRepository activityRepository;
    private final IssueRelationRepository relationRepository;
    private final ObjectMapper objectMapper;

    public WorkflowEngine(WorkflowRegistry registry,
                          WorkflowInstanceRepository instanceRepository,
                          WorkflowStepRepository stepRepository,
                          IssueRepository issueRepository,
                          IssueActivityRepository activityRepository,
                          IssueRelationRepository relationRepository,
                          ObjectMapper objectMapper) {
        this.registry = registry;
        this.instanceRepository = instanceRepository;
        this.stepRepository = stepRepository;
        this.issueRepository = issueRepository;
        this.activityRepository = activityRepository;
        this.relationRepository = relationRepository;
        this.objectMapper = objectMapper;
    }

    @Transactional
    public Map<String, Object> attachWorkflow(String issueId, String definitionId, User user) {
        Issue issue = issueRepository.findById(issueId)
                .orElseThrow(() -> new IllegalArgumentException("Issue not found: " + issueId));

        WorkflowDefinition definition = registry.getDefinition(definitionId);
        if (definition == null) {
            throw new IllegalArgumentException("Unknown workflow definition: " + definitionId);
        }

        Optional<WorkflowInstance> existing = instanceRepository.findByIssueId(issueId);
        if (existing.isPresent()) {
            throw new IllegalStateException("Issue already has a workflow attached");
        }

        // Create instance
        WorkflowInstance instance = new WorkflowInstance();
        instance.setIssueId(issueId);
        instance.setDefinitionId(definitionId);
        instance.setStatus(WorkflowStatus.Active);
        instanceRepository.save(instance);

        // Create all steps as pending
        for (StepDefinition stepDef : definition.getSteps()) {
            WorkflowStep step = new WorkflowStep();
            step.setInstanceId(instance.getId());
            step.setStepId(stepDef.getId());
            step.setStatus(StepStatus.pending);
            stepRepository.save(step);
        }

        // Activate root steps
        activateSteps(instance.getId(), definition, issue);

        // Derive issue status
        IssueStatus derived = deriveStatus(instance.getId(), definition);
        if (derived != null) {
            issue.setStatus(derived);
            issueRepository.save(issue);
        }

        // Log activity
        logWorkflowActivity(issueId, user, definitionId,
                definition.getSteps().get(0).getId(), "attach");

        return buildWorkflowResponse(instance.getId(), definition);
    }

    @Transactional
    public Map<String, Object> completeStep(String issueId, String stepId, User user,
                                            Map<String, Object> payload) {
        Issue issue = issueRepository.findById(issueId)
                .orElseThrow(() -> new IllegalArgumentException("Issue not found: " + issueId));
        WorkflowInstance instance = instanceRepository.findByIssueId(issueId)
                .orElseThrow(() -> new IllegalStateException("Issue has no workflow"));

        if (instance.getStatus() == WorkflowStatus.Completed) {
            throw new IllegalStateException("Workflow is already completed");
        }

        WorkflowDefinition definition = registry.getDefinition(instance.getDefinitionId());
        StepDefinition stepDef = definition.findStep(stepId);
        if (stepDef == null) {
            throw new IllegalArgumentException("Step not found: " + stepId);
        }

        WorkflowStep step = stepRepository.findByInstanceIdAndStepId(instance.getId(), stepId)
                .orElseThrow(() -> new IllegalArgumentException("Step not found: " + stepId));

        if (step.getStatus() != StepStatus.ongoing) {
            throw new IllegalStateException(
                    "Step " + stepId + " is not ongoing (current status: " + step.getStatus() + ")");
        }

        // Permission gate
        if (stepDef.getGate() != null && !stepDef.getGate().test(user.getId(), issue)) {
            throw new SecurityException(
                    "User " + user.getId() + " does not pass gate for step " + stepId);
        }

        // Blocker gate: resolved step cannot complete while unresolved blockers exist
        if ("resolved".equals(stepId)) {
            checkBlockerGate(issueId);
        }

        // Payload validation
        if (stepDef.getPayloadSchema() != null && payload != null) {
            String error = validatePayload(payload, stepDef.getPayloadSchema());
            if (error != null) {
                throw new IllegalArgumentException(error);
            }
        }

        // Transition step
        Instant now = Instant.now();
        step.setStatus(StepStatus.completed);
        step.setCompletedAt(now);
        step.setActorId(user.getId());
        if (payload != null && !payload.isEmpty()) {
            step.setPayload(serializePayload(payload));
        }
        stepRepository.save(step);

        // Activate downstream steps
        activateSteps(instance.getId(), definition, issue);

        // Check terminal
        if (isTerminal(instance.getId())) {
            instance.setStatus(WorkflowStatus.Completed);
            instance.setCompletedAt(now);
            instanceRepository.save(instance);
        }

        // Derive issue status
        IssueStatus derived = deriveStatus(instance.getId(), definition);
        if (derived != null) {
            issue.setStatus(derived);
            issueRepository.save(issue);
        }

        // Log activity
        logWorkflowActivity(issueId, user, instance.getDefinitionId(), stepId, "complete");

        return buildWorkflowResponse(instance.getId(), definition);
    }

    @Transactional
    public Map<String, Object> skipStep(String issueId, String stepId, User user) {
        Issue issue = issueRepository.findById(issueId)
                .orElseThrow(() -> new IllegalArgumentException("Issue not found: " + issueId));
        WorkflowInstance instance = instanceRepository.findByIssueId(issueId)
                .orElseThrow(() -> new IllegalStateException("Issue has no workflow"));

        if (instance.getStatus() == WorkflowStatus.Completed) {
            throw new IllegalStateException("Workflow is already completed");
        }

        WorkflowDefinition definition = registry.getDefinition(instance.getDefinitionId());
        StepDefinition stepDef = definition.findStep(stepId);
        if (stepDef == null) {
            throw new IllegalArgumentException("Step not found: " + stepId);
        }

        WorkflowStep step = stepRepository.findByInstanceIdAndStepId(instance.getId(), stepId)
                .orElseThrow(() -> new IllegalArgumentException("Step not found: " + stepId));

        if (step.getStatus() != StepStatus.ongoing) {
            throw new IllegalStateException(
                    "Step " + stepId + " is not ongoing (current status: " + step.getStatus() + ")");
        }

        if (stepDef.getSkippableIf() == null) {
            throw new IllegalStateException("Step " + stepId + " is not skippable");
        }

        if (!stepDef.getSkippableIf().test(issue)) {
            throw new IllegalStateException("Step " + stepId + " cannot be skipped for this issue");
        }

        // Transition
        Instant now = Instant.now();
        step.setStatus(StepStatus.skipped);
        step.setSkippedAt(now);
        step.setActorId(user.getId());
        stepRepository.save(step);

        // Activate downstream steps
        activateSteps(instance.getId(), definition, issue);

        // Check terminal
        if (isTerminal(instance.getId())) {
            instance.setStatus(WorkflowStatus.Completed);
            instance.setCompletedAt(now);
            instanceRepository.save(instance);
        }

        // Derive issue status
        IssueStatus derived = deriveStatus(instance.getId(), definition);
        if (derived != null) {
            issue.setStatus(derived);
            issueRepository.save(issue);
        }

        // Log activity
        logWorkflowActivity(issueId, user, instance.getDefinitionId(), stepId, "skip");

        return buildWorkflowResponse(instance.getId(), definition);
    }

    @Transactional
    public Map<String, Object> reviveStep(String issueId, String stepId, User user) {
        Issue issue = issueRepository.findById(issueId)
                .orElseThrow(() -> new IllegalArgumentException("Issue not found: " + issueId));
        WorkflowInstance instance = instanceRepository.findByIssueId(issueId)
                .orElseThrow(() -> new IllegalStateException("Issue has no workflow"));

        if (instance.getStatus() == WorkflowStatus.Completed) {
            throw new IllegalStateException("Workflow is already completed");
        }

        WorkflowDefinition definition = registry.getDefinition(instance.getDefinitionId());
        StepDefinition stepDef = definition.findStep(stepId);
        if (stepDef == null) {
            throw new IllegalArgumentException("Step not found: " + stepId);
        }

        WorkflowStep step = stepRepository.findByInstanceIdAndStepId(instance.getId(), stepId)
                .orElseThrow(() -> new IllegalArgumentException("Step not found: " + stepId));

        if (step.getStatus() != StepStatus.skipped) {
            throw new IllegalStateException(
                    "Step " + stepId + " is not skipped (current status: " + step.getStatus() + ")");
        }

        // Disallow revive once resolved has completed
        WorkflowStep resolvedStep = stepRepository.findByInstanceIdAndStepId(instance.getId(), "resolved")
                .orElse(null);
        if (resolvedStep != null && resolvedStep.getStatus() == StepStatus.completed) {
            throw new IllegalStateException("Cannot revive after resolved has completed");
        }

        // Transition back to ongoing
        step.setStatus(StepStatus.ongoing);
        step.setSkippedAt(null);
        step.setActorId(null);
        stepRepository.save(step);

        // Derive issue status
        IssueStatus derived = deriveStatus(instance.getId(), definition);
        if (derived != null) {
            issue.setStatus(derived);
            issueRepository.save(issue);
        }

        // Log activity
        logWorkflowActivity(issueId, user, instance.getDefinitionId(), stepId, "revive");

        return buildWorkflowResponse(instance.getId(), definition);
    }

    @Transactional
    public Map<String, Object> editStep(String issueId, String stepId, User user,
                                        Map<String, Object> payload) {
        Issue issue = issueRepository.findById(issueId)
                .orElseThrow(() -> new IllegalArgumentException("Issue not found: " + issueId));
        WorkflowInstance instance = instanceRepository.findByIssueId(issueId)
                .orElseThrow(() -> new IllegalStateException("Issue has no workflow"));

        WorkflowDefinition definition = registry.getDefinition(instance.getDefinitionId());
        StepDefinition stepDef = definition.findStep(stepId);
        if (stepDef == null) {
            throw new IllegalArgumentException("Step not found: " + stepId);
        }

        WorkflowStep step = stepRepository.findByInstanceIdAndStepId(instance.getId(), stepId)
                .orElseThrow(() -> new IllegalArgumentException("Step not found: " + stepId));

        if (step.getStatus() != StepStatus.completed) {
            throw new IllegalStateException(
                    "Step " + stepId + " is not completed (current status: " + step.getStatus() + ")");
        }

        // Gate check against current actor
        if (stepDef.getGate() != null && !stepDef.getGate().test(user.getId(), issue)) {
            throw new SecurityException(
                    "User " + user.getId() + " does not pass gate for step " + stepId);
        }

        // Payload validation
        if (stepDef.getPayloadSchema() != null && payload != null) {
            String error = validatePayload(payload, stepDef.getPayloadSchema());
            if (error != null) {
                throw new IllegalArgumentException(error);
            }
        }

        // Update payload only
        if (payload != null) {
            step.setPayload(serializePayload(payload));
        }
        stepRepository.save(step);

        // Log activity
        logWorkflowActivity(issueId, user, instance.getDefinitionId(), stepId, "edit");

        return buildWorkflowResponse(instance.getId(), definition);
    }

    public Map<String, Object> getWorkflow(String issueId) {
        WorkflowInstance instance = instanceRepository.findByIssueId(issueId).orElse(null);
        if (instance == null) return null;

        WorkflowDefinition definition = registry.getDefinition(instance.getDefinitionId());
        return buildWorkflowResponse(instance.getId(), definition);
    }

    // --- Internal helpers ---

    private void activateSteps(Long instanceId, WorkflowDefinition definition, Issue issue) {
        List<WorkflowStep> steps = stepRepository.findByInstanceId(instanceId);
        Map<String, WorkflowStep> stepMap = steps.stream()
                .collect(Collectors.toMap(WorkflowStep::getStepId, s -> s));

        boolean changed = true;
        while (changed) {
            changed = false;
            for (StepDefinition stepDef : definition.getSteps()) {
                WorkflowStep step = stepMap.get(stepDef.getId());
                if (step == null || step.getStatus() != StepStatus.pending) continue;

                boolean allPreDone = stepDef.getPreSteps().stream().allMatch(preId -> {
                    WorkflowStep pre = stepMap.get(preId);
                    return pre != null && (pre.getStatus() == StepStatus.completed
                            || pre.getStatus() == StepStatus.skipped);
                });

                if (allPreDone) {
                    if (stepDef.getDefaultSkipIf() != null && stepDef.getDefaultSkipIf().test(issue)) {
                        step.setStatus(StepStatus.skipped);
                        step.setSkippedAt(Instant.now());
                        step.setActorId("system");
                    } else {
                        step.setStatus(StepStatus.ongoing);
                    }
                    stepRepository.save(step);
                    changed = true;
                }
            }
        }
    }

    private IssueStatus deriveStatus(Long instanceId, WorkflowDefinition definition) {
        List<WorkflowStep> steps = stepRepository.findByInstanceId(instanceId);
        Map<String, WorkflowStep> stepMap = steps.stream()
                .collect(Collectors.toMap(WorkflowStep::getStepId, s -> s));

        StepDefinition bestStep = null;
        for (StepDefinition stepDef : definition.getSteps()) {
            if (stepDef.getImpliesStatus() == null) continue;
            WorkflowStep step = stepMap.get(stepDef.getId());
            if (step == null || step.getStatus() != StepStatus.completed) continue;
            if (bestStep == null || stepDef.getOrder() > bestStep.getOrder()) {
                bestStep = stepDef;
            }
        }
        return bestStep != null ? bestStep.getImpliesStatus() : null;
    }

    private boolean isTerminal(Long instanceId) {
        List<WorkflowStep> steps = stepRepository.findByInstanceId(instanceId);
        return steps.stream().allMatch(s ->
                s.getStatus() == StepStatus.completed || s.getStatus() == StepStatus.skipped);
    }

    private void checkBlockerGate(String issueId) {
        List<IssueRelation> blockers = relationRepository
                .findByFromIssueIdAndType(issueId, IssueRelationType.BLOCKER);
        for (IssueRelation blocker : blockers) {
            Issue blockerIssue = issueRepository.findById(blocker.getToIssueId()).orElse(null);
            if (blockerIssue != null) {
                IssueStatus status = blockerIssue.getStatus();
                if (status != IssueStatus.Resolved && status != IssueStatus.Closed) {
                    throw new IllegalStateException(
                            "Cannot complete resolved: issue has unresolved blockers");
                }
            }
        }
    }

    private String validatePayload(Map<String, Object> payload,
                                   Map<String, PayloadFieldSchema> schema) {
        for (Map.Entry<String, PayloadFieldSchema> entry : schema.entrySet()) {
            String fieldName = entry.getKey();
            PayloadFieldSchema fieldSchema = entry.getValue();
            Object value = payload.get(fieldName);

            if (fieldSchema.isRequired()) {
                if (value == null || "".equals(value)) {
                    return "Missing required field: " + fieldName;
                }
            }

            if (value == null || "".equals(value)) continue;

            if ("enum".equals(fieldSchema.getKind()) && fieldSchema.getOptions() != null) {
                if (!fieldSchema.getOptions().contains(value.toString())) {
                    return "Invalid value for " + fieldName + ": " + value
                            + ". Expected one of: " + String.join(", ", fieldSchema.getOptions());
                }
            }

            if ("text".equals(fieldSchema.getKind()) && fieldSchema.getMinLength() != null) {
                if (!(value instanceof String) || ((String) value).length() < fieldSchema.getMinLength()) {
                    return "Field " + fieldName + " must be at least "
                            + fieldSchema.getMinLength() + " character(s)";
                }
            }
        }
        return null;
    }

    private void logWorkflowActivity(String issueId, User user,
                                     String definitionId, String stepId, String action) {
        IssueActivity activity = new IssueActivity();
        activity.setIssueId(issueId);
        activity.setType(IssueActivityType.workflow_transition);
        activity.setTimestamp(Instant.now());
        activity.setAuthor(user.getName());
        activity.setWorkflowDefinitionId(definitionId);
        activity.setWorkflowStepId(stepId);
        activity.setWorkflowAction(action);
        activity.setWorkflowActorId(user.getId());
        activityRepository.save(activity);
    }

    Map<String, Object> buildWorkflowResponse(Long instanceId, WorkflowDefinition definition) {
        WorkflowInstance instance = instanceRepository.findById(instanceId).orElse(null);
        if (instance == null) return null;

        List<WorkflowStep> steps = stepRepository.findByInstanceId(instanceId);
        Map<String, WorkflowStep> stepMap = steps.stream()
                .collect(Collectors.toMap(WorkflowStep::getStepId, s -> s));

        // Build stepStates map matching frontend shape
        Map<String, Object> stepStates = new LinkedHashMap<>();
        for (StepDefinition stepDef : definition.getSteps()) {
            WorkflowStep step = stepMap.get(stepDef.getId());
            if (step == null) continue;

            Map<String, Object> state = new LinkedHashMap<>();
            state.put("status", step.getStatus().name());
            if (step.getPayload() != null) {
                state.put("payload", deserializePayload(step.getPayload()));
            }
            if (step.getCompletedAt() != null) {
                state.put("completedAt", step.getCompletedAt().toString());
                state.put("completedBy", step.getActorId());
            }
            if (step.getSkippedAt() != null) {
                state.put("skippedAt", step.getSkippedAt().toString());
                state.put("skippedBy", step.getActorId());
            }
            stepStates.put(stepDef.getId(), state);
        }

        Map<String, Object> result = new LinkedHashMap<>();
        result.put("definitionId", instance.getDefinitionId());
        result.put("stepStates", stepStates);
        result.put("actors", List.of()); // no required roles in current definitions
        if (instance.getCompletedAt() != null) {
            result.put("completedAt", instance.getCompletedAt().toString());
        }
        return result;
    }

    private String serializePayload(Map<String, Object> payload) {
        try {
            return objectMapper.writeValueAsString(payload);
        } catch (JsonProcessingException e) {
            throw new IllegalArgumentException("Cannot serialize payload", e);
        }
    }

    private Map<String, Object> deserializePayload(String json) {
        try {
            return objectMapper.readValue(json, new TypeReference<Map<String, Object>>() {});
        } catch (JsonProcessingException e) {
            return Map.of();
        }
    }
}
