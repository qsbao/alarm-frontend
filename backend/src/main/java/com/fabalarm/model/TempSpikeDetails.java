package com.fabalarm.model;

import java.time.Instant;

public record TempSpikeDetails(
    double currentTemp,
    double thresholdTemp,
    String sensorId,
    Instant spikeStartTime,
    int durationSeconds
) implements AlarmDetails {
}
