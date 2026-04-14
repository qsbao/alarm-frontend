package com.fabalarm.plugins;

import com.fabalarm.alarm.AlarmTypeSpec;
import com.fabalarm.model.AlarmDetails;
import com.fabalarm.model.ValueUnit;

public class TempSpikeAlarmType implements AlarmTypeSpec {
    public static final TempSpikeAlarmType INSTANCE = new TempSpikeAlarmType();

    @Override
    public String kind() {
        return "example-plugin:TempSpike";
    }

    @Override
    public Class<? extends AlarmDetails> detailsClass() {
        return TempSpikeDetails.class;
    }

    @Override
    public ValueUnit project(AlarmDetails details) {
        TempSpikeDetails ts = (TempSpikeDetails) details;
        double delta = ts.currentTemp() - ts.thresholdTemp();
        return new ValueUnit(delta, "°C");
    }
}
