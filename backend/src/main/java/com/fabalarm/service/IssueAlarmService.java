package com.fabalarm.service;

import com.fabalarm.model.*;
import com.fabalarm.repository.*;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.time.Instant;
import java.util.List;

@Service
public class IssueAlarmService {

    private final IssueAlarmRepository issueAlarmRepository;
    private final IssueRepository issueRepository;
    private final AlarmRepository alarmRepository;
    private final IssueActivityRepository issueActivityRepository;
    private final AlarmActivityRepository alarmActivityRepository;

    public IssueAlarmService(IssueAlarmRepository issueAlarmRepository,
                             IssueRepository issueRepository,
                             AlarmRepository alarmRepository,
                             IssueActivityRepository issueActivityRepository,
                             AlarmActivityRepository alarmActivityRepository) {
        this.issueAlarmRepository = issueAlarmRepository;
        this.issueRepository = issueRepository;
        this.alarmRepository = alarmRepository;
        this.issueActivityRepository = issueActivityRepository;
        this.alarmActivityRepository = alarmActivityRepository;
    }

    public List<IssueAlarm> getActiveAlarms(String issueId) {
        return issueAlarmRepository.findByIssueIdAndMergedAtIsNull(issueId);
    }

    public List<IssueAlarm> getHistoricalAlarms(String issueId) {
        return issueAlarmRepository.findByIssueIdAndMergedAtIsNotNull(issueId);
    }

    @Transactional
    public IssueAlarm link(String issueId, String alarmId, User user) {
        // Verify issue and alarm exist
        issueRepository.findById(issueId)
                .orElseThrow(() -> new IllegalArgumentException("Issue not found: " + issueId));
        alarmRepository.findById(alarmId)
                .orElseThrow(() -> new IllegalArgumentException("Alarm not found: " + alarmId));

        // Check not already linked
        if (issueAlarmRepository.findByIssueIdAndAlarmIdAndMergedAtIsNull(issueId, alarmId).isPresent()) {
            throw new IllegalStateException("Alarm " + alarmId + " is already linked to issue " + issueId);
        }

        IssueAlarm ia = new IssueAlarm();
        ia.setIssueId(issueId);
        ia.setAlarmId(alarmId);
        ia.setAttachedAt(Instant.now());
        ia.setAttachedBy(user.getName());
        issueAlarmRepository.save(ia);

        // Log activity on issue
        IssueActivity issueAct = new IssueActivity();
        issueAct.setIssueId(issueId);
        issueAct.setType(IssueActivityType.alarm_linked);
        issueAct.setTimestamp(Instant.now());
        issueAct.setAuthor(user.getName());
        issueAct.setAlarmId(alarmId);
        issueActivityRepository.save(issueAct);

        // Log activity on alarm
        AlarmActivity alarmAct = new AlarmActivity();
        alarmAct.setAlarmId(alarmId);
        alarmAct.setType(AlarmActivityType.linked);
        alarmAct.setTimestamp(Instant.now());
        alarmAct.setAuthor(user.getName());
        alarmAct.setNote("Linked to issue " + issueId);
        alarmActivityRepository.save(alarmAct);

        return ia;
    }

    @Transactional
    public void unlink(String issueId, String alarmId, User user) {
        IssueAlarm ia = issueAlarmRepository.findByIssueIdAndAlarmIdAndMergedAtIsNull(issueId, alarmId)
                .orElseThrow(() -> new IllegalArgumentException(
                        "No active link between issue " + issueId + " and alarm " + alarmId));

        issueAlarmRepository.delete(ia);

        // Log activity on issue
        IssueActivity issueAct = new IssueActivity();
        issueAct.setIssueId(issueId);
        issueAct.setType(IssueActivityType.alarm_unlinked);
        issueAct.setTimestamp(Instant.now());
        issueAct.setAuthor(user.getName());
        issueAct.setAlarmId(alarmId);
        issueActivityRepository.save(issueAct);

        // Log activity on alarm
        AlarmActivity alarmAct = new AlarmActivity();
        alarmAct.setAlarmId(alarmId);
        alarmAct.setType(AlarmActivityType.unlinked);
        alarmAct.setTimestamp(Instant.now());
        alarmAct.setAuthor(user.getName());
        alarmAct.setNote("Unlinked from issue " + issueId);
        alarmActivityRepository.save(alarmAct);
    }

    @Transactional
    public IssueAlarm move(String alarmId, String targetIssueId, User user) {
        // Find current active link
        IssueAlarm old = issueAlarmRepository.findByAlarmIdAndMergedAtIsNull(alarmId)
                .orElseThrow(() -> new IllegalArgumentException(
                        "No active link found for alarm " + alarmId));

        String sourceIssueId = old.getIssueId();

        // Verify target issue exists
        issueRepository.findById(targetIssueId)
                .orElseThrow(() -> new IllegalArgumentException("Target issue not found: " + targetIssueId));

        // Mark old row as merged
        old.setMergedAt(Instant.now());
        old.setMergedBy(user.getName());
        old.setMergedToIssueId(targetIssueId);
        issueAlarmRepository.save(old);

        // Create new row on target
        IssueAlarm newLink = new IssueAlarm();
        newLink.setIssueId(targetIssueId);
        newLink.setAlarmId(alarmId);
        newLink.setAttachedAt(Instant.now());
        newLink.setAttachedBy(user.getName());
        issueAlarmRepository.save(newLink);

        // Log activity on source issue
        IssueActivity sourceAct = new IssueActivity();
        sourceAct.setIssueId(sourceIssueId);
        sourceAct.setType(IssueActivityType.alarm_moved);
        sourceAct.setTimestamp(Instant.now());
        sourceAct.setAuthor(user.getName());
        sourceAct.setAlarmId(alarmId);
        sourceAct.setText("Alarm moved to issue " + targetIssueId);
        issueActivityRepository.save(sourceAct);

        // Log activity on target issue
        IssueActivity targetAct = new IssueActivity();
        targetAct.setIssueId(targetIssueId);
        targetAct.setType(IssueActivityType.alarm_moved);
        targetAct.setTimestamp(Instant.now());
        targetAct.setAuthor(user.getName());
        targetAct.setAlarmId(alarmId);
        targetAct.setText("Alarm moved from issue " + sourceIssueId);
        issueActivityRepository.save(targetAct);

        // Log activity on alarm
        AlarmActivity alarmAct = new AlarmActivity();
        alarmAct.setAlarmId(alarmId);
        alarmAct.setType(AlarmActivityType.moved_between_issues);
        alarmAct.setTimestamp(Instant.now());
        alarmAct.setAuthor(user.getName());
        alarmAct.setNote("Moved from issue " + sourceIssueId + " to issue " + targetIssueId);
        alarmActivityRepository.save(alarmAct);

        return newLink;
    }
}
