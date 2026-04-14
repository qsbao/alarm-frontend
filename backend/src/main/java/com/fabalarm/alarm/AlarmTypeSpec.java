package com.fabalarm.alarm;

import com.fabalarm.model.AlarmDetails;
import com.fabalarm.model.ValueUnit;

public interface AlarmTypeSpec {
    String kind();
    Class<? extends AlarmDetails> detailsClass();
    ValueUnit project(AlarmDetails details);
}
