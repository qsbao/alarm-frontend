package com.fabalarm.workflow;

import org.springframework.beans.factory.annotation.Value;
import org.springframework.stereotype.Component;

import java.io.File;
import java.io.IOException;
import java.net.URL;
import java.net.URLClassLoader;
import java.nio.file.Files;
import java.nio.file.Path;
import java.nio.file.Paths;
import java.util.ArrayList;
import java.util.Enumeration;
import java.util.LinkedHashMap;
import java.util.List;
import java.util.Map;
import java.util.jar.JarEntry;
import java.util.jar.JarFile;

@Component
public class WorkflowRegistry {

    private final Map<String, WorkflowDefinition> definitions = new LinkedHashMap<>();

    public WorkflowRegistry(@Value("${plugins.directory:plugins}") String pluginsDirectory) {
        // Register built-in definitions
        register(GenericLinearDefinition.INSTANCE);
        register(SpcOocBranchingDefinition.INSTANCE);

        // Load plugin definitions
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
        Path backendDir = pluginDir.resolve("backend");
        if (!Files.exists(backendDir)) {
            return;
        }

        try {
            // Look for JAR files in backend directory (and subdirectories)
            Files.walk(backendDir)
                .filter(path -> path.toString().endsWith(".jar"))
                .forEach(this::loadDefinitionsFromJar);
        } catch (IOException e) {
            System.err.println("Warning: Failed to load plugin from " + pluginDir + ": " + e.getMessage());
        }
    }

    @SuppressWarnings("deprecation")
    private void loadDefinitionsFromJar(Path jarPath) {
        try {
            URL jarUrl = jarPath.toUri().toURL();
            URLClassLoader classLoader = new URLClassLoader(
                new URL[]{jarUrl},
                getClass().getClassLoader()
            );

            try (JarFile jarFile = new JarFile(jarPath.toFile())) {
                Enumeration<JarEntry> entries = jarFile.entries();
                while (entries.hasMoreElements()) {
                    JarEntry entry = entries.nextElement();
                    String entryName = entry.getName();
                    if (entryName.endsWith(".class")) {
                        String className = entryName.substring(0, entryName.length() - 6)
                            .replace('/', '.');
                        try {
                            Class<?> clazz = classLoader.loadClass(className);
                            // Look for public static final WorkflowDefinition INSTANCE field
                            try {
                                java.lang.reflect.Field instanceField = clazz.getField("INSTANCE");
                                if (WorkflowDefinition.class.isAssignableFrom(instanceField.getType())) {
                                    WorkflowDefinition def = (WorkflowDefinition) instanceField.get(null);
                                    register(def);
                                    System.out.println("Loaded workflow definition: " + def.getId());
                                }
                            } catch (NoSuchFieldException | IllegalAccessException e) {
                                // Skip - no INSTANCE field or not accessible
                            }
                        } catch (ClassNotFoundException | NoClassDefFoundError e) {
                            // Skip - class not found or dependency missing
                        }
                    }
                }
            }
        } catch (IOException e) {
            System.err.println("Warning: Failed to load JAR " + jarPath + ": " + e.getMessage());
        }
    }

    public WorkflowDefinition getDefinition(String id) {
        return definitions.get(id);
    }

    public List<WorkflowDefinition> getAllDefinitions() {
        return List.copyOf(definitions.values());
    }
}
