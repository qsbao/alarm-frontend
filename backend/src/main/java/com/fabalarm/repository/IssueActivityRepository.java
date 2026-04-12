package com.fabalarm.repository;

import com.fabalarm.model.IssueActivity;
import org.springframework.data.jpa.repository.JpaRepository;

import java.util.List;

public interface IssueActivityRepository extends JpaRepository<IssueActivity, Long> {

    List<IssueActivity> findByIssueIdOrderByTimestampAsc(String issueId);
}
