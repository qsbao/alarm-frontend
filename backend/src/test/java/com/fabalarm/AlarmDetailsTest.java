package com.fabalarm;

import com.fasterxml.jackson.databind.ObjectMapper;
import com.fabalarm.model.*;
import com.fabalarm.service.IngestProjector;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.context.SpringBootTest;

import java.time.Instant;

import static org.junit.jupiter.api.Assertions.*;

@SpringBootTest
class AlarmDetailsTest {

    @Autowired
    private ObjectMapper objectMapper;

    @Autowired
    private IngestProjector ingestProjector;

    @Test
    void testSpcOocDetailsJsonRoundTrip() throws Exception {
        SpcOocDetails original = new SpcOocDetails(
                "Etch Rate",
                "CH-001",
                ChartLevel.KIP,
                "HOLD-123",
                Instant.parse("2026-04-13T10:00:00Z"),
                25,
                3
        );

        String json = objectMapper.writeValueAsString(original);
        assertTrue(json.contains("\"kind\":\"spc_ooc\""));

        AlarmDetails deserialized = objectMapper.readValue(json, AlarmDetails.class);
        assertInstanceOf(SpcOocDetails.class, deserialized);
        SpcOocDetails spcOoc = (SpcOocDetails) deserialized;
        assertEquals(original.chartName(), spcOoc.chartName());
        assertEquals(original.chartNo(), spcOoc.chartNo());
        assertEquals(original.chartLevel(), spcOoc.chartLevel());
        assertEquals(original.holdCode(), spcOoc.holdCode());
        assertEquals(original.txDatetime(), spcOoc.txDatetime());
        assertEquals(original.waferCount(), spcOoc.waferCount());
        assertEquals(original.oocCount(), spcOoc.oocCount());
    }

    @Test
    void testIngestProjectorSpcOoc() {
        Alarm alarm = new Alarm();
        alarm.setDetails(new SpcOocDetails(
                "Etch Rate",
                "CH-001",
                ChartLevel.KIP,
                "HOLD-123",
                Instant.parse("2026-04-13T10:00:00Z"),
                25,
                3
        ));

        // Try to set value/unit manually - projector should override
        alarm.setValue(999.0);
        alarm.setUnit("ppm");

        ingestProjector.projectValueAndUnit(alarm);

        assertEquals(12.0, alarm.getValue(), 0.001); // 3/25 * 100 = 12.0
        assertEquals("%", alarm.getUnit());
    }

    @Test
    void testIngestProjectorSpcOocZeroWaferCount() {
        Alarm alarm = new Alarm();
        alarm.setDetails(new SpcOocDetails(
                "Etch Rate",
                "CH-001",
                ChartLevel.KIP,
                "HOLD-123",
                Instant.parse("2026-04-13T10:00:00Z"),
                0,
                0
        ));

        ingestProjector.projectValueAndUnit(alarm);

        assertNull(alarm.getValue());
        assertNull(alarm.getUnit());
    }
}
