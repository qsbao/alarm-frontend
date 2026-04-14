package com.fabalarm.alarm;

import com.fabalarm.model.AlarmTypes;
import com.fabalarm.model.SpcOocDetails;
import com.fabalarm.model.TempSpikeDetails;
import com.fabalarm.model.ValueUnit;
import jakarta.annotation.PostConstruct;
import org.springframework.stereotype.Component;

@Component
public class BuiltinAlarmTypeRegistrar {

    private final AlarmTypeRegistry registry;

    public BuiltinAlarmTypeRegistrar(AlarmTypeRegistry registry) {
        this.registry = registry;
    }

    @PostConstruct
    public void registerBuiltins() {
        registry.register(AlarmTypes.SPC_OOC, SpcOocDetails.class, details -> {
            SpcOocDetails spc = (SpcOocDetails) details;
            if (spc.waferCount() > 0) {
                double value = (double) spc.oocCount() / spc.waferCount() * 100;
                return new ValueUnit(value, "%");
            }
            return new ValueUnit(null, null);
        });

        registry.register(AlarmTypes.TEMP_SPIKE, TempSpikeDetails.class, details -> {
            TempSpikeDetails ts = (TempSpikeDetails) details;
            double delta = ts.currentTemp() - ts.thresholdTemp();
            return new ValueUnit(delta, "°C");
        });

        registry.register(AlarmTypes.CHAMBER_LEAK, null, details -> new ValueUnit(null, null));
    }
}
