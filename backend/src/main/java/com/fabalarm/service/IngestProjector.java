package com.fabalarm.service;

import com.fabalarm.alarm.AlarmTypeRegistry;
import com.fabalarm.model.Alarm;
import com.fabalarm.model.AlarmDetails;
import com.fabalarm.model.ValueUnit;
import org.springframework.stereotype.Component;

import java.util.function.Function;

@Component
public class IngestProjector {

    private final AlarmTypeRegistry registry;

    public IngestProjector(AlarmTypeRegistry registry) {
        this.registry = registry;
    }

    public void projectValueAndUnit(Alarm alarm) {
        AlarmDetails details = alarm.getDetails();
        if (details == null || alarm.getType() == null) {
            return;
        }
        Function<AlarmDetails, ValueUnit> projector = registry.getProjector(alarm.getType());
        if (projector != null) {
            ValueUnit vu = projector.apply(details);
            alarm.setValue(vu.value());
            alarm.setUnit(vu.unit());
        }
    }
}
