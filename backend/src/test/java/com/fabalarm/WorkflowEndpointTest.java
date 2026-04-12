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
class WorkflowEndpointTest {

    @Autowired
    private TestRestTemplate restTemplate;

    // user-tanaka owns iss-001 (Litho dept)
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

    // Helper: create a fresh issue for workflow tests to avoid state conflicts
    private String createTestIssue(String issueId, String ownerId) {
        Map<String, String> body = Map.of(
                "id", issueId,
                "title", "Test workflow issue " + issueId,
                "alarmType", "TempSpike",
                "riskLevel", "High",
                "issueTime", "2025-06-15T10:00:00Z",
                "operation", "Endpoint detect",
                "product", "A7-Litho",
                "ownerId", ownerId,
                "department", "Litho",
                "description", "Test issue for workflow"
        );
        restTemplate.exchange("/api/issues", HttpMethod.POST,
                withAuth(ownerId, body), Map.class);
        return issueId;
    }

    private String createTestIssueWithRisk(String issueId, String ownerId, String riskLevel) {
        Map<String, String> body = Map.of(
                "id", issueId,
                "title", "Test workflow issue " + issueId,
                "alarmType", "TempSpike",
                "riskLevel", riskLevel,
                "issueTime", "2025-06-15T10:00:00Z",
                "operation", "Endpoint detect",
                "product", "A7-Litho",
                "ownerId", ownerId,
                "department", "Litho",
                "description", "Test issue for workflow"
        );
        restTemplate.exchange("/api/issues", HttpMethod.POST,
                withAuth(ownerId, body), Map.class);
        return issueId;
    }

    // --- GET /api/workflow-definitions ---

    @Test
    void listDefinitionsReturnsGenericLinearAndSpcOoc() {
        ResponseEntity<List> response = restTemplate.exchange(
                "/api/workflow-definitions", HttpMethod.GET,
                withAuth("user-tanaka"), List.class);
        assertEquals(HttpStatus.OK, response.getStatusCode());
        List<Map<String, Object>> defs = response.getBody();
        assertEquals(2, defs.size());
        assertEquals("generic_linear_v1", defs.get(0).get("id"));
        assertEquals("Generic Linear", defs.get(0).get("name"));
        assertEquals("spc_ooc_branching_v1", defs.get(1).get("id"));
        assertEquals("SPC OOC Branching", defs.get(1).get("name"));
    }

    @Test
    void definitionsIncludeStepDetails() {
        ResponseEntity<List> response = restTemplate.exchange(
                "/api/workflow-definitions", HttpMethod.GET,
                withAuth("user-tanaka"), List.class);
        List<Map<String, Object>> defs = response.getBody();
        Map<String, Object> genericLinear = defs.get(0);
        List<Map<String, Object>> steps = (List<Map<String, Object>>) genericLinear.get("steps");
        assertEquals(3, steps.size());
        assertEquals("chart_owner_comment", steps.get(0).get("id"));
        assertEquals("Chart Owner Comment", steps.get(0).get("label"));
    }

    // --- POST /api/issues/{id}/workflow (attach) ---

    @Test
    void attachWorkflowCreatesInstanceAndActivatesRootSteps() {
        String issueId = createTestIssue("iss-wf-att-1", "user-tanaka");

        Map<String, String> body = Map.of("definitionId", "generic_linear_v1");
        ResponseEntity<Map> response = restTemplate.exchange(
                "/api/issues/" + issueId + "/workflow", HttpMethod.POST,
                withAuth("user-tanaka", body), Map.class);
        assertEquals(HttpStatus.CREATED, response.getStatusCode());

        Map<String, Object> workflow = response.getBody();
        assertEquals("generic_linear_v1", workflow.get("definitionId"));

        Map<String, Object> stepStates = (Map<String, Object>) workflow.get("stepStates");
        Map<String, Object> chartOwner = (Map<String, Object>) stepStates.get("chart_owner_comment");
        assertEquals("ongoing", chartOwner.get("status"));

        Map<String, Object> resolved = (Map<String, Object>) stepStates.get("resolved");
        assertEquals("pending", resolved.get("status"));

        Map<String, Object> closed = (Map<String, Object>) stepStates.get("closed");
        assertEquals("pending", closed.get("status"));
    }

    @Test
    void attachWorkflowDerivesIssueStatusToInvestigating() {
        String issueId = createTestIssue("iss-wf-att-2", "user-tanaka");

        Map<String, String> body = Map.of("definitionId", "generic_linear_v1");
        restTemplate.exchange("/api/issues/" + issueId + "/workflow", HttpMethod.POST,
                withAuth("user-tanaka", body), Map.class);

        // chart_owner_comment has impliesStatus=Investigating but it's ongoing not completed
        // So status stays Triage (no completed step implies anything)
        // Actually, the TS reference activates root steps as ongoing, and deriveStatus only
        // looks at completed steps. So status remains Triage until chart_owner_comment is completed.
        ResponseEntity<Map> issueRes = restTemplate.exchange(
                "/api/issues/" + issueId, HttpMethod.GET,
                withAuth("user-tanaka"), Map.class);
        assertEquals("Triage", issueRes.getBody().get("status"));
    }

    @Test
    void attachWorkflowConflictsWhenAlreadyAttached() {
        String issueId = createTestIssue("iss-wf-att-dup", "user-tanaka");

        Map<String, String> body = Map.of("definitionId", "generic_linear_v1");
        restTemplate.exchange("/api/issues/" + issueId + "/workflow", HttpMethod.POST,
                withAuth("user-tanaka", body), Map.class);

        // Second attach should fail
        ResponseEntity<Map> response = restTemplate.exchange(
                "/api/issues/" + issueId + "/workflow", HttpMethod.POST,
                withAuth("user-tanaka", body), Map.class);
        assertEquals(HttpStatus.CONFLICT, response.getStatusCode());
    }

    @Test
    void attachWorkflowLogsActivity() {
        String issueId = createTestIssue("iss-wf-att-act", "user-tanaka");

        Map<String, String> body = Map.of("definitionId", "generic_linear_v1");
        restTemplate.exchange("/api/issues/" + issueId + "/workflow", HttpMethod.POST,
                withAuth("user-tanaka", body), Map.class);

        ResponseEntity<List> actResponse = restTemplate.exchange(
                "/api/issues/" + issueId + "/activity", HttpMethod.GET,
                withAuth("user-tanaka"), List.class);
        List<Map<String, Object>> activities = actResponse.getBody();
        boolean hasWorkflowTransition = activities.stream()
                .anyMatch(a -> "workflow_transition".equals(a.get("type"))
                        && "attach".equals(a.get("workflowAction"))
                        && "generic_linear_v1".equals(a.get("workflowDefinitionId")));
        assertTrue(hasWorkflowTransition, "Should have workflow_transition activity for attach");
    }

    // --- GET /api/issues/{id}/workflow ---

    @Test
    void getWorkflowReturnsCurrentState() {
        String issueId = createTestIssue("iss-wf-get-1", "user-tanaka");

        Map<String, String> body = Map.of("definitionId", "generic_linear_v1");
        restTemplate.exchange("/api/issues/" + issueId + "/workflow", HttpMethod.POST,
                withAuth("user-tanaka", body), Map.class);

        ResponseEntity<Map> response = restTemplate.exchange(
                "/api/issues/" + issueId + "/workflow", HttpMethod.GET,
                withAuth("user-tanaka"), Map.class);
        assertEquals(HttpStatus.OK, response.getStatusCode());
        assertEquals("generic_linear_v1", response.getBody().get("definitionId"));
    }

    @Test
    void getWorkflowReturns404WhenNone() {
        String issueId = createTestIssue("iss-wf-get-none", "user-tanaka");

        ResponseEntity<String> response = restTemplate.exchange(
                "/api/issues/" + issueId + "/workflow", HttpMethod.GET,
                withAuth("user-tanaka"), String.class);
        assertEquals(HttpStatus.NOT_FOUND, response.getStatusCode());
    }

    // --- Complete step ---

    @Test
    void completeStepTransitionsAndActivatesDownstream() {
        String issueId = createTestIssue("iss-wf-comp-1", "user-tanaka");

        Map<String, String> attachBody = Map.of("definitionId", "generic_linear_v1");
        restTemplate.exchange("/api/issues/" + issueId + "/workflow", HttpMethod.POST,
                withAuth("user-tanaka", attachBody), Map.class);

        // Complete chart_owner_comment (no gate, no payload required)
        ResponseEntity<Map> response = restTemplate.exchange(
                "/api/issues/" + issueId + "/workflow/steps/chart_owner_comment/complete",
                HttpMethod.POST, withAuth("user-tanaka", Map.of()), Map.class);
        assertEquals(HttpStatus.OK, response.getStatusCode());

        Map<String, Object> stepStates = (Map<String, Object>) response.getBody().get("stepStates");
        Map<String, Object> chartOwner = (Map<String, Object>) stepStates.get("chart_owner_comment");
        assertEquals("completed", chartOwner.get("status"));

        // resolved should now be ongoing
        Map<String, Object> resolved = (Map<String, Object>) stepStates.get("resolved");
        assertEquals("ongoing", resolved.get("status"));

        // Issue status should now be Investigating
        ResponseEntity<Map> issueRes = restTemplate.exchange(
                "/api/issues/" + issueId, HttpMethod.GET,
                withAuth("user-tanaka"), Map.class);
        assertEquals("Investigating", issueRes.getBody().get("status"));
    }

    @Test
    void completeStepWithPayloadPersists() {
        String issueId = createTestIssue("iss-wf-comp-pld", "user-tanaka");

        Map<String, String> attachBody = Map.of("definitionId", "generic_linear_v1");
        restTemplate.exchange("/api/issues/" + issueId + "/workflow", HttpMethod.POST,
                withAuth("user-tanaka", attachBody), Map.class);

        // Complete chart_owner_comment
        restTemplate.exchange(
                "/api/issues/" + issueId + "/workflow/steps/chart_owner_comment/complete",
                HttpMethod.POST, withAuth("user-tanaka", Map.of()), Map.class);

        // Complete resolved with payload
        Map<String, Object> payload = Map.of("comment", "Issue resolved");
        ResponseEntity<Map> response = restTemplate.exchange(
                "/api/issues/" + issueId + "/workflow/steps/resolved/complete",
                HttpMethod.POST, withAuth("user-tanaka", payload), Map.class);
        assertEquals(HttpStatus.OK, response.getStatusCode());

        Map<String, Object> stepStates = (Map<String, Object>) response.getBody().get("stepStates");
        Map<String, Object> resolved = (Map<String, Object>) stepStates.get("resolved");
        assertEquals("completed", resolved.get("status"));
        Map<String, Object> savedPayload = (Map<String, Object>) resolved.get("payload");
        assertEquals("Issue resolved", savedPayload.get("comment"));

        // Issue status should be Resolved
        ResponseEntity<Map> issueRes = restTemplate.exchange(
                "/api/issues/" + issueId, HttpMethod.GET,
                withAuth("user-tanaka"), Map.class);
        assertEquals("Resolved", issueRes.getBody().get("status"));
    }

    @Test
    void completeStepLogsActivity() {
        String issueId = createTestIssue("iss-wf-comp-act", "user-tanaka");

        Map<String, String> attachBody = Map.of("definitionId", "generic_linear_v1");
        restTemplate.exchange("/api/issues/" + issueId + "/workflow", HttpMethod.POST,
                withAuth("user-tanaka", attachBody), Map.class);

        restTemplate.exchange(
                "/api/issues/" + issueId + "/workflow/steps/chart_owner_comment/complete",
                HttpMethod.POST, withAuth("user-tanaka", Map.of()), Map.class);

        ResponseEntity<List> actResponse = restTemplate.exchange(
                "/api/issues/" + issueId + "/activity", HttpMethod.GET,
                withAuth("user-tanaka"), List.class);
        List<Map<String, Object>> activities = actResponse.getBody();
        boolean hasComplete = activities.stream()
                .anyMatch(a -> "workflow_transition".equals(a.get("type"))
                        && "complete".equals(a.get("workflowAction"))
                        && "chart_owner_comment".equals(a.get("workflowStepId")));
        assertTrue(hasComplete, "Should have workflow_transition activity for complete");
    }

    // --- Permission gate ---

    @Test
    void permissionGateRejectsUnauthorizedActor() {
        String issueId = createTestIssue("iss-wf-gate-1", "user-tanaka");

        Map<String, String> attachBody = Map.of("definitionId", "generic_linear_v1");
        restTemplate.exchange("/api/issues/" + issueId + "/workflow", HttpMethod.POST,
                withAuth("user-tanaka", attachBody), Map.class);

        // Complete chart_owner_comment first
        restTemplate.exchange(
                "/api/issues/" + issueId + "/workflow/steps/chart_owner_comment/complete",
                HttpMethod.POST, withAuth("user-tanaka", Map.of()), Map.class);

        // resolved has gate: user must be issue owner (user-tanaka)
        // Try with user-chen (not the owner) → should get 403
        ResponseEntity<Map> response = restTemplate.exchange(
                "/api/issues/" + issueId + "/workflow/steps/resolved/complete",
                HttpMethod.POST, withAuth("user-chen", Map.of()), Map.class);
        assertEquals(HttpStatus.FORBIDDEN, response.getStatusCode());
    }

    @Test
    void permissionGateAllowsOwner() {
        String issueId = createTestIssue("iss-wf-gate-2", "user-tanaka");

        Map<String, String> attachBody = Map.of("definitionId", "generic_linear_v1");
        restTemplate.exchange("/api/issues/" + issueId + "/workflow", HttpMethod.POST,
                withAuth("user-tanaka", attachBody), Map.class);

        // Complete chart_owner_comment
        restTemplate.exchange(
                "/api/issues/" + issueId + "/workflow/steps/chart_owner_comment/complete",
                HttpMethod.POST, withAuth("user-tanaka", Map.of()), Map.class);

        // Owner completes resolved → should succeed
        ResponseEntity<Map> response = restTemplate.exchange(
                "/api/issues/" + issueId + "/workflow/steps/resolved/complete",
                HttpMethod.POST, withAuth("user-tanaka", Map.of()), Map.class);
        assertEquals(HttpStatus.OK, response.getStatusCode());
    }

    // --- Blocker gate ---

    @Test
    void blockerGatePreventsCompletionWithUnresolvedBlockers() {
        String issueId = createTestIssue("iss-wf-blk-1", "user-tanaka");
        String blockerId = createTestIssue("iss-wf-blk-ch", "user-tanaka");

        // Attach workflow
        Map<String, String> attachBody = Map.of("definitionId", "generic_linear_v1");
        restTemplate.exchange("/api/issues/" + issueId + "/workflow", HttpMethod.POST,
                withAuth("user-tanaka", attachBody), Map.class);

        // Add blocker (child is still Triage = unresolved)
        Map<String, String> blockerBody = Map.of("toIssueId", blockerId);
        restTemplate.exchange("/api/issues/" + issueId + "/blockers", HttpMethod.POST,
                withAuth("user-tanaka", blockerBody), Map.class);

        // Complete chart_owner_comment
        restTemplate.exchange(
                "/api/issues/" + issueId + "/workflow/steps/chart_owner_comment/complete",
                HttpMethod.POST, withAuth("user-tanaka", Map.of()), Map.class);

        // Try to complete resolved → should fail (blocker is unresolved)
        ResponseEntity<Map> response = restTemplate.exchange(
                "/api/issues/" + issueId + "/workflow/steps/resolved/complete",
                HttpMethod.POST, withAuth("user-tanaka", Map.of()), Map.class);
        assertEquals(HttpStatus.CONFLICT, response.getStatusCode());
        assertTrue(response.getBody().get("error").toString().contains("unresolved blockers"));
    }

    // --- Skip step ---

    @Test
    void skipStepTransitionsAndActivatesDownstream() {
        // SPC OOC with Low risk — meeting is skippable
        String issueId = createTestIssueWithRisk("iss-wf-skip-1", "user-tanaka", "Low");

        Map<String, String> attachBody = Map.of("definitionId", "spc_ooc_branching_v1");
        restTemplate.exchange("/api/issues/" + issueId + "/workflow", HttpMethod.POST,
                withAuth("user-tanaka", attachBody), Map.class);

        // Complete chart_owner_comment → activates l5_review + pi_comment (parallel)
        restTemplate.exchange(
                "/api/issues/" + issueId + "/workflow/steps/chart_owner_comment/complete",
                HttpMethod.POST, withAuth("user-tanaka", Map.of()), Map.class);

        // Complete l5_review → activates l4_review
        restTemplate.exchange(
                "/api/issues/" + issueId + "/workflow/steps/l5_review/complete",
                HttpMethod.POST, withAuth("user-tanaka", Map.of()), Map.class);

        // Complete l4_review
        restTemplate.exchange(
                "/api/issues/" + issueId + "/workflow/steps/l4_review/complete",
                HttpMethod.POST, withAuth("user-tanaka", Map.of()), Map.class);

        // Complete pi_comment
        restTemplate.exchange(
                "/api/issues/" + issueId + "/workflow/steps/pi_comment/complete",
                HttpMethod.POST, withAuth("user-tanaka", Map.of()), Map.class);

        // Skip attach_report → meeting should now be ongoing (l4 + pi + attach_report done)
        restTemplate.exchange(
                "/api/issues/" + issueId + "/workflow/steps/attach_report/skip",
                HttpMethod.POST, withAuth("user-tanaka"), Map.class);

        // Skip meeting (risk=Low, so skippable)
        ResponseEntity<Map> response = restTemplate.exchange(
                "/api/issues/" + issueId + "/workflow/steps/meeting/skip",
                HttpMethod.POST, withAuth("user-tanaka"), Map.class);
        assertEquals(HttpStatus.OK, response.getStatusCode());

        Map<String, Object> stepStates = (Map<String, Object>) response.getBody().get("stepStates");
        Map<String, Object> meeting = (Map<String, Object>) stepStates.get("meeting");
        assertEquals("skipped", meeting.get("status"));

        // resolved should be ongoing now
        Map<String, Object> resolved = (Map<String, Object>) stepStates.get("resolved");
        assertEquals("ongoing", resolved.get("status"));
    }

    @Test
    void skipStepRejectsNonSkippableStep() {
        String issueId = createTestIssue("iss-wf-sk-rej", "user-tanaka");

        Map<String, String> attachBody = Map.of("definitionId", "generic_linear_v1");
        restTemplate.exchange("/api/issues/" + issueId + "/workflow", HttpMethod.POST,
                withAuth("user-tanaka", attachBody), Map.class);

        // chart_owner_comment is not skippable
        ResponseEntity<Map> response = restTemplate.exchange(
                "/api/issues/" + issueId + "/workflow/steps/chart_owner_comment/skip",
                HttpMethod.POST, withAuth("user-tanaka"), Map.class);
        assertEquals(HttpStatus.CONFLICT, response.getStatusCode());
    }

    @Test
    void skipStepRejectsHighRiskMeetingSkip() {
        // SPC OOC with High risk — meeting is NOT skippable
        String issueId = createTestIssueWithRisk("iss-wf-sk-hi", "user-tanaka", "High");

        Map<String, String> attachBody = Map.of("definitionId", "spc_ooc_branching_v1");
        restTemplate.exchange("/api/issues/" + issueId + "/workflow", HttpMethod.POST,
                withAuth("user-tanaka", attachBody), Map.class);

        // Complete through to meeting being ongoing
        restTemplate.exchange("/api/issues/" + issueId + "/workflow/steps/chart_owner_comment/complete",
                HttpMethod.POST, withAuth("user-tanaka", Map.of()), Map.class);
        restTemplate.exchange("/api/issues/" + issueId + "/workflow/steps/l5_review/complete",
                HttpMethod.POST, withAuth("user-tanaka", Map.of()), Map.class);
        restTemplate.exchange("/api/issues/" + issueId + "/workflow/steps/l4_review/complete",
                HttpMethod.POST, withAuth("user-tanaka", Map.of()), Map.class);
        restTemplate.exchange("/api/issues/" + issueId + "/workflow/steps/pi_comment/complete",
                HttpMethod.POST, withAuth("user-tanaka", Map.of()), Map.class);
        restTemplate.exchange("/api/issues/" + issueId + "/workflow/steps/attach_report/skip",
                HttpMethod.POST, withAuth("user-tanaka"), Map.class);

        // Try to skip meeting (risk=High, not skippable)
        ResponseEntity<Map> response = restTemplate.exchange(
                "/api/issues/" + issueId + "/workflow/steps/meeting/skip",
                HttpMethod.POST, withAuth("user-tanaka"), Map.class);
        assertEquals(HttpStatus.CONFLICT, response.getStatusCode());
    }

    // --- Revive step ---

    @Test
    void reviveStepMovesSkippedToOngoing() {
        String issueId = createTestIssueWithRisk("iss-wf-revive-1", "user-tanaka", "Low");

        Map<String, String> attachBody = Map.of("definitionId", "spc_ooc_branching_v1");
        restTemplate.exchange("/api/issues/" + issueId + "/workflow", HttpMethod.POST,
                withAuth("user-tanaka", attachBody), Map.class);

        // Progress to meeting being ongoing
        restTemplate.exchange("/api/issues/" + issueId + "/workflow/steps/chart_owner_comment/complete",
                HttpMethod.POST, withAuth("user-tanaka", Map.of()), Map.class);
        restTemplate.exchange("/api/issues/" + issueId + "/workflow/steps/l5_review/complete",
                HttpMethod.POST, withAuth("user-tanaka", Map.of()), Map.class);
        restTemplate.exchange("/api/issues/" + issueId + "/workflow/steps/l4_review/complete",
                HttpMethod.POST, withAuth("user-tanaka", Map.of()), Map.class);
        restTemplate.exchange("/api/issues/" + issueId + "/workflow/steps/pi_comment/complete",
                HttpMethod.POST, withAuth("user-tanaka", Map.of()), Map.class);
        restTemplate.exchange("/api/issues/" + issueId + "/workflow/steps/attach_report/skip",
                HttpMethod.POST, withAuth("user-tanaka"), Map.class);

        // Skip meeting
        restTemplate.exchange("/api/issues/" + issueId + "/workflow/steps/meeting/skip",
                HttpMethod.POST, withAuth("user-tanaka"), Map.class);

        // Revive meeting
        ResponseEntity<Map> response = restTemplate.exchange(
                "/api/issues/" + issueId + "/workflow/steps/meeting/revive",
                HttpMethod.POST, withAuth("user-tanaka"), Map.class);
        assertEquals(HttpStatus.OK, response.getStatusCode());

        Map<String, Object> stepStates = (Map<String, Object>) response.getBody().get("stepStates");
        Map<String, Object> meeting = (Map<String, Object>) stepStates.get("meeting");
        assertEquals("ongoing", meeting.get("status"));
    }

    @Test
    void reviveStepRejectsAfterResolvedCompleted() {
        String issueId = createTestIssueWithRisk("iss-wf-rv-blk", "user-tanaka", "Low");

        Map<String, String> attachBody = Map.of("definitionId", "spc_ooc_branching_v1");
        restTemplate.exchange("/api/issues/" + issueId + "/workflow", HttpMethod.POST,
                withAuth("user-tanaka", attachBody), Map.class);

        // Progress and skip meeting
        restTemplate.exchange("/api/issues/" + issueId + "/workflow/steps/chart_owner_comment/complete",
                HttpMethod.POST, withAuth("user-tanaka", Map.of()), Map.class);
        restTemplate.exchange("/api/issues/" + issueId + "/workflow/steps/l5_review/complete",
                HttpMethod.POST, withAuth("user-tanaka", Map.of()), Map.class);
        restTemplate.exchange("/api/issues/" + issueId + "/workflow/steps/l4_review/complete",
                HttpMethod.POST, withAuth("user-tanaka", Map.of()), Map.class);
        restTemplate.exchange("/api/issues/" + issueId + "/workflow/steps/pi_comment/complete",
                HttpMethod.POST, withAuth("user-tanaka", Map.of()), Map.class);
        restTemplate.exchange("/api/issues/" + issueId + "/workflow/steps/attach_report/skip",
                HttpMethod.POST, withAuth("user-tanaka"), Map.class);

        // Skip meeting, then complete resolved
        restTemplate.exchange("/api/issues/" + issueId + "/workflow/steps/meeting/skip",
                HttpMethod.POST, withAuth("user-tanaka"), Map.class);
        restTemplate.exchange("/api/issues/" + issueId + "/workflow/steps/resolved/complete",
                HttpMethod.POST, withAuth("user-tanaka", Map.of()), Map.class);

        // Try to revive meeting after resolved is completed → should fail
        ResponseEntity<Map> response = restTemplate.exchange(
                "/api/issues/" + issueId + "/workflow/steps/meeting/revive",
                HttpMethod.POST, withAuth("user-tanaka"), Map.class);
        assertEquals(HttpStatus.CONFLICT, response.getStatusCode());
    }

    // --- Edit step ---

    @Test
    void editStepUpdatesPayloadOnCompletedStep() {
        String issueId = createTestIssue("iss-wf-edit-1", "user-tanaka");

        Map<String, String> attachBody = Map.of("definitionId", "generic_linear_v1");
        restTemplate.exchange("/api/issues/" + issueId + "/workflow", HttpMethod.POST,
                withAuth("user-tanaka", attachBody), Map.class);

        // Complete chart_owner_comment, then resolved with initial payload
        restTemplate.exchange("/api/issues/" + issueId + "/workflow/steps/chart_owner_comment/complete",
                HttpMethod.POST, withAuth("user-tanaka", Map.of()), Map.class);
        restTemplate.exchange("/api/issues/" + issueId + "/workflow/steps/resolved/complete",
                HttpMethod.POST, withAuth("user-tanaka", Map.of("comment", "First")), Map.class);

        // Edit the resolved step payload
        Map<String, Object> newPayload = Map.of("comment", "Updated comment");
        ResponseEntity<Map> response = restTemplate.exchange(
                "/api/issues/" + issueId + "/workflow/steps/resolved/edit",
                HttpMethod.POST, withAuth("user-tanaka", newPayload), Map.class);
        assertEquals(HttpStatus.OK, response.getStatusCode());

        Map<String, Object> stepStates = (Map<String, Object>) response.getBody().get("stepStates");
        Map<String, Object> resolved = (Map<String, Object>) stepStates.get("resolved");
        Map<String, Object> payload = (Map<String, Object>) resolved.get("payload");
        assertEquals("Updated comment", payload.get("comment"));
    }

    @Test
    void editStepRejectsNonOwner() {
        String issueId = createTestIssue("iss-wf-ed-rej", "user-tanaka");

        Map<String, String> attachBody = Map.of("definitionId", "generic_linear_v1");
        restTemplate.exchange("/api/issues/" + issueId + "/workflow", HttpMethod.POST,
                withAuth("user-tanaka", attachBody), Map.class);

        restTemplate.exchange("/api/issues/" + issueId + "/workflow/steps/chart_owner_comment/complete",
                HttpMethod.POST, withAuth("user-tanaka", Map.of()), Map.class);
        restTemplate.exchange("/api/issues/" + issueId + "/workflow/steps/resolved/complete",
                HttpMethod.POST, withAuth("user-tanaka", Map.of("comment", "First")), Map.class);

        // Non-owner tries to edit resolved → 403
        ResponseEntity<Map> response = restTemplate.exchange(
                "/api/issues/" + issueId + "/workflow/steps/resolved/edit",
                HttpMethod.POST, withAuth("user-chen", Map.of("comment", "Hijack")), Map.class);
        assertEquals(HttpStatus.FORBIDDEN, response.getStatusCode());
    }

    // --- Invalid transition ---

    @Test
    void completeStepRejectsPendingStep() {
        String issueId = createTestIssue("iss-wf-inv-1", "user-tanaka");

        Map<String, String> attachBody = Map.of("definitionId", "generic_linear_v1");
        restTemplate.exchange("/api/issues/" + issueId + "/workflow", HttpMethod.POST,
                withAuth("user-tanaka", attachBody), Map.class);

        // Try to complete resolved while chart_owner_comment is still ongoing
        ResponseEntity<Map> response = restTemplate.exchange(
                "/api/issues/" + issueId + "/workflow/steps/resolved/complete",
                HttpMethod.POST, withAuth("user-tanaka", Map.of()), Map.class);
        assertEquals(HttpStatus.CONFLICT, response.getStatusCode());
    }

    // --- DAG resolution with parallel steps (SpcOocBranching) ---

    @Test
    void spcOocBranchingDAGResolutionWithParallelPaths() {
        String issueId = createTestIssue("iss-wf-dag-1", "user-tanaka");

        Map<String, String> attachBody = Map.of("definitionId", "spc_ooc_branching_v1");
        ResponseEntity<Map> attachRes = restTemplate.exchange(
                "/api/issues/" + issueId + "/workflow", HttpMethod.POST,
                withAuth("user-tanaka", attachBody), Map.class);
        assertEquals(HttpStatus.CREATED, attachRes.getStatusCode());

        // After attach: chart_owner_comment should be ongoing, everything else pending
        Map<String, Object> stepStates = (Map<String, Object>) attachRes.getBody().get("stepStates");
        assertEquals("ongoing", ((Map) stepStates.get("chart_owner_comment")).get("status"));
        assertEquals("pending", ((Map) stepStates.get("l5_review")).get("status"));
        assertEquals("pending", ((Map) stepStates.get("pi_comment")).get("status"));
        assertEquals("pending", ((Map) stepStates.get("attach_report")).get("status"));

        // Complete chart_owner_comment → should activate l5_review, pi_comment, AND attach_report (parallel)
        ResponseEntity<Map> completeRes = restTemplate.exchange(
                "/api/issues/" + issueId + "/workflow/steps/chart_owner_comment/complete",
                HttpMethod.POST, withAuth("user-tanaka", Map.of()), Map.class);
        stepStates = (Map<String, Object>) completeRes.getBody().get("stepStates");
        assertEquals("ongoing", ((Map) stepStates.get("l5_review")).get("status"));
        assertEquals("ongoing", ((Map) stepStates.get("pi_comment")).get("status"));
        assertEquals("ongoing", ((Map) stepStates.get("attach_report")).get("status"));
        assertEquals("pending", ((Map) stepStates.get("l4_review")).get("status")); // needs l5 first
        assertEquals("pending", ((Map) stepStates.get("meeting")).get("status")); // needs l4 + pi + attach_report

        // Complete l5_review → activates l4_review
        completeRes = restTemplate.exchange(
                "/api/issues/" + issueId + "/workflow/steps/l5_review/complete",
                HttpMethod.POST, withAuth("user-tanaka", Map.of()), Map.class);
        stepStates = (Map<String, Object>) completeRes.getBody().get("stepStates");
        assertEquals("ongoing", ((Map) stepStates.get("l4_review")).get("status"));
        assertEquals("pending", ((Map) stepStates.get("meeting")).get("status")); // still needs pi

        // Complete l4_review (meeting still needs pi_comment + attach_report)
        restTemplate.exchange("/api/issues/" + issueId + "/workflow/steps/l4_review/complete",
                HttpMethod.POST, withAuth("user-tanaka", Map.of()), Map.class);

        // Complete pi_comment (meeting still needs attach_report)
        completeRes = restTemplate.exchange(
                "/api/issues/" + issueId + "/workflow/steps/pi_comment/complete",
                HttpMethod.POST, withAuth("user-tanaka", Map.of()), Map.class);
        stepStates = (Map<String, Object>) completeRes.getBody().get("stepStates");
        assertEquals("pending", ((Map) stepStates.get("meeting")).get("status"));

        // Skip attach_report → meeting should now be ongoing (l4 + pi + attach_report done)
        completeRes = restTemplate.exchange(
                "/api/issues/" + issueId + "/workflow/steps/attach_report/skip",
                HttpMethod.POST, withAuth("user-tanaka"), Map.class);
        stepStates = (Map<String, Object>) completeRes.getBody().get("stepStates");
        assertEquals("ongoing", ((Map) stepStates.get("meeting")).get("status"));
    }

    // --- Full workflow completion ---

    @Test
    void fullGenericLinearCompletionSetsClosedStatus() {
        String issueId = createTestIssue("iss-wf-full-1", "user-tanaka");

        Map<String, String> attachBody = Map.of("definitionId", "generic_linear_v1");
        restTemplate.exchange("/api/issues/" + issueId + "/workflow", HttpMethod.POST,
                withAuth("user-tanaka", attachBody), Map.class);

        restTemplate.exchange("/api/issues/" + issueId + "/workflow/steps/chart_owner_comment/complete",
                HttpMethod.POST, withAuth("user-tanaka", Map.of()), Map.class);
        restTemplate.exchange("/api/issues/" + issueId + "/workflow/steps/resolved/complete",
                HttpMethod.POST, withAuth("user-tanaka", Map.of()), Map.class);
        ResponseEntity<Map> closeRes = restTemplate.exchange(
                "/api/issues/" + issueId + "/workflow/steps/closed/complete",
                HttpMethod.POST, withAuth("user-tanaka", Map.of()), Map.class);

        Map<String, Object> workflow = closeRes.getBody();
        assertNotNull(workflow.get("completedAt"), "Workflow should have completedAt when terminal");

        // Issue status should be Closed
        ResponseEntity<Map> issueRes = restTemplate.exchange(
                "/api/issues/" + issueId, HttpMethod.GET,
                withAuth("user-tanaka"), Map.class);
        assertEquals("Closed", issueRes.getBody().get("status"));
    }
}
