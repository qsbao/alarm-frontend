package com.fabalarm.workflow;

import org.springframework.stereotype.Component;

import java.util.LinkedHashMap;
import java.util.List;
import java.util.Map;

@Component
public class WorkflowRegistry {

    private final Map<String, WorkflowDefinition> definitions = new LinkedHashMap<>();

    public WorkflowRegistry() {
        register(GenericLinearDefinition.INSTANCE);
        register(SpcOocBranchingDefinition.INSTANCE);
    }

    private void register(WorkflowDefinition definition) {
        definitions.put(definition.getId(), definition);
    }

    public WorkflowDefinition getDefinition(String id) {
        return definitions.get(id);
    }

    public List<WorkflowDefinition> getAllDefinitions() {
        return List.copyOf(definitions.values());
    }
}
