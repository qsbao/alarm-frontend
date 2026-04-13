package com.fabalarm.model;

import java.time.Instant;

public record SpcOocDetails(
    String chartName,
    String chartNo,
    ChartLevel chartLevel,
    String holdCode,
    Instant txDatetime,
    int waferCount,
    int oocCount
) implements AlarmDetails {
}
