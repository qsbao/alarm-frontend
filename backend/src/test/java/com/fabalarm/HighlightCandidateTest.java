package com.fabalarm;

import com.fabalarm.model.*;
import com.fabalarm.repository.IssueActivityRepository;
import com.fabalarm.repository.IssueRelationRepository;
import com.fabalarm.repository.IssueRepository;
import com.fabalarm.service.RelationService;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;

import java.time.Instant;
import java.util.ArrayList;
import java.util.List;
import java.util.Map;
import java.util.Optional;

import static org.junit.jupiter.api.Assertions.*;
import static org.mockito.Mockito.*;

/**
 * Unit tests for highlight candidate discovery logic.
 */
class HighlightCandidateTest {

    private IssueRepository issueRepository;
    private RelationService service;

    @BeforeEach
    void setup() {
        issueRepository = mock(IssueRepository.class);
        IssueRelationRepository relationRepository = mock(IssueRelationRepository.class);
        IssueActivityRepository activityRepository = mock(IssueActivityRepository.class);
        service = new RelationService(relationRepository, issueRepository, activityRepository);
    }

    private Issue makeIssue(String id, String product, String operation, IssueStatus status) {
        Issue issue = new Issue();
        issue.setId(id);
        issue.setTitle("Issue " + id);
        issue.setProduct(product);
        issue.setOperation(operation);
        issue.setStatus(status);
        issue.setDate(Instant.now());
        issue.setIssueTime(Instant.now());
        issue.setAlarmType(AlarmType.TempSpike);
        issue.setRiskLevel(RiskLevel.Medium);
        issue.setOwnerId("user-test");
        issue.setDepartment("Litho");
        return issue;
    }

    @Test
    void returnsUpstreamOperations() {
        Issue parent = makeIssue("p1", "A7-Litho", "Endpoint detect", IssueStatus.Investigating);
        when(issueRepository.findById("p1")).thenReturn(Optional.of(parent));
        when(issueRepository.findAll()).thenReturn(List.of(parent));

        List<Map<String, Object>> result = service.listHighlightCandidates("p1");

        // A7-Litho route: Lot start(0), Wafer transfer(1), Chamber pump-down(2), Recipe step 3(3), Endpoint detect(4), Vent cycle(5)
        // Parent at index 4, so 4 upstream operations
        assertEquals(4, result.size());
        Map<String, Object> firstOp = (Map<String, Object>) result.get(0).get("operation");
        assertEquals("Lot start", firstOp.get("name"));
        assertEquals("A7-Litho:Lot start", firstOp.get("id"));
        assertEquals(0, firstOp.get("order"));
    }

    @Test
    void returnsEmptyForFirstOperation() {
        Issue parent = makeIssue("p2", "A7-Litho", "Lot start", IssueStatus.Triage);
        when(issueRepository.findById("p2")).thenReturn(Optional.of(parent));

        List<Map<String, Object>> result = service.listHighlightCandidates("p2");
        assertTrue(result.isEmpty());
    }

    @Test
    void returnsEmptyForUnknownProduct() {
        Issue parent = makeIssue("p3", "UNKNOWN-Product", "Some op", IssueStatus.Triage);
        when(issueRepository.findById("p3")).thenReturn(Optional.of(parent));

        List<Map<String, Object>> result = service.listHighlightCandidates("p3");
        assertTrue(result.isEmpty());
    }

    @Test
    void groupsOpenIssuesByOperation() {
        Issue parent = makeIssue("p4", "A7-Litho", "Recipe step 3", IssueStatus.Investigating);
        Issue open1 = makeIssue("o1", "A7-Litho", "Lot start", IssueStatus.Triage);
        Issue open2 = makeIssue("o2", "A7-Litho", "Lot start", IssueStatus.Investigating);
        Issue open3 = makeIssue("o3", "A7-Litho", "Wafer transfer", IssueStatus.Triage);

        when(issueRepository.findById("p4")).thenReturn(Optional.of(parent));
        when(issueRepository.findAll()).thenReturn(List.of(parent, open1, open2, open3));

        List<Map<String, Object>> result = service.listHighlightCandidates("p4");

        // Parent at index 3, upstream: Lot start(0), Wafer transfer(1), Chamber pump-down(2)
        assertEquals(3, result.size());

        // Lot start should have 2 open issues
        List<Map<String, Object>> lotStartIssues =
                (List<Map<String, Object>>) result.get(0).get("existingOpenIssues");
        assertEquals(2, lotStartIssues.size());

        // Wafer transfer should have 1 open issue
        List<Map<String, Object>> waferTransferIssues =
                (List<Map<String, Object>>) result.get(1).get("existingOpenIssues");
        assertEquals(1, waferTransferIssues.size());

        // Chamber pump-down should have 0
        List<Map<String, Object>> chamberIssues =
                (List<Map<String, Object>>) result.get(2).get("existingOpenIssues");
        assertEquals(0, chamberIssues.size());
    }

    @Test
    void excludesResolvedAndClosedIssues() {
        Issue parent = makeIssue("p5", "A7-Litho", "Wafer transfer", IssueStatus.Investigating);
        Issue resolved = makeIssue("r1", "A7-Litho", "Lot start", IssueStatus.Resolved);
        Issue closed = makeIssue("c1", "A7-Litho", "Lot start", IssueStatus.Closed);
        Issue merged = makeIssue("m1", "A7-Litho", "Lot start", IssueStatus.Merged);

        when(issueRepository.findById("p5")).thenReturn(Optional.of(parent));
        when(issueRepository.findAll()).thenReturn(List.of(parent, resolved, closed, merged));

        List<Map<String, Object>> result = service.listHighlightCandidates("p5");
        assertEquals(1, result.size()); // Only Lot start

        List<Map<String, Object>> lotStartIssues =
                (List<Map<String, Object>>) result.get(0).get("existingOpenIssues");
        assertEquals(0, lotStartIssues.size(), "Resolved/Closed/Merged should be excluded");
    }

    @Test
    void excludesParentIssueFromResults() {
        // Parent is at "Wafer transfer" on A7-Litho. Create another issue at "Lot start" with same product
        Issue parent = makeIssue("p6", "A7-Litho", "Wafer transfer", IssueStatus.Triage);

        when(issueRepository.findById("p6")).thenReturn(Optional.of(parent));
        when(issueRepository.findAll()).thenReturn(List.of(parent));

        List<Map<String, Object>> result = service.listHighlightCandidates("p6");
        assertEquals(1, result.size());

        List<Map<String, Object>> lotStartIssues =
                (List<Map<String, Object>>) result.get(0).get("existingOpenIssues");
        boolean containsParent = lotStartIssues.stream()
                .anyMatch(i -> "p6".equals(i.get("id")));
        assertFalse(containsParent, "Parent should be excluded from results");
    }

    @Test
    void returnsEmptyForNonexistentIssue() {
        when(issueRepository.findById("nonexistent")).thenReturn(Optional.empty());
        List<Map<String, Object>> result = service.listHighlightCandidates("nonexistent");
        assertTrue(result.isEmpty());
    }
}
