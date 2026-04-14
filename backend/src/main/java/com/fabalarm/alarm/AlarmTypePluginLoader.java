package com.fabalarm.alarm;

import com.fasterxml.jackson.databind.JsonNode;
import com.fasterxml.jackson.databind.ObjectMapper;
import jakarta.annotation.PostConstruct;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.stereotype.Component;

import java.io.IOException;
import java.lang.reflect.Field;
import java.nio.file.Files;
import java.nio.file.Path;
import java.nio.file.Paths;

@Component
public class AlarmTypePluginLoader {

    private static final ObjectMapper MAPPER = new ObjectMapper();

    private final AlarmTypeRegistry registry;
    private final String pluginsDirectory;

    public AlarmTypePluginLoader(AlarmTypeRegistry registry,
                                 @Value("${plugins.directory:plugins}") String pluginsDirectory) {
        this.registry = registry;
        this.pluginsDirectory = pluginsDirectory;
    }

    @PostConstruct
    public void loadPluginAlarmTypes() {
        Path pluginsPath = Paths.get(pluginsDirectory);
        if (!Files.exists(pluginsPath)) {
            return;
        }

        try {
            Files.list(pluginsPath)
                .filter(Files::isDirectory)
                .forEach(this::loadFromPlugin);
        } catch (IOException e) {
            System.err.println("Warning: Failed to scan plugins directory for alarm types: " + e.getMessage());
        }
    }

    private void loadFromPlugin(Path pluginDir) {
        Path manifest = pluginDir.resolve("plugin.json");
        if (!Files.exists(manifest)) {
            return;
        }

        try {
            JsonNode root = MAPPER.readTree(manifest.toFile());
            JsonNode alarmTypes = root.path("alarmTypes");
            if (!alarmTypes.isArray()) {
                return;
            }
            for (JsonNode entry : alarmTypes) {
                String backendClass = entry.path("backendClass").asText(null);
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
            if (!AlarmTypeSpec.class.isAssignableFrom(instanceField.getType())) {
                System.err.println("Warning: " + className + ".INSTANCE is not an AlarmTypeSpec");
                return;
            }
            AlarmTypeSpec spec = (AlarmTypeSpec) instanceField.get(null);
            registry.register(spec.kind(), spec.detailsClass(), spec::project);
            System.out.println("Loaded alarm type " + spec.kind() + " from plugin " + pluginDir.getFileName());
        } catch (ClassNotFoundException e) {
            System.err.println("Warning: Plugin alarm type class " + className + " not on classpath. "
                + "Ensure " + pluginDir.getFileName() + "/backend/src is registered as a source root in backend/pom.xml.");
        } catch (NoSuchFieldException | IllegalAccessException e) {
            System.err.println("Warning: Plugin alarm type class " + className + " missing public static INSTANCE field: " + e.getMessage());
        }
    }
}
