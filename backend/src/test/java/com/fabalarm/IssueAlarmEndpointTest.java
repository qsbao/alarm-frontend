package com.fabalarm;

import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.boot.test.web.client.TestRestTemplate;
import org.springframework.http.*;

import java.util.HashMap;
import java.util.List;
import java.util.Map;

import static org.junit.jupiter.api.Assertions.*;

@SpringBootTest(webEnvironment = SpringBootTest.WebEnvironment.RANDOM_PORT)
class IssueAlarmEndpointTest {

    @Autowired
    private TestRestTemplate restTemplate;

    private HttpEntity<Void> withAuth() {
        HttpHeaders headers = new HttpHeaders();
        headers.set("X-User-Id", "user-tanaka");
        return new HttpEntity<>(headers);
    }

    private <T> HttpEntity<T> withAuth(T body) {
        HttpHeaders headers = new HttpHeaders();
        headers.set("X-User-Id", "user-tanaka");
        headers.setContentType(MediaType.APPLICATION_JSON);
        return new HttpEntity<>(body, headers);
    }

    // --- GET /api/issues/{id}/alarms (active alarms) ---

    @Test
    void getActiveAlarmsReturnsSeededLinks() {
        ResponseEntity<List> response = restTemplate.exchange(
                "/api/issues/iss-001/alarms", HttpMethod.GET, withAuth(), List.class);
        assertEquals(HttpStatus.OK, response.getStatusCode());
        List<Map<String, Object>> alarms = response.getBody();
        // iss-001 has alm-001, alm-006, alm-010 active
        assertTrue(alarms.size() >= 3, "iss-001 should have at least 3 active alarms");
        for (Map<String, Object> a : alarms) {
            assertEquals("iss-001", a.get("issueId"));
            assertNotNull(a.get("alarmId"));
            assertNotNull(a.get("attachedAt"));
            assertNotNull(a.get("attachedBy"));
            assertNull(a.get("mergedAt"));
        }
    }

    @Test
    void getActiveAlarmsReturnsEmptyForNoLinks() {
        ResponseEntity<List> response = restTemplate.exchange(
                "/api/issues/iss-025/alarms", HttpMethod.GET, withAuth(), List.class);
        assertEquals(HttpStatus.OK, response.getStatusCode());
        assertEquals(0, response.getBody().size());
    }

    // --- GET /api/issues/{id}/alarms/historical ---

    @Test
    void getHistoricalAlarmsReturnsMovedAlarms() {
        ResponseEntity<List> response = restTemplate.exchange(
                "/api/issues/iss-006/alarms/historical", HttpMethod.GET, withAuth(), List.class);
        assertEquals(HttpStatus.OK, response.getStatusCode());
        List<Map<String, Object>> alarms = response.getBody();
        assertTrue(alarms.size() >= 1, "iss-006 should have at least 1 historical alarm");
        Map<String, Object> historical = alarms.get(0);
        assertEquals("alm-010", historical.get("alarmId"));
        assertNotNull(historical.get("mergedAt"));
        assertNotNull(historical.get("mergedBy"));
        assertEquals("iss-001", historical.get("mergedToIssueId"));
    }

    // --- POST /api/issues/{id}/alarms/{alarmId} (link) ---

    @Test
    void linkAlarmCreatesLinkAndActivities() {
        // Link alm-030 to iss-010
        ResponseEntity<Map> response = restTemplate.exchange(
                "/api/issues/iss-010/alarms/alm-030", HttpMethod.POST, withAuth(), Map.class);
        assertEquals(HttpStatus.CREATED, response.getStatusCode());
        Map<String, Object> link = response.getBody();
        assertEquals("iss-010", link.get("issueId"));
        assertEquals("alm-030", link.get("alarmId"));
        assertNotNull(link.get("attachedAt"));
        assertEquals("H. Tanaka", link.get("attachedBy"));

        // Verify it appears in active alarms
        ResponseEntity<List> activeRes = restTemplate.exchange(
                "/api/issues/iss-010/alarms", HttpMethod.GET, withAuth(), List.class);
        List<Map<String, Object>> active = activeRes.getBody();
        boolean found = active.stream().anyMatch(a -> "alm-030".equals(a.get("alarmId")));
        assertTrue(found, "alm-030 should appear in active alarms for iss-010");

        // Verify issue activity logged
        ResponseEntity<List> issueActRes = restTemplate.exchange(
                "/api/issues/iss-010/activity", HttpMethod.GET, withAuth(), List.class);
        List<Map<String, Object>> issueActs = issueActRes.getBody();
        boolean hasLinked = issueActs.stream()
                .anyMatch(a -> "alarm_linked".equals(a.get("type")) && "alm-030".equals(a.get("alarmId")));
        assertTrue(hasLinked, "Issue activity should have alarm_linked entry");

        // Verify alarm activity logged
        ResponseEntity<List> alarmActRes = restTemplate.exchange(
                "/api/alarms/alm-030/activity", HttpMethod.GET, withAuth(), List.class);
        List<Map<String, Object>> alarmActs = alarmActRes.getBody();
        boolean hasAlarmLinked = alarmActs.stream()
                .anyMatch(a -> "linked".equals(a.get("type")));
        assertTrue(hasAlarmLinked, "Alarm activity should have linked entry");
    }

    @Test
    void linkAlarmDuplicateReturnsBadRequest() {
        // alm-001 is already linked to iss-001 via seed data
        ResponseEntity<Map> response = restTemplate.exchange(
                "/api/issues/iss-001/alarms/alm-001", HttpMethod.POST, withAuth(), Map.class);
        assertEquals(HttpStatus.BAD_REQUEST, response.getStatusCode());
    }

    @Test
    void linkAlarmNotFoundIssueReturns404() {
        ResponseEntity<String> response = restTemplate.exchange(
                "/api/issues/nonexistent/alarms/alm-001", HttpMethod.POST, withAuth(), String.class);
        assertEquals(HttpStatus.NOT_FOUND, response.getStatusCode());
    }

    @Test
    void linkAlarmNotFoundAlarmReturns404() {
        ResponseEntity<String> response = restTemplate.exchange(
                "/api/issues/iss-010/alarms/nonexistent", HttpMethod.POST, withAuth(), String.class);
        assertEquals(HttpStatus.NOT_FOUND, response.getStatusCode());
    }

    // --- DELETE /api/issues/{id}/alarms/{alarmId} (unlink) ---

    @Test
    void unlinkAlarmRemovesLinkAndActivities() {
        // First link alm-040 to iss-012
        restTemplate.exchange(
                "/api/issues/iss-012/alarms/alm-040", HttpMethod.POST, withAuth(), Map.class);

        // Then unlink
        ResponseEntity<Void> response = restTemplate.exchange(
                "/api/issues/iss-012/alarms/alm-040", HttpMethod.DELETE, withAuth(), Void.class);
        assertEquals(HttpStatus.NO_CONTENT, response.getStatusCode());

        // Verify removed from active alarms
        ResponseEntity<List> activeRes = restTemplate.exchange(
                "/api/issues/iss-012/alarms", HttpMethod.GET, withAuth(), List.class);
        List<Map<String, Object>> active = activeRes.getBody();
        boolean found = active.stream().anyMatch(a -> "alm-040".equals(a.get("alarmId")));
        assertFalse(found, "alm-040 should not appear in active alarms after unlink");

        // Verify issue activity logged
        ResponseEntity<List> issueActRes = restTemplate.exchange(
                "/api/issues/iss-012/activity", HttpMethod.GET, withAuth(), List.class);
        List<Map<String, Object>> issueActs = issueActRes.getBody();
        boolean hasUnlinked = issueActs.stream()
                .anyMatch(a -> "alarm_unlinked".equals(a.get("type")) && "alm-040".equals(a.get("alarmId")));
        assertTrue(hasUnlinked, "Issue activity should have alarm_unlinked entry");

        // Verify alarm activity logged
        ResponseEntity<List> alarmActRes = restTemplate.exchange(
                "/api/alarms/alm-040/activity", HttpMethod.GET, withAuth(), List.class);
        List<Map<String, Object>> alarmActs = alarmActRes.getBody();
        boolean hasAlarmUnlinked = alarmActs.stream()
                .anyMatch(a -> "unlinked".equals(a.get("type")));
        assertTrue(hasAlarmUnlinked, "Alarm activity should have unlinked entry");
    }

    @Test
    void unlinkAlarmNotFoundReturns404() {
        ResponseEntity<String> response = restTemplate.exchange(
                "/api/issues/iss-010/alarms/alm-999", HttpMethod.DELETE, withAuth(), String.class);
        assertEquals(HttpStatus.NOT_FOUND, response.getStatusCode());
    }

    // --- POST /api/alarms/{alarmId}/move ---

    @Test
    void moveAlarmMarksOldRowCreatesNewAndActivities() {
        // Link alm-050 to iss-016 first
        restTemplate.exchange(
                "/api/issues/iss-016/alarms/alm-050", HttpMethod.POST, withAuth(), Map.class);

        // Move alm-050 from iss-016 to iss-018
        Map<String, String> body = Map.of("targetIssueId", "iss-018");
        ResponseEntity<Map> response = restTemplate.exchange(
                "/api/alarms/alm-050/move", HttpMethod.POST, withAuth(body), Map.class);
        assertEquals(HttpStatus.OK, response.getStatusCode());
        Map<String, Object> moved = response.getBody();
        assertEquals("iss-018", moved.get("issueId"));
        assertEquals("alm-050", moved.get("alarmId"));

        // Verify old row is historical on iss-016
        ResponseEntity<List> histRes = restTemplate.exchange(
                "/api/issues/iss-016/alarms/historical", HttpMethod.GET, withAuth(), List.class);
        List<Map<String, Object>> historical = histRes.getBody();
        boolean hasHistorical = historical.stream()
                .anyMatch(a -> "alm-050".equals(a.get("alarmId")) && "iss-018".equals(a.get("mergedToIssueId")));
        assertTrue(hasHistorical, "iss-016 should have historical record for alm-050");

        // Verify new row is active on iss-018
        ResponseEntity<List> activeRes = restTemplate.exchange(
                "/api/issues/iss-018/alarms", HttpMethod.GET, withAuth(), List.class);
        List<Map<String, Object>> active = activeRes.getBody();
        boolean found = active.stream().anyMatch(a -> "alm-050".equals(a.get("alarmId")));
        assertTrue(found, "alm-050 should be active on iss-018");

        // Verify alarm activity
        ResponseEntity<List> alarmActRes = restTemplate.exchange(
                "/api/alarms/alm-050/activity", HttpMethod.GET, withAuth(), List.class);
        List<Map<String, Object>> alarmActs = alarmActRes.getBody();
        boolean hasMoved = alarmActs.stream()
                .anyMatch(a -> "moved_between_issues".equals(a.get("type")));
        assertTrue(hasMoved, "Alarm activity should have moved_between_issues entry");
    }

    @Test
    void moveAlarmNotLinkedReturns404() {
        Map<String, String> body = Map.of("targetIssueId", "iss-018");
        ResponseEntity<String> response = restTemplate.exchange(
                "/api/alarms/alm-099/move", HttpMethod.POST, withAuth(body), String.class);
        assertEquals(HttpStatus.NOT_FOUND, response.getStatusCode());
    }

    @Test
    void moveAlarmMissingTargetReturnsBadRequest() {
        Map<String, String> body = Map.of();
        ResponseEntity<Map> response = restTemplate.exchange(
                "/api/alarms/alm-001/move", HttpMethod.POST, withAuth(body), Map.class);
        assertEquals(HttpStatus.BAD_REQUEST, response.getStatusCode());
    }

    // --- POST /api/issues (create from alarm) ---

    @Test
    void createIssueFromAlarmLinksAlarm() {
        Map<String, String> body = new HashMap<>();
        body.put("id", "iss-test-from-alarm");
        body.put("title", "Issue from alarm test");
        body.put("riskLevel", "High");
        body.put("issueTime", "2025-06-15T10:00:00Z");
        body.put("operName", "Exposure");
        body.put("product", "A7-Litho");
        body.put("ownerId", "user-tanaka");
        body.put("department", "Litho");
        body.put("description", "Created from alarm");
        body.put("alarmId", "alm-060");
        ResponseEntity<Map> response = restTemplate.exchange(
                "/api/issues", HttpMethod.POST, withAuth(body), Map.class);
        assertEquals(HttpStatus.CREATED, response.getStatusCode());
        assertEquals("iss-test-from-alarm", response.getBody().get("id"));

        // Verify alarm is linked
        ResponseEntity<List> activeRes = restTemplate.exchange(
                "/api/issues/iss-test-from-alarm/alarms", HttpMethod.GET, withAuth(), List.class);
        List<Map<String, Object>> active = activeRes.getBody();
        assertEquals(1, active.size());
        assertEquals("alm-060", active.get(0).get("alarmId"));
    }
}
