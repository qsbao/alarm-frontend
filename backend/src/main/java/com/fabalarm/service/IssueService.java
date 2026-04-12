package com.fabalarm.service;

import com.fabalarm.model.*;
import com.fabalarm.repository.IssueActivityRepository;
import com.fabalarm.repository.IssueAlarmRepository;
import com.fabalarm.repository.IssueRepository;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.time.Instant;
import java.util.ArrayList;
import java.util.List;
import java.util.Optional;
import java.util.Set;
import java.util.stream.Collectors;

@Service
public class IssueService {

    private final IssueRepository issueRepository;
    private final IssueActivityRepository issueActivityRepository;
    private final IssueAlarmRepository issueAlarmRepository;

    public IssueService(IssueRepository issueRepository,
                        IssueActivityRepository issueActivityRepository,
                        IssueAlarmRepository issueAlarmRepository) {
        this.issueRepository = issueRepository;
        this.issueActivityRepository = issueActivityRepository;
        this.issueAlarmRepository = issueAlarmRepository;
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

    @Transactional
    public Issue mergeIssues(List<String> sourceIds, String targetId, User user) {
        Issue target = issueRepository.findById(targetId)
                .orElseThrow(() -> new IllegalArgumentException("Target issue not found: " + targetId));

        List<Issue> sources = new ArrayList<>();
        for (String sourceId : sourceIds) {
            Issue source = issueRepository.findById(sourceId)
                    .orElseThrow(() -> new IllegalArgumentException("Source issue not found: " + sourceId));
            if (source.getStatus() != IssueStatus.Triage) {
                throw new IllegalStateException("Source issue " + sourceId + " is not in Triage status");
            }
            if (!source.getDepartment().equals(target.getDepartment())) {
                throw new IllegalStateException("Source issue " + sourceId + " is not in the same department as target");
            }
            sources.add(source);
        }

        Instant now = Instant.now();
        List<String> mergedSourceIds = new ArrayList<>();

        for (Issue source : sources) {
            // Move all active alarms from source to target
            List<IssueAlarm> activeAlarms = issueAlarmRepository.findByIssueIdAndMergedAtIsNull(source.getId());
            for (IssueAlarm ia : activeAlarms) {
                // Mark old row as merged
                ia.setMergedAt(now);
                ia.setMergedBy(user.getName());
                ia.setMergedToIssueId(targetId);
                issueAlarmRepository.save(ia);

                // Create new active row on target
                IssueAlarm newLink = new IssueAlarm();
                newLink.setIssueId(targetId);
                newLink.setAlarmId(ia.getAlarmId());
                newLink.setAttachedAt(now);
                newLink.setAttachedBy(user.getName());
                issueAlarmRepository.save(newLink);
            }

            // Set source to Merged status
            source.setStatus(IssueStatus.Merged);
            source.setMergedIntoIssueId(targetId);
            issueRepository.save(source);

            // Log activity on source
            IssueActivity sourceAct = new IssueActivity();
            sourceAct.setIssueId(source.getId());
            sourceAct.setType(IssueActivityType.merged_out);
            sourceAct.setTimestamp(now);
            sourceAct.setAuthor(user.getName());
            sourceAct.setText("Merged into issue " + targetId);
            issueActivityRepository.save(sourceAct);

            mergedSourceIds.add(source.getId());
        }

        // Log activity on target
        IssueActivity targetAct = new IssueActivity();
        targetAct.setIssueId(targetId);
        targetAct.setType(IssueActivityType.merged_in);
        targetAct.setTimestamp(now);
        targetAct.setAuthor(user.getName());
        targetAct.setText("Merged from issues: " + String.join(", ", mergedSourceIds));
        issueActivityRepository.save(targetAct);

        return target;
    }

    public Optional<String> getMergedInto(String issueId) {
        return issueRepository.findById(issueId)
                .map(Issue::getMergedIntoIssueId);
    }

    public List<Issue> getMergeCandidates(String issueId) {
        Issue issue = issueRepository.findById(issueId).orElse(null);
        if (issue == null) return List.of();
        return issueRepository.findByDepartmentAndStatusAndIdNot(
                issue.getDepartment(), IssueStatus.Triage, issueId);
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
