package com.fabalarm;

import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.boot.test.web.client.TestRestTemplate;
import org.springframework.http.*;

import java.util.List;
import java.util.Map;

import static org.junit.jupiter.api.Assertions.*;

@SpringBootTest(webEnvironment = SpringBootTest.WebEnvironment.RANDOM_PORT)
class AlarmEndpointTest {

    @Autowired
    private TestRestTemplate restTemplate;

    private HttpEntity<Void> withAuth() {
        HttpHeaders headers = new HttpHeaders();
        headers.set("X-User-Id", "user-tanaka");
        return new HttpEntity<>(headers);
    }

    @Test
    void listAlarmsRequiresDateRange() {
        ResponseEntity<String> response = restTemplate.exchange(
                "/api/alarms", HttpMethod.GET, withAuth(), String.class);
        assertEquals(HttpStatus.BAD_REQUEST, response.getStatusCode());
        assertTrue(response.getBody().contains("required"));
    }

    @Test
    void listAlarmsWithMissingToReturns400() {
        ResponseEntity<String> response = restTemplate.exchange(
                "/api/alarms?from=2025-01-01T00:00:00Z", HttpMethod.GET, withAuth(), String.class);
        assertEquals(HttpStatus.BAD_REQUEST, response.getStatusCode());
    }

    @Test
    void listAlarmsReturnsAlarmsInDateRange() {
        ResponseEntity<List> response = restTemplate.exchange(
                "/api/alarms?from=2025-01-01T00:00:00Z&to=2026-12-31T23:59:59Z",
                HttpMethod.GET, withAuth(), List.class);
        assertEquals(HttpStatus.OK, response.getStatusCode());
        assertNotNull(response.getBody());
        assertTrue(response.getBody().size() > 0, "Should return seeded alarms");
    }

    @Test
    void listAlarmsNarrowDateRangeReturnsSubset() {
        // Full range
        ResponseEntity<List> fullResponse = restTemplate.exchange(
                "/api/alarms?from=2025-01-01T00:00:00Z&to=2026-12-31T23:59:59Z",
                HttpMethod.GET, withAuth(), List.class);
        int fullCount = fullResponse.getBody().size();

        // Very narrow range that should return fewer alarms
        ResponseEntity<List> narrowResponse = restTemplate.exchange(
                "/api/alarms?from=2025-06-01T00:00:00Z&to=2025-06-01T01:00:00Z",
                HttpMethod.GET, withAuth(), List.class);
        assertTrue(narrowResponse.getBody().size() <= fullCount);
    }

    @Test
    void listAlarmsFilterByStatus() {
        ResponseEntity<List> response = restTemplate.exchange(
                "/api/alarms?from=2025-01-01T00:00:00Z&to=2026-12-31T23:59:59Z&status=Open",
                HttpMethod.GET, withAuth(), List.class);
        assertEquals(HttpStatus.OK, response.getStatusCode());
        List<Map<String, Object>> alarms = response.getBody();
        for (Map<String, Object> alarm : alarms) {
            assertEquals("Open", alarm.get("status"));
        }
    }

    @Test
    void listAlarmsFilterByDepartment() {
        ResponseEntity<List> response = restTemplate.exchange(
                "/api/alarms?from=2025-01-01T00:00:00Z&to=2026-12-31T23:59:59Z&department=Litho",
                HttpMethod.GET, withAuth(), List.class);
        assertEquals(HttpStatus.OK, response.getStatusCode());
        List<Map<String, Object>> alarms = response.getBody();
        assertTrue(alarms.size() > 0);
        for (Map<String, Object> alarm : alarms) {
            assertEquals("Litho", alarm.get("department"));
        }
    }

    @Test
    void listAlarmsFilterBySeverity() {
        ResponseEntity<List> response = restTemplate.exchange(
                "/api/alarms?from=2025-01-01T00:00:00Z&to=2026-12-31T23:59:59Z&severity=P1",
                HttpMethod.GET, withAuth(), List.class);
        assertEquals(HttpStatus.OK, response.getStatusCode());
        List<Map<String, Object>> alarms = response.getBody();
        for (Map<String, Object> alarm : alarms) {
            assertEquals("P1", alarm.get("severity"));
        }
    }

    @Test
    void listAlarmsFilterByAlarmType() {
        ResponseEntity<List> response = restTemplate.exchange(
                "/api/alarms?from=2025-01-01T00:00:00Z&to=2026-12-31T23:59:59Z&alarmType=example-plugin:TempSpike",
                HttpMethod.GET, withAuth(), List.class);
        assertEquals(HttpStatus.OK, response.getStatusCode());
        List<Map<String, Object>> alarms = response.getBody();
        assertTrue(alarms.size() > 0);
        for (Map<String, Object> alarm : alarms) {
            assertEquals("example-plugin:TempSpike", alarm.get("type"));
        }
    }

    @Test
    void listAlarmsFilterBySearch() {
        ResponseEntity<List> response = restTemplate.exchange(
                "/api/alarms?from=2025-01-01T00:00:00Z&to=2026-12-31T23:59:59Z&search=temperature",
                HttpMethod.GET, withAuth(), List.class);
        assertEquals(HttpStatus.OK, response.getStatusCode());
        List<Map<String, Object>> alarms = response.getBody();
        for (Map<String, Object> alarm : alarms) {
            String message = ((String) alarm.get("message")).toLowerCase();
            assertTrue(message.contains("temperature") ||
                    ((String) alarm.get("type")).toLowerCase().contains("temperature"));
        }
    }

    @Test
    void listAlarmsFilterByOwner() {
        ResponseEntity<List> response = restTemplate.exchange(
                "/api/alarms?from=2025-01-01T00:00:00Z&to=2026-12-31T23:59:59Z&owner=H.+Tanaka",
                HttpMethod.GET, withAuth(), List.class);
        assertEquals(HttpStatus.OK, response.getStatusCode());
        List<Map<String, Object>> alarms = response.getBody();
        for (Map<String, Object> alarm : alarms) {
            assertEquals("H. Tanaka", alarm.get("owner"));
        }
    }

    @Test
    void listAlarmsFilterByEqpId() {
        ResponseEntity<List> response = restTemplate.exchange(
                "/api/alarms?from=2025-01-01T00:00:00Z&to=2026-12-31T23:59:59Z&eqpId=LITHO-07",
                HttpMethod.GET, withAuth(), List.class);
        assertEquals(HttpStatus.OK, response.getStatusCode());
        List<Map<String, Object>> alarms = response.getBody();
        for (Map<String, Object> alarm : alarms) {
            assertEquals("LITHO-07", alarm.get("eqpId"));
        }
    }

    @Test
    void listAlarmsFilterByProductId() {
        ResponseEntity<List> response = restTemplate.exchange(
                "/api/alarms?from=2025-01-01T00:00:00Z&to=2026-12-31T23:59:59Z&productId=A7-Litho",
                HttpMethod.GET, withAuth(), List.class);
        assertEquals(HttpStatus.OK, response.getStatusCode());
        List<Map<String, Object>> alarms = response.getBody();
        for (Map<String, Object> alarm : alarms) {
            assertEquals("A7-Litho", alarm.get("productId"));
        }
    }

    @Test
    void listAlarmsFilterByActiveRecovered() {
        ResponseEntity<List> allResponse = restTemplate.exchange(
                "/api/alarms?from=2025-01-01T00:00:00Z&to=2026-12-31T23:59:59Z",
                HttpMethod.GET, withAuth(), List.class);
        int total = allResponse.getBody().size();

        ResponseEntity<List> activeResponse = restTemplate.exchange(
                "/api/alarms?from=2025-01-01T00:00:00Z&to=2026-12-31T23:59:59Z&active=active",
                HttpMethod.GET, withAuth(), List.class);

        ResponseEntity<List> recoveredResponse = restTemplate.exchange(
                "/api/alarms?from=2025-01-01T00:00:00Z&to=2026-12-31T23:59:59Z&active=recovered",
                HttpMethod.GET, withAuth(), List.class);

        int activeCount = activeResponse.getBody().size();
        int recoveredCount = recoveredResponse.getBody().size();
        assertEquals(total, activeCount + recoveredCount);
    }

    @Test
    void listAlarmsMultipleFiltersCompose() {
        ResponseEntity<List> response = restTemplate.exchange(
                "/api/alarms?from=2025-01-01T00:00:00Z&to=2026-12-31T23:59:59Z&status=Open&department=Litho",
                HttpMethod.GET, withAuth(), List.class);
        assertEquals(HttpStatus.OK, response.getStatusCode());
        List<Map<String, Object>> alarms = response.getBody();
        for (Map<String, Object> alarm : alarms) {
            assertEquals("Open", alarm.get("status"));
            assertEquals("Litho", alarm.get("department"));
        }
    }

    @Test
    void getAlarmByIdReturnsAlarmWithLabels() {
        ResponseEntity<Map> response = restTemplate.exchange(
                "/api/alarms/alm-001", HttpMethod.GET, withAuth(), Map.class);
        assertEquals(HttpStatus.OK, response.getStatusCode());
        Map<String, Object> alarm = response.getBody();
        assertEquals("alm-001", alarm.get("id"));
        assertNotNull(alarm.get("type"));
        assertNotNull(alarm.get("severity"));
        assertNotNull(alarm.get("message"));
        assertNotNull(alarm.get("alarmTime"));
        assertNotNull(alarm.get("eqpId"));
        assertNotNull(alarm.get("status"));
        assertNotNull(alarm.get("labels"));
    }

    @Test
    void getAlarmByIdNotFoundReturns404() {
        ResponseEntity<String> response = restTemplate.exchange(
                "/api/alarms/nonexistent", HttpMethod.GET, withAuth(), String.class);
        assertEquals(HttpStatus.NOT_FOUND, response.getStatusCode());
    }

    @Test
    void listAlarmsFilterByLabels() {
        ResponseEntity<List> response = restTemplate.exchange(
                "/api/alarms?from=2025-01-01T00:00:00Z&to=2026-12-31T23:59:59Z&labels=FalsePositive",
                HttpMethod.GET, withAuth(), List.class);
        assertEquals(HttpStatus.OK, response.getStatusCode());
        List<Map<String, Object>> alarms = response.getBody();
        for (Map<String, Object> alarm : alarms) {
            List<String> alarmLabels = (List<String>) alarm.get("labels");
            assertTrue(alarmLabels.contains("FalsePositive"));
        }
    }

    @Test
    void listAlarmsFilterByHumanRisk() {
        ResponseEntity<List> response = restTemplate.exchange(
                "/api/alarms?from=2025-01-01T00:00:00Z&to=2026-12-31T23:59:59Z&riskLevel=HIGH_RISK",
                HttpMethod.GET, withAuth(), List.class);
        assertEquals(HttpStatus.OK, response.getStatusCode());
        List<Map<String, Object>> alarms = response.getBody();
        for (Map<String, Object> alarm : alarms) {
            assertEquals("HIGH_RISK", alarm.get("riskLevel"));
        }
    }
}
