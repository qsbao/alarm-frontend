package com.fabalarm.alarm;

import com.fabalarm.model.AlarmDetails;
import com.fabalarm.model.ValueUnit;
import com.fasterxml.jackson.databind.ObjectMapper;
import com.fasterxml.jackson.databind.jsontype.NamedType;
import org.springframework.stereotype.Component;

import java.util.Collections;
import java.util.LinkedHashMap;
import java.util.Map;
import java.util.Set;
import java.util.function.Function;

@Component
public class AlarmTypeRegistry {

    private final Map<String, Function<AlarmDetails, ValueUnit>> projectors = new LinkedHashMap<>();
    private final ObjectMapper objectMapper;

    public AlarmTypeRegistry(ObjectMapper objectMapper) {
        this.objectMapper = objectMapper;
    }

    public void register(String kind, Class<? extends AlarmDetails> detailsClass,
                         Function<AlarmDetails, ValueUnit> projector) {
        if (projectors.containsKey(kind)) {
            throw new IllegalStateException("Duplicate alarm type registration: " + kind);
        }
        if (detailsClass != null) {
            objectMapper.registerSubtypes(new NamedType(detailsClass, kind));
        }
        projectors.put(kind, projector);
    }

    public Function<AlarmDetails, ValueUnit> getProjector(String kind) {
        return projectors.get(kind);
    }

    public Set<String> getRegisteredKinds() {
        return Collections.unmodifiableSet(projectors.keySet());
    }

    public boolean isRegistered(String kind) {
        return projectors.containsKey(kind);
    }
}
