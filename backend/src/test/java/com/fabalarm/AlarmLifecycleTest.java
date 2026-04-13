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
class AlarmLifecycleTest {

    @Autowired
    private TestRestTemplate restTemplate;

    private HttpEntity<?> withAuth(String userId) {
        HttpHeaders headers = new HttpHeaders();
        headers.set("X-User-Id", userId);
        return new HttpEntity<>(headers);
    }

    private <T> HttpEntity<T> withAuth(String userId, T body) {
        HttpHeaders headers = new HttpHeaders();
        headers.set("X-User-Id", userId);
        headers.setContentType(MediaType.APPLICATION_JSON);
        return new HttpEntity<>(body, headers);
    }

    // --- ACK ---

    @Test
    void ackAlarmSameDepartmentSucceeds() {
        // alm-001 is Litho, user-tanaka is Litho
        ResponseEntity<Map> response = restTemplate.exchange(
                "/api/alarms/alm-001/ack", HttpMethod.POST,
                withAuth("user-tanaka", Map.of()),
                Map.class);
        assertEquals(HttpStatus.OK, response.getStatusCode());
        assertEquals("Acked", response.getBody().get("status"));
    }

    @Test
    void ackAlarmCrossDepartmentReturns403() {
        // alm-002 is Etch, user-tanaka is Litho → cross-dept → 403
        ResponseEntity<String> response = restTemplate.exchange(
                "/api/alarms/alm-002/ack", HttpMethod.POST,
                withAuth("user-tanaka", Map.of()),
                String.class);
        assertEquals(HttpStatus.FORBIDDEN, response.getStatusCode());
    }

    @Test
    void ackAlarmCreatesActivityEntry() {
        // alm-003 is Etch, user-chen is Etch
        restTemplate.exchange(
                "/api/alarms/alm-003/ack", HttpMethod.POST,
                withAuth("user-chen", Map.of()),
                Map.class);

        ResponseEntity<List> activityResponse = restTemplate.exchange(
                "/api/alarms/alm-003/activity", HttpMethod.GET,
                withAuth("user-chen"),
                List.class);
        assertEquals(HttpStatus.OK, activityResponse.getStatusCode());
        List<Map<String, Object>> activities = activityResponse.getBody();
        assertTrue(activities.stream().anyMatch(a -> "acked".equals(a.get("type"))));
    }

    @Test
    void ackAlarmWithNoteStoresNote() {
        // alm-005 is Litho, user-tanaka is Litho
        ResponseEntity<Map> response = restTemplate.exchange(
                "/api/alarms/alm-005/ack", HttpMethod.POST,
                withAuth("user-tanaka", Map.of("note", "Checked the chamber")),
                Map.class);
        assertEquals(HttpStatus.OK, response.getStatusCode());

        ResponseEntity<List> activityResponse = restTemplate.exchange(
                "/api/alarms/alm-005/activity", HttpMethod.GET,
                withAuth("user-tanaka"),
                List.class);
        List<Map<String, Object>> activities = activityResponse.getBody();
        Map<String, Object> ackEntry = activities.stream()
                .filter(a -> "acked".equals(a.get("type")))
                .findFirst().orElseThrow();
        assertEquals("Checked the chamber", ackEntry.get("note"));
    }

    @Test
    void ackAlarmNotFoundReturns404() {
        ResponseEntity<String> response = restTemplate.exchange(
                "/api/alarms/nonexistent/ack", HttpMethod.POST,
                withAuth("user-tanaka", Map.of()),
                String.class);
        assertEquals(HttpStatus.NOT_FOUND, response.getStatusCode());
    }

    // --- LABEL ---

    @Test
    void setLabelAddsLabel() {
        // alm-011 is Litho, user-tanaka is Litho
        ResponseEntity<Map> response = restTemplate.exchange(
                "/api/alarms/alm-011/label", HttpMethod.POST,
                withAuth("user-tanaka", Map.of("action", "add", "label", "FalsePositive")),
                Map.class);
        assertEquals(HttpStatus.OK, response.getStatusCode());
        List<String> labels = (List<String>) response.getBody().get("labels");
        assertTrue(labels.contains("FalsePositive"));
    }

    @Test
    void setLabelRemovesLabel() {
        // alm-012 is Etch, user-chen is Etch — add then remove
        restTemplate.exchange(
                "/api/alarms/alm-012/label", HttpMethod.POST,
                withAuth("user-chen", Map.of("action", "add", "label", "Recurring")),
                Map.class);
        ResponseEntity<Map> response = restTemplate.exchange(
                "/api/alarms/alm-012/label", HttpMethod.POST,
                withAuth("user-chen", Map.of("action", "remove", "label", "Recurring")),
                Map.class);
        assertEquals(HttpStatus.OK, response.getStatusCode());
        List<String> labels = (List<String>) response.getBody().get("labels");
        assertFalse(labels.contains("Recurring"));
    }

    @Test
    void setLabelCreatesActivityEntry() {
        // alm-020 is Etch, user-chen is Etch
        restTemplate.exchange(
                "/api/alarms/alm-020/label", HttpMethod.POST,
                withAuth("user-chen", Map.of("action", "add", "label", "LotImpacting")),
                Map.class);

        ResponseEntity<List> activityResponse = restTemplate.exchange(
                "/api/alarms/alm-020/activity", HttpMethod.GET,
                withAuth("user-chen"),
                List.class);
        List<Map<String, Object>> activities = activityResponse.getBody();
        Map<String, Object> entry = activities.stream()
                .filter(a -> "label_added".equals(a.get("type")))
                .findFirst().orElseThrow();
        assertEquals("LotImpacting", entry.get("label"));
    }

    // --- RISK ---

    @Test
    void setRiskChangesHumanRisk() {
        // alm-021 is Etch, user-chen is Etch
        ResponseEntity<Map> response = restTemplate.exchange(
                "/api/alarms/alm-021/risk", HttpMethod.POST,
                withAuth("user-chen", Map.of("risk", "HIGH_RISK")),
                Map.class);
        assertEquals(HttpStatus.OK, response.getStatusCode());
        assertEquals("HIGH_RISK", response.getBody().get("riskLevel"));
    }

    @Test
    void setRiskCreatesActivityWithFromAndTo() {
        // alm-010 is Etch, user-chen is Etch — set middle then high
        restTemplate.exchange(
                "/api/alarms/alm-010/risk", HttpMethod.POST,
                withAuth("user-chen", Map.of("risk", "MIDDLE_RISK")),
                Map.class);
        restTemplate.exchange(
                "/api/alarms/alm-010/risk", HttpMethod.POST,
                withAuth("user-chen", Map.of("risk", "HIGH_RISK")),
                Map.class);

        ResponseEntity<List> activityResponse = restTemplate.exchange(
                "/api/alarms/alm-010/activity", HttpMethod.GET,
                withAuth("user-chen"),
                List.class);
        List<Map<String, Object>> activities = activityResponse.getBody();
        Map<String, Object> entry = activities.stream()
                .filter(a -> "risk_changed".equals(a.get("type")) && "HIGH_RISK".equals(a.get("toRisk")))
                .findFirst().orElseThrow();
        assertEquals("MIDDLE_RISK", entry.get("fromRisk"));
        assertEquals("HIGH_RISK", entry.get("toRisk"));
    }

    // --- RECOVER ---

    @Test
    void recoverAlarmSetsRecoveryTime() {
        // alm-030 is Etch, no recovery_time
        ResponseEntity<Map> response = restTemplate.exchange(
                "/api/alarms/alm-030/recover", HttpMethod.POST,
                withAuth("user-chen", Map.of()),
                Map.class);
        assertEquals(HttpStatus.OK, response.getStatusCode());
        assertNotNull(response.getBody().get("recoveryTime"));
    }

    @Test
    void recoverAlarmCreatesActivityEntry() {
        // alm-032 is Litho, no recovery_time
        restTemplate.exchange(
                "/api/alarms/alm-032/recover", HttpMethod.POST,
                withAuth("user-tanaka", Map.of()),
                Map.class);

        ResponseEntity<List> activityResponse = restTemplate.exchange(
                "/api/alarms/alm-032/activity", HttpMethod.GET,
                withAuth("user-tanaka"),
                List.class);
        List<Map<String, Object>> activities = activityResponse.getBody();
        assertTrue(activities.stream().anyMatch(a -> "recovered".equals(a.get("type"))));
    }

    @Test
    void recoverAlreadyRecoveredReturns400() {
        // alm-031 already has recovery_time in seed data
        ResponseEntity<String> response = restTemplate.exchange(
                "/api/alarms/alm-031/recover", HttpMethod.POST,
                withAuth("user-chen", Map.of()),
                String.class);
        assertEquals(HttpStatus.BAD_REQUEST, response.getStatusCode());
    }

    // --- ACTIVITY ENDPOINT ---

    @Test
    void getActivityReturnsOrderedEntries() {
        // alm-040 is Etch, Open — ack then label
        restTemplate.exchange(
                "/api/alarms/alm-040/ack", HttpMethod.POST,
                withAuth("user-chen", Map.of()),
                Map.class);
        restTemplate.exchange(
                "/api/alarms/alm-040/label", HttpMethod.POST,
                withAuth("user-chen", Map.of("action", "add", "label", "NeedsEngReview")),
                Map.class);

        ResponseEntity<List> activityResponse = restTemplate.exchange(
                "/api/alarms/alm-040/activity", HttpMethod.GET,
                withAuth("user-chen"),
                List.class);
        assertEquals(HttpStatus.OK, activityResponse.getStatusCode());
        List<Map<String, Object>> activities = activityResponse.getBody();
        assertTrue(activities.size() >= 2);

        // Verify chronological order
        for (int i = 1; i < activities.size(); i++) {
            String prev = (String) activities.get(i - 1).get("timestamp");
            String curr = (String) activities.get(i).get("timestamp");
            assertTrue(prev.compareTo(curr) <= 0, "Activities should be in chronological order");
        }
    }

    @Test
    void getActivityForNonexistentAlarmReturns404() {
        ResponseEntity<String> response = restTemplate.exchange(
                "/api/alarms/nonexistent/activity", HttpMethod.GET,
                withAuth("user-tanaka"),
                String.class);
        assertEquals(HttpStatus.NOT_FOUND, response.getStatusCode());
    }
}
