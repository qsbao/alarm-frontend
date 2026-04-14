package com.fabalarm.workflow;

import com.fasterxml.jackson.databind.JsonNode;
import com.fasterxml.jackson.databind.ObjectMapper;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.stereotype.Component;

import java.io.IOException;
import java.lang.reflect.Field;
import java.nio.file.Files;
import java.nio.file.Path;
import java.nio.file.Paths;
import java.util.LinkedHashMap;
import java.util.List;
import java.util.Map;

@Component
public class WorkflowRegistry {

    private static final ObjectMapper MAPPER = new ObjectMapper();

    private final Map<String, WorkflowDefinition> definitions = new LinkedHashMap<>();

    public WorkflowRegistry(@Value("${plugins.directory:plugins}") String pluginsDirectory) {
        register(GenericLinearDefinition.INSTANCE);
        register(SpcOocBranchingDefinition.INSTANCE);

        loadPluginDefinitions(pluginsDirectory);
    }

    private void register(WorkflowDefinition definition) {
        definitions.put(definition.getId(), definition);
    }

    private void loadPluginDefinitions(String pluginsDirectory) {
        Path pluginsPath = Paths.get(pluginsDirectory);
        if (!Files.exists(pluginsPath)) {
            return;
        }

        try {
            Files.list(pluginsPath)
                .filter(Files::isDirectory)
                .forEach(this::loadPluginFromDirectory);
        } catch (IOException e) {
            System.err.println("Warning: Failed to scan plugins directory: " + e.getMessage());
        }
    }

    private void loadPluginFromDirectory(Path pluginDir) {
        Path manifest = pluginDir.resolve("plugin.json");
        if (!Files.exists(manifest)) {
            return;
        }

        try {
            JsonNode root = MAPPER.readTree(manifest.toFile());
            JsonNode workflows = root.path("workflows");
            if (!workflows.isArray()) {
                return;
            }
            for (JsonNode workflow : workflows) {
                String backendClass = workflow.path("backendClass").asText(null);
                if (backendClass == null || backendClass.isEmpty()) {
                    continue;
                }
                registerFromClass(backendClass, pluginDir);
            }
        } catch (IOException e) {
            System.err.println("Warning: Failed to read plugin manifest " + manifest + ": " + e.getMessage());
        }
    }

    private void registerFromClass(String className, Path pluginDir) {
        try {
            Class<?> clazz = Class.forName(className);
            Field instanceField = clazz.getField("INSTANCE");
            if (!WorkflowDefinition.class.isAssignableFrom(instanceField.getType())) {
                System.err.println("Warning: " + className + ".INSTANCE is not a WorkflowDefinition");
                return;
            }
            WorkflowDefinition def = (WorkflowDefinition) instanceField.get(null);
            register(def);
            System.out.println("Loaded workflow definition " + def.getId() + " from plugin " + pluginDir.getFileName());
        } catch (ClassNotFoundException e) {
            System.err.println("Warning: Plugin class " + className + " not on classpath. "
                + "Ensure " + pluginDir.getFileName() + "/backend/src is registered as a source root in backend/pom.xml.");
        } catch (NoSuchFieldException | IllegalAccessException e) {
            System.err.println("Warning: Plugin class " + className + " missing public static INSTANCE field: " + e.getMessage());
        }
    }

    public WorkflowDefinition getDefinition(String id) {
        return definitions.get(id);
    }

    public List<WorkflowDefinition> getAllDefinitions() {
        return List.copyOf(definitions.values());
    }
}
