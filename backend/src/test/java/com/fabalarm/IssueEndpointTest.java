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
class IssueEndpointTest {

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

    // --- GET /api/issues ---

    @Test
    void listIssuesReturnsSeededIssues() {
        ResponseEntity<List> response = restTemplate.exchange(
                "/api/issues", HttpMethod.GET, withAuth(), List.class);
        assertEquals(HttpStatus.OK, response.getStatusCode());
        assertTrue(response.getBody().size() >= 25, "Should return at least 25 seeded issues");
    }

    @Test
    void listIssuesFilterByStatus() {
        ResponseEntity<List> response = restTemplate.exchange(
                "/api/issues?status=Triage", HttpMethod.GET, withAuth(), List.class);
        assertEquals(HttpStatus.OK, response.getStatusCode());
        List<Map<String, Object>> issues = response.getBody();
        assertTrue(issues.size() > 0);
        for (Map<String, Object> issue : issues) {
            assertEquals("Triage", issue.get("status"));
        }
    }

    @Test
    void listIssuesFilterByRiskLevel() {
        ResponseEntity<List> response = restTemplate.exchange(
                "/api/issues?riskLevel=Critical", HttpMethod.GET, withAuth(), List.class);
        assertEquals(HttpStatus.OK, response.getStatusCode());
        List<Map<String, Object>> issues = response.getBody();
        assertTrue(issues.size() > 0);
        for (Map<String, Object> issue : issues) {
            assertEquals("Critical", issue.get("riskLevel"));
        }
    }

    @Test
    void listIssuesFilterByAlarmType() {
        ResponseEntity<List> response = restTemplate.exchange(
                "/api/issues?alarmType=TempSpike", HttpMethod.GET, withAuth(), List.class);
        assertEquals(HttpStatus.OK, response.getStatusCode());
        List<Map<String, Object>> issues = response.getBody();
        assertTrue(issues.size() > 0);
        for (Map<String, Object> issue : issues) {
            assertEquals("TempSpike", issue.get("alarmType"));
        }
    }

    @Test
    void listIssuesFilterBySearch() {
        ResponseEntity<List> response = restTemplate.exchange(
                "/api/issues?search=temperature", HttpMethod.GET, withAuth(), List.class);
        assertEquals(HttpStatus.OK, response.getStatusCode());
        List<Map<String, Object>> issues = response.getBody();
        assertTrue(issues.size() > 0);
        for (Map<String, Object> issue : issues) {
            String title = ((String) issue.get("title")).toLowerCase();
            String desc = ((String) issue.get("description")).toLowerCase();
            assertTrue(title.contains("temperature") || desc.contains("temperature") ||
                    ((String) issue.get("id")).toLowerCase().contains("temperature"));
        }
    }

    // --- GET /api/issues/{id} ---

    @Test
    void getIssueByIdReturnsIssue() {
        ResponseEntity<Map> response = restTemplate.exchange(
                "/api/issues/iss-001", HttpMethod.GET, withAuth(), Map.class);
        assertEquals(HttpStatus.OK, response.getStatusCode());
        Map<String, Object> issue = response.getBody();
        assertEquals("iss-001", issue.get("id"));
        assertNotNull(issue.get("title"));
        assertNotNull(issue.get("date"));
        assertNotNull(issue.get("alarmType"));
        assertNotNull(issue.get("riskLevel"));
        assertNotNull(issue.get("status"));
        assertNotNull(issue.get("ownerId"));
        assertNotNull(issue.get("department"));
    }

    @Test
    void getIssueNotFoundReturns404() {
        ResponseEntity<String> response = restTemplate.exchange(
                "/api/issues/nonexistent", HttpMethod.GET, withAuth(), String.class);
        assertEquals(HttpStatus.NOT_FOUND, response.getStatusCode());
    }

    // --- POST /api/issues ---

    @Test
    void createIssueReturns201() {
        Map<String, String> body = Map.of(
                "id", "iss-test-create",
                "title", "Test issue creation",
                "alarmType", "TempSpike",
                "riskLevel", "High",
                "issueTime", "2025-06-15T10:00:00Z",
                "operation", "Exposure",
                "product", "A7-Litho",
                "ownerId", "user-tanaka",
                "department", "Litho",
                "description", "Created by test"
        );
        ResponseEntity<Map> response = restTemplate.exchange(
                "/api/issues", HttpMethod.POST, withAuth(body), Map.class);
        assertEquals(HttpStatus.CREATED, response.getStatusCode());
        Map<String, Object> created = response.getBody();
        assertEquals("iss-test-create", created.get("id"));
        assertEquals("Test issue creation", created.get("title"));
        assertEquals("Triage", created.get("status"));
    }

    @Test
    void createIssueLogsCreatedActivity() {
        Map<String, String> body = Map.of(
                "id", "iss-test-act",
                "title", "Test activity logging",
                "alarmType", "PressureDrop",
                "riskLevel", "Medium",
                "issueTime", "2025-06-15T11:00:00Z",
                "operation", "Etch",
                "product", "B3-Etch",
                "ownerId", "user-chen",
                "department", "Etch",
                "description", "Testing activity"
        );
        restTemplate.exchange("/api/issues", HttpMethod.POST, withAuth(body), Map.class);

        ResponseEntity<List> actResponse = restTemplate.exchange(
                "/api/issues/iss-test-act/activity", HttpMethod.GET, withAuth(), List.class);
        assertEquals(HttpStatus.OK, actResponse.getStatusCode());
        List<Map<String, Object>> activities = actResponse.getBody();
        assertTrue(activities.size() >= 1);
        assertEquals("created", activities.get(0).get("type"));
    }

    // --- PUT /api/issues/{id}/owner ---

    @Test
    void assignOwnerUpdatesAndLogsActivity() {
        Map<String, String> body = Map.of("ownerId", "user-rossi");
        ResponseEntity<Map> response = restTemplate.exchange(
                "/api/issues/iss-002/owner", HttpMethod.PUT, withAuth(body), Map.class);
        assertEquals(HttpStatus.OK, response.getStatusCode());
        assertEquals("user-rossi", response.getBody().get("ownerId"));

        // Check activity logged
        ResponseEntity<List> actResponse = restTemplate.exchange(
                "/api/issues/iss-002/activity", HttpMethod.GET, withAuth(), List.class);
        List<Map<String, Object>> activities = actResponse.getBody();
        boolean hasAssignment = activities.stream()
                .anyMatch(a -> "assignment".equals(a.get("type")));
        assertTrue(hasAssignment, "Should have assignment activity entry");
    }

    @Test
    void assignOwnerNotFoundReturns404() {
        Map<String, String> body = Map.of("ownerId", "user-rossi");
        ResponseEntity<String> response = restTemplate.exchange(
                "/api/issues/nonexistent/owner", HttpMethod.PUT, withAuth(body), String.class);
        assertEquals(HttpStatus.NOT_FOUND, response.getStatusCode());
    }

    // --- POST /api/issues/{id}/comments ---

    @Test
    void addCommentLogsActivity() {
        Map<String, String> body = Map.of("text", "This is a test comment");
        ResponseEntity<Map> response = restTemplate.exchange(
                "/api/issues/iss-003/comments", HttpMethod.POST, withAuth(body), Map.class);
        assertEquals(HttpStatus.OK, response.getStatusCode());

        // Check activity logged
        ResponseEntity<List> actResponse = restTemplate.exchange(
                "/api/issues/iss-003/activity", HttpMethod.GET, withAuth(), List.class);
        List<Map<String, Object>> activities = actResponse.getBody();
        boolean hasComment = activities.stream()
                .anyMatch(a -> "comment".equals(a.get("type")) && "This is a test comment".equals(a.get("text")));
        assertTrue(hasComment, "Should have comment activity entry with text");
    }

    @Test
    void addCommentNotFoundReturns404() {
        Map<String, String> body = Map.of("text", "comment on missing");
        ResponseEntity<String> response = restTemplate.exchange(
                "/api/issues/nonexistent/comments", HttpMethod.POST, withAuth(body), String.class);
        assertEquals(HttpStatus.NOT_FOUND, response.getStatusCode());
    }

    // --- GET /api/issues/{id}/activity ---

    @Test
    void getActivityReturnsOrderedTimeline() {
        ResponseEntity<List> response = restTemplate.exchange(
                "/api/issues/iss-001/activity", HttpMethod.GET, withAuth(), List.class);
        assertEquals(HttpStatus.OK, response.getStatusCode());
        List<Map<String, Object>> activities = response.getBody();
        assertTrue(activities.size() >= 2, "iss-001 should have at least 2 seeded activity entries");

        // Verify ordered by timestamp ascending
        for (int i = 1; i < activities.size(); i++) {
            String prev = (String) activities.get(i - 1).get("timestamp");
            String curr = (String) activities.get(i).get("timestamp");
            assertTrue(prev.compareTo(curr) <= 0, "Activity should be ordered by timestamp ascending");
        }
    }

    @Test
    void getActivityNotFoundReturns404() {
        ResponseEntity<String> response = restTemplate.exchange(
                "/api/issues/nonexistent/activity", HttpMethod.GET, withAuth(), String.class);
        assertEquals(HttpStatus.NOT_FOUND, response.getStatusCode());
    }
}
