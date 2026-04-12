package com.fabalarm.service;

import com.fabalarm.model.*;
import com.fabalarm.repository.IssueActivityRepository;
import com.fabalarm.repository.IssueRepository;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.time.Instant;
import java.util.List;
import java.util.Optional;
import java.util.Set;
import java.util.stream.Collectors;

@Service
public class IssueService {

    private final IssueRepository issueRepository;
    private final IssueActivityRepository issueActivityRepository;

    public IssueService(IssueRepository issueRepository, IssueActivityRepository issueActivityRepository) {
        this.issueRepository = issueRepository;
        this.issueActivityRepository = issueActivityRepository;
    }

    public List<Issue> findAll(String search, List<IssueStatus> status,
                               List<RiskLevel> riskLevel, List<AlarmType> alarmType) {
        List<Issue> issues = issueRepository.findAll();
        return issues.stream()
                .filter(i -> matchSearch(i, search))
                .filter(i -> matchList(i.getStatus(), status))
                .filter(i -> matchList(i.getRiskLevel(), riskLevel))
                .filter(i -> matchList(i.getAlarmType(), alarmType))
                .collect(Collectors.toList());
    }

    public Optional<Issue> findById(String id) {
        return issueRepository.findById(id);
    }

    @Transactional
    public Issue create(Issue issue, User user) {
        issue.setDate(Instant.now());
        issue.setStatus(IssueStatus.Triage);
        issueRepository.save(issue);

        IssueActivity activity = new IssueActivity();
        activity.setIssueId(issue.getId());
        activity.setType(IssueActivityType.created);
        activity.setTimestamp(Instant.now());
        activity.setAuthor(user.getName());
        issueActivityRepository.save(activity);

        return issue;
    }

    @Transactional
    public Issue assignOwner(String issueId, String ownerId, User user) {
        Issue issue = issueRepository.findById(issueId).orElse(null);
        if (issue == null) return null;

        issue.setOwnerId(ownerId);
        issueRepository.save(issue);

        IssueActivity activity = new IssueActivity();
        activity.setIssueId(issueId);
        activity.setType(IssueActivityType.assignment);
        activity.setTimestamp(Instant.now());
        activity.setAuthor(user.getName());
        activity.setAssignedTo(ownerId);
        issueActivityRepository.save(activity);

        return issue;
    }

    @Transactional
    public Issue addComment(String issueId, String text, User user) {
        Issue issue = issueRepository.findById(issueId).orElse(null);
        if (issue == null) return null;

        IssueActivity activity = new IssueActivity();
        activity.setIssueId(issueId);
        activity.setType(IssueActivityType.comment);
        activity.setTimestamp(Instant.now());
        activity.setAuthor(user.getName());
        activity.setText(text);
        issueActivityRepository.save(activity);

        return issue;
    }

    public List<IssueActivity> getActivity(String issueId) {
        return issueActivityRepository.findByIssueIdOrderByTimestampAsc(issueId);
    }

    private boolean matchSearch(Issue i, String search) {
        if (search == null || search.isBlank()) return true;
        String q = search.toLowerCase();
        String haystack = (i.getId() + " " + i.getTitle() + " " + i.getDescription()).toLowerCase();
        return haystack.contains(q);
    }

    private <T> boolean matchList(T value, List<T> filter) {
        if (filter == null || filter.isEmpty()) return true;
        return filter.contains(value);
    }
}
