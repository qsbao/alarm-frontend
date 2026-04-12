package com.fabalarm.repository;

import com.fabalarm.model.IssueAlarm;
import org.springframework.data.jpa.repository.JpaRepository;

import java.util.List;
import java.util.Optional;

public interface IssueAlarmRepository extends JpaRepository<IssueAlarm, Long> {

    List<IssueAlarm> findByIssueIdAndMergedAtIsNull(String issueId);

    List<IssueAlarm> findByIssueIdAndMergedAtIsNotNull(String issueId);

    Optional<IssueAlarm> findByIssueIdAndAlarmIdAndMergedAtIsNull(String issueId, String alarmId);

    Optional<IssueAlarm> findByAlarmIdAndMergedAtIsNull(String alarmId);
}
