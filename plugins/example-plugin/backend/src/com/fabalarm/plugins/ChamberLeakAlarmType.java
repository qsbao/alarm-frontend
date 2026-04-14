package com.fabalarm.plugins;

import com.fabalarm.alarm.AlarmTypeSpec;
import com.fabalarm.model.AlarmDetails;
import com.fabalarm.model.ValueUnit;

public class ChamberLeakAlarmType implements AlarmTypeSpec {
    public static final ChamberLeakAlarmType INSTANCE = new ChamberLeakAlarmType();

    @Override
    public String kind() {
        return "example-plugin:ChamberLeak";
    }

    @Override
    public Class<? extends AlarmDetails> detailsClass() {
        return ChamberLeakDetails.class;
    }

    @Override
    public ValueUnit project(AlarmDetails details) {
        ChamberLeakDetails cl = (ChamberLeakDetails) details;
        return new ValueUnit(cl.leakRate(), "sccm");
    }
}
