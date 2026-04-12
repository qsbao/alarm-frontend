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
class RelationEndpointTest {

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

    // --- GET /api/issues/{id}/blockers (seeded data) ---

    @Test
    void listBlockersReturnsSeededBlockers() {
        ResponseEntity<List> response = restTemplate.exchange(
                "/api/issues/iss-001/blockers", HttpMethod.GET, withAuth(), List.class);
        assertEquals(HttpStatus.OK, response.getStatusCode());
        List<Map<String, Object>> blockers = response.getBody();
        assertTrue(blockers.size() >= 1, "iss-001 should have at least 1 seeded blocker");
        // Seeded: iss-001 blocks iss-004
        boolean hasIss004 = blockers.stream()
                .anyMatch(b -> "iss-004".equals(b.get("issueId")));
        assertTrue(hasIss004, "iss-001 should have iss-004 as blocker");
    }

    @Test
    void listBlockersReturnsTitleAndStatus() {
        ResponseEntity<List> response = restTemplate.exchange(
                "/api/issues/iss-001/blockers", HttpMethod.GET, withAuth(), List.class);
        List<Map<String, Object>> blockers = response.getBody();
        Map<String, Object> first = blockers.get(0);
        assertNotNull(first.get("issueId"));
        assertNotNull(first.get("title"));
        assertNotNull(first.get("status"));
    }

    @Test
    void listBlockersNotFoundReturns404() {
        ResponseEntity<String> response = restTemplate.exchange(
                "/api/issues/nonexistent/blockers", HttpMethod.GET, withAuth(), String.class);
        assertEquals(HttpStatus.NOT_FOUND, response.getStatusCode());
    }

    // --- POST + DELETE blockers ---

    @Test
    void addBlockerPersistsAndLogsActivity() {
        Map<String, String> body = Map.of("toIssueId", "iss-011");
        ResponseEntity<Map> response = restTemplate.exchange(
                "/api/issues/iss-006/blockers", HttpMethod.POST, withAuth(body), Map.class);
        assertEquals(HttpStatus.CREATED, response.getStatusCode());
        Map<String, Object> rel = response.getBody();
        assertEquals("iss-006", rel.get("fromIssueId"));
        assertEquals("iss-011", rel.get("toIssueId"));
        assertEquals("BLOCKER", rel.get("type"));

        // Verify blocker appears in list
        ResponseEntity<List> listResponse = restTemplate.exchange(
                "/api/issues/iss-006/blockers", HttpMethod.GET, withAuth(), List.class);
        List<Map<String, Object>> blockers = listResponse.getBody();
        boolean found = blockers.stream().anyMatch(b -> "iss-011".equals(b.get("issueId")));
        assertTrue(found, "Added blocker should appear in list");

        // Verify activity logged on parent
        ResponseEntity<List> actResponse = restTemplate.exchange(
                "/api/issues/iss-006/activity", HttpMethod.GET, withAuth(), List.class);
        List<Map<String, Object>> activities = actResponse.getBody();
        boolean hasBlockerAdded = activities.stream()
                .anyMatch(a -> "blocker_added".equals(a.get("type"))
                        && "iss-011".equals(a.get("blockerIssueId")));
        assertTrue(hasBlockerAdded, "Should have blocker_added activity entry");

        // Verify activity logged on blocker issue
        ResponseEntity<List> blockerActResponse = restTemplate.exchange(
                "/api/issues/iss-011/activity", HttpMethod.GET, withAuth(), List.class);
        List<Map<String, Object>> blockerActivities = blockerActResponse.getBody();
        boolean hasBlockerAddedOnTarget = blockerActivities.stream()
                .anyMatch(a -> "blocker_added".equals(a.get("type"))
                        && "iss-006".equals(a.get("blockerIssueId")));
        assertTrue(hasBlockerAddedOnTarget, "Blocker issue should have blocker_added activity");
    }

    @Test
    void addBlockerIsIdempotent() {
        Map<String, String> body = Map.of("toIssueId", "iss-014");
        // Add twice
        restTemplate.exchange("/api/issues/iss-011/blockers", HttpMethod.POST, withAuth(body), Map.class);
        restTemplate.exchange("/api/issues/iss-011/blockers", HttpMethod.POST, withAuth(body), Map.class);

        ResponseEntity<List> listResponse = restTemplate.exchange(
                "/api/issues/iss-011/blockers", HttpMethod.GET, withAuth(), List.class);
        List<Map<String, Object>> blockers = listResponse.getBody();
        long count = blockers.stream().filter(b -> "iss-014".equals(b.get("issueId"))).count();
        assertEquals(1, count, "Should have exactly one blocker relation");
    }

    @Test
    void removeBlockerPersistsAndLogsActivity() {
        // First add
        Map<String, String> body = Map.of("toIssueId", "iss-017");
        restTemplate.exchange("/api/issues/iss-014/blockers", HttpMethod.POST, withAuth(body), Map.class);

        // Then remove
        ResponseEntity<Void> deleteResponse = restTemplate.exchange(
                "/api/issues/iss-014/blockers/iss-017", HttpMethod.DELETE, withAuth(), Void.class);
        assertEquals(HttpStatus.NO_CONTENT, deleteResponse.getStatusCode());

        // Verify removed from list
        ResponseEntity<List> listResponse = restTemplate.exchange(
                "/api/issues/iss-014/blockers", HttpMethod.GET, withAuth(), List.class);
        List<Map<String, Object>> blockers = listResponse.getBody();
        boolean found = blockers.stream().anyMatch(b -> "iss-017".equals(b.get("issueId")));
        assertFalse(found, "Removed blocker should not appear in list");

        // Verify activity logged
        ResponseEntity<List> actResponse = restTemplate.exchange(
                "/api/issues/iss-014/activity", HttpMethod.GET, withAuth(), List.class);
        List<Map<String, Object>> activities = actResponse.getBody();
        boolean hasBlockerRemoved = activities.stream()
                .anyMatch(a -> "blocker_removed".equals(a.get("type"))
                        && "iss-017".equals(a.get("blockerIssueId")));
        assertTrue(hasBlockerRemoved, "Should have blocker_removed activity entry");
    }

    // --- Highlights ---

    @Test
    void addHighlightPersistsAndLogsActivity() {
        Map<String, String> body = Map.of("toIssueId", "iss-021");
        ResponseEntity<Map> response = restTemplate.exchange(
                "/api/issues/iss-004/highlights", HttpMethod.POST, withAuth(body), Map.class);
        assertEquals(HttpStatus.CREATED, response.getStatusCode());
        Map<String, Object> rel = response.getBody();
        assertEquals("iss-004", rel.get("fromIssueId"));
        assertEquals("iss-021", rel.get("toIssueId"));
        assertEquals("HIGHLIGHT", rel.get("type"));

        // Verify activity logged
        ResponseEntity<List> actResponse = restTemplate.exchange(
                "/api/issues/iss-004/activity", HttpMethod.GET, withAuth(), List.class);
        List<Map<String, Object>> activities = actResponse.getBody();
        boolean hasHighlightAdded = activities.stream()
                .anyMatch(a -> "highlight_added".equals(a.get("type"))
                        && "iss-021".equals(a.get("blockerIssueId")));
        assertTrue(hasHighlightAdded, "Should have highlight_added activity entry");
    }

    // --- Highlight candidates ---

    @Test
    void highlightCandidatesReturnsUpstreamOperations() {
        // iss-001 is on A7-Litho, operation "Exposure"
        // But iss-001's operation is "Exposure" which is NOT in the A7-Litho route
        // We need an issue on a known route operation.
        // Let's use a seeded issue that matches the product routes.

        // Create an issue on A7-Litho at "Endpoint detect" (index 4 in route)
        Map<String, String> body = Map.of(
                "id", "iss-test-hl-cand",
                "title", "Test highlight candidates",
                "alarmType", "TempSpike",
                "riskLevel", "High",
                "issueTime", "2025-06-15T10:00:00Z",
                "operation", "Endpoint detect",
                "product", "A7-Litho",
                "ownerId", "user-tanaka",
                "department", "Litho",
                "description", "Test highlight candidate discovery"
        );
        restTemplate.exchange("/api/issues", HttpMethod.POST, withAuth(body), Map.class);

        ResponseEntity<List> response = restTemplate.exchange(
                "/api/issues/iss-test-hl-cand/highlight-candidates",
                HttpMethod.GET, withAuth(), List.class);
        assertEquals(HttpStatus.OK, response.getStatusCode());
        List<Map<String, Object>> candidates = response.getBody();

        // A7-Litho route: [Lot start(0), Wafer transfer(1), Chamber pump-down(2), Recipe step 3(3), Endpoint detect(4), Vent cycle(5)]
        // Parent at Endpoint detect (idx=4), so upstream = [Lot start, Wafer transfer, Chamber pump-down, Recipe step 3]
        assertEquals(4, candidates.size(), "Should return 4 upstream operations");

        // Verify operation details
        Map<String, Object> first = candidates.get(0);
        Map<String, Object> operation = (Map<String, Object>) first.get("operation");
        assertEquals("Lot start", operation.get("name"));
        assertEquals("A7-Litho:Lot start", operation.get("id"));
        assertNotNull(first.get("existingOpenIssues"));
    }

    @Test
    void highlightCandidatesReturnsEmptyForFirstOperation() {
        Map<String, String> body = Map.of(
                "id", "iss-test-hl-first",
                "title", "Test first op",
                "alarmType", "TempSpike",
                "riskLevel", "Low",
                "issueTime", "2025-06-15T10:00:00Z",
                "operation", "Lot start",
                "product", "A7-Litho",
                "ownerId", "user-tanaka",
                "department", "Litho",
                "description", "At first position"
        );
        restTemplate.exchange("/api/issues", HttpMethod.POST, withAuth(body), Map.class);

        ResponseEntity<List> response = restTemplate.exchange(
                "/api/issues/iss-test-hl-first/highlight-candidates",
                HttpMethod.GET, withAuth(), List.class);
        assertEquals(HttpStatus.OK, response.getStatusCode());
        List<?> candidates = response.getBody();
        assertEquals(0, candidates.size(), "First operation should have no upstream candidates");
    }

    @Test
    void highlightCandidatesNotFoundReturns404() {
        ResponseEntity<String> response = restTemplate.exchange(
                "/api/issues/nonexistent/highlight-candidates",
                HttpMethod.GET, withAuth(), String.class);
        assertEquals(HttpStatus.NOT_FOUND, response.getStatusCode());
    }

    // --- Create highlighted issue ---

    @Test
    void createHighlightedIssueCreatesIssueAndRelation() {
        // Create parent issue on a known route
        Map<String, String> parentBody = Map.of(
                "id", "iss-test-hl-parent",
                "title", "Test highlight parent",
                "alarmType", "PressureDrop",
                "riskLevel", "High",
                "issueTime", "2025-06-15T10:00:00Z",
                "operation", "Endpoint detect",
                "product", "B3-Etch",
                "ownerId", "user-tanaka",
                "department", "Litho",
                "description", "Parent for highlight test"
        );
        restTemplate.exchange("/api/issues", HttpMethod.POST, withAuth(parentBody), Map.class);

        // Create highlighted issue for upstream operation
        Map<String, String> highlightBody = Map.of("targetOperationId", "B3-Etch:Lot start");
        ResponseEntity<Map> response = restTemplate.exchange(
                "/api/issues/iss-test-hl-parent/highlights/create",
                HttpMethod.POST, withAuth(highlightBody), Map.class);
        assertEquals(HttpStatus.CREATED, response.getStatusCode());

        Map<String, Object> result = response.getBody();
        assertEquals("iss-test-hl-parent", result.get("parentIssueId"));
        String childId = (String) result.get("childIssueId");
        assertNotNull(childId);

        // Verify child issue was created
        ResponseEntity<Map> childResponse = restTemplate.exchange(
                "/api/issues/" + childId, HttpMethod.GET, withAuth(), Map.class);
        assertEquals(HttpStatus.OK, childResponse.getStatusCode());
        Map<String, Object> child = childResponse.getBody();
        assertEquals("Highlight: Lot start on B3-Etch", child.get("title"));
        assertEquals("Lot start", child.get("operation"));
        assertEquals("B3-Etch", child.get("product"));
        assertEquals("Triage", child.get("status"));

        // Verify activity logged on parent (highlight_added)
        ResponseEntity<List> actResponse = restTemplate.exchange(
                "/api/issues/iss-test-hl-parent/activity", HttpMethod.GET, withAuth(), List.class);
        List<Map<String, Object>> activities = actResponse.getBody();
        boolean hasHighlightAdded = activities.stream()
                .anyMatch(a -> "highlight_added".equals(a.get("type"))
                        && childId.equals(a.get("blockerIssueId")));
        assertTrue(hasHighlightAdded, "Parent should have highlight_added activity");
    }
}
