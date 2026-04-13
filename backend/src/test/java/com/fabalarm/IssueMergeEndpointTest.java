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
class IssueMergeEndpointTest {

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

    private HttpEntity<Void> withAuth(String userId) {
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

    // --- Helper: create a Triage issue for merge tests ---
    private String createTriageIssue(String id, String department) {
        Map<String, String> body = new HashMap<>();
        body.put("id", id);
        body.put("title", "Merge test issue " + id);
        body.put("riskLevel", "MIDDLE_RISK");
        body.put("issueTime", "2025-06-15T10:00:00Z");
        body.put("operName", "Etch");
        body.put("product", "B3-Etch");
        body.put("ownerId", "user-tanaka");
        body.put("department", department);
        body.put("description", "Test issue for merge");
        restTemplate.exchange("/api/issues", HttpMethod.POST, withAuth(body), Map.class);
        return id;
    }

    // --- POST /api/issues/{id}/merge ---

    @Test
    void mergeValidatesSourcesAreTriageStatus() {
        // iss-001 is Investigating (not Triage), iss-004 is Investigating
        // Try to merge iss-001 into iss-006 (Triage, Litho)
        Map<String, Object> body = Map.of("sourceIds", List.of("iss-001"));
        ResponseEntity<Map> response = restTemplate.exchange(
                "/api/issues/iss-006/merge", HttpMethod.POST, withAuth(body), Map.class);
        assertEquals(HttpStatus.BAD_REQUEST, response.getStatusCode());
        assertTrue(response.getBody().get("error").toString().contains("not in Triage status"));
    }

    @Test
    void mergeValidatesSameDepartment() {
        // Create source in Litho, target in Etch — should fail
        createTriageIssue("iss-merge-dept-src", "Litho");

        Map<String, Object> body = Map.of("sourceIds", List.of("iss-merge-dept-src"));
        // iss-010 is Etch, Triage
        ResponseEntity<Map> response = restTemplate.exchange(
                "/api/issues/iss-010/merge", HttpMethod.POST, withAuth(body), Map.class);
        assertEquals(HttpStatus.BAD_REQUEST, response.getStatusCode());
        assertTrue(response.getBody().get("error").toString().contains("not in the same department"));
    }

    @Test
    void mergeRejectsMissingSourceIds() {
        Map<String, Object> body = Map.of("sourceIds", List.of());
        ResponseEntity<Map> response = restTemplate.exchange(
                "/api/issues/iss-010/merge", HttpMethod.POST, withAuth(body), Map.class);
        assertEquals(HttpStatus.BAD_REQUEST, response.getStatusCode());
    }

    @Test
    void mergeMovesAlarmsAndSetsStatusAndLogsActivity() {
        // Create two Triage sources in Etch with alarms, merge into iss-010 (Triage, Etch)
        String src1 = createTriageIssue("iss-merge-s1", "Etch");
        String src2 = createTriageIssue("iss-merge-s2", "Etch");

        // Link alarms to source issues
        restTemplate.exchange("/api/issues/" + src1 + "/alarms/alm-070", HttpMethod.POST, withAuth(), Map.class);
        restTemplate.exchange("/api/issues/" + src2 + "/alarms/alm-080", HttpMethod.POST, withAuth(), Map.class);

        String targetId = "iss-010";

        // Perform merge
        Map<String, Object> mergeBody = Map.of("sourceIds", List.of(src1, src2));
        ResponseEntity<Map> response = restTemplate.exchange(
                "/api/issues/" + targetId + "/merge", HttpMethod.POST, withAuth(mergeBody), Map.class);
        assertEquals(HttpStatus.OK, response.getStatusCode());

        // Verify alarms moved to target
        ResponseEntity<List> targetAlarms = restTemplate.exchange(
                "/api/issues/" + targetId + "/alarms", HttpMethod.GET, withAuth(), List.class);
        List<Map<String, Object>> alarmList = targetAlarms.getBody();
        assertTrue(alarmList.stream().anyMatch(a -> "alm-070".equals(a.get("alarmId"))),
                "alm-070 should be active on target");
        assertTrue(alarmList.stream().anyMatch(a -> "alm-080".equals(a.get("alarmId"))),
                "alm-080 should be active on target");

        // Verify source issues are Merged
        ResponseEntity<Map> src1Issue = restTemplate.exchange(
                "/api/issues/" + src1, HttpMethod.GET, withAuth(), Map.class);
        assertEquals("Merged", src1Issue.getBody().get("status"));
        assertEquals(targetId, src1Issue.getBody().get("mergedIntoIssueId"));

        ResponseEntity<Map> src2Issue = restTemplate.exchange(
                "/api/issues/" + src2, HttpMethod.GET, withAuth(), Map.class);
        assertEquals("Merged", src2Issue.getBody().get("status"));

        // Verify source has historical alarms
        ResponseEntity<List> src1Historical = restTemplate.exchange(
                "/api/issues/" + src1 + "/alarms/historical", HttpMethod.GET, withAuth(), List.class);
        assertTrue(src1Historical.getBody().stream()
                .anyMatch(a -> "alm-070".equals(((Map<?, ?>) a).get("alarmId"))
                        && targetId.equals(((Map<?, ?>) a).get("mergedToIssueId"))),
                "src1 should have historical record for alm-070");

        // Verify activity on source (merged_out)
        ResponseEntity<List> src1Activity = restTemplate.exchange(
                "/api/issues/" + src1 + "/activity", HttpMethod.GET, withAuth(), List.class);
        assertTrue(src1Activity.getBody().stream()
                .anyMatch(a -> "merged_out".equals(((Map<?, ?>) a).get("type"))),
                "Source should have merged_out activity");

        // Verify activity on target (merged_in)
        ResponseEntity<List> targetActivity = restTemplate.exchange(
                "/api/issues/" + targetId + "/activity", HttpMethod.GET, withAuth(), List.class);
        assertTrue(targetActivity.getBody().stream()
                .anyMatch(a -> "merged_in".equals(((Map<?, ?>) a).get("type"))),
                "Target should have merged_in activity");
    }

    // --- GET /api/issues/{id}/merged-into ---

    @Test
    void getMergedIntoReturnsTargetAfterMerge() {
        String src = createTriageIssue("iss-merge-into-src", "Etch");
        String target = createTriageIssue("iss-merge-into-tgt", "Etch");

        // Merge src into target
        Map<String, Object> mergeBody = Map.of("sourceIds", List.of(src));
        restTemplate.exchange("/api/issues/" + target + "/merge", HttpMethod.POST, withAuth(mergeBody), Map.class);

        // Get merged-into for source
        ResponseEntity<Map> response = restTemplate.exchange(
                "/api/issues/" + src + "/merged-into", HttpMethod.GET, withAuth(), Map.class);
        assertEquals(HttpStatus.OK, response.getStatusCode());
        assertEquals(target, response.getBody().get("targetIssueId"));
    }

    @Test
    void getMergedIntoReturnsEmptyForUnmergedIssue() {
        ResponseEntity<Map> response = restTemplate.exchange(
                "/api/issues/iss-002/merged-into", HttpMethod.GET, withAuth(), Map.class);
        assertEquals(HttpStatus.OK, response.getStatusCode());
        assertFalse(response.getBody().containsKey("targetIssueId"));
    }

    // --- GET /api/issues/{id}/merge-candidates ---

    @Test
    void mergeCandidatesReturnsSameDeptTriageExcludingSelf() {
        // iss-002 is Etch, Triage
        ResponseEntity<List> response = restTemplate.exchange(
                "/api/issues/iss-002/merge-candidates", HttpMethod.GET, withAuth(), List.class);
        assertEquals(HttpStatus.OK, response.getStatusCode());
        List<Map<String, Object>> candidates = response.getBody();

        // All candidates should be Triage status and Etch department
        for (Map<String, Object> c : candidates) {
            assertEquals("Triage", c.get("status"), "All candidates should be Triage");
            assertEquals("Etch", c.get("department"), "All candidates should be same department");
            assertNotEquals("iss-002", c.get("id"), "Should not include self");
        }
        assertTrue(candidates.size() > 0, "Should have at least some candidates");
    }

    @Test
    void mergeCandidatesReturns404ForNonexistentIssue() {
        ResponseEntity<Map> response = restTemplate.exchange(
                "/api/issues/nonexistent/merge-candidates", HttpMethod.GET, withAuth(), Map.class);
        assertEquals(HttpStatus.NOT_FOUND, response.getStatusCode());
    }
}
