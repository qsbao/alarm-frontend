package com.fabalarm;

import com.fabalarm.repository.IssueActivityRepository;
import com.fabalarm.repository.IssueRepository;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.context.SpringBootTest;

import static org.junit.jupiter.api.Assertions.*;

@SpringBootTest
class IssueSeedDataTest {

    @Autowired
    private IssueRepository issueRepository;

    @Autowired
    private IssueActivityRepository issueActivityRepository;

    @Test
    void seedDataLoads25Issues() {
        assertEquals(25, issueRepository.count());
    }

    @Test
    void seedDataContainsExpectedIssue() {
        var issue = issueRepository.findById("iss-001");
        assertTrue(issue.isPresent());
        assertEquals("Temperature excursion on LITHO-07", issue.get().getTitle());
        assertEquals("Litho", issue.get().getDepartment());
        assertEquals("LITHO", issue.get().getModule().name());
        assertEquals("Critical", issue.get().getRiskLevel().name());
        assertEquals("Investigating", issue.get().getStatus().name());
    }

    @Test
    void seedDataLoadsIssueActivities() {
        long activityCount = issueActivityRepository.count();
        assertTrue(activityCount >= 25, "Should have at least one activity per issue (created)");
    }

    @Test
    void seedDataIss001HasMultipleActivities() {
        var activities = issueActivityRepository.findByIssueIdOrderByTimestampAsc("iss-001");
        assertTrue(activities.size() >= 3, "iss-001 should have created + comment + assignment");
        assertEquals("created", activities.get(0).getType().name());
    }
}
