package com.fabalarm;

import com.fasterxml.jackson.databind.ObjectMapper;
import com.fabalarm.model.*;
import com.fabalarm.plugins.ChamberLeakDetails;
import com.fabalarm.plugins.TempSpikeDetails;
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
        alarm.setType(AlarmTypes.SPC_OOC);
        alarm.setDetails(new SpcOocDetails(
                "Etch Rate",
                "CH-001",
                ChartLevel.KIP,
                "HOLD-123",
                Instant.parse("2026-04-13T10:00:00Z"),
                25,
                3
        ));

        alarm.setValue(999.0);
        alarm.setUnit("ppm");

        ingestProjector.projectValueAndUnit(alarm);

        assertEquals(12.0, alarm.getValue(), 0.001);
        assertEquals("%", alarm.getUnit());
    }

    @Test
    void testIngestProjectorSpcOocZeroWaferCount() {
        Alarm alarm = new Alarm();
        alarm.setType(AlarmTypes.SPC_OOC);
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

    @Test
    void testTempSpikeDetailsJsonRoundTrip() throws Exception {
        TempSpikeDetails original = new TempSpikeDetails(
                125.5,
                120.0,
                "SENSOR-ETCH-01",
                Instant.parse("2026-04-13T10:00:00Z"),
                45
        );

        String json = objectMapper.writeValueAsString(original);
        assertTrue(json.contains("\"kind\":\"example-plugin:TempSpike\""));

        AlarmDetails deserialized = objectMapper.readValue(json, AlarmDetails.class);
        assertInstanceOf(TempSpikeDetails.class, deserialized);
        TempSpikeDetails tempSpike = (TempSpikeDetails) deserialized;
        assertEquals(original.currentTemp(), tempSpike.currentTemp());
        assertEquals(original.thresholdTemp(), tempSpike.thresholdTemp());
        assertEquals(original.sensorId(), tempSpike.sensorId());
        assertEquals(original.spikeStartTime(), tempSpike.spikeStartTime());
        assertEquals(original.durationSeconds(), tempSpike.durationSeconds());
    }

    @Test
    void testIngestProjectorTempSpike() {
        Alarm alarm = new Alarm();
        alarm.setType("example-plugin:TempSpike");
        alarm.setDetails(new TempSpikeDetails(
                125.5,
                120.0,
                "SENSOR-ETCH-01",
                Instant.parse("2026-04-13T10:00:00Z"),
                45
        ));

        alarm.setValue(999.0);
        alarm.setUnit("ppm");

        ingestProjector.projectValueAndUnit(alarm);

        assertEquals(5.5, alarm.getValue(), 0.001);
        assertEquals("°C", alarm.getUnit());
    }

    @Test
    void testChamberLeakDetailsJsonRoundTrip() throws Exception {
        ChamberLeakDetails original = new ChamberLeakDetails(
                0.33,
                0.1,
                "CVD-04-A",
                "helium"
        );

        String json = objectMapper.writeValueAsString(original);
        assertTrue(json.contains("\"kind\":\"example-plugin:ChamberLeak\""));

        AlarmDetails deserialized = objectMapper.readValue(json, AlarmDetails.class);
        assertInstanceOf(ChamberLeakDetails.class, deserialized);
        ChamberLeakDetails chamberLeak = (ChamberLeakDetails) deserialized;
        assertEquals(original.leakRate(), chamberLeak.leakRate());
        assertEquals(original.threshold(), chamberLeak.threshold());
        assertEquals(original.chamberId(), chamberLeak.chamberId());
        assertEquals(original.testMethod(), chamberLeak.testMethod());
    }

    @Test
    void testIngestProjectorChamberLeak() {
        Alarm alarm = new Alarm();
        alarm.setType("example-plugin:ChamberLeak");
        alarm.setDetails(new ChamberLeakDetails(
                0.33,
                0.1,
                "CVD-04-A",
                "helium"
        ));

        ingestProjector.projectValueAndUnit(alarm);

        assertEquals(0.33, alarm.getValue(), 0.001);
        assertEquals("sccm", alarm.getUnit());
    }
}
