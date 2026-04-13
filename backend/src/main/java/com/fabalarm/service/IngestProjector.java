package com.fabalarm.service;

import com.fabalarm.model.Alarm;
import com.fabalarm.model.AlarmDetails;
import com.fabalarm.model.SpcOocDetails;
import org.springframework.stereotype.Component;

@Component
public class IngestProjector {

    public void projectValueAndUnit(Alarm alarm) {
        AlarmDetails details = alarm.getDetails();
        if (details instanceof SpcOocDetails spcOoc) {
            if (spcOoc.waferCount() > 0) {
                double value = (double) spcOoc.oocCount() / spcOoc.waferCount() * 100;
                alarm.setValue(value);
                alarm.setUnit("%");
            } else {
                alarm.setValue(null);
                alarm.setUnit(null);
            }
        }
    }
}
