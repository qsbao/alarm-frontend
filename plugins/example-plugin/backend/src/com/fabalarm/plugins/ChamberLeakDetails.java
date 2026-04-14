package com.fabalarm.plugins;

import com.fabalarm.model.AlarmDetails;

public record ChamberLeakDetails(
    double leakRate,
    double threshold,
    String chamberId,
    String testMethod
) implements AlarmDetails {
}
