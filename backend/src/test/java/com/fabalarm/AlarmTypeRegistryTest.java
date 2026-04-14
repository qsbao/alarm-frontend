package com.fabalarm;

import com.fabalarm.alarm.AlarmTypeRegistry;
import com.fabalarm.model.*;
import com.fasterxml.jackson.databind.ObjectMapper;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.context.SpringBootTest;

import java.time.Instant;
import java.util.function.Function;

import static org.junit.jupiter.api.Assertions.*;

@SpringBootTest
class AlarmTypeRegistryTest {

    @Autowired
    private AlarmTypeRegistry registry;

    @Autowired
    private ObjectMapper objectMapper;

    @Test
    void spcOocIsRegistered() {
        assertTrue(registry.isRegistered(AlarmTypes.SPC_OOC));
    }

    @Test
    void registeredKindsContainsSpcOoc() {
        assertTrue(registry.getRegisteredKinds().contains(AlarmTypes.SPC_OOC));
    }

    @Test
    void spcOocProjectorComputesPercentage() {
        Function<AlarmDetails, ValueUnit> projector = registry.getProjector(AlarmTypes.SPC_OOC);
        assertNotNull(projector);

        SpcOocDetails details = new SpcOocDetails(
                "Etch Rate", "CH-001", ChartLevel.KIP, "HOLD-123",
                Instant.parse("2026-04-13T10:00:00Z"), 25, 3);
        ValueUnit result = projector.apply(details);
        assertEquals(12.0, result.value(), 0.001);
        assertEquals("%", result.unit());
    }

    @Test
    void spcOocProjectorHandlesZeroWaferCount() {
        Function<AlarmDetails, ValueUnit> projector = registry.getProjector(AlarmTypes.SPC_OOC);

        SpcOocDetails details = new SpcOocDetails(
                "Etch Rate", "CH-001", ChartLevel.KIP, "HOLD-123",
                Instant.parse("2026-04-13T10:00:00Z"), 0, 0);
        ValueUnit result = projector.apply(details);
        assertNull(result.value());
        assertNull(result.unit());
    }

    @Test
    void duplicateRegistrationThrows() {
        assertThrows(IllegalStateException.class, () ->
            registry.register(AlarmTypes.SPC_OOC, SpcOocDetails.class, d -> new ValueUnit(0.0, "x"))
        );
    }

    @Test
    void jacksonRoundTripViaRegistrySpcOoc() throws Exception {
        SpcOocDetails original = new SpcOocDetails(
                "Etch Rate", "CH-001", ChartLevel.KIP, "HOLD-123",
                Instant.parse("2026-04-13T10:00:00Z"), 25, 3);

        String json = objectMapper.writeValueAsString(original);
        assertTrue(json.contains("\"kind\":\"spc_ooc\""));

        AlarmDetails deserialized = objectMapper.readValue(json, AlarmDetails.class);
        assertInstanceOf(SpcOocDetails.class, deserialized);
        SpcOocDetails spcOoc = (SpcOocDetails) deserialized;
        assertEquals(original.chartName(), spcOoc.chartName());
        assertEquals(original.oocCount(), spcOoc.oocCount());
    }

    @Test
    void unregisteredKindReturnsNullProjector() {
        assertNull(registry.getProjector("nonexistent_kind"));
        assertFalse(registry.isRegistered("nonexistent_kind"));
    }
}
