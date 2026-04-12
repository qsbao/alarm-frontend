package com.fabalarm.workflow;

import java.util.List;

public class WorkflowDefinition {

    private final String id;
    private final String name;
    private final String version;
    private final List<StepDefinition> steps;

    public WorkflowDefinition(String id, String name, String version, List<StepDefinition> steps) {
        this.id = id;
        this.name = name;
        this.version = version;
        this.steps = List.copyOf(steps);
    }

    public String getId() { return id; }
    public String getName() { return name; }
    public String getVersion() { return version; }
    public List<StepDefinition> getSteps() { return steps; }

    public StepDefinition findStep(String stepId) {
        return steps.stream()
                .filter(s -> s.getId().equals(stepId))
                .findFirst()
                .orElse(null);
    }
}
